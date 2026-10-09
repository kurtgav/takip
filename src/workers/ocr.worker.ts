import { createOCR } from '../pipeline/ocr';

self.onmessage = async ({ data }: MessageEvent<Blob>) => {
  let ocr: Awaited<ReturnType<typeof createOCR>> | undefined;
  try {
    ocr = await createOCR();
    const result = await ocr.read(data);
    await ocr.terminate(); ocr = undefined;
    self.postMessage({ ok: true, value: result });
  } catch {
    await ocr?.terminate();
    self.postMessage({ ok: false });
  }
};
