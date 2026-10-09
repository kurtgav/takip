import { categoryLabels, type Category } from '../types.ts';
import { templateSummary } from './risk.ts';
import { allowedSummarySentences, normalizeSummaryCategories } from './summary-contract.ts';

export { allowedSummarySentences, categoriesPayload, normalizeSummaryCategories } from './summary-contract.ts';

type WorkerResult = { riskSentence: string; adviceSentence: string };
type WorkerReply =
  | { id: number; type: 'ready' }
  | { id: number; type: 'result'; result: unknown }
  | { id: number; type: 'progress'; text: string }
  | { id: number; type: 'error'; error: string };

const formatList = (values: string[]): string => {
  if (values.length < 2) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
};

export function renderModelSummary(categories: Category[], value: unknown): string | null {
  let normalized: Category[];
  try { normalized = normalizeSummaryCategories(categories); } catch { return null; }
  if (!value || typeof value !== 'object') return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('riskSentence') || !keys.includes('adviceSentence')) return null;
  const { riskSentence, adviceSentence } = value as Partial<WorkerResult>;
  const allowed = allowedSummarySentences(normalized);
  if (typeof riskSentence !== 'string' || !allowed.riskSentences.includes(riskSentence)
    || typeof adviceSentence !== 'string' || !allowed.adviceSentences.includes(adviceSentence)
    || normalized.length === 0) return null;
  const exposed = formatList(normalized.map((category) => categoryLabels[category]));
  return `Detected: ${exposed}. ${riskSentence} ${adviceSentence}`;
}

export class SummaryEngine {
  ready = false;
  private worker?: Worker;
  private nextId = 0;

  async init(onProgress: (text: string) => void): Promise<void> {
    this.dispose();
    if (!('gpu' in navigator)) throw new Error('Smart summary requires WebGPU on this device.');
    const worker = new Worker(new URL('../workers/summary.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    try {
      await this.request(worker, { type: 'init' }, 240_000, onProgress);
      this.ready = true;
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  async summarize(categories: Category[]): Promise<{ text: string; source: 'model' | 'template' }> {
    const normalized = normalizeSummaryCategories(categories);
    const fallback = (): { text: string; source: 'template' } => ({
      text: templateSummary(normalized), source: 'template',
    });
    if (!this.ready || !this.worker || normalized.length === 0) return fallback();
    try {
      const result = await this.request(this.worker, { type: 'summarize', categories: normalized }, 15_000);
      const text = renderModelSummary(normalized, result);
      return text ? { text, source: 'model' } : fallback();
    } catch {
      this.dispose();
      return fallback();
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
  }

  private request(worker: Worker, message: object, timeoutMs: number, onProgress?: (text: string) => void): Promise<unknown> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const finish = (callback: () => void) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        callback();
      };
      const onMessage = (event: MessageEvent<WorkerReply>) => {
        const reply = event.data;
        if (!reply || reply.id !== id) return;
        if (reply.type === 'progress') { onProgress?.(reply.text); return; }
        if (reply.type === 'error') finish(() => reject(new Error(reply.error)));
        else finish(() => resolve(reply.type === 'result' ? reply.result : undefined));
      };
      const onError = () => finish(() => reject(new Error('Smart summary worker failed.')));
      const timeout = setTimeout(() => finish(() => reject(new Error('Smart summary timed out.'))), timeoutMs);
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ id, ...message });
    });
  }
}
