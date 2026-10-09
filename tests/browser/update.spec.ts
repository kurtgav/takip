import { expect, test, type Page, type Request } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chooseManualMode, samplePhoto } from './sample';

async function workerMessage(page: Page, type: string): Promise<{ ready?: boolean; done?: boolean; error?: string }> {
  return page.evaluate(async type => {
    await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller;
    if (!worker) throw new Error('Controlling worker unavailable');
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error(`${type} timed out`)), 120_000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      worker.postMessage({ type }, [channel.port2]);
    });
  }, type);
}

async function activateUpdate(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('Registration unavailable');
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Update did not install')), 30_000);
      registration.addEventListener('updatefound', () => {
        const candidate = registration.installing!;
        candidate.addEventListener('statechange', () => {
          if (candidate.state === 'installed') { clearTimeout(timer); resolve(); }
          if (candidate.state === 'redundant') { clearTimeout(timer); reject(new Error('Update failed')); }
        });
      }, { once: true });
      registration.update().catch(reject);
    });
  });
  // Release the old worker naturally, as a real app restart does. No skipWaiting shortcut.
  await page.goto('about:blank');
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

function reviseManifest(source: string, path: string, bytes: Buffer): string {
  const revision = createHash('md5').update(bytes).digest('hex');
  const pattern = new RegExp(`\\{"revision":"[^"]+","url":"${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\}`);
  if (!pattern.test(source)) throw new Error(`Build manifest entry not found: ${path}`);
  return source.replace(pattern, JSON.stringify({ revision, url: path }));
}

test('retains tools across a real shell revision change and rejects changed model revisions', async ({ page, context }) => {
  test.setTimeout(300_000);
  const originalWorker = await readFile('dist/sw.js', 'utf8');
  const originalIndex = await readFile('dist/index.html');
  const modelPath = 'models/ner/config.json';
  const originalModel = await readFile(`dist/${modelPath}`);
  const requests: string[] = [];
  const record = (request: Request) => requests.push(new URL(request.url()).pathname);
  try {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 120_000 }).toBe(true);
    expect(await workerMessage(page, 'TOOLS_DOWNLOAD')).toEqual({ done: true });
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: true });
    const oldCache = await page.evaluate(async () => (await caches.keys()).find(name => name.startsWith('takip-core-'))!);
    const nextIndex = Buffer.concat([originalIndex, Buffer.from('\n<!-- shell update regression -->\n')]);
    const shellWorker = reviseManifest(originalWorker, 'index.html', nextIndex);
    await writeFile('dist/index.html', nextIndex);
    await writeFile('dist/sw.js', shellWorker);
    context.on('request', record);
    await activateUpdate(page);
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: true });
    const afterShell = await page.evaluate(async () => (await caches.keys()).filter(name => name.startsWith('takip-core-')));
    expect(afterShell).toHaveLength(1);
    expect(afterShell).not.toContain(oldCache);
    expect(requests.filter(path => /^\/(?:ocr|models|vision|wasm|summary)\//.test(path) || /\/assets\/(?:.*\.wasm|(?:ocr|vision|ner|summary)\.worker-.*\.js)$/.test(path))).toEqual([]);

    const nextModel = Buffer.concat([originalModel, Buffer.from('\n ')]);
    await writeFile(`dist/${modelPath}`, nextModel);
    await writeFile('dist/sw.js', reviseManifest(shellWorker, modelPath, nextModel));
    await activateUpdate(page);
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: false });
    const saved = await page.evaluate(async modelPath => {
      const names = (await caches.keys()).filter(name => name.startsWith('takip-core-'));
      const cache = await caches.open(names[0]);
      return { names, changed: Boolean(await cache.match(modelPath)), unchanged: Boolean(await cache.match('models/face.tflite')) };
    }, modelPath);
    expect(saved.names).toHaveLength(1);
    expect(saved.changed).toBe(false);
    expect(saved.unchanged).toBe(true);
    expect(requests).not.toContain(`/${modelPath}`);
    await workerMessage(page, 'PROCESS_START');
    expect(await page.evaluate(async modelPath => {
      try { await fetch(modelPath); return 'unexpected response'; } catch { return 'blocked'; }
    }, modelPath)).toBe('blocked');
    await workerMessage(page, 'PROCESS_END');
    requests.length = 0;
    expect(await workerMessage(page, 'TOOLS_DOWNLOAD')).toEqual({ done: true });
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: true });
    expect(requests).toEqual([`/${modelPath}`]);
    expect(await page.evaluate(async modelPath => {
      const name = (await caches.keys()).find(name => name.startsWith('takip-core-'))!;
      return (await (await caches.open(name)).match(modelPath))!.text();
    }, modelPath)).toBe(nextModel.toString());
  } finally {
    context.off('request', record);
    await writeFile('dist/sw.js', originalWorker);
    await writeFile('dist/index.html', originalIndex);
    await writeFile(`dist/${modelPath}`, originalModel);
  }
});

test('preserves unversioned legacy caches without trusting their models', async ({ page }) => {
  const originalWorker = await readFile('dist/sw.js', 'utf8');
  const originalIndex = await readFile('dist/index.html');
  try {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 120_000 }).toBe(true);
    const legacy = await page.evaluate(async () => {
      const name = (await caches.keys()).find(name => name.startsWith('takip-core-'))!;
      const cache = await caches.open(name);
      await cache.delete('__offline_manifest__');
      await cache.put('models/face.tflite', new Response('unverified legacy model'));
      return name;
    });
    const nextIndex = Buffer.concat([originalIndex, Buffer.from('\n<!-- legacy upgrade regression -->\n')]);
    await writeFile('dist/index.html', nextIndex);
    await writeFile('dist/sw.js', reviseManifest(originalWorker, 'index.html', nextIndex));
    await activateUpdate(page);
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: false });
    expect(await page.evaluate(async legacy => {
      const names = (await caches.keys()).filter(name => name.startsWith('takip-core-'));
      const current = await caches.open(names.find(name => name !== legacy)!);
      return { legacyRetained: names.includes(legacy), reused: Boolean(await current.match('models/face.tflite')) };
    }, legacy)).toEqual({ legacyRetained: true, reused: false });
    expect(await workerMessage(page, 'TOOLS_DOWNLOAD')).toEqual({ done: true });
    expect(await workerMessage(page, 'TOOLS_STATUS')).toEqual({ ready: true });
    expect(await page.evaluate(() => caches.keys())).not.toContain(legacy);
  } finally {
    await writeFile('dist/sw.js', originalWorker);
    await writeFile('dist/index.html', originalIndex);
  }
});

test('defers a service worker update without fetching assets while a photo is open', async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await chooseManualMode(page);

  const sample = await samplePhoto(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'sample-update-guard.png', mimeType: 'image/png', buffer: sample,
  });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('network-counter')).toHaveText(/^0 network requests .* 0 blocked attempts$/);

  const swPath = 'dist/sw.js';
  const original = await readFile(swPath);
  const requests: string[] = [];
  const record = (request: Request) => requests.push(request.url());
  context.on('request', record);
  try {
    await writeFile(swPath, Buffer.concat([
      original,
      Buffer.from(`\n// update-guard-test-${Date.now()}\n`),
    ]));

    const update = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error('Active service worker unavailable');
      return await new Promise<{ found: boolean; state: ServiceWorkerState | 'timeout' }>((resolve, reject) => {
        let found = false;
        let candidate: ServiceWorker | null = null;
        const timer = setTimeout(() => resolve({ found, state: 'timeout' }), 30_000);
        const watch = () => {
          found = true;
          candidate = registration.installing;
          if (!candidate) return;
          const check = () => {
            if (candidate?.state !== 'redundant') return;
            clearTimeout(timer);
            resolve({ found, state: candidate.state });
          };
          candidate.addEventListener('statechange', check);
          check();
        };
        registration.addEventListener('updatefound', watch, { once: true });
        registration.update().catch(error => {
          clearTimeout(timer);
          reject(new Error(`Service worker update check failed: ${String(error)}`));
        });
      });
    });

    expect(update).toEqual({ found: true, state: 'redundant' });
    const assetRequests = requests.filter(requestUrl => {
      const url = new URL(requestUrl);
      return /^https?:$/.test(url.protocol) && url.pathname !== '/sw.js';
    });
    expect(assetRequests).toEqual([]);
    await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible();
    await expect(page.getByTestId('network-counter')).toHaveText(/^0 network requests .* 0 blocked attempts$/);
  } finally {
    context.off('request', record);
    await writeFile(swPath, original);
  }
});
