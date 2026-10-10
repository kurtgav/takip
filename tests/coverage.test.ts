import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageWarnings } from '../src/pipeline/coverage.ts';
import type { Category, Word } from '../src/types.ts';

const words = (text: string): Word[] => [{ text, x: 0, y: 0, width: 1, height: 1, line: 0 }];

test('passport assessment lists missing fields instead of treating partial redaction as complete', () => {
  const warnings = coverageWarnings(words('Passport'), ['mrz', 'face', 'full_name'], 'ID').join(' ');
  assert.match(warnings, /Passport number/);
  assert.match(warnings, /Issue date/);
  assert.match(warnings, /Passport security area/);
  const covered: Category[] = ['passport', 'issue_date', 'expiry_date', 'mrz', 'passport_security_area'];
  assert.deepEqual(coverageWarnings(words('Passport'), covered, 'ID'), []);
});

test('student and employee identifiers count as real identity numbers', () => {
  assert.deepEqual(coverageWarnings(words('Student ID'), ['full_name', 'student_number'], 'ID'), []);
  assert.deepEqual(coverageWarnings(words('Learner reference number'), ['full_name', 'learner_number'], 'ID'), []);
  assert.deepEqual(coverageWarnings(words('Employee ID'), ['full_name', 'employee_number'], 'ID'), []);
  for (const title of ['Student ID', 'Employee ID']) assert.deepEqual(coverageWarnings(words(title), ['full_name', 'identity_number'], 'ID'), []);
  assert.match(coverageWarnings(words('Student ID'), ['full_name'], 'ID').join(' '), /Student ID/);
});

test('license preset requires every selected field without requiring optional personal fields', () => {
  const warnings = coverageWarnings(words("Driver's license"), ['drivers_license', 'full_name'], 'ID').join(' ');
  assert.match(warnings, /Address, Signature area/);
  assert.deepEqual(coverageWarnings(words("Driver's license"), ['drivers_license', 'address', 'signature'], 'ID'), []);
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
