import { categoryLabels, type Category } from '../types.ts';
import { riskLevel } from './risk.ts';

const CATEGORY_SET = new Set<string>(Object.keys(categoryLabels));
const RISK_SENTENCES = {
  High: [
    'These details could be misused for identity theft, fraud, or unauthorized account access.',
    'Someone could combine these details to impersonate you or try to access an account.',
    'Sharing these details could expose you to serious identity or financial misuse.',
  ],
  Medium: [
    'Together, these details could help someone identify, impersonate, or contact you.',
    'Someone could combine these details to learn more about you or pose as you.',
    'This combination could make unwanted contact or impersonation easier.',
  ],
  Low: [
    'This exposure is limited, but it may still reveal personal information.',
    'This detail may reveal something personal even though the immediate risk is limited.',
  ],
} as const;
const ADVICE_SENTENCES = [
  'Review every cover before sharing.',
  'Check the covered image carefully before you share it.',
] as const;

export function normalizeSummaryCategories(value: unknown): Category[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !CATEGORY_SET.has(item))) {
    throw new TypeError('Summary accepts only known category identifiers.');
  }
  return [...new Set(value as Category[])].filter((category) => category !== 'manual');
}

export function allowedSummarySentences(categories: Category[]): {
  riskSentences: readonly string[];
  adviceSentences: readonly string[];
} {
  return { riskSentences: RISK_SENTENCES[riskLevel(categories)], adviceSentences: ADVICE_SENTENCES };
}

export const categoriesPayload = (categories: Category[]): string => JSON.stringify(categories);
