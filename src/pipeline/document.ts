import type { Category, Detection, DocumentGuess, Word } from '../types.ts';

const clues: Record<Exclude<DocumentGuess, 'Unknown'>, RegExp[]> = {
  ID: [/\brepublic of the philippines\b/, /\b(?:date of birth|petsa ng kapanganakan)\b/, /\b(?:nationality|nasyonalidad)\b/, /\b(?:national id|philsys|driver ?s licen[sc]e|passport|pasaporte|student|employee|learner|sss|umid|philhealth|pag ibig|bir)\b/, /\b(?:license no|passport no|last name first name middle name|student (?:id|number|no)|employee (?:id|number|no)|learner reference number|common reference number|tax identification number|membership id)\b/],
  Receipt: [/\breceipt\b/, /\b(?:sub ?total|total|balance)\b/, /\b(?:amount due|total amount|vatable sales)\b/, /\b(?:cash|change|vat|net|quantity|qty)\b/, /\b(?:cashier|service charge|order type)\b/],
  'Chat screenshot': [/\b(?:sent|delivered|seen)\b/, /\btyping\b/, /\b(?:message|reply)\b/, /\b(?:today|yesterday) at \d/],
  'Bank transfer': [/\b(?:bank|gcash|maya) transfer\b/, /\btransaction (?:number|id|reference)\b/, /\bamount (?:sent|transferred)\b/, /\btransfer (?:successful|complete|confirmation)\b/],
  'Payment card': [/\b(?:payment card|debit|credit|visa|mastercard|amex|american express)\b/, /\b(?:valid thru|valid through|good thru|cardholder|card holder)\b/, /\b(?:cvv|cvc|cid|card security code)\b/],
};

const idCategories = new Set<Category>([
  'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'drivers_license', 'passport', 'mrz',
  'student_number', 'learner_number', 'employee_number', 'identity_number', 'government_number', 'pagibig_rtn',
]);

export function guessDocument(words: Word[], categories: Category[] = []): DocumentGuess {
  const text = words.map(word => word.text).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const scores = Object.entries(clues).map(([guess, patterns]) => ({
    guess: guess as Exclude<DocumentGuess, 'Unknown'>,
    score: patterns.reduce((score, pattern) => score + Number(pattern.test(text)), 0),
  }));
  const receiptScore = scores.find(item => item.guess === 'Receipt')!.score;
  if (categories.some(category => idCategories.has(category) && !(category === 'tin' && receiptScore >= 2))) scores.find(item => item.guess === 'ID')!.score += 2;
  if (words.some(word => /[<«‹]{2}/.test(word.text) && /[A-Z0-9]/i.test(word.text))) scores.find(item => item.guess === 'ID')!.score += 2;
  if (categories.includes('account_number')) scores.find(item => item.guess === 'Bank transfer')!.score += 1;
  if (categories.includes('card_number')) scores.find(item => item.guess === 'Payment card')!.score += 1;
  const candidates = scores.filter(item => item.score >= 2);
  return candidates.length === 1 ? candidates[0].guess : 'Unknown';
}

/** Structured cards have field labels; free-form entity guesses must not override them. */
export function usesEntityModel(document: DocumentGuess, categories: Category[] = []): boolean {
  return (document === 'Unknown' || document === 'Chat screenshot' || document === 'Bank transfer')
    && !categories.some(category => idCategories.has(category) || category === 'card_number');
}

export type CoverPreset = 'seller-verification' | 'cover-all';

export function applyCoverPreset(detections: Detection[], preset: CoverPreset): Detection[] {
  return detections.map(detection => ({
    ...detection,
    enabled: preset === 'cover-all' || detection.category === 'manual'
      ? true
      : detection.category !== 'full_name' && detection.category !== 'face',
  }));
}
