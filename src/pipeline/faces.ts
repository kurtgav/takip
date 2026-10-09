import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { Detection } from '../types';

export async function createFaceDetector() {
  const files = await FilesetResolver.forVisionTasks(`${self.location.origin}/vision`, true);
  const detector = await FaceDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${self.location.origin}/models/face.tflite`, delegate: 'CPU' },
    runningMode: 'IMAGE', minDetectionConfidence: 0.45,
  });
  return (image: OffscreenCanvas): Detection[] => {
    const detections: Detection[] = [];
    function detect(canvas: OffscreenCanvas, offsetX: number, offsetY: number, scale = 1) {
      for (const result of detector.detect(canvas).detections) {
        const box = result.boundingBox;
        if (box) detections.push({ id: `face-${detections.length}`, category: 'face', enabled: true,
          x: box.originX / scale + offsetX, y: box.originY / scale + offsetY,
          width: box.width / scale, height: box.height / scale });
      }
    }
    detect(image, 0, 0);
    // Overlapping tiles bring small document portraits into BlazeFace's working scale.
    const side = Math.min(image.width, image.height);
    const tile = Math.max(128, Math.round(side * 0.55));
    const crop = new OffscreenCanvas(512, 512);
    const context = crop.getContext('2d')!;
    const step = Math.max(1, Math.floor(tile * 0.75));
    for (let y = 0; y < image.height; y += step) {
      for (let x = 0; x < image.width; x += step) {
        const left = Math.min(x, Math.max(0, image.width - tile));
        const top = Math.min(y, Math.max(0, image.height - tile));
        context.fillStyle = 'white'; context.fillRect(0, 0, 512, 512);
        context.drawImage(image, left, top, tile, tile, 0, 0, 512, 512);
        detect(crop, left, top, 512 / tile);
        if (left + tile >= image.width) break;
      }
      if (Math.min(y, Math.max(0, image.height - tile)) + tile >= image.height) break;
    }
    return detections;
  };
}
