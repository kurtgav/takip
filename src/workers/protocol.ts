import type { ScanResult } from '../types';

export type Request = { id: number; action: 'scan'; file: Blob; width: number; height: number };
export type ScanOutput = ScanResult & { original: Blob; preview: Blob };
export interface WorkerOutputs { scan: ScanResult }
export type Response =
  | { id: number; type: 'progress'; text: string }
  | { id: number; type: 'error'; error: string }
  | { id: number; type: 'result'; result: WorkerOutputs[keyof WorkerOutputs] };
