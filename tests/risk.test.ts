import assert from 'node:assert/strict';
import test from 'node:test';
import { riskLevel, templateSummary } from '../src/pipeline/risk.ts';
import type { Category } from '../src/types.ts';

test('rates direct identifiers, financial details, and QR codes High', () => {
  const high: Category[] = [
    'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig',
    'drivers_license', 'passport', 'mrz', 'passport_security_area', 'card_number', 'account_number', 'qr_code',
  ];
  for (const category of high) assert.equal(riskLevel([category]), 'High', category);
});

test('rates dangerous identity combinations High', () => {
  assert.equal(riskLevel(['full_name', 'birthday']), 'High');
  assert.equal(riskLevel(['full_name', 'address']), 'High');
  assert.equal(riskLevel(['full_name', 'signature']), 'High');
});

test('rates specified and conservative combinations Medium', () => {
  assert.equal(riskLevel(['address']), 'Medium');
  assert.equal(riskLevel(['full_name', 'phone']), 'Medium');
  assert.equal(riskLevel(['face', 'full_name']), 'Medium');
  assert.equal(riskLevel(['digits']), 'Medium');
  assert.equal(riskLevel(['signature']), 'Medium');
  assert.equal(riskLevel(['email', 'phone']), 'Medium');
});

test('rates zero or one minor category Low and ignores duplicates/manual covers', () => {
  assert.equal(riskLevel([]), 'Low');
  assert.equal(riskLevel(['manual']), 'Low');
  assert.equal(riskLevel(['email']), 'Low');
  assert.equal(riskLevel(['email', 'email', 'manual']), 'Low');
});

test('zero-detection summary is cautious and asks for manual review', () => {
  const summary = templateSummary(['manual']);
  assert.match(summary, /nothing sensitive was detected/i);
  assert.match(summary, /does not guarantee/i);
  assert.match(summary, /review/i);
  assert.ok(summary.split(/[.!?](?:\s|$)/).filter(Boolean).length <= 3);
});

test('summary deduplicates labels, excludes manual, and stays within three sentences', () => {
  const summary = templateSummary(['full_name', 'birthday', 'full_name', 'manual']);
  assert.equal((summary.match(/Full name/g) ?? []).length, 1);
  assert.equal((summary.match(/Birthday/g) ?? []).length, 1);
  assert.doesNotMatch(summary, /Manual cover/);
  assert.match(summary, /identity theft/i);
  assert.match(summary, /review/i);
  assert.ok(summary.split(/[.!?](?:\s|$)/).filter(Boolean).length <= 3);
});

test('summary mentions only supplied category labels', () => {
  const summary = templateSummary(['phone']);
  assert.match(summary, /Phone number/);
  assert.doesNotMatch(summary, /Full name|Address|Birthday|ID number|Account number|QR code/);
});
