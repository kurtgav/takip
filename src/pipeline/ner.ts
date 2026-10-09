import { env, pipeline } from '@huggingface/transformers';
import { assetPath } from '../asset';
import type { Detection, Word } from '../types';

export async function createNER() {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = assetPath('models/');
  env.useBrowserCache = false;
  env.backends.onnx.wasm!.wasmPaths = assetPath('wasm/');
  env.backends.onnx.wasm!.numThreads = 1;
  const classifier = await pipeline('token-classification', 'ner', { dtype: 'q8', device: 'wasm', local_files_only: true });
  await classifier('Sample text.');
  return async (words: Word[]): Promise<Detection[]> => {
    const lines = new Map<number, Word[]>();
    for (const word of words) { const line = lines.get(word.line) ?? []; line.push(word); lines.set(word.line, line); }
    const detections: Detection[] = [];
    for (const line of lines.values()) {
      line.sort((a, b) => a.x - b.x);
      const complete = line.map(word => word.text).join(' ');
      if (/republic of|statistics authority|department of|social security system|land transportation office|sample.*made.up/i.test(complete)) continue;
      // Bound each call below the model's token limit; no raw text crosses the worker boundary.
      for (let start = 0; start < line.length; start += 60) {
        const chunk = line.slice(start, start + 60);
        const text = chunk.map(word => word.text).join(' ');
        const result = await classifier(text, { ignore_labels: [] });
        let cursor = 0;
        const selected = new Map<Word, 'possible_name' | 'possible_location'>();
        for (const token of result.flat()) {
          const piece = token.word.replace(/^##/, '').trim();
          if (!piece) continue;
          const index = text.toLowerCase().indexOf(piece.toLowerCase(), cursor);
          if (index < 0) continue;
          cursor = index + piece.length;
          if (token.score < 0.7 || !/-(PER|LOC)$/.test(token.entity)) continue;
          let position = 0;
          for (const word of chunk) {
            const end = position + word.text.length;
            if (position < cursor && end > index && (word.confidence ?? 100) >= 60 && /[a-z]{3}/i.test(word.text) && !/^(name|surname|address|birthday|birth|date|city|province|pangalan|tirahan|sample)[:.]?$/i.test(word.text)) {
              selected.set(word, token.entity.endsWith('PER') ? 'possible_name' : 'possible_location');
            }
            position = end + 1;
          }
        }
        for (const [word, category] of selected) {
          detections.push({ id: `ner-${detections.length}`, category, enabled: true, x: word.x, y: word.y, width: word.width, height: word.height });
        }
      }
    }
    return detections;
  };
}
