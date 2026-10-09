import type { Category, Detection, Word } from '../types.ts';

type IndexedWord = Word & { index: number };

const union = (items: IndexedWord[]) => {
  const x = Math.min(...items.map((item) => item.x));
  const y = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const bottom = Math.max(...items.map((item) => item.y + item.height));
  return { x, y, width: right - x, height: bottom - y };
};

const digits = (value: string) => value.replace(/\D/g, '');
const normalized = (value: string) => value.toLowerCase().replace(/\u2019/g, "'").replace(/\s+/g, ' ').trim();
const normalizedLabelText = (value: string) => normalized(value).replace(/[.:]+(?=\s|$)/g, '');
const datePattern = /^(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4})$/i;

export function isLuhn(value: string): boolean {
  const number = digits(value);
  if (number.length < 12 || number.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

const identifierPatterns: Array<[Category, RegExp]> = [
  ['philsys_number', /^\d{4}-\d{4}-\d{4}-\d{4}$/],
  ['tin', /^\d{3}-\d{3}-\d{3}(?:-\d{3})?$/],
  ['sss', /^\d{2}-\d{7}-\d$/],
  ['umid', /^\d{4}-\d{7}-\d$/],
  ['philhealth', /^\d{2}-\d{9}-\d$/],
  ['pagibig', /^\d{4}-\d{4}-\d{4}$/],
  ['drivers_license', /^[A-Z]\d{2}-\d{2}-\d{6}$/i],
  ['passport', /^[A-Z]{1,2}\d{7}[A-Z]?$/i],
  ['phone', /^(?:\+63|0)9\d{2}-?\d{3}-?\d{4}$/],
];

const labelRules: Array<{ labels: string[]; category: Category; validate?: (value: string) => boolean; enabled?: boolean }> = [
  { labels: ['date of birth', 'birth date', 'birthday', 'dob', 'petsa ng kapanganakan', 'kapanganakan'], category: 'birthday', validate: (value) => datePattern.test(value) },
  { labels: ['first name', 'middle name', 'last name', 'surname', 'full name', 'name', 'pangalan'], category: 'full_name' },
  { labels: ['address', 'tirahan', 'city', 'province'], category: 'address', validate: (value) => !/\b(?:authority|department|government|office|agency)\b/i.test(value) },
  { labels: ['account number', 'account no', 'account'], category: 'account_number', validate: (value) => digits(value).length >= 9 },
  { labels: ['card number', 'card no', 'card'], category: 'card_number', validate: isLuhn },
  { labels: ['reference number', 'reference no', 'ref no', 'reference'], category: 'reference', validate: (value) => /\d{6,}/.test(digits(value)), enabled: false },
];

export function detectPatterns(words: Word[]): Detection[] {
  const indexed = words.map((word, index) => ({ ...word, index }));
  const wordsByLine = new Map<number, IndexedWord[]>();
  for (const word of indexed) wordsByLine.set(word.line, [...(wordsByLine.get(word.line) ?? []), word]);
  const lines = [...wordsByLine.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, lineWords]) => lineWords.toSorted((a, b) => a.x - b.x));
  const detections: Detection[] = [];
  const claimed = new Set<number>();
  const isOnlyLabel = (value: string) => labelRules.some((rule) => rule.labels.includes(normalizedLabelText(value)));

  const add = (category: Category, items: IndexedWord[], enabled = true) => {
    const available = items.filter((item) => !claimed.has(item.index));
    if (available.length === 0) return;
    available.forEach((item) => claimed.add(item.index));
    detections.push({
      id: `pattern-${category}-${available.map((item) => item.index).join('-')}`,
      category,
      enabled,
      ...union(available),
    });
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const lineText = normalizedLabelText(line.map((word) => word.text).join(' '));
    for (const rule of labelRules) {
      const label = rule.labels.find((candidate) => lineText === candidate || lineText.startsWith(`${candidate} `));
      if (!label) continue;
      let valueWords = lineText === label ? (lines[lineIndex + 1] ?? []) : line;
      if (lineText === label && isOnlyLabel(valueWords.map((word) => word.text).join(' '))) valueWords = [];
      if (lineText !== label) {
        const labelWordCount = label.split(' ').length;
        valueWords = line.slice(labelWordCount);
      }
      const value = valueWords.map((word) => word.text).join(' ');
      if (valueWords.length > 0 && (!rule.validate || rule.validate(value))) add(rule.category, valueWords, rule.enabled ?? true);
      break;
    }
  }

  for (const line of lines) {
    for (let start = 0; start < line.length; start += 1) {
      for (let end = Math.min(line.length, start + 3); end > start; end -= 1) {
        const items = line.slice(start, end);
        if (!items.some((item) => claimed.has(item.index)) && datePattern.test(items.map((item) => item.text).join(' '))) {
          add('birthday', items);
          break;
        }
      }
    }
    for (let start = 0; start < line.length; start += 1) {
      if (claimed.has(line[start].index)) continue;
      for (let end = Math.min(line.length, start + 5); end > start; end -= 1) {
        const items = line.slice(start, end);
        if (items.some((item) => claimed.has(item.index))) continue;
        const compact = items.map((item) => item.text).join('').replace(/[,.]$/, '');
        const match = identifierPatterns.find(([, pattern]) => pattern.test(compact.replace(/[ ()]/g, '')));
        if (match) {
          add(match[0], items);
          break;
        }
        const number = digits(compact);
        if (/^\d{12,19}$/.test(number) && number.length === compact.length) {
          add(isLuhn(number) ? 'card_number' : number.length === 16 ? 'philsys_number' : 'account_number', items);
          break;
        }
        if (items.length === 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compact)) {
          add('email', items);
          break;
        }
      }
    }
  }

  for (const line of lines) {
    const available = line.filter((word) => !claimed.has(word.index));
    const text = available.map((word) => word.text).join(' ');
    if (available.length > 1
      && /\b(?:brgy\.?|barangay|st\.?|street|city|province)\b/i.test(text)
      && !/\b(?:republic|authority|department|government|office|agency)\b/i.test(text)) add('address', available);
  }

  for (const line of lines) {
    let run: IndexedWord[] = [];
    const flush = () => {
      if (digits(run.map((word) => word.text).join('')).length >= 9) add('digits', run);
      run = [];
    };
    for (const word of line) {
      if (!claimed.has(word.index) && /^[\d\s().+-]+$/.test(word.text)) run.push(word);
      else flush();
    }
    flush();
  }
  return detections.toSorted((a, b) => a.y - b.y || a.x - b.x);
}
