import { assetPath } from './asset';

export interface NetworkCount { requests: number; blocked: number }

interface WorkerReply extends Partial<NetworkCount> {
  ready?: boolean;
  done?: boolean;
  error?: string;
}

export async function prepareOffline(onProgress: (text: string) => void): Promise<void> {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error('Offline storage is unavailable. Use current Chrome over HTTPS or localhost.');
  await new Promise<void>((resolve, reject) => {
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const fail = (text: string) => { cleanup(); reject(new Error(text)); };
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fail('No offline app progress for 90 seconds. Check your connection and free storage, then retry.'), 90_000);
    };
    const check = () => {
      if (navigator.serviceWorker.controller && registration?.active) { cleanup(); resolve(); }
      else if (installing?.state === 'redundant') fail('Offline installation failed. Check your connection and free storage, then retry. Completed files are saved.');
    };
    const watchInstaller = () => {
      installing?.removeEventListener('statechange', check);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', check);
      installing?.postMessage({ type: 'OFFLINE_STATUS' });
      check();
    };
    const message = (event: MessageEvent<{ type?: string; text?: string }>) => {
      if (!(event.source instanceof ServiceWorker) || event.source.scriptURL !== new URL(assetPath('sw.js'), location.href).href) return;
      if (event.data?.type === 'OFFLINE_ERROR' && typeof event.data.text === 'string') fail(event.data.text);
      if (event.data?.type === 'OFFLINE_PROGRESS' && typeof event.data.text === 'string') {
        resetTimer(); onProgress(event.data.text);
      }
    };
    function cleanup() {
      settled = true;
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', check);
      navigator.serviceWorker.removeEventListener('message', message);
      registration?.removeEventListener('updatefound', watchInstaller);
      installing?.removeEventListener('statechange', check);
    }
    resetTimer();
    navigator.serviceWorker.addEventListener('controllerchange', check);
    navigator.serviceWorker.addEventListener('message', message);
    void navigator.serviceWorker.register(assetPath('sw.js')).then(value => {
      if (settled) return;
      registration = value;
      registration.addEventListener('updatefound', watchInstaller);
      watchInstaller();
    }).catch(() => fail('Offline storage could not start. Use a regular browser tab over HTTPS and retry.'));
  });
}

function activeWorker(): ServiceWorker {
  const controller = navigator.serviceWorker.controller;
  if (!controller) throw new Error('Offline protection is not ready. Reload, then retry.');
  return controller;
}

function workerRequest(type: string, timeout: number, timeoutText: string): Promise<WorkerReply> {
  const controller = activeWorker();
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error(timeoutText));
    }, timeout);
    channel.port1.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      clearTimeout(timer);
      channel.port1.close();
      if (typeof data?.error === 'string') reject(new Error(data.error));
      else resolve(data);
    };
    controller.postMessage({ type }, [channel.port2]);
  });
}

export async function toolsReady(): Promise<boolean> {
  if (import.meta.env.DEV) return true;
  if (!navigator.serviceWorker.controller) return false;
  const reply = await workerRequest('TOOLS_STATUS', 5000, 'Offline tools status did not respond. Reload, then retry.');
  return reply.ready === true;
}

export async function downloadTools(onProgress: (text: string) => void): Promise<void> {
  if (import.meta.env.DEV) return;
  const controller = activeWorker();
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      channel.port1.close();
      navigator.serviceWorker.removeEventListener('message', message);
    };
    const fail = (text: string) => {
      if (settled) return;
      cleanup();
      reject(new Error(text));
    };
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        controller.postMessage({ type: 'TOOLS_CANCEL' });
        fail('No tool download progress for 90 seconds. Check your connection and free storage, then retry. Completed files are saved.');
      }, 90_000);
    };
    const message = (event: MessageEvent<{ type?: string; text?: string }>) => {
      if (!(event.source instanceof ServiceWorker) || event.source.scriptURL !== controller.scriptURL) return;
      if (event.data?.type === 'TOOLS_PROGRESS' && typeof event.data.text === 'string') {
        resetTimer();
        onProgress(event.data.text);
      }
    };
    channel.port1.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      if (typeof data?.error === 'string') {
        fail(data.error);
        return;
      }
      cleanup();
      resolve();
    };
    resetTimer();
    navigator.serviceWorker.addEventListener('message', message);
    controller.postMessage({ type: 'TOOLS_DOWNLOAD' }, [channel.port2]);
  });
}

export async function cancelTools(): Promise<void> {
  if (import.meta.env.DEV || !navigator.serviceWorker.controller) return;
  await workerRequest('TOOLS_CANCEL', 5000, 'Tool download did not stop. Reload before opening a photo.');
}

export async function processingNetwork(type: 'PROCESS_START' | 'PROCESS_END'): Promise<NetworkCount> {
  if (import.meta.env.DEV) return { requests: 0, blocked: 0 };
  const reply = await workerRequest(type, 5000, 'Offline protection did not respond. Reload to continue.');
  return { requests: reply.requests ?? 0, blocked: reply.blocked ?? 0 };
}
