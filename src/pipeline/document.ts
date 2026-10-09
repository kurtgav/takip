import type { Category, Detection, DocumentGuess, Word } from '../types.ts';

const clues: Record<Exclude<DocumentGuess, 'Unknown'>, RegExp[]> = {
  ID: [/\brepublic of the philippines\b/, /\bdate of birth\b/, /\bnationality\b/, /\b(?:national id|philsys|driver ?s license|passport)\b/],
  Receipt: [/\breceipt\b/, /\bsub ?total\b/, /\bamount due\b/, /\b(?:cash|change|vat|quantity|qty)\b/],
  'Chat screenshot': [/\b(?:sent|delivered|seen)\b/, /\btyping\b/, /\b(?:message|reply)\b/, /\b(?:today|yesterday) at \d/],
  'Bank transfer': [/\b(?:bank|gcash|maya) transfer\b/, /\btransaction (?:number|id|reference)\b/, /\bamount (?:sent|transferred)\b/, /\btransfer (?:successful|complete|confirmation)\b/],
};

const idCategories = new Set<Category>([
  'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'drivers_license', 'passport',
]);

export function guessDocument(words: Word[], categories: Category[]): DocumentGuess {
  const text = words.map(word => word.text).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const scores = Object.entries(clues).map(([guess, patterns]) => ({
    guess: guess as Exclude<DocumentGuess, 'Unknown'>,
    score: patterns.reduce((score, pattern) => score + Number(pattern.test(text)), 0),
  }));
  if (categories.some(category => idCategories.has(category))) scores.find(item => item.guess === 'ID')!.score += 2;
  if (categories.includes('account_number') || categories.includes('card_number')) scores.find(item => item.guess === 'Bank transfer')!.score += 1;
  const candidates = scores.filter(item => item.score >= 2);
  return candidates.length === 1 ? candidates[0].guess : 'Unknown';
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
