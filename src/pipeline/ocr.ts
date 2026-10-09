import { createWorker, OEM, PSM } from 'tesseract.js';
import type { Word } from '../types';

export async function createOCR() {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${self.location.origin}/ocr/worker.min.js`,
    corePath: `${self.location.origin}/ocr/core`,
    langPath: `${self.location.origin}/ocr`,
    workerBlobURL: false,
    cacheMethod: 'none',
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  return {
    async read(image: Blob): Promise<Word[]> {
      const result = await worker.recognize(image, {}, { text: true, blocks: true });
      const words: Word[] = [];
      let lineNumber = 0;
      for (const block of result.data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            for (const word of line.words) {
              if (!word.text.trim()) continue;
              const { x0, y0, x1, y1 } = word.bbox;
              words.push({ text: word.text, x: x0, y: y0, width: x1 - x0, height: y1 - y0, line: lineNumber });
            }
            lineNumber++;
          }
        }
      }
      return words;
    },
    terminate: () => worker.terminate(),
  };
}
