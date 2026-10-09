import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { cacheOfflineAsset } from '../src/offline-download';

test('offline downloads retain completed files and reject failures, stalls, and cancellation', async () => {
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    if (request.url === '/failed') { response.writeHead(503); response.end(); return; }
    if (request.url === '/stalled' || request.url === '/cancelled') { response.writeHead(200); response.write('partial'); return; }
    response.end('complete model');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = (path: string) => new URL(path, `http://127.0.0.1:${address.port}`);
  const saved = new Map<string, string>();
  const cache = {
    async match(key: RequestInfo | URL) {
      const value = saved.get(String(key));
      return value === undefined ? undefined : new Response(value);
    },
    async put(key: RequestInfo | URL, response: Response) {
      const complete = await response.text();
      saved.set(String(key), complete);
    },
  };
  let bytes = 0;
  const progress = (count: number) => { bytes += count; };
  try {
    await cacheOfflineAsset(cache, url('/model'), progress);
    assert.equal(bytes, Buffer.byteLength('complete model'));
    await assert.rejects(cacheOfflineAsset(cache, url('/failed'), progress), /HTTP 503/);
    assert.equal(saved.has(url('/failed').href), false);
    await assert.rejects(cacheOfflineAsset(cache, url('/stalled'), progress, 50), /Download stalled/);
    assert.equal(saved.has(url('/stalled').href), false, 'partial files cannot count as ready');
    const cancellation = new AbortController();
    const cancelled = cacheOfflineAsset(cache, url('/cancelled'), progress, 1000, cancellation.signal);
    setTimeout(() => cancellation.abort(), 25);
    await assert.rejects(cancelled, error => error instanceof Error
      && error.name === 'AbortError'
      && /cancelled/.test(error.message));
    assert.equal(saved.has(url('/cancelled').href), false, 'cancelled partial files cannot count as ready');
    const beforeRetry = requests;
    await cacheOfflineAsset(cache, url('/model'), progress);
    assert.equal(requests, beforeRetry, 'retry must reuse the completed model');
    await assert.rejects(cacheOfflineAsset({ ...cache, put: async () => {
      throw new DOMException('Full', 'QuotaExceededError');
    } }, url('/full'), progress), /Not enough browser storage/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
