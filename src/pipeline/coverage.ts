import { categoryLabels, type Category, type Detection, type DocumentGuess, type Word } from '../types.ts';

/** Independently anchored side regions bound the personal fields even if OCR misses a value. */
export function passportPrivacyArea(detections: Detection[]): Detection[] {
  const portrait = detections.find(box => box.category === 'passport_portrait_area');
  const security = detections.find(box => box.category === 'passport_security_area');
  const mrz = detections.filter(box => box.category === 'mrz');
  // The side estimates already required two MRZ rows before merge/padding.
  // On small images their padded boxes can legitimately merge into one.
  if (!portrait || !security || !mrz.length) return detections;
  const x = portrait.x + portrait.width;
  const right = security.x;
  const y = Math.min(portrait.y, security.y);
  const bottom = Math.min(...mrz.map(box => box.y));
  if (right <= x || bottom <= y) return detections;
  return [...detections, { id: 'passport-personal-data-area', category: 'passport_details_area', enabled: true,
    x: Math.max(0, x - 3), y, width: right - x + 6, height: bottom - y }];
}

/** Missing evidence is a review requirement, never a successful empty scan. */
export function coverageWarnings(words: Word[], categories: Category[], document: DocumentGuess): string[] {
  const text = words.map(word => word.text).join(' ').toLowerCase().replace(/[^a-z0-9<]+/g, ' ');
  const has = (category: Category) => categories.includes(category);
  const warnings: string[] = [];
  const requireFields = (name: string, fields: Category[]) => {
    const missing = fields.filter(category => !has(category));
    if (missing.length) warnings.push(`${name}: not located reliably — ${missing.map(category => categoryLabels[category]).join(', ')}. Add covers over missing details before sharing.`);
  };
  const identityNumber = categories.some(category => ['drivers_license', 'passport', 'mrz', 'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'pagibig_rtn', 'government_number', 'student_number', 'learner_number', 'employee_number', 'identity_number'].includes(category));
  if (document === 'ID' || (document !== 'Receipt' && identityNumber)) {
    requireFields('Identity document', ['full_name']);
    if (!categories.some(category => ['drivers_license', 'passport', 'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig', 'pagibig_rtn', 'government_number', 'student_number', 'learner_number', 'employee_number', 'identity_number'].includes(category))) {
      warnings.push('The identity number was not located reliably. Check and cover the holder’s number, including any repeated copies.');
    }
    if (has('passport') || has('mrz') || /\b(?:passport|pasaporte)\b|p<phl/.test(text)) {
      requireFields('Passport', ['passport', 'mrz', 'birthday', 'birthplace', 'issue_date', 'expiry_date']);
      if (!has('passport_portrait_area') || !has('passport_security_area')) warnings.push('Check the whole passport portrait and security print for faint or repeated personal details. Face boxes alone do not cover the full portrait.');
    }
    if (has('drivers_license') || /\bdriver ?s licen[sc]e\b/.test(text)) {
      requireFields('Driver’s license', ['drivers_license', 'birthday', 'address', 'expiry_date', 'face', 'signature']);
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
