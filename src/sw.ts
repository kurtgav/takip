/// <reference lib="webworker" />
import { cacheOfflineAsset } from './offline-download';

interface ManifestEntry { url: string; revision?: string | null }
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: ManifestEntry[] };

const manifest = self.__WB_MANIFEST;
const scopePath = new URL(self.registration.scope).pathname;
const isToolAsset = ({ url }: { url: string }) => {
  const pathname = new URL(url, self.registration.scope).pathname;
  const relativePath = pathname.startsWith(scopePath) ? pathname.slice(scopePath.length) : pathname.replace(/^\/+/, '');
  return /^(?:ocr|models|vision|wasm|summary)\//.test(relativePath)
    || /^assets\/[^/]+\.wasm$/.test(relativePath)
    || /^assets\/(?:ocr|vision|ner|summary)\.worker-[^/]+\.js$/.test(relativePath);
};
const toolManifest = manifest.filter(isToolAsset);
const shellManifest = manifest.filter(entry => !isToolAsset(entry));
// Identical assets keep the same cache across orchestrator/docs-only rebuilds.
const cacheName = crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(manifest)))
  .then(hash => `takip-core-${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`);
const guardCacheName = 'takip-processing-guards';
const manifestUrl = new URL('__offline_manifest__', self.registration.scope);
const guardUrl = (id: string) => new URL(`__processing_guard__/${encodeURIComponent(id)}`, self.registration.scope);
let setupStatus = { type: 'OFFLINE_PROGRESS', text: 'Checking offline app…' };

interface ToolDownload {
  controller: AbortController;
  promise: Promise<void>;
}

let toolDownload: ToolDownload | undefined;

async function previousTools(cache: Cache): Promise<ManifestEntry[] | undefined> {
  const saved = await cache.match(manifestUrl);
  if (!saved) return undefined;
  const metadata: { scope: string; tools: ManifestEntry[] } = await saved.json();
  return metadata.scope === self.registration.scope ? metadata.tools : undefined;
}

async function reuseToolAssets(): Promise<void> {
  const currentName = await cacheName;
  const current = await caches.open(currentName);
  for (const name of await caches.keys()) {
    if (!name.startsWith('takip-core-') || name === currentName) continue;
    const previous = await caches.open(name);
    const entries = await previousTools(previous);
    // Legacy caches have no revision evidence. Preserve them, but never serve them as current.
    if (!entries) continue;
    const revisions = new Map(entries.map(entry => [entry.url, entry.revision]));
    for (const entry of toolManifest) {
      const revisionMatches = revisions.has(entry.url) && revisions.get(entry.url) === entry.revision;
      // Vite's null revisions are safe only for its content-hashed output filenames.
      const hasIdentity = Boolean(entry.revision) || (entry.revision === null && /^assets\/[^/]+-[\w-]{8,}\.(?:js|wasm)$/.test(entry.url));
      if (!revisionMatches || !hasIdentity) continue;
      const url = new URL(entry.url, self.registration.scope);
      if (await current.match(url)) continue;
      const response = await previous.match(url);
      if (response) await current.put(url, response);
    }
  }
}

async function retirePreviousCaches(includeLegacy = false): Promise<void> {
  const currentName = await cacheName;
  for (const name of await caches.keys()) {
    if (!name.startsWith('takip-core-') || name === currentName) continue;
    const cache = await caches.open(name);
    // Scope-specific keys avoid deleting another app's caches on this origin.
    const known = await previousTools(cache);
    const legacyHere = includeLegacy && !await cache.match(manifestUrl)
      && await cache.match(new URL('index.html', self.registration.scope));
    if (known || legacyHere) await caches.delete(name);
  }
}

async function broadcast(message: { type: string; text: string }) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    if (client.url.startsWith(self.registration.scope)) client.postMessage(message);
  }
}

async function reportSetup(type: string, text: string) {
  setupStatus = { type, text };
  await broadcast(setupStatus);
}

async function hasProcessingClient(): Promise<boolean> {
  const guards = await caches.open(guardCacheName);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return (await guards.keys()).some(key => clients.some(client => guardUrl(client.id).href === key.url));
}

async function toolsReady(): Promise<boolean> {
  const cache = await caches.open(await cacheName);
  for (const entry of toolManifest) {
    if (!await cache.match(new URL(entry.url, self.registration.scope).href)) return false;
  }
  return true;
}

async function downloadToolAssets(signal: AbortSignal): Promise<void> {
  if (await hasProcessingClient()) throw new Error('Finish or close the current photo before downloading local tools.');
  const cache = await caches.open(await cacheName);
  let bytes = 0;
  let lastReport = 0;
  for (const [index, entry] of toolManifest.entries()) {
    if (await hasProcessingClient()) throw new Error('Tool download stopped because a photo was opened. Completed files are saved.');
    const report = () => broadcast({
      type: 'TOOLS_PROGRESS',
      text: `Saving local tools: file ${index + 1} of ${toolManifest.length} · ${(bytes / 1e6).toFixed(1)} MB downloaded this time. Keep this tab open…`,
    });
    await report();
    await cacheOfflineAsset(cache, new URL(entry.url, self.registration.scope), count => {
      bytes += count;
      if (Date.now() - lastReport >= 500) {
        lastReport = Date.now();
        void report();
      }
    }, 60_000, signal);
  }
  if (!await hasProcessingClient() && await toolsReady()) await retirePreviousCaches(true);
  await broadcast({ type: 'TOOLS_PROGRESS', text: 'Local tools saved for offline use.' });
}

function startToolDownload(): Promise<void> {
  if (toolDownload) return toolDownload.promise;
  const current: ToolDownload = { controller: new AbortController(), promise: Promise.resolve() };
  current.promise = downloadToolAssets(current.controller.signal).finally(() => {
    if (toolDownload === current) toolDownload = undefined;
  });
  toolDownload = current;
  return current.promise;
}

async function cancelToolDownload(): Promise<void> {
  const current = toolDownload;
  if (!current) return;
  current.controller.abort();
  try {
    await current.promise;
  } catch {
    // Cancellation only acknowledges after the active fetch and cache write settle.
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(await cacheName);
      let bytes = 0;
      let lastReport = 0;
      // Only static build assets enter this cache. Uploaded files and blob URLs never do.
      for (const [index, entry] of shellManifest.entries()) {
        if (await hasProcessingClient()) throw new Error('Update deferred while a photo is open.');
        const report = () => reportSetup('OFFLINE_PROGRESS', `Saving offline app: file ${index + 1} of ${shellManifest.length} · ${(bytes / 1e6).toFixed(1)} MB downloaded. Keep this tab open…`);
        await report();
        await cacheOfflineAsset(cache, new URL(entry.url, self.registration.scope), count => {
          bytes += count;
          if (Date.now() - lastReport >= 500) {
            lastReport = Date.now();
            void report();
          }
        });
      }
      await cache.put(manifestUrl, Response.json({ scope: self.registration.scope, tools: toolManifest }));
      await reportSetup('OFFLINE_PROGRESS', 'Offline app ready.');
    } catch (error) {
      await reportSetup('OFFLINE_ERROR', error instanceof Error ? error.message : 'Offline setup failed. Check your connection and storage, then retry.');
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Activation waits for the previous app's clients to close, including in-flight downloads.
    await reuseToolAssets();
    await retirePreviousCaches();
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const source = event.source;
  if (!source || !('id' in source)) return;
  if (event.data?.type === 'OFFLINE_STATUS') {
    source.postMessage(setupStatus);
    return;
  }
  event.waitUntil((async () => {
    const port = event.ports[0];
    try {
      if (event.data?.type === 'TOOLS_STATUS') {
        port?.postMessage({ ready: await toolsReady() });
        return;
      }
      if (event.data?.type === 'TOOLS_DOWNLOAD') {
        await startToolDownload();
        port?.postMessage({ done: true });
        return;
      }
      if (event.data?.type === 'TOOLS_CANCEL') {
        await cancelToolDownload();
        port?.postMessage({ done: true });
        return;
      }

      const guards = await caches.open(guardCacheName);
      if (event.data?.type === 'PROCESS_START') {
        await guards.put(guardUrl(source.id), new Response('0'));
        await cancelToolDownload();
      }
      if (event.data?.type === 'PROCESS_END') await guards.delete(guardUrl(source.id));
      port?.postMessage({ requests: 0, blocked: 0 });
    } catch (error) {
      port?.postMessage({ error: error instanceof Error ? error.message : 'Offline operation failed.' });
    }
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
