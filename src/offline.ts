import { assetPath } from './asset';

export interface NetworkCount { requests: number; blocked: number }

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
      timer = setTimeout(() => fail('No download progress for 90 seconds. Check your connection and free storage, then retry. Completed files are saved.'), 90_000);
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

export async function processingNetwork(type: 'PROCESS_START' | 'PROCESS_END'): Promise<NetworkCount> {
  if (import.meta.env.DEV) return { requests: 0, blocked: 0 };
  const controller = navigator.serviceWorker.controller;
  if (!controller) throw new Error('Offline protection is not ready. Reload before selecting a photo.');
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline protection did not respond. Reload to continue.')); }, 5000);
    channel.port1.onmessage = ({ data }: MessageEvent<NetworkCount>) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
    controller.postMessage({ type }, [channel.port2]);
  });
}
