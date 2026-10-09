export interface NetworkCount { requests: number; blocked: number }

export async function prepareOffline(): Promise<void> {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error('Offline storage is unavailable. Use current Chrome over HTTPS or localhost.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('Offline setup could not finish. Check your connection and free storage, then retry.')); }, 120_000);
    const check = () => { if (navigator.serviceWorker.controller && registration.active) { cleanup(); resolve(); } };
    function cleanup() { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', check); }
    navigator.serviceWorker.addEventListener('controllerchange', check);
    void navigator.serviceWorker.ready.then(check);
    check();
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
