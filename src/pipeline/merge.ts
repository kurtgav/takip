import type { Detection } from '../types.ts';

const PADDING = 3;

const overlaps = (a: Detection, b: Detection) =>
  a.x <= b.x + b.width && b.x <= a.x + a.width
  && a.y <= b.y + b.height && b.y <= a.y + a.height;

const combine = (a: Detection, b: Detection): Detection => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { ...a, ...(a.estimated || b.estimated ? { estimated: true } : {}), id: `${a.id}+${b.id}`, x, y, width: right - x, height: bottom - y };
};

export function mergeDetections(detections: Detection[], width: number, height: number): Detection[] {
  const pending = detections.map((detection) => {
    const x = Math.max(0, detection.x - PADDING);
    const y = Math.max(0, detection.y - PADDING);
    const right = Math.min(width, detection.x + detection.width + PADDING);
    const bottom = Math.min(height, detection.y + detection.height + PADDING);
    return { ...detection, x, y, width: right - x, height: bottom - y };
  }).filter((detection) => detection.width > 0 && detection.height > 0);

  const result: Detection[] = [];
  while (pending.length > 0) {
    let current = pending.shift()!;
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = 0; index < pending.length; index += 1) {
        const candidate = pending[index];
        if (current.category === candidate.category && current.enabled === candidate.enabled && overlaps(current, candidate)) {
          current = combine(current, candidate);
          pending.splice(index, 1);
          changed = true;
          break;
        }
      }
    }
    result.push(current);
  }
  return result;
}
