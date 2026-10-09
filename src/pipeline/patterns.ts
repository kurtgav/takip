import type { Box, Category, Detection, DocumentGuess, Word } from '../types.ts';
import { guessDocument } from './document.ts';

type IndexedWord = Word & { index: number };
const union = (items: Box[]) => {
  const x = Math.min(...items.map(item => item.x));
  const y = Math.min(...items.map(item => item.y));
  return { x, y, width: Math.max(...items.map(item => item.x + item.width)) - x,
    height: Math.max(...items.map(item => item.y + item.height)) - y };
};
const digits = (value: string) => value.replace(/\D/g, '');
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const oneEditApart = (a: string, b: string): boolean => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let left = 0; let right = 0; let edits = 0;
  while (left < a.length && right < b.length) {
    if (a[left] === b[right]) { left++; right++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) left++;
    if (b.length >= a.length) right++;
  }
  return edits + Number(left < a.length || right < b.length) <= 1;
};
const datePattern = /^(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4})$/i;
const labeledDate = (value: string) => datePattern.test(value) || (/^[0-9A-Z/-]{6,12}$/i.test(value) && digits(value).length >= 6 && value.replace(/[^a-z]/gi, '').length <= 2);

export function isLuhn(value: string): boolean {
  const number = digits(value);
  if (number.length < 12 || number.length > 19 || /^0+$/.test(number)) return false;
  let sum = 0;
  let double = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (double) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

const identifierPatterns: Array<[Category, RegExp]> = [
  ['philsys_number', /^\d{4}-\d{4}-\d{4}-\d{4}$/],
  ['tin', /^\d{3}-\d{3}-\d{3}(?:-\d{3})?$/],
  ['sss', /^\d{2}-\d{7}-\d$/], ['umid', /^\d{4}-\d{7}-\d$/],
  ['philhealth', /^\d{2}-\d{9}-\d$/], ['pagibig', /^\d{4}-\d{4}-\d{4}$/],
  ['drivers_license', /^[A-Z]\d{2}-\d{2}-\d{6}$/i],
  ['passport', /^[A-Z]{1,2}\d{7}[A-Z]?$/i],
  ['phone', /^(?:\+63|0)9\d{2}-?\d{3}-?\d{4}$/],
];
type Rule = { labels: string[]; category?: Category; validate?: (value: string) => boolean; enabled?: boolean; customer?: boolean };
const personalText = (value: string) => /[a-z]/i.test(value) && !/\b(?:authority|department|government|office|agency|republic)\b/i.test(value);
const receiptMerchantLabel = '(?:tin|vat reg|terminal|order|receipt|invoice|transaction|reference|ref|merchant|permit|accreditation|serial|machine|cashier)';
const receiptMerchantRow = new RegExp(`\\b${receiptMerchantLabel}(?: no| number| id)?\\b`, 'i');
const receiptMerchantPrefix = new RegExp(`(?:^| )${receiptMerchantLabel}(?: no| number| id)?$`);
const labelRules: Rule[] = [
  { labels: ['date of birth', 'birth date', 'birthday', 'dob', 'petsa ng kapanganakan', 'kapanganakan'], category: 'birthday', validate: labeledDate },
  { labels: ['expiration date', 'expiry date', 'date of expiry', 'date of expiration', 'valid until', 'petsa ng pagkapaso'], category: 'expiry_date', validate: value => datePattern.test(value) },
  { labels: ['date of issue', 'issue date', 'date issued', 'petsa ng pagkakaloob'], category: 'issue_date', validate: value => datePattern.test(value) },
  { labels: ['place of birth', 'birthplace', 'pook ng kapanganakan'], category: 'birthplace', validate: personalText },
  { labels: ['customer name', 'customer', 'sold to', 'bill to', 'billed to', 'ship to'], category: 'full_name', validate: personalText, customer: true },
  { labels: ['customer address', 'billing address', 'shipping address', 'delivery address'], category: 'address', validate: personalText, customer: true },
  { labels: ['first name', 'given names', 'given name', 'middle name', 'last name', 'last name first name middle', 'surname', 'full name', 'name', 'pangalan', 'apelyido', 'gitnang pangalan', 'panggitnang apelyido'], category: 'full_name', validate: personalText },
  { labels: ['address', 'tirahan', 'city', 'province'], category: 'address', validate: personalText },
  { labels: ['license no', 'license number', 'licence no', 'licence number', 'license', 'licence'], category: 'drivers_license', validate: value => /^[A-Z0-9][0-9OIL]{2}[-. ]?[0-9OIL]{2}[-. ]?[0-9OIL]{6}$/i.test(value.trim()) },
  { labels: ['passport no', 'passport number', 'pasaporte blg'], category: 'passport', validate: value => /^[A-Z]{1,2}[0-9OIL]{7}[A-Z]?$/i.test(value.replace(/\s/g, '')) },
  { labels: ['account number', 'account no', 'account'], category: 'account_number', validate: value => digits(value).length >= 9 },
  { labels: ['card number', 'card no', 'card'], category: 'card_number', validate: value => isLuhn(value) || /(?:[*xX•]{2,}[ -]*)+\d{4}$/.test(value) },
  { labels: ['reference number', 'reference no', 'ref no', 'reference'], category: 'reference', validate: value => digits(value).length >= 6, enabled: false },
  { labels: ['signature of holder', 'signature', 'lagda', 'holder s signature'], category: 'signature' },
  // Field boundaries stop a neighboring value from being mistaken for a name/address.
  { labels: ['nationality', 'nasyonalidad', 'sex', 'kasarian', 'height', 'weight', 'blood type', 'restrictions', 'conditions', 'agency code', 'issuing authority', 'issuing office', 'country code', 'type', 'date', 'transaction date', 'receipt date', 'tin', 'terminal', 'order', 'merchant', 'cashier'] },
];
const labelPhrases = labelRules.flatMap(rule => rule.labels.map(label => ({ rule, parts: label.split(' ') })))
  .sort((a, b) => b.parts.length - a.parts.length);

type Label = { rule: Rule; start: number; end: number; x: number; right: number };
const findLabels = (row: IndexedWord[], identityDocument = false): Label[] => {
  const tokens = row.flatMap((word, index) => normalize(word.text).split(' ').filter(Boolean).map(text => {
    // A single OCR edit in these long ID labels is common on photographed cards.
    const corrected = identityDocument ? ['address', 'nationality'].find(label => oneEditApart(text, label)) : undefined;
    return { text: corrected ?? text, index };
  }));
  const labels: Label[] = [];
  for (let index = 0; index < tokens.length;) {
    const match = labelPhrases.find(({ parts }) => parts.every((part, offset) => tokens[index + offset]?.text === part)
      && (!['city', 'province'].includes(parts[0]) || index === 0));
    if (!match) { index += 1; continue; }
    const start = tokens[index].index;
    const end = tokens[index + match.parts.length - 1].index + 1;
    const previous = labels.at(-1);
    // Adjacent name parts or bilingual duplicates form one label for one value row.
    if (previous && previous.rule.category === match.rule.category && match.rule.category !== undefined && start <= previous.end) {
      previous.end = end;
      previous.right = row[end - 1].x + row[end - 1].width;
    } else labels.push({ rule: match.rule, start, end, x: row[start].x, right: row[end - 1].x + row[end - 1].width });
    index += match.parts.length;
  }
  return labels;
};

/** OCR line IDs can describe reading order or separate columns; use physical rows instead. */
const geometricRows = (words: IndexedWord[]): IndexedWord[][] => {
  const rows: IndexedWord[][] = [];
  for (const word of words.toSorted((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.findLast(items => {
      const anchor = items[0];
      return Math.abs(word.y + word.height / 2 - anchor.y - anchor.height / 2) <= Math.min(word.height, anchor.height) * 0.55;
    });
    if (row) row.push(word); else rows.push([word]);
  }
  const center = (row: IndexedWord[]) => row.map(word => word.y + word.height / 2).sort((a, b) => a - b)[Math.floor(row.length / 2)];
  return rows.toSorted((a, b) => center(a) - center(b)).map(row => row.toSorted((a, b) => a.x - b.x));
};

export function detectPatterns(words: Word[], documentGuess: DocumentGuess = guessDocument(words)): Detection[] {
  const indexed = words.map((word, index) => ({ ...word, index }));
  const rows = geometricRows(indexed);
  const labelsByRow = rows.map(row => findLabels(row, documentGuess === 'ID'));
  const receipt = documentGuess === 'Receipt';
  const detections: Detection[] = [];
  const claimed = new Set<number>();
  const blocked = new Set<number>();
  const mrzNames = new Set<string>();
  let philippinePassport = false;
  const mrzDates: Array<{ category: 'birthday' | 'expiry_date'; value: string }> = [];
  const add = (category: Category, items: IndexedWord[], enabled = true) => {
    const available = items.filter(item => !claimed.has(item.index));
    if (!available.length) return;
    available.forEach(item => claimed.add(item.index));
    detections.push({ id: `pattern-${category}-${available.map(item => item.index).join('-')}`, category, enabled, ...union(available) });
  };

  for (const row of rows) {
    const compact = row.map(word => word.text).join('').replace(/[«‹]/g, '<').replace(/\s/g, '');
    if (compact.length >= 20 && /<{2}/.test(compact) && /^[A-Z0-9<]+$/i.test(compact)) {
      add('mrz', row);
      if (/^P<[A-Z]{3}/i.test(compact)) {
        philippinePassport ||= /^P<PHL/i.test(compact);
        for (const name of compact.slice(5).toUpperCase().split('<')) if (name.length >= 3) mrzNames.add(name);
      } else if (/^[A-Z0-9<]{9}\d[A-Z<]{3}\d{7}[MF<]\d{7}/i.test(compact)) {
        for (const [category, offset] of [['birthday', 13], ['expiry_date', 21]] as const) {
          const value = compact.slice(offset, offset + 6);
          const checksum = [...value].reduce((sum, digit, index) => sum + Number(digit) * [7, 3, 1][index % 3], 0) % 10;
          if (checksum === Number(compact[offset + 6]) && Number(value.slice(2, 4)) >= 1 && Number(value.slice(2, 4)) <= 12
            && Number(value.slice(4)) >= 1 && Number(value.slice(4)) <= 31) mrzDates.push({ category, value });
        }
      }
    }
    if (receipt && receiptMerchantRow.test(normalize(row.map(word => word.text).join(' ')))) {
      row.forEach(word => blocked.add(word.index));
    }
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const labels = labelsByRow[rowIndex];
    for (const [labelIndex, label] of labels.entries()) {
      const { rule } = label;
      if (!rule.category || (receipt && ((['full_name', 'address'].includes(rule.category) && !rule.customer) || ['reference', 'signature', 'expiry_date', 'issue_date'].includes(rule.category)))) continue;
      const labelBox = union(row.slice(label.start, label.end));
      if (rule.category === 'signature') {
        if (documentGuess !== 'ID') continue;
        const height = labelBox.height;
        const x = Math.max(0, labelBox.x - height);
        const y = Math.max(0, labelBox.y - height * 3);
        detections.push({ id: `pattern-signature-${row[label.start].index}`, category: 'signature', enabled: true,
          x, y, width: Math.max(labelBox.width + height * 2, height * 12), height: labelBox.y + height * 4 - y });
        continue;
      }
      const nextLabel = labels[labelIndex + 1];
      let values = row.slice(label.end, nextLabel?.start ?? row.length);
      const left = label.x - labelBox.height;
      const right = nextLabel?.x ?? Infinity;
      if (rule.category === 'full_name' && /last name first name middle$/.test(normalize(row.slice(label.start, label.end).map(word => word.text).join(' ')))
        && values.length && values.every(word => word.confidence !== undefined && word.confidence < 40)) values = [];
      if (!values.length || (rule.category === 'full_name' && values.every(word => word.height > labelBox.height * 1.4))) {
        for (let below = rowIndex + 1; below < rows.length; below += 1) {
          const candidate = rows[below];
          if (candidate[0].y - (labelBox.y + labelBox.height) > labelBox.height * (rule.category === 'address' ? 5 : 2.5)) break;
          const inColumn = candidate.filter(word => word.x >= left && word.x < right);
          if (!inColumn.length) continue;
          if (labelsByRow[below].some(other => other.x >= left && other.x < right)) break;
          values.push(...inColumn);
          if (rule.category !== 'address' || values.length > 24) break;
        }
      }
      // Never consume adjacent field labels or MRZ as a value.
      values = values.filter(word => !claimed.has(word.index) && !/[<«‹]{2}/.test(word.text));
      const value = values.map(word => word.text).join(' ');
      if (values.length && (!rule.validate || rule.validate(value))) add(rule.category, values, rule.enabled ?? true);
    }
  }

  // A valid MRZ supplies independent evidence when photographed field labels vanish.
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (documentGuess === 'ID' && mrzNames.size) {
    for (const row of rows) {
      const names = row.filter(word => !claimed.has(word.index) && mrzNames.has(word.text.toUpperCase().replace(/[^A-Z]/g, '')));
      if (names.length) add('full_name', names);
    }
  }
  if (documentGuess === 'ID' && mrzDates.length) {
    for (const row of rows) {
      for (let start = 0; start < row.length; start++) {
        const items = row.slice(start, start + 3);
        if (items.length !== 3 || items.some(word => claimed.has(word.index))) continue;
        const [day, month, year] = items.map(word => word.text.toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ''));
        if (!/^[A-Z0-9]{1,2}$/.test(day) || !/^[A-Z]{3}$/.test(month) || !/^(?:19|20)\d{2}$/.test(year)) continue;
        const candidate = mrzDates.find(date => year.endsWith(date.value.slice(0, 2))
          && oneEditApart(month, months[Number(date.value.slice(2, 4)) - 1])
          && (!/^\d+$/.test(day) || Number(day) === Number(date.value.slice(4))));
        if (candidate) add(candidate.category, items);
      }
    }
  }

  for (const row of rows) {
    for (let start = 0; start < row.length; start += 1) {
      if (claimed.has(row[start].index)) continue;
      for (let end = Math.min(row.length, start + 5); end > start; end -= 1) {
        const items = row.slice(start, end);
        if (items.some(item => claimed.has(item.index))) continue;
        const compact = items.map(item => item.text).join('').replace(/[,.¢]$/, '').replace(/[ ()]/g, '');
        if (receipt && items.some(item => blocked.has(item.index))) {
          const prefix = normalize(row.slice(Math.max(0, start - 3), start).map(item => item.text).join(' '));
          const merchantValue = receiptMerchantPrefix.test(prefix);
          const phone = identifierPatterns.find(([category, pattern]) => category === 'phone' && pattern.test(compact));
          if (!merchantValue && phone) { add('phone', items); break; }
          if (!merchantValue && /^\d{13,19}$/.test(compact) && isLuhn(compact)) { add('card_number', items); break; }
          if (items.length === 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compact)) { add('email', items); break; }
          continue;
        }
        const match = identifierPatterns.find(([category, pattern]) => (!receipt || category === 'phone')
          && pattern.test(documentGuess === 'ID' && category === 'drivers_license' ? compact.replace(/[.]/g, '-') : compact));
        if (match) { add(match[0], items); break; }
        if (!receipt && /^\d{12,19}$/.test(compact)) {
          add(isLuhn(compact) ? 'card_number' : compact.length === 16 ? 'philsys_number' : 'account_number', items); break;
        }
        // A receipt may still expose a real payment card without a field label.
        if (receipt && /^\d{13,19}$/.test(compact) && isLuhn(compact)) { add('card_number', items); break; }
        if (items.length === 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compact)) { add('email', items); break; }
      }
    }
  }
  if (!receipt) {
    for (const [rowIndex, row] of rows.entries()) {
      const available = row.filter(word => !claimed.has(word.index));
      const text = available.map(word => word.text).join(' ');
      if (text.trim().split(/\s+/).length > 1 && /\b(?:brgy\.?|barangay|st\.?|street|city|province|blk\.?|block|lot|subd\.?|subdivision|purok|sitio)\b/i.test(text)
        && personalText(text) && !findLabels(available).some(label => label.rule.category !== 'address')) {
        const bounds = union(available);
        const address = [...available];
        if (documentGuess === 'ID') for (let below = rowIndex + 1; below < rows.length; below++) {
          const candidate = rows[below].filter(word => word.x >= bounds.x - bounds.height && !claimed.has(word.index));
          if (!candidate.length) continue;
          if (Math.min(...candidate.map(word => word.y)) > bounds.y + bounds.height * 3) break;
          if (findLabels(candidate, true).some(label => label.rule.category !== 'address')) break;
          address.push(...candidate);
        }
        add('address', address);
      }
      let run: IndexedWord[] = [];
      const flush = () => { if (digits(run.map(word => word.text).join('')).length >= 9) add('digits', run); run = []; };
      for (const word of row) {
        const numeric = word.text.replace(/^[,;:]+|[,;:.]+$/g, '');
        if (!claimed.has(word.index) && numeric && /^[\d\s().+-]+$/.test(numeric)) run.push(word); else flush();
      }
      flush();
    }
    for (const word of indexed) if (!claimed.has(word.index) && /\d{9,}/.test(word.text)) add('digits', [word]);
  }
  if (documentGuess === 'ID' && philippinePassport) {
    const mrz = detections.filter(box => box.category === 'mrz').toSorted((a, b) => a.y - b.y);
    if (mrz.length >= 2 && mrz[1].y >= mrz[0].y + mrz[0].height) {
      const bounds = union(mrz);
      const number = detections.find(box => box.category === 'passport'
        && box.x > bounds.x + bounds.width / 2 && box.y + box.height * 4 < mrz[0].y);
      if (number) {
        // Philippine passports repeat identity details in the right-hand security print.
        // This is an estimated area, not a claim to recognize the ghost portrait or microtext.
        const x = Math.max(bounds.x, number.x - Math.max(number.width / 2, number.height * 2));
        detections.push({ id: `pattern-passport-security-${number.id}`, category: 'passport_security_area', enabled: true,
          x, y: number.y, width: bounds.x + bounds.width - x, height: mrz[0].y - number.y });
      }
    }
  }
  return detections.toSorted((a, b) => a.y - b.y || a.x - b.x);
}
