/// <reference lib="webworker" />
import { cacheOfflineAsset } from './offline-download';
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };
const manifest = self.__WB_MANIFEST;
// Identical assets keep the same cache across orchestrator/docs-only rebuilds.
const cacheName = crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(manifest)))
  .then(hash => `takip-core-${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`);
const guardCacheName = 'takip-processing-guards';
const guardUrl = (id: string) => new URL(`__processing_guard__/${encodeURIComponent(id)}`, self.registration.scope);
let setupStatus = { type: 'OFFLINE_PROGRESS', text: 'Checking saved tools…' };

async function reportSetup(type: string, text: string) {
  setupStatus = { type, text };
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    if (client.url.startsWith(self.registration.scope)) client.postMessage(setupStatus);
  }
}

async function hasProcessingClient(): Promise<boolean> {
  const guards = await caches.open(guardCacheName);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return (await guards.keys()).some(key => clients.some(client => guardUrl(client.id).href === key.url));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(await cacheName);
      let bytes = 0;
      let lastReport = 0;
      // Only static build assets enter this cache. Uploaded files and blob URLs never do.
      for (const [index, entry] of manifest.entries()) {
        if (await hasProcessingClient()) throw new Error('Update deferred while a photo is open.');
        const report = () => reportSetup('OFFLINE_PROGRESS', `Saving tools: file ${index + 1} of ${manifest.length} · ${(bytes / 1e6).toFixed(1)} MB downloaded. Keep this tab open…`);
        await report();
        await cacheOfflineAsset(cache, new URL(entry.url, self.registration.scope), count => {
          bytes += count;
          if (Date.now() - lastReport >= 500) { lastReport = Date.now(); void report(); }
        });
      }
      await reportSetup('OFFLINE_PROGRESS', 'Downloads complete. Starting local tools…');
    } catch (error) {
      await reportSetup('OFFLINE_ERROR', error instanceof Error ? error.message : 'Offline setup failed. Check your connection and storage, then retry.');
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const currentCache = await cacheName;
    for (const name of await caches.keys()) if (name.startsWith('takip-core-') && name !== currentCache) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const source = event.source;
  if (!source || !('id' in source)) return;
  if (event.data?.type === 'OFFLINE_STATUS') { source.postMessage(setupStatus); return; }
  event.waitUntil((async () => {
    const guards = await caches.open(guardCacheName);
    if (event.data?.type === 'PROCESS_START') await guards.put(guardUrl(source.id), new Response('0'));
    if (event.data?.type === 'PROCESS_END') await guards.delete(guardUrl(source.id));
    event.ports[0]?.postMessage({ requests: 0, blocked: 0 });
  })());
});

self.addEventListener('fetch', event => {
  if (!/^https?:/.test(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(await cacheName);
    const url = new URL(event.request.url);
    const cached = event.request.method === 'GET' && url.origin === self.location.origin
      ? await cache.match(event.request, { ignoreSearch: true, ignoreVary: true })
        ?? (event.request.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope)) : undefined)
      : undefined;
    if (cached) return cached;
    const clients = await self.clients.matchAll({ type: 'window' });
    // Persist only anonymous guard IDs/counts, so worker suspension cannot unlock processing.
    const guards = await caches.open(guardCacheName);
    const active = [];
    for (const key of await guards.keys()) {
      const client = clients.find(client => guardUrl(client.id).href === key.url);
      if (!client) await guards.delete(key);
      else active.push({ key, client });
    }
    if (active.length) {
      for (const { key, client } of active) {
        const count = Number(await (await guards.match(key))!.text()) + 1;
        await guards.put(key, new Response(String(count)));
        client.postMessage({ type: 'NETWORK_COUNT', requests: 0, blocked: count });
      }
      return Response.error();
    }
    // Runtime never stores responses; optional model libraries own their static model caches.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return Response.error();
    return fetch(event.request);
  })());
});
