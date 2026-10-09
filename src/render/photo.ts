import { paintCovers, paintWatermark } from './covers';
import { stripPngMetadata } from './png';
import type { Detection, Watermark } from '../types';

function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The covered photo could not be saved.')), 'image/png'))
    .then(stripPngMetadata);
}

export class LocalPhoto {
  private constructor(private canvas: HTMLCanvasElement, readonly original: Blob) {}
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  static async open(file: Blob): Promise<LocalPhoto> {
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      image.src = url;
      try { await image.decode(); }
      catch { throw new Error('This browser could not open that photo. Try a JPEG or PNG.'); }
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Choose a photo below 40 megapixels.');
      const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo rendering is unavailable in this browser.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return new LocalPhoto(canvas, await png(canvas));
    } finally { URL.revokeObjectURL(url); image.src = ''; }
  }

  async render(detections: Detection[], watermark?: Watermark): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = this.width; canvas.height = this.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo rendering is unavailable in this browser.');
    context.drawImage(this.canvas, 0, 0);
    paintCovers(context, detections); paintWatermark(context, this.width, this.height, watermark);
    try { return await png(canvas); }
    finally { canvas.width = canvas.height = 0; }
  }

  dispose() { this.canvas.width = this.canvas.height = 0; }
}
