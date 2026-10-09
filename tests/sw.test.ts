import assert from 'node:assert/strict';
import { test } from 'node:test';

test('service worker preserves other scopes’ guards and blocks uncached processing requests', async () => {
  const scope = 'https://example.test/takip/';
  const entries = new Map<string, Map<string, Response>>();
  const handlers = new Map<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void>();
  const originalSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  const originalFetch = globalThis.fetch;
  let networkRequests = 0;
  const key = (input: RequestInfo | URL) => input instanceof Request ? input.url : String(input);
  const storage = {
    async open(name: string) {
      let values = entries.get(name);
      if (!values) { values = new Map(); entries.set(name, values); }
      const saved = values;
      return {
        async keys() { return [...saved.keys()].map(url => new Request(url)); },
        async match(input: RequestInfo | URL) { return saved.get(key(input))?.clone(); },
        async put(input: RequestInfo | URL, response: Response) { saved.set(key(input), response.clone()); },
        async delete(input: RequestInfo | URL) { return saved.delete(key(input)); },
      };
    },
  };
  Object.defineProperty(globalThis, 'self', { configurable: true, value: {
    __WB_MANIFEST: [],
    registration: { scope },
    location: new URL(scope),
    clients: { matchAll: async () => [{ id: 'current-photo', url: scope, postMessage() {} }] },
    addEventListener: (type: string, handler: (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void) => handlers.set(type, handler),
  } });
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: storage });
  globalThis.fetch = async () => { networkRequests++; return new Response('network'); };
  try {
    await import('../src/sw');
    const guards = await storage.open('takip-processing-guards');
    const foreignGuard = 'https://example.test/other-app/__processing_guard__/other-photo';
    const currentGuard = `${scope}__processing_guard__/current-photo`;
    const staleGuard = `${scope}__processing_guard__/closed-photo`;
    await guards.put(foreignGuard, new Response('0'));
    await guards.put(currentGuard, new Response('0'));
    await guards.put(staleGuard, new Response('0'));
    let response: Promise<Response> | undefined;
    handlers.get('fetch')!({ request: new Request(`${scope}uncached`), respondWith: value => { response = value; } });
    assert.equal((await response)?.type, 'error');
    assert.equal(networkRequests, 0);
    assert.ok(await guards.match(foreignGuard), 'one app must not remove another app’s photo guard');
    assert.equal(await (await guards.match(currentGuard))?.text(), '1');
    assert.equal(await guards.match(staleGuard), undefined, 'closed clients in this scope must still be cleaned up');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSelf) Object.defineProperty(globalThis, 'self', originalSelf);
    else Reflect.deleteProperty(globalThis, 'self');
    if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches);
    else Reflect.deleteProperty(globalThis, 'caches');
  }
});
