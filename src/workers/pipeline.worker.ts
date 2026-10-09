import { createOCR } from '../pipeline/ocr';
import { createFaceDetector } from '../pipeline/faces';
import { prepareCodes, findCodes } from '../pipeline/qr';
import { createNER } from '../pipeline/ner';
import { detectPatterns } from '../pipeline/patterns';
import { mergeDetections } from '../pipeline/merge';
import { paintCovers, paintWatermark } from '../render/covers';
import type { Request, Response } from './protocol';
import type { Detection, Watermark } from '../types';

let ocr: Awaited<ReturnType<typeof createOCR>> | undefined;
let faces: Awaited<ReturnType<typeof createFaceDetector>> | undefined;
let ner: Awaited<ReturnType<typeof createNER>> | undefined;
let original: OffscreenCanvas | undefined;
function send(message: Response) { self.postMessage(message); }

async function render(detections: Detection[], watermark?: Watermark): Promise<Blob> {
  if (!original) throw new Error('Choose a photo first.');
  const canvas = new OffscreenCanvas(original.width, original.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot render photos.');
  context.drawImage(original, 0, 0);
  paintCovers(context, detections);
  paintWatermark(context, canvas.width, canvas.height, watermark);
  return canvas.convertToBlob({ type: 'image/png' });
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const progress = (text: string) => send({ id: data.id, type: 'progress', text });
  try {
    if (data.action === 'init') {
      progress('Preparing local text reader…');
      ocr = await createOCR();
      progress('Preparing local face and code detectors…');
      faces = await createFaceDetector();
      await prepareCodes();
      progress('Preparing local name detector…');
      ner = await createNER();
      send({ id: data.id, type: 'result', result: null });
    } else if (data.action === 'clear') {
      original = undefined;
      send({ id: data.id, type: 'result', result: null });
    } else if (data.action === 'render') {
      send({ id: data.id, type: 'result', result: await render(data.detections, data.watermark) });
    } else {
      if (!ocr || !faces || !ner) throw new Error('Local models are not ready. Reload and try again.');
      const start = performance.now();
      const bitmap = await createImageBitmap(data.file);
      if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); throw new Error('Choose a photo below 40 megapixels.'); }
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      original = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
      const context = original.getContext('2d', { willReadFrequently: true });
      if (!context) { bitmap.close(); throw new Error('Photo rendering unavailable in this browser.'); }
      context.drawImage(bitmap, 0, 0, original.width, original.height);
      bitmap.close();
      const image = await original.convertToBlob({ type: 'image/png' });
      progress('Reading text…');
      const words = await ocr.read(image);
      progress('Finding faces…');
      const faceBoxes = faces(original);
      progress('Finding QR codes and barcodes…');
      const codeBoxes = await findCodes(context.getImageData(0, 0, original.width, original.height));
      progress('Checking sensitive information…');
      const patterns = detectPatterns(words);
      const entities = await ner(words);
      const freshEntities = entities.filter(entity => !patterns.some(box => entity.x < box.x + box.width && entity.x + entity.width > box.x && entity.y < box.y + box.height && entity.y + entity.height > box.y));
      const detections = mergeDetections([...patterns, ...freshEntities, ...faceBoxes, ...codeBoxes], original.width, original.height);
      send({ id: data.id, type: 'result', result: {
        width: original.width, height: original.height, detections,
        elapsedMs: performance.now() - start,
        warnings: words.length ? [] : ['No text found. Check for missed details and add covers manually.'],
        original: image, preview: await render(detections),
      } });
    }
  } catch {
    original = undefined;
    send({ id: data.id, type: 'error', error: data.action === 'init'
      ? 'Local tools could not load. Reconnect, reload, and wait for setup to finish.'
      : 'This photo could not be processed. Try a clear JPEG or PNG, or a smaller photo.' });
  }
};
