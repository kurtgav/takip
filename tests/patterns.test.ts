import assert from 'node:assert/strict';
import test from 'node:test';
import { detectPatterns, isLuhn } from '../src/pipeline/patterns.ts';
import { riskLevel } from '../src/pipeline/risk.ts';
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

test('unlabelled dates are not birthdays; spaced phone variants remain detected', () => {
  assert.deepEqual(detectPatterns(words([
    ['10/09/1998'],
    ['9', 'October', '1998'],
    ['09', '17', '123', '4567'],
    ['+63', '917', '123', '4567'],
  ])).map(({ category }) => category), ['phone', 'phone']);
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

const at = (text: string, x: number, y: number, width = 100, height = 12, line = 99): Word => ({ text, x, y, width, height, line });

test('geometry associates columns despite scrambled OCR line IDs', () => {
  const detections = detectPatterns([
    at('Date of Birth', 150, 10), at('Expiry Date', 300, 10), at('License No.', 0, 10),
    at('2030/03/14', 300, 30, 100, 14, 1), at('A01-23-456789', 0, 30, 100, 14, 9),
    at('1994/03/14', 150, 30, 100, 14, 0),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y }) => [category, x, y]), [
    ['drivers_license', 0, 30], ['birthday', 150, 30], ['expiry_date', 300, 30],
  ]);
});

test('compound name label covers whole name and address spans multiple rows', () => {
  const detections = detectPatterns([
    at('Last Name. First Name. Middle Name', 40, 10, 300),
    at('DELA CRUZ, LINA MAY SANTOS', 40, 30, 290),
    at('Address', 40, 60), at('17 Fiction Lane', 40, 80, 140),
    at('Cebu City', 40, 100, 110), at('License No.', 40, 130), at('A01-23-456789', 40, 150),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, y, height }) => [category, y, height]), [
    ['full_name', 30, 12], ['address', 80, 32], ['drivers_license', 150, 12],
  ]);
});

test('a single OCR substitution in an ID address label still anchors the whole address', () => {
  const detections = detectPatterns([
    at('Addrese', 40, 10), at('17 Fiction Lane', 40, 30), at('Cebu City', 40, 50),
    at('License No.', 40, 80), at('A01-23-456789', 40, 100),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, y, height }) => [category, y, height]), [['address', 30, 32], ['drivers_license', 100, 12]]);
});

test('license OCR punctuation and a missing number-label suffix still preserve the number', () => {
  const detections = detectPatterns([at('License', 40, 10), at('A01.23-456789', 40, 30)], 'ID');
  assert.deepEqual(detections.map(({ category, y }) => [category, y]), [['drivers_license', 30]]);
});

test('Philippine block and lot anchors preserve both address rows when the field label is unreadable', () => {
  const detections = detectPatterns([
    at('BLK. 2 LOT 17 FICTION HOMES', 40, 20, 250),
    at('BARANGAY HILLS, CEBU 6000', 40, 40, 250),
    at('License', 40, 70), at('A01.23-456789', 40, 90),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, y, height }) => [category, y, height]), [['address', 20, 32], ['drivers_license', 90, 12]]);
});

test('bilingual passport fields and OCR-confused identifiers keep their complete boxes', () => {
  const detections = detectPatterns([
    at('Apelyido / Surname', 150, 10, 170), at('DELA CRUZ', 150, 30),
    at('Pangalan / Given names', 150, 60, 170), at('LINA MAY', 150, 80),
    at('Passport No.', 350, 10), at('PO123456A', 350, 30),
    at('License No.', 350, 60), at('AO1-23-456789', 350, 80),
    at('Place of Birth', 150, 110), at('CEBU', 150, 130),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y }) => [category, x, y]), [
    ['full_name', 150, 30], ['passport', 350, 30], ['full_name', 150, 80],
    ['drivers_license', 350, 80], ['birthplace', 150, 130],
  ]);
});

test('MRZ covers both entire rows including fillers and split OCR tokens', () => {
  const detections = detectPatterns([
    at('P<PHLDELA<CRUZ<<LINA<MAY', 0, 10, 250), at('<<<<<<<<<<<<<<<<<<<<<', 255, 10, 180),
    at('P1234567<0PHL9403145F3003146<<<<<<<<<<<<<<00', 0, 30, 435),
  ]);
  assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [['mrz', 0, 435], ['mrz', 0, 435]]);
});

test('MRZ name matches and checked dates recover printed fields whose labels disappeared', () => {
  const detections = detectPatterns([
    at('LINA', 150, 50, 35), at('MAY', 190, 50, 30),
    at('I4', 150, 90, 20), at('M4R', 175, 90, 35), at('1994', 215, 90, 40),
    at('14', 150, 150, 20), at('MAR', 175, 150, 35), at('2030', 215, 150, 40),
    at('P<PHLDELA<CRUZ<<LINA<MAY<<<<<<<<<<<<<<<<<<', 0, 220, 435),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 0, 240, 435),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, y }) => [category, y]), [
    ['full_name', 50], ['expiry_date', 150], ['mrz', 220], ['mrz', 240],
  ]);
  // The alternate OCR pass reads a three-letter month imperfectly but retains the year.
  const recovered = detectPatterns([
    at('I4', 150, 90, 20), at('MAB', 175, 90, 35), at('1994', 215, 90, 40),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 0, 240, 435),
  ], 'ID');
  assert.deepEqual(recovered.map(({ category, y }) => [category, y]), [['birthday', 90], ['mrz', 240]]);
});

test('MRZ date recovery rejects bad check digits and conflicting printed dates', () => {
  const printed = [at('14', 150, 90, 20), at('MAR', 175, 90, 35), at('1994', 215, 90, 40)];
  assert.deepEqual(detectPatterns([...printed, at('P1234567<0PHL9403145F3003146<<<<<<<<<<<<<<00', 0, 240, 435)], 'ID')
    .map(({ category }) => category), ['mrz']);
  assert.deepEqual(detectPatterns([
    at('15', 150, 90, 20), at('MAR', 175, 90, 35), at('1994', 215, 90, 40),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 0, 240, 435),
  ], 'ID').map(({ category }) => category), ['mrz']);
});

test('Philippine passport security area derives bounds from the top-right number and two MRZ rows', () => {
  const detections = detectPatterns([
    at('P1234567', 320, 30, 90, 15),
    at('P<PHLDELA<CRUZ<<LINA<MAY<<<<<<<<<<<<<<<<<<', 10, 250, 440, 15),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 10, 275, 440, 15),
  ], 'ID');
  const security = detections.find(box => box.category === 'passport_security_area');
  assert.ok(security);
  assert.deepEqual({ x: security.x, y: security.y, width: security.width, height: security.height },
    { x: 275, y: 30, width: 175, height: 220 });
  assert.equal(security.enabled, true);
});

test('passport security area requires Philippine country code, both MRZ rows and the right-side number anchor', () => {
  const first = at('P<PHLDELA<CRUZ<<LINA<MAY<<<<<<<<<<<<<<<<<<', 10, 250, 440, 15);
  const second = at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 10, 275, 440, 15);
  const number = at('P1234567', 320, 30, 90, 15);
  for (const input of [
    [number, { ...first, text: first.text.replace('PHL', 'UTO') }, { ...second, text: second.text.replace('PHL', 'UTO') }],
    [number, first], [first, second], [{ ...number, x: 20 }, first, second],
  ]) assert.ok(!detectPatterns(input, 'ID').some(box => box.category === 'passport_security_area'));
});

test('a tall OCR artifact beside the label cannot move the name value before its label', () => {
  const detections = detectPatterns([
    at('?', 38, 98, 10, 25), at('Pangalan / Given names', 193, 100, 130, 6),
    at('LINA', 193, 108, 30, 9), at('MAY', 233, 102, 35, 16),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width, height }) => [category, x, y, width, height]), [['full_name', 193, 102, 75, 16]]);
});

test('signature area requires ID context and an actual signature label', () => {
  const input = [at('Signature of holder', 80, 90, 130)];
  assert.equal(detectPatterns(input, 'Unknown').length, 0);
  const detection = detectPatterns(input, 'ID')[0];
  assert.equal(detection.category, 'signature');
  assert.ok(detection.y < 90 && detection.y + detection.height > 102);
  assert.ok(detection.x <= 80 && detection.x + detection.width >= 210);
  assert.equal(detectPatterns([at('LINA MAY', 80, 90)], 'ID').length, 0);
});

test('issue, expiry, receipt, and unlabelled dates are never reported as birthdays', () => {
  const detections = detectPatterns(words([
    ['Date', 'of', 'Issue', '2020/03/14'], ['Expiry', 'Date', '2030/03/14'],
    ['Receipt', 'Date', '2026/03/14'], ['2026/03/15'],
  ]), 'Unknown');
  assert.deepEqual(detections.map(({ category }) => category), ['issue_date', 'expiry_date']);
});

test('receipt merchant metadata, logo, menu, and footer do not create personal risks', () => {
  const detections = detectPatterns(words([
    ['OFFICIAL', 'RECEIPT'], ['SUNRISE', 'KITCHEN'], ['Address', '42', 'Fiction', 'Street'],
    ['TIN', '123-456-789-000'], ['Terminal', '4111111111111111'],
    ['Order', '123456789012'], ['Reference', '1234567890123456'],
    ['VEGGIE', 'BURGER', '199.00'], ['Name', 'OF', 'BUSINESS'],
    ['Accreditation', '123456789012345'], ['2026/03/14'], ['VAT', 'CASH', 'CHANGE'],
  ]));
  assert.equal(riskLevel(detections.map(item => item.category)), 'Low');
  assert.deepEqual(detections, []);
});

test('receipt customer identity, payment card, account, phone and email stay protected', () => {
  const detections = detectPatterns(words([
    ['OFFICIAL', 'RECEIPT'], ['VAT', 'Cash', 'Change'],
    ['Customer', 'Name', 'Lina', 'Cruz'], ['Customer', 'Address', '17', 'Fiction', 'Lane'],
    ['Card', '4111', '1111', '1111', '1111'], ['Account', '123456789012'],
    ['Phone', '0917-234-5678'], ['Email', 'lina@example.test'],
  ]));
  assert.deepEqual(detections.map(({ category }) => category), ['full_name', 'address', 'card_number', 'account_number', 'phone', 'email']);
  assert.equal(riskLevel(detections.map(item => item.category)), 'High');
});

test('masked card on receipt is still sensitive while generic long numbers are suppressed', () => {
  const detections = detectPatterns(words([['Card', '****', '****', '****', '1234'], ['1234567890123456']]), 'Receipt');
  assert.deepEqual(detections.map(({ category, width }) => [category, width]), [['card_number', 350]]);
});
