/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };
declare const __BUILD_VERSION__: string;

const cacheName = `takip-core-${__BUILD_VERSION__}`;
const manifest = self.__WB_MANIFEST;
const guardCacheName = 'takip-processing-guards';
const guardUrl = (id: string) => new URL(`__processing_guard__/${encodeURIComponent(id)}`, self.registration.scope);

async function hasProcessingClient(): Promise<boolean> {
  const guards = await caches.open(guardCacheName);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return (await guards.keys()).some(key => clients.some(client => guardUrl(client.id).href === key.url));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    // Only static build assets enter this cache. Uploaded files and blob URLs never do.
    for (const entry of manifest) {
      if (await hasProcessingClient()) throw new Error('Update deferred while a photo is open.');
      await cache.add(new Request(new URL(entry.url, self.registration.scope), { cache: 'reload' }));
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('takip-core-') && name !== cacheName) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const source = event.source;
  if (!source || !('id' in source)) return;
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
    const cache = await caches.open(cacheName);
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
