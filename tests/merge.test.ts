import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeDetections } from '../src/pipeline/merge.ts';
import type { Detection } from '../src/types.ts';

const detection = (id: string, category: Detection['category'], x: number, enabled = true): Detection =>
  ({ id, category, enabled, x, y: 10, width: 10, height: 10 });

test('merges connected detections only when category and enabled state match', () => {
  const merged = mergeDetections([
    detection('a', 'full_name', 10), detection('b', 'full_name', 20),
    detection('c', 'address', 20), detection('d', 'full_name', 20, false),
  ], 100, 100);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged[0], { id: 'a+b', category: 'full_name', enabled: true, x: 7, y: 7, width: 26, height: 16 });
});

test('pads and clamps boxes to image bounds and drops empty boxes', () => {
  assert.deepEqual(mergeDetections([
    { ...detection('edge', 'email', -2), y: -1, width: 8, height: 8 },
    { ...detection('outside', 'email', 120), width: 2, height: 2 },
  ], 20, 20), [
    { id: 'edge', category: 'email', enabled: true, x: 0, y: 0, width: 9, height: 10 },
  ]);
});
