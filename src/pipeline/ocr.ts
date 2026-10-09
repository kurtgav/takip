import { createWorker, OEM, PSM } from 'tesseract.js';
import { assetPath } from '../asset';
import type { Word } from '../types';

export interface OCRResult {
  primary: Word[];
  passes: Word[][];
}

function quality(words: Word[]): number {
  const confidence = words
    .filter(word => word.text.trim().length > 2 && word.confidence !== undefined)
    .map(word => word.confidence!)
    .sort((a, b) => a - b);
  if (!confidence.length) return -Infinity;
  const median = confidence[Math.floor(confidence.length / 2)];
  const reliable = confidence.filter(value => value >= 60).length;
  const uncertain = confidence.filter(value => value < 40).length / confidence.length;
  return median + Math.min(reliable, 5) - uncertain * 25;
}

export async function createOCR() {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: assetPath('ocr/worker.min.js'),
    corePath: assetPath('ocr/core'),
    langPath: assetPath('ocr'),
    workerBlobURL: false,
    cacheMethod: 'none',
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  return {
    async read(image: Blob): Promise<OCRResult> {
      // Small phone screenshots have tiny field labels. Enlarge only OCR input;
      // return every box in original-photo coordinates and keep memory bounded.
      const bitmap = await createImageBitmap(image);
      const originalWidth = bitmap.width; const originalHeight = bitmap.height;
      const scale = Math.max(1, 1600 / Math.max(originalWidth, originalHeight));
      let input = image;
      let scaleX = 1; let scaleY = 1;
      try {
        if (scale > 1) {
          const canvas = new OffscreenCanvas(Math.round(originalWidth * scale), Math.round(originalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Text image preparation is unavailable.');
          context.imageSmoothingQuality = 'high';
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          input = await canvas.convertToBlob({ type: 'image/png' });
          scaleX = canvas.width / originalWidth; scaleY = canvas.height / originalHeight;
          canvas.width = canvas.height = 0;
        }
      } finally { bitmap.close(); }
      const recognize = async (thresholdingMethod: '0' | '2'): Promise<Word[]> => {
        await worker.setParameters({ thresholding_method: thresholdingMethod });
        const result = await worker.recognize(input, {}, { text: true, blocks: true });
        const words: Word[] = [];
        let lineNumber = 0;
        for (const block of result.data.blocks ?? []) {
          for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
              for (const word of line.words) {
                if (!word.text.trim()) continue;
                const { x0, y0, x1, y1 } = word.bbox;
                words.push({ text: word.text, x: x0 / scaleX, y: y0 / scaleY, width: (x1 - x0) / scaleX, height: (y1 - y0) / scaleY, line: lineNumber, confidence: word.confidence });
              }
              lineNumber++;
            }
          }
        }
        return words;
      };
      const passes = [await recognize('0'), await recognize('2')];
      const primary = quality(passes[1]) > quality(passes[0]) ? passes[1] : passes[0];
      return { primary, passes };
    },
    terminate: () => worker.terminate(),
  };
}
