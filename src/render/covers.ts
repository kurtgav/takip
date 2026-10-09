import type { Detection, Watermark } from '../types';

export function paintCovers(context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, detections: Detection[]): void {
  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = '#14281f';
  for (const box of detections) {
    if (box.enabled) context.fillRect(Math.floor(box.x), Math.floor(box.y), Math.ceil(box.width) + 1, Math.ceil(box.height) + 1);
  }
  context.restore();
}

export function watermarkText(mark: Watermark): string {
  return `For ${mark.recipient.trim()} verification only · ${mark.purpose.trim()} · ${mark.date}`;
}

export function paintWatermark(context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, width: number, height: number, mark?: Watermark): void {
  if (!mark?.recipient.trim() || !mark.purpose.trim()) return;
  const size = Math.max(14, Math.min(width, height) / 35);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 6);
  context.font = `600 ${size}px sans-serif`;
  context.fillStyle = 'rgba(255,255,255,0.58)';
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.lineWidth = Math.max(1, size / 20);
  const text = watermarkText(mark);
  const step = context.measureText(text).width + size * 3;
  const reach = Math.hypot(width, height);
  for (let y = -reach; y < reach; y += size * 6) {
    for (let x = -reach; x < reach; x += step) {
      context.strokeText(text, x, y);
      context.fillText(text, x, y);
    }
  }
  context.restore();
}
