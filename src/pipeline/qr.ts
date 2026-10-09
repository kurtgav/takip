import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import type { Detection } from '../types';

export async function prepareCodes(): Promise<void> {
  await prepareZXingModule({ overrides: { locateFile: () => `${self.location.origin}/wasm/zxing_reader.wasm` }, fireImmediately: true });
}

export async function findCodes(image: ImageData): Promise<Detection[]> {
  const results = await readBarcodes(image, { tryHarder: true, tryRotate: true, tryInvert: true });
  return results.map((result, index) => {
    const corners = Object.values(result.position);
    const x = Math.min(...corners.map(point => point.x));
    const y = Math.min(...corners.map(point => point.y));
    return { id: `code-${index}`, category: result.format === 'QRCode' ? 'qr_code' : 'barcode', enabled: true,
      x, y, width: Math.max(...corners.map(point => point.x)) - x, height: Math.max(...corners.map(point => point.y)) - y };
  });
}
