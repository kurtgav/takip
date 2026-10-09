import type { Detection, ScanResult, Watermark } from '../types';

export type Request =
  | { id: number; action: 'init' }
  | { id: number; action: 'scan'; file: File }
  | { id: number; action: 'render'; detections: Detection[]; watermark?: Watermark }
  | { id: number; action: 'clear' };
export type ScanOutput = ScanResult & { original: Blob; preview: Blob };
export interface WorkerOutputs { init: null; scan: ScanOutput; render: Blob; clear: null }
export type Response =
  | { id: number; type: 'progress'; text: string }
  | { id: number; type: 'error'; error: string }
  | { id: number; type: 'result'; result: WorkerOutputs[keyof WorkerOutputs] };
