import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCoverPreset, guessDocument, usesEntityModel } from '../src/pipeline/document.ts';
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

test('receipt merchant TIN does not compete with clear receipt clues', () => {
  assert.equal(guessDocument(words('Official receipt VAT Cash Change'), ['tin']), 'Receipt');
});

test('clipped receipts retain classification from checkout labels without the receipt title', () => {
  assert.equal(guessDocument(words('Cashier 7 Service charge Total Balance'), []), 'Receipt');
  assert.equal(guessDocument(words('Order type Total VAT'), []), 'Receipt');
  assert.equal(guessDocument(words('Service charge NET'), []), 'Receipt');
  assert.equal(guessDocument(words('Total alone'), []), 'Unknown');
});

test('MRZ and Filipino passport clues support ID classification', () => {
  assert.equal(guessDocument(words('P<PHLDELA<CRUZ<<LINA<MAY<<<<<<<<<<<<<<<<<<<<<')), 'ID');
  assert.equal(guessDocument(words('Pasaporte Nasyonalidad Petsa ng kapanganakan')), 'ID');
});

test('structured school, employee and payment cards use field evidence, not entity guesses', () => {
  for (const text of ['Student ID Name Example', 'Employee number Example', 'Learner reference number', 'Credit VISA Valid thru', 'Mastercard Cardholder']) {
    const guess = guessDocument(words(text));
    assert.notEqual(guess, 'Unknown', text);
    assert.equal(usesEntityModel(guess), false, text);
  }
  assert.equal(usesEntityModel('ID'), false);
  assert.equal(usesEntityModel('Receipt'), false);
  assert.equal(usesEntityModel('Chat screenshot'), true);
  assert.equal(usesEntityModel('Unknown', ['pagibig', 'card_number']), false);
});
