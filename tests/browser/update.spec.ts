import { expect, test, type Request } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { samplePhoto } from './sample';

test('defers a service worker update without fetching assets while a photo is open', async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await expect(choose).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();

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
