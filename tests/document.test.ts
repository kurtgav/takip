import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCoverPreset, coverProfile, groupPassportRows, guessDocument, usesEntityModel } from '../src/pipeline/document.ts';
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
  assert.equal(guessDocument(words('ID No.'), ['identity_number']), 'ID');
  assert.equal(usesEntityModel('Unknown', ['identity_number']), false);
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

test('independent licensee signature and expiry captions support a damaged license title', () => {
  assert.equal(guessDocument(words('Signature of License Expiration Date')), 'ID');
  assert.equal(guessDocument(words('Signature of Licensee Expiration Date')), 'ID');
  assert.equal(guessDocument(words('Signature Expiration Date')), 'Unknown');
  assert.equal(guessDocument(words('Signature of License')), 'Unknown');
});

test('document defaults cover only requested categories and keep manual additions', () => {
  const categories: Category[] = ['address', 'drivers_license', 'signature', 'passport', 'issue_date', 'expiry_date', 'mrz', 'passport_security_area', 'full_name', 'birthday', 'face', 'passport_portrait_area', 'agency_code', 'manual'];
  const boxes = categories.map((category, index): Detection => ({ id: String(index), category, enabled: true, x: 0, y: index * 30, width: 40, height: 20 }));
  assert.deepEqual(applyCoverPreset(boxes, 'drivers-license').filter(box => box.enabled).map(box => box.category), ['address', 'drivers_license', 'signature', 'manual']);
  assert.deepEqual(applyCoverPreset(boxes, 'passport').filter(box => box.enabled).map(box => box.category), ['passport', 'issue_date', 'expiry_date', 'mrz', 'passport_security_area', 'manual']);
  assert.equal(coverProfile(words("REPUBLIC OF THE PHILIPPINES DRIVER'S LICENSE"), []), 'drivers-license');
  assert.equal(coverProfile(words('PASAPORTE'), ['mrz']), 'passport');
  assert.equal(coverProfile(words('Student ID'), ['student_number']), undefined);
  assert.equal(coverProfile(words('Receipt Total'), []), undefined);
  assert.equal(coverProfile(words('RECEIPT Passport photo Total VAT'), []), undefined);
  assert.equal(coverProfile(words('PASSPORT ACADEMY STUDENT ID'), ['student_number', 'full_name']), undefined);
  assert.equal(coverProfile(words('Expiration Date Signature of License'), ['signature', 'expiry_date']), 'drivers-license');
  assert.equal(coverProfile(words('Signature alone'), ['signature']), undefined);
});

test('passport rows become one neat independent cover without merging adjacent fields', () => {
  const boxes: Detection[] = [
    { id: 'number', category: 'passport', enabled: true, x: 200, y: 10, width: 80, height: 20 },
    { id: 'row1', category: 'mrz', enabled: true, x: 10, y: 300, width: 500, height: 20 },
    { id: 'row2', category: 'mrz', enabled: true, x: 8, y: 330, width: 505, height: 22 },
  ];
  const result = groupPassportRows(boxes);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], boxes[0]);
  assert.deepEqual(result[1], { ...boxes[1], x: 8, y: 300, width: 505, height: 52 });
  assert.equal(boxes[1].height, 20);
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
