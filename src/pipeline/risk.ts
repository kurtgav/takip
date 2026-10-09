import { categoryLabels, type Category } from '../types.ts';

export type RiskLevel = 'Low' | 'Medium' | 'High';

const directHighRisk = new Set<Category>([
  'philsys_number', 'tin', 'sss', 'umid', 'philhealth', 'pagibig',
  'drivers_license', 'passport', 'mrz', 'passport_security_area', 'card_number', 'account_number', 'qr_code',
]);

const uniqueCategories = (categories: Category[]): Category[] =>
  [...new Set<Category>(categories.filter((category) => category !== 'manual'))];

export function riskLevel(categories: Category[]): RiskLevel {
  const unique = uniqueCategories(categories);
  const has = (category: Category) => unique.includes(category);
  if (unique.some((category) => directHighRisk.has(category))
    || (has('full_name') && (has('birthday') || has('address') || has('signature')))) return 'High';
  if (has('address') || has('digits') || has('signature') || has('barcode')
    || (has('full_name') && (has('phone') || has('face')))
    || unique.length > 1) return 'Medium';
  return 'Low';
}

const formatList = (values: string[]) => {
  if (values.length < 2) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
};

export function templateSummary(categories: Category[]): string {
  const unique = uniqueCategories(categories);
  if (unique.length === 0) {
    return 'Nothing sensitive was detected, but this does not guarantee the image is safe. Review the image carefully before sharing.';
  }

  const exposed = formatList(unique.map((category) => categoryLabels[category]));
  const risk = riskLevel(unique);
  const explanation = risk === 'High'
    ? 'These details could enable identity theft, fraud, or unauthorized account access.'
    : risk === 'Medium'
      ? 'Together, these details could help someone identify, impersonate, or contact you.'
      : 'This exposure is limited, but it may still reveal personal information.';
  return `Detected: ${exposed}. ${explanation} Review every cover before sharing.`;
}
