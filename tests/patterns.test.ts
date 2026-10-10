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

test('bare long numbers stay generic unless they validate as a payment card', () => {
  assert.deepEqual(detectPatterns(words([
    ['4111111111111111'],
    ['1234567890123456'],
    ['123456789012'],
    ['1234567890123456789'],
  ])).map(({ category }) => category), [
    'card_number', 'digits', 'digits', 'digits',
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

test('passport-shaped references require passport labels or MRZ evidence', () => {
  for (const document of ['Unknown', 'ID', 'Receipt'] as const) {
    assert.deepEqual(detectPatterns(words([['AB1234567']]), document), []);
  }
  assert.deepEqual(detectPatterns(words([['Reference', 'AB1234567']]), 'Unknown')
    .map(({ category, enabled }) => [category, enabled]), [['reference', false]]);
  assert.deepEqual(detectPatterns(words([['Passport', 'No', 'AB1234567']]), 'ID')
    .map(({ category }) => category), ['passport']);
  assert.deepEqual(detectPatterns(words([['Order', 'AB1234567']]), 'Receipt'), []);
});

const at = (text: string, x: number, y: number, width = 100, height = 12, line = 99): Word => ({ text, x, y, width, height, line });

test('unlabeled passport birthplace is not invented as a residential address', () => {
  const detections = detectPatterns([at('TEST CITY', 150, 80), at('P<PHLSAMPLE<<ALEXIS<<<<<<<<<<<<<<<<<<<<<<<<<', 0, 220, 435), at('P0000000<5PHL9001011F3512311<<<<<<<<<<<<<<08', 0, 240, 435)], 'ID');
  assert.equal(detections.some(box => box.category === 'address'), false);
});

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

test('unlabelled address inference ignores uncertain OCR cues and unreadable companion words', () => {
  const noise = [
    { ...at('St', 20, 20, 15), confidence: 58 },
    { ...at('rnv', 40, 20, 25), confidence: 31 },
    { ...at('ii', 70, 20, 15), confidence: 14 },
  ];
  assert.deepEqual(detectPatterns(noise, 'Unknown'), []);
  assert.deepEqual(detectPatterns([{ ...noise[0], confidence: 95 }, ...noise.slice(1)], 'Unknown'), []);
  const address = words([['42', 'Fiction', 'Street']]).map(word => ({ ...word, confidence: 95 }));
  assert.deepEqual(detectPatterns(address, 'Unknown').map(({ category, x, width }) => [category, x, width]), [['address', 0, 260]]);
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
    { x: 312.5, y: 52.5, width: 137.5, height: 197.5 });
  const number = detections.find(box => box.category === 'passport')!;
  assert.ok(security.y > number.y + number.height + 6, 'three-pixel padding on each box must not join the number to security print');
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

test('passport security bounds include confirmed repeated fields beyond the MRZ right edge', () => {
  const detections = detectPatterns([
    at('P1234567', 320, 30, 90, 15), at('SANTOS', 480, 90, 95), at('P1234567', 500, 130, 90),
    at('ISSUER', 700, 170, 100),
    at('P<PHLSANTOS<<LINA<MAY<<<<<<<<<<<<<<<<<<<<', 10, 250, 440, 15),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 10, 275, 440, 15),
  ], 'ID');
  const security = detections.find(box => box.category === 'passport_security_area')!;
  assert.equal(security.x + security.width, 590);
  assert.ok(security.y > 45, 'the primary number retains its separate box');
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

test('licensee signature estimate stays above its label and away from neighboring fields', () => {
  const detections = detectPatterns([
    at('Signature of Licensee', 30, 120, 125, 12),
    at('DL Codes', 190, 100, 65), at('A, B', 190, 120, 50),
  ], 'ID');
  const signature = detections.find(box => box.category === 'signature')!;
  assert.deepEqual([signature.x, signature.y, signature.width, signature.height], [27, 96, 131, 20]);
  assert.ok(signature.y + signature.height + 3 < 120, 'padding must leave the signature label visible');
  assert.ok(signature.x + signature.width < 190);
});

test('missing license number is estimated only from independent licensee, left-column and expiry anchors', () => {
  const fixture = [at('Full name', 250, 20, 120), at('ALEXIS SANTOS', 250, 42, 140),
    at('Expiration Date', 430, 120, 120), at('Signature of Licensee', 40, 260, 140)];
  const number = detectPatterns(fixture, 'ID').find(box => box.category === 'drivers_license')!;
  assert.equal(number.estimated, true);
  assert.deepEqual([number.x, number.y, number.width, number.height], [244, 135, 180, 24]);
  for (const absent of [0, 2, 3]) assert.ok(!detectPatterns(fixture.filter((_, index) => index !== absent), 'ID')
    .some(box => box.category === 'drivers_license'));
  assert.ok(!detectPatterns(fixture, 'Unknown').some(box => box.category === 'drivers_license'));
});

test('labeled license OCR tolerates split groups and digit-shaped letters', () => {
  const detections = detectPatterns(words([['License', 'No.'], ['A01–23–', '4S6789']]), 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width, estimated }) => [category, x, y, width, estimated]),
    [['drivers_license', 0, 30, 170, undefined]]);
});

test('an inline address value continues below without consuming following license fields', () => {
  const detections = detectPatterns([
    at('Address', 10, 10, 65), at('17 Fiction Lane', 90, 10, 130),
    at('Cebu City', 90, 30, 90), at('License No.', 90, 60), at('A01-23-456789', 90, 80),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width, height }) => [category, x, y, width, height]),
    [['address', 90, 10, 130, 32], ['drivers_license', 90, 80, 100, 12]]);
});

test('address bounds stop before a neighboring license heading even when OCR value boxes are tall', () => {
  const input = [at('Address', 30, 10, 70, 10),
    at('17 Fiction Lane', 30, 25, 240, 14), at('Cebu City', 30, 43, 240, 30),
    at('License No.', 30, 69, 90, 10), at('Expiry Date', 165, 67, 100, 10),
    at('A01-23-456789', 30, 84, 120), at('2030/03/14', 165, 84, 100)];
  const address = detectPatterns(input, 'ID').find(box => box.category === 'address')!;
  assert.ok(address.y >= 24);
  assert.equal(address.y + address.height, 63);
  assert.ok(address.y + address.height + 3 < 67, 'export padding must leave the expiry heading visible');
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

test('receipt merchant rows still protect validated customer contact and card details', () => {
  const detections = detectPatterns(words([
    ['Email', 'lina@example.test', 'Order', '123'],
    ['Phone', '0917-234-5678', 'Terminal', '7'],
    ['Order', '123', '4111', '1111', '1111', '1111'],
    ['TIN', '123-456-789-000'], ['Reference', '1234567890123456'],
  ]), 'Receipt');
  assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [
    ['email', 90, 80], ['phone', 90, 80], ['card_number', 180, 350],
  ]);
});

test('receipt merchant labels suppress phone-shaped merchant values', () => {
  const detections = detectPatterns(words([
    ['Terminal', '0917-234-5678'], ['Order', '0917-234-5678'], ['Reference', '0917-234-5678'],
    ['Order', 'No.', '0917-234-5678'], ['Terminal', 'ID', '0917-234-5678'],
    ['Reference', 'Number', '4111111111111111'], ['Receipt', 'No.', '4111111111111111'],
    ['Invoice', 'Number', '4111111111111111'], ['Transaction', 'ID', '4111111111111111'],
  ]), 'Receipt');
  assert.deepEqual(detections, []);
});

test('masked card on receipt is still sensitive while generic long numbers are suppressed', () => {
  const detections = detectPatterns(words([['Card', '****', '****', '****', '1234'], ['1234567890123456']]), 'Receipt');
  assert.deepEqual(detections.map(({ category, width }) => [category, width]), [['card_number', 350]]);
});

test('damaged bilingual name labels exclude every label fragment and keep the middle name', () => {
  const detections = detectPatterns([
    at('Pangalan/G', 100, 20, 90), at('LINA', 100, 40, 45), at('MAY', 155, 40, 40),
    at('Panggitnang', 100, 70, 100), at('apetyido/Middie', 210, 70, 110), at('nome', 330, 70, 35),
    at('SANTOS', 100, 92, 80),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width }) => [category, x, y, width]), [
    ['full_name', 100, 40, 95], ['full_name', 100, 92, 80],
  ]);
});

test('short real names are not fuzzy field labels', () => {
  for (const name of ['NATE', 'CARL', 'TATE']) {
    const detections = detectPatterns(words([['Full', 'Name', name, 'SANTOS']]), 'ID');
    assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [['full_name', 180, 170]], name);
  }
});

test('values on a mixed next row stop at a neighboring field label', () => {
  const detections = detectPatterns([
    at('First name', 20, 10), at('Sex', 180, 10, 30),
    at('LINA', 20, 30, 55), at('F', 180, 30, 10), at('Nationality', 240, 30, 90),
    at('FILIPINO', 240, 50, 90),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y }) => [category, x, y]), [
    ['full_name', 20, 30], ['sex', 180, 30], ['nationality', 240, 50],
  ]);
});

test('small OCR column drift does not merge neighboring identity and medical fields', () => {
  const detections = detectPatterns([
    at('Full Name', 55, 10, 120), at('License No.', 625, 10, 110),
    at('CASEY SAMPLE', 55, 32, 180), at('A01-23-456789', 623, 32, 170),
    at('Blood Type', 55, 70, 100), at('Conditions', 625, 70, 110),
    at('AB+', 55, 92, 45), at('NONE', 625, 92, 60),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x }) => [category, x]), [
    ['full_name', 55], ['drivers_license', 623], ['medical_details', 55], ['medical_details', 625],
  ]);
});

test('adjacent name-part labels cover the continuous name row including intervening tokens', () => {
  const detections = detectPatterns([
    at('Last Name.', 80, 10, 90), at('First Name.', 175, 10, 95), at('Middle Name.', 275, 10, 110),
    at('SANTOS,', 80, 32, 80), at('ALEXIS', 175, 32, 75), at('MAY', 255, 32, 45), at('REYES', 310, 32, 70),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width }) => [category, x, y, width]), [['full_name', 80, 32, 300]]);
});

test('damaged translated birthplace label anchors the complete left-aligned value', () => {
  const detections = detectPatterns([
    at('Lugar', 80, 10, 45), at('gan', 160, 10, 25), at('akan/', 195, 10, 45),
    at('Ploce', 250, 10, 45), at('of', 305, 10, 15), at('birth', 330, 10, 45),
    at('CEBU', 80, 32, 60), at('CITY', 165, 32, 60),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width }) => [category, x, y, width]), [['birthplace', 80, 32, 145]]);
});

test('labeled school and employee fields distinguish institution metadata', () => {
  const detections = detectPatterns(words([
    ['School', 'ID', '123456'], ['School', 'Name', 'SAMPLE', 'ACADEMY'],
    ['Student', 'ID', 'ST-2026-018'], ['LRN', '123456789012'],
    ['Course', 'BS', 'COMPUTER', 'SCIENCE'], ['Employee', 'ID', 'EMP-0214'],
    ['Job', 'Title', 'DESIGNER'], ['Department', 'OPERATIONS'],
  ]), 'ID');
  assert.deepEqual(detections.map(({ category, x }) => [category, x]), [
    ['student_number', 180], ['learner_number', 90], ['education', 90],
    ['employee_number', 180], ['employment_details', 180], ['employment_details', 90],
  ]);
});

test('generic ID number labels protect short holder IDs without relabeling school or receipt metadata', () => {
  for (const title of ['STUDENT ID', 'EMPLOYEE ID']) for (const label of ['ID No.', 'ID Number', 'Identification Number']) {
    const detections = detectPatterns([at(title, 10, 0, 160), at(label, 10, 50, 150), at('A-1234', 10, 72, 80)]);
    assert.deepEqual(detections.map(({ category, x, y, width }) => [category, x, y, width]), [['identity_number', 10, 72, 80]]);
  }
  for (const label of ['School ID', 'School ID Number', 'School ID No.']) {
    assert.deepEqual(detectPatterns([at(label, 10, 10, 150), at('123456', 10, 32, 80)], 'ID'), []);
  }
  assert.deepEqual(detectPatterns(words([['ID', 'No.', 'UNKNOWN']]), 'ID'), []);
  assert.deepEqual(detectPatterns(words([['ID', 'Number', '123456']]), 'Receipt'), []);
});

test('government department headings are not employee details and medical values stop at field boundaries', () => {
  const detections = detectPatterns([
    ...words([['DEPARTMENT', 'OF', 'TRANSPORTATION']]),
    at('Blood Type', 20, 50, 90), at('Eyes Color', 190, 50, 90),
    at('BROWN', 190, 70, 80),
    at('Conditions', 20, 100, 90), at('DL Codes', 190, 100, 90),
    at('NONE', 20, 120, 50), at('A, B', 190, 120, 50),
    at('Official Signature', 190, 160, 150),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width }) => [category, x, y, width]), [['medical_details', 20, 120, 50]]);
});

test('signature OCR beside a medical label cannot displace its printed value below', () => {
  const detections = detectPatterns([
    at('Blood Type', 20, 50, 75, 10), at('Eyes Color', 180, 50, 75, 10),
    at('-', 40, 70, 5, 3), at('BROWN', 180, 70, 55, 12),
    at('Conditions', 180, 100, 75, 10),
    { ...at('scribble', 300, 75, 80, 55), confidence: 20 },
    at('NONE', 180, 118, 45, 12),
    at('OFFICER', 390, 118, 65, 12),
  ], 'ID');
  assert.deepEqual(detections.map(({ category, x, y, width, height }) => [category, x, y, width, height]), [['medical_details', 180, 118, 45, 12]]);
});

test('payment labels protect PAN despite an OCR checksum error, CVV, short expiry and cardholder', () => {
  const detections = detectPatterns(words([
    ['Card', 'Number', '4111', '1111', '1111', '1112'], ['CVV', '123'],
    ['Expiry', 'Date', '08/29'], ['Cardholder', 'Name', 'LINA', 'SANTOS'],
    ['Account', 'Number', '123456789012'], ['OTP', '654321'],
  ]), 'Payment card');
  assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [
    ['card_number', 180, 350], ['card_security_code', 90, 80], ['expiry_date', 180, 80],
    ['full_name', 180, 170], ['account_number', 180, 80], ['payment_secret', 90, 80],
  ]);
  assert.deepEqual(detectPatterns(words([['123'], ['08/29']]), 'Unknown'), []);
});

test('payment-card expiry aliases work in card context', () => {
  for (const label of ['VALID THRU', 'VALID THROUGH', 'GOOD THRU', 'EXPIRES']) {
    assert.deepEqual(detectPatterns([at(label, 10, 10), at('12/29', 10, 30)], 'Payment card')
      .map(({ category, x, y }) => [category, x, y]), [['expiry_date', 10, 30]], label);
    assert.deepEqual(detectPatterns([at(label, 10, 10), at('12/29', 10, 30)], 'Receipt'), []);
  }
});

test('joined CVV OCR alias needs payment evidence and bank name stays institutional', () => {
  const code = words([['CW', '123']]);
  assert.deepEqual(detectPatterns(code, 'Unknown'), []);
  assert.deepEqual(detectPatterns(code, 'ID'), []);
  assert.deepEqual(detectPatterns(code, 'Payment card').map(({ category, x }) => [category, x]), [['card_security_code', 90]]);
  assert.deepEqual(detectPatterns(words([['Card', 'Number', '4111111111111111'], ['CW', '123']]), 'Unknown')
    .map(({ category }) => category), ['card_number', 'card_security_code']);
  assert.deepEqual(detectPatterns(words([['Bank', 'Name', 'SAMPLE', 'BANK']]), 'Payment card'), []);
});

test('labeled truncated PAN keeps its full printed box without asserting short unlabelled numbers are cards', () => {
  for (const values of [['4111', '1111'], ['4111', '1111', '1111']]) {
    const detections = detectPatterns(words([['Card', 'Number', ...values]]), 'Payment card');
    assert.deepEqual(detections.map(({ category, x, width }) => [category, x, width]), [['card_number', 180, values.length * 90 - 10]]);
    assert.ok(!detectPatterns(words([values]), 'Unknown').some(box => box.category === 'card_number'));
  }
});

test('government number labels disambiguate identical twelve-digit values', () => {
  const detections = detectPatterns(words([
    ['SS', 'No', '1234567890'], ['CRN', '123456789012'], ['TIN', '123456789'],
    ['MID', '123456789012'], ['PhilHealth', 'PIN', '123456789012'],
    ['PSN', '123456789012'], ['PCN', '1234567890123456'], ['RTN', '123456789012'],
    ['MP2', 'Account', '123456789012'], ['GSIS', 'Number', 'BP-1234567890'],
    ['Agency', 'Code', 'N01'], ['Blood', 'Type', 'O+'],
  ]), 'ID');
  assert.deepEqual(detections.map(({ category }) => category), [
    'sss', 'umid', 'tin', 'pagibig', 'philhealth', 'philsys_number', 'philsys_number', 'pagibig_rtn',
    'account_number', 'government_number', 'agency_code', 'medical_details',
  ]);
  assert.equal(detections.find(box => box.category === 'agency_code')?.enabled, false);
  assert.deepEqual(detectPatterns(words([['1234-5678-9012'], ['1234-5678-9012-3456']]), 'Unknown')
    .map(({ category }) => category), ['digits', 'digits']);
});

test('Philippine passport zones survive missing number OCR with independent title and name anchors', () => {
  const detections = detectPatterns([
    at('PASAPORTE/', 20, 10, 100),
    at('Surname', 180, 45), at('SANTOS', 180, 65),
    at('Given names', 180, 90), at('LINA MAY', 180, 110),
    at('P<PHLSANTOS<<LINA<MAY<<<<<<<<<<<<<<<<<<<<', 10, 250, 500, 15),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 10, 275, 500, 15),
  ], 'ID');
  for (const category of ['passport_security_area', 'passport_portrait_area']) {
    const area = detections.find(box => box.category === category);
    assert.ok(area?.enabled);
    assert.equal(area.y, 22);
    assert.equal(area.y + area.height, 250);
  }
  assert.equal(detections.find(box => box.category === 'passport_portrait_area')?.width, 170);
});

test('checked MRZ dates support a single intervening OCR-damaged issue date', () => {
  const fixture = [
    at('14', 150, 70, 20), at('MAR', 175, 70, 35), at('1994', 215, 70, 40),
    at('13', 150, 110, 20), at('MAR', 175, 110, 35), at('2D2O', 215, 110, 40),
    at('14', 150, 160, 20), at('MAR', 175, 160, 35), at('2030', 215, 160, 40),
    at('P<PHLSANTOS<<LINA<MAY<<<<<<<<<<<<<<<<<<<<', 0, 220, 435),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 0, 240, 435),
  ];
  assert.deepEqual(detectPatterns(fixture, 'ID').filter(box => box.category.endsWith('date') || box.category === 'birthday')
    .map(({ category, y }) => [category, y]), [['birthday', 70], ['issue_date', 110], ['expiry_date', 160]]);
  assert.ok(!detectPatterns([...fixture, at('2021/01/01', 150, 135)], 'ID').some(box => box.category === 'issue_date'));
});

test('Philippine passport issue estimate uses the preceding date when birth OCR is missing', () => {
  const fixture = [
    at('15', 150, 110, 20, 20), at('JAN', 175, 110, 35, 20), at('2', 215, 110, 8, 20), at('D025', 225, 110, 40, 20),
    at('14', 150, 160, 20, 20), at('MAR', 175, 160, 35, 20), at('2030', 215, 160, 50, 20),
    at('P<PHLSANTOS<<LINA<MAY<<<<<<<<<<<<<<<<<<<<', 0, 220, 435),
    at('P1234567<0PHL9403143F3003149<<<<<<<<<<<<<<00', 0, 240, 435),
  ];
  const issue = detectPatterns(fixture, 'ID').find(box => box.category === 'issue_date');
  assert.ok(issue?.estimated);
  assert.deepEqual([issue.x, issue.y, issue.width, issue.height], [150, 110, 115, 20]);
  assert.ok(!detectPatterns(fixture.slice(0, -1), 'ID').some(box => box.category === 'issue_date'));
  const ambiguous = [...fixture, at('16', 150, 135, 20), at('FEB', 175, 135, 35), at('2025', 215, 135, 40)];
  assert.ok(!detectPatterns(ambiguous, 'ID').some(box => box.category === 'issue_date'));
});
