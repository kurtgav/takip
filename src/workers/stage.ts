export type StageReply<T> = { ok: true; value: T } | { ok: false };

// Termination releases each engine's WASM heap before the next engine starts.
export function runStage<T>(worker: Worker, input: unknown, timeout = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Local check timed out.')); }, timeout);
    worker.onmessage = ({ data }: MessageEvent<StageReply<T>>) => {
      finish();
      if (data.ok) resolve(data.value);
      else reject(new Error('Local check could not run.'));
    };
    worker.onerror = () => { finish(); reject(new Error('Local check stopped.')); };
    worker.postMessage(input);
  });
}
