import { createFaceDetector } from '../pipeline/faces';
import { prepareCodes, findCodes } from '../pipeline/qr';

self.onmessage = async ({ data }: MessageEvent<{ file: Blob; strictFaces: boolean }>) => {
  try {
    const bitmap = await createImageBitmap(data.file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) { bitmap.close(); throw new Error('Canvas unavailable.'); }
    context.drawImage(bitmap, 0, 0); bitmap.close();
    const detector = await createFaceDetector(data.strictFaces ? 0.85 : 0.65);
    const faces = detector(canvas);
    await prepareCodes();
    const codes = await findCodes(context.getImageData(0, 0, canvas.width, canvas.height));
    self.postMessage({ ok: true, value: { faces, codes } });
  } catch { self.postMessage({ ok: false }); }
};
