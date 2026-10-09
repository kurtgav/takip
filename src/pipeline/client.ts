import type { Request, Response, WorkerOutputs } from '../workers/protocol';

export class Pipeline {
  private worker = new Worker(new URL('../workers/pipeline.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private stopped = false;
  private pending = new Map<number, { resolve: (value: WorkerOutputs[keyof WorkerOutputs]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  onProgress: (text: string) => void = () => {};
  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<Response>) => {
      if (data.type === 'progress') { this.onProgress(data.text); return; }
      const item = this.pending.get(data.id);
      if (!item) return;
      clearTimeout(item.timer);
      this.pending.delete(data.id);
      if (data.type === 'error') item.reject(new Error(data.error));
      else item.resolve(data.result);
    };
    this.worker.onerror = () => this.dispose('Local processing stopped. Reload to try again.');
  }
  request<T extends Request['action']>(request: Omit<Extract<Request, { action: T }>, 'id'> & { action: T }): Promise<WorkerOutputs[T]> {
    if (this.stopped) return Promise.reject(new Error('Local processing stopped. Retry setup to continue.'));
    const id = ++this.sequence;
    return new Promise<WorkerOutputs[T]>((resolve, reject) => {
      const timer = setTimeout(() => this.dispose('Processing took too long. Try a smaller, clearer photo.'), 120_000);
      this.pending.set(id, { resolve: value => resolve(value as WorkerOutputs[T]), reject, timer });
      this.worker.postMessage({ ...request, id });
    });
  }
  dispose(message = 'Processing cancelled.') {
    this.stopped = true;
    this.worker.terminate();
    for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error(message)); }
    this.pending.clear();
  }
}
