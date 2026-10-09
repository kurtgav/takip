import test from 'node:test';
import assert from 'node:assert/strict';
import { canShareFile, validatePhoto } from '../src/platform.ts';

test('photo input accepts raster images and rejects invalid or oversized files', () => {
  assert.equal(validatePhoto({ type: 'image/png', size: 1024 }), null);
  assert.match(validatePhoto({ type: 'text/html', size: 1024 })!, /Choose/);
  assert.match(validatePhoto({ type: 'image/jpeg', size: 0 })!, /empty/);
  assert.match(validatePhoto({ type: '', size: 0 })!, /empty/);
  assert.match(validatePhoto({ type: 'image/jpeg', size: 31 * 1024 * 1024 })!, /30 MB/);
});

test('file sharing falls back when capability probing throws', () => {
  const file = new File(['sample'], 'sample.png', { type: 'image/png' });
  assert.equal(canShareFile(file, {
    share: async () => {},
    canShare: () => { throw new DOMException('Share service unavailable', 'NotAllowedError'); },
  }), false);
});
