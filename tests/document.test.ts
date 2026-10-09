import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCoverPreset, guessDocument } from '../src/pipeline/document.ts';
import type { Category, Detection, Word } from '../src/types.ts';

const words = (text: string): Word[] => text.split(' ').map((word, index) => ({ text: word, line: 0, x: index, y: 0, width: 1, height: 1 }));

test('guesses supported document types from bounded clues', () => {
  const cases: Array<[string, Category[], string]> = [
    ['Republic of the Philippines Date of Birth Nationality', [], 'ID'],
    ['OFFICIAL RECEIPT Subtotal VAT Cash Change', [], 'Receipt'],
    ['Message delivered Seen yesterday at 8', [], 'Chat screenshot'],
    ['Bank transfer Amount sent Transfer successful', [], 'Bank transfer'],
    ['A plain page without document clues', [], 'Unknown'],
  ];
  for (const [text, categories, expected] of cases) assert.equal(guessDocument(words(text), categories), expected);
});

test('returns Unknown when strong document clues compete', () => {
  assert.equal(guessDocument(words('Official receipt subtotal VAT Date of Birth Nationality National ID'), []), 'Unknown');
});

test('ID numbers support an ID guess but birthday alone does not', () => {
  assert.equal(guessDocument(words('Sample details'), ['tin']), 'ID');
  assert.equal(guessDocument(words('Sample details'), ['birthday']), 'Unknown');
  assert.equal(guessDocument(words("Driver's license Nationality"), []), 'ID');
});

test('seller preset exposes only name and face while preserving manual covers', () => {
  const inputs: Array<[string, Category, boolean]> = [
    ['name', 'full_name', true], ['face', 'face', true], ['ref', 'reference', false], ['manual', 'manual', false],
  ];
  const detections: Detection[] = inputs.map(([id, category, enabled], index) => ({ id, category, enabled, x: index, y: 0, width: 1, height: 1 }));
  const seller = applyCoverPreset(detections, 'seller-verification');
  assert.deepEqual(seller.map(item => [item.category, item.enabled]), [
    ['full_name', false], ['face', false], ['reference', true], ['manual', true],
  ]);
  assert.ok(seller.every((item, index) => item !== detections[index]));
  assert.ok(applyCoverPreset(seller, 'cover-all').every(item => item.enabled));
});
