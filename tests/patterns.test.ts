import assert from 'node:assert/strict';
import test from 'node:test';
import { detectPatterns, isLuhn } from '../src/pipeline/patterns.ts';
import type { Word } from '../src/types.ts';

const words = (lines: string[][]): Word[] => lines.flatMap((line, lineIndex) =>
  line.map((text, column) => ({ text, line: lineIndex, x: column * 90, y: lineIndex * 30, width: 80, height: 20 })),
);

test('Luhn accepts cards after formatting and rejects arbitrary digits', () => {
  assert.equal(isLuhn('4111 1111 1111 1111'), true);
  assert.equal(isLuhn('4111 1111 1111 1112'), false);
  assert.equal(isLuhn('123'), false);
});

test('detects every Philippine identifier format and excludes labels from boxes', () => {
  const input = words([
    ['National', 'ID', '1234-5678-9012-3456'],
    ['TIN', '123-456-789-000'],
    ['SSS', '12-3456789-0'],
    ['CRN', '1234-1234567-1'],
    ['PhilHealth', '12-123456789-1'],
    ['Pag-IBIG', '1234-5678-9012'],
    ["Driver's", 'License', 'A01-23-456789'],
    ['Passport', 'P1234567'],
  ]);
  const detections = detectPatterns(input);
  assert.deepEqual(detections.map(({ category }) => category), [
    'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'drivers_license', 'passport',
  ]);
  assert.deepEqual(detections.map(({ x }) => x), [180, 90, 90, 90, 90, 90, 180, 90]);
});

test('detects contact, financial, email, safety-net, and optional reference', () => {
  const detections = detectPatterns(words([
    ['Mobile', '+63917-123-4567'],
    ['Card', '4111', '1111', '1111', '1111'],
    ['Account', '123456789012'],
    ['Email', 'ana@example.ph'],
    ['Code', '123', '456', '789'],
    ['Reference', 'ABC-123456789'],
  ]));
  assert.deepEqual(detections.map(({ category, enabled }) => [category, enabled]), [
    ['phone', true], ['card_number', true], ['account_number', true], ['email', true],
    ['digits', true], ['reference', false],
  ]);
});

test('safety net covers trailing punctuation, split numeric runs, and embedded sequences', () => {
  const detections = detectPatterns(words([
    ['123456789,'],
    ['Code', '123', '456', '789,'],
    ['TXN123456789'],
  ]));
  assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [
    ['digits', 0, 80],
    ['digits', 90, 260],
    ['digits', 0, 80],
  ]);
});

test('punctuated labeled reference remains optional and claims its full value', () => {
  const detections = detectPatterns(words([['Ref', 'No.', 'TXN123456789,']]));
  assert.deepEqual(detections.map(({ category, enabled, x }) => [category, enabled, x]), [
    ['reference', false, 180],
  ]);
});

test('uses English or Filipino labels on same or next line for personal fields', () => {
  const detections = detectPatterns(words([
    ['Pangalan'], ['Ana', 'Reyes'],
    ['Petsa', 'ng', 'Kapanganakan'], ['October', '9,', '1998'],
    ['Tirahan', '42', 'Mabini', 'St.,', 'Cebu', 'City'],
  ]));
  assert.deepEqual(detections.map(({ category }) => category), ['full_name', 'birthday', 'address']);
  assert.deepEqual(detections.map(({ y }) => y), [30, 90, 120]);
});

test('accepts punctuated labels, DOB alias, and name-part labels without covering labels', () => {
  const detections = detectPatterns(words([
    ['First', 'Name:', 'Ana'],
    ['Middle', 'Name:', 'Maria'],
    ['Surname:', 'Reyes'],
    ['DOB:', '09', 'October', '1998'],
    ['Ref', 'No.', 'ABC-123456789'],
  ]));
  assert.deepEqual(detections.map(({ category, enabled, x }) => [category, enabled, x]), [
    ['full_name', true, 180], ['full_name', true, 180], ['full_name', true, 90],
    ['birthday', true, 90], ['reference', false, 180],
  ]);
});

test('classifies bare long numbers by financial and PhilSys priority', () => {
  assert.deepEqual(detectPatterns(words([
    ['4111111111111111'],
    ['1234567890123456'],
    ['123456789012'],
    ['1234567890123456789'],
  ])).map(({ category }) => category), [
    'card_number', 'philsys_number', 'account_number', 'account_number',
  ]);
});

test('detects standalone date forms and spaced phone variants', () => {
  assert.deepEqual(detectPatterns(words([
    ['10/09/1998'],
    ['9', 'October', '1998'],
    ['09', '17', '123', '4567'],
    ['+63', '917', '123', '4567'],
  ])).map(({ category }) => category), ['birthday', 'birthday', 'phone', 'phone']);
});

test('email matching cannot swallow preceding words', () => {
  const detections = detectPatterns(words([['Contact', 'ana@example.ph']]));
  assert.equal(detections.length, 1);
  assert.deepEqual({ category: detections[0].category, x: detections[0].x }, { category: 'email', x: 90 });
});

test('does not cover titles, agencies, or field labels without values', () => {
  assert.deepEqual(detectPatterns(words([
    ['REPUBLIC', 'OF', 'THE', 'PHILIPPINES'],
    ['Philippine', 'Statistics', 'Authority'],
    ['Name'], ['Address'], ['Date', 'of', 'Birth'],
    ['City'], ['Province'], ['First', 'Name:'], ['DOB:'], ['Ref', 'No.'],
  ])), []);
});
