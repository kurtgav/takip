import { categoryLabels, type Category, type DocumentGuess, type Word } from '../types.ts';
import { coverProfile } from './document.ts';

/** Missing evidence is a review requirement, never a successful empty scan. */
export function coverageWarnings(words: Word[], categories: Category[], document: DocumentGuess): string[] {
  const text = words.map(word => word.text).join(' ').toLowerCase().replace(/[^a-z0-9<]+/g, ' ');
  const has = (category: Category) => categories.includes(category);
  const warnings: string[] = [];
  const requireFields = (name: string, fields: Category[]) => {
    const missing = fields.filter(category => !has(category));
    if (missing.length) warnings.push(`${name}: not located reliably — ${missing.map(category => categoryLabels[category]).join(', ')}. Add covers over missing details before sharing.`);
  };
  const profile = coverProfile(words, categories);
  if (profile === 'passport') {
    requireFields('Passport selected fields', ['passport', 'issue_date', 'expiry_date', 'mrz', 'passport_security_area']);
    return warnings;
  }
  if (profile === 'drivers-license') {
    requireFields('Driver’s license selected fields', ['drivers_license', 'address', 'signature']);
    return warnings;
  }
  const identityNumber = categories.some(category => ['drivers_license', 'passport', 'mrz', 'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'pagibig_rtn', 'government_number', 'student_number', 'learner_number', 'employee_number', 'identity_number'].includes(category));
  if (document === 'ID' || (document !== 'Receipt' && identityNumber)) {
    requireFields('Identity document', ['full_name']);
    if (!categories.some(category => ['drivers_license', 'passport', 'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'pagibig_rtn', 'government_number', 'student_number', 'learner_number', 'employee_number', 'identity_number'].includes(category))) {
      warnings.push('The identity number was not located reliably. Check and cover the holder’s number, including any repeated copies.');
    }
    if (/\b(?:student|learner|lrn)\b/.test(text) && !has('student_number') && !has('learner_number') && !has('identity_number')) requireFields('Student ID', ['student_number']);
    if (/\b(?:employee|personnel)\b/.test(text) && !has('identity_number')) requireFields('Employee ID', ['employee_number']);
  }
  if (document === 'Payment card' || (document !== 'Receipt' && has('card_number'))) {
    requireFields('Payment card', ['card_number', 'full_name', 'expiry_date']);
    warnings.push('Check both sides: cover the security code, signature, account number and any unlabeled cardholder details. A security code may be printed without a label.');
  }
  return warnings;
}
