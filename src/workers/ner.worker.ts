import { createNER } from '../pipeline/ner';
import type { Word } from '../types';

self.onmessage = async ({ data }: MessageEvent<Word[]>) => {
  try {
    const ner = await createNER();
    self.postMessage({ ok: true, value: await ner(data) });
  } catch { self.postMessage({ ok: false }); }
};
