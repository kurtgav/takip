import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageWarnings, passportPrivacyArea } from '../src/pipeline/coverage.ts';
import { mergeDetections } from '../src/pipeline/merge.ts';
import type { Category, Detection, Word } from '../src/types.ts';

const words = (text: string): Word[] => [{ text, x: 0, y: 0, width: 1, height: 1, line: 0 }];

test('passport assessment lists missing fields instead of treating partial redaction as complete', () => {
  const warnings = coverageWarnings(words('Passport'), ['mrz', 'face', 'full_name'], 'ID').join(' ');
  assert.match(warnings, /Passport number/);
  assert.match(warnings, /Issue date/);
  assert.match(warnings, /whole passport portrait/);
  const covered: Category[] = ['passport', 'full_name', 'birthday', 'birthplace', 'issue_date', 'expiry_date', 'mrz', 'passport_portrait_area', 'passport_security_area'];
  assert.deepEqual(coverageWarnings(words('Passport'), covered, 'ID'), []);
});

test('student and employee identifiers count as real identity numbers', () => {
  assert.deepEqual(coverageWarnings(words('Student ID'), ['full_name', 'student_number'], 'ID'), []);
  assert.deepEqual(coverageWarnings(words('Learner reference number'), ['full_name', 'learner_number'], 'ID'), []);
  assert.deepEqual(coverageWarnings(words('Employee ID'), ['full_name', 'employee_number'], 'ID'), []);
  for (const title of ['Student ID', 'Employee ID']) assert.deepEqual(coverageWarnings(words(title), ['full_name', 'identity_number'], 'ID'), []);
  assert.match(coverageWarnings(words('Student ID'), ['full_name'], 'ID').join(' '), /Student ID/);
});

test('license number and name alone cannot imply the other personal fields were located', () => {
  const warnings = coverageWarnings(words("Driver's license"), ['drivers_license', 'full_name'], 'ID').join(' ');
  assert.match(warnings, /Birthday, Address, Expiry date, Face, Signature area/);
  assert.deepEqual(coverageWarnings(words("Driver's license"), ['drivers_license', 'full_name', 'birthday', 'address', 'expiry_date', 'face', 'signature'], 'ID'), []);
});

test('payment cards require expiry and a review of unlabeled security details', () => {
  assert.match(coverageWarnings(words('Credit card'), ['card_number'], 'Payment card').join(' '), /Full name, Expiry date/);
  assert.match(coverageWarnings(words('Credit card'), ['card_number', 'full_name', 'expiry_date'], 'Payment card').join(' '), /both sides/);
  assert.deepEqual(coverageWarnings(words('Cashier Total'), [], 'Receipt'), []);
});

test('combined identity/payment cards cannot bypass either coverage check through Unknown', () => {
  const warnings = coverageWarnings(words('Republic of the Philippines Pag-IBIG VISA'), ['pagibig', 'card_number'], 'Unknown').join(' ');
  assert.match(warnings, /Full name/);
  assert.match(warnings, /Expiry date/);
  assert.match(warnings, /both sides/);
});

test('anchored passport area conceals unreadable central fields without inventing their categories', () => {
  const box = (category: Category, x: number, y: number, width: number, height: number): Detection => ({ id: category, category, enabled: true, x, y, width, height });
  const input = [box('passport_portrait_area', 0, 10, 100, 190), box('passport_security_area', 200, 10, 100, 190), box('mrz', 0, 200, 300, 10), box('mrz', 0, 220, 300, 10)];
  const result = passportPrivacyArea(input);
  const area = result.at(-1)!;
  assert.equal(area.category, 'passport_details_area');
  assert.equal(area.enabled, true);
  assert.deepEqual([area.x, area.y, area.width, area.height], [97, 10, 106, 190]);
  assert.equal(result.some(box => box.category === 'birthday'), false);
  assert.equal(passportPrivacyArea(input.slice(1)).length, 3);
  input[3].y = 215;
  const merged = mergeDetections(input, 300, 240);
  assert.equal(merged.filter(box => box.category === 'mrz').length, 1);
  assert.equal(passportPrivacyArea(merged).at(-1)!.category, 'passport_details_area');
});
