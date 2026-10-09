import { expect, test, webkit, type Route } from '@playwright/test';
import { chooseManualMode, continueToSave, enableAutomaticChecks, expectRequestsCached, samplePhoto } from './sample';

function isToolRequest(requestUrl: string): boolean {
  const pathname = new URL(requestUrl).pathname;
  return /\/(?:ocr|models|vision|wasm|summary)\//.test(pathname)
    || /\/assets\/(?:[^/]+\.wasm|(?:ocr|vision|ner|summary)\.worker-[^/]+\.js)$/.test(pathname);
}

test('automatic checks report failed downloads and retry reuses completed files', async ({ page, context }) => {
  test.setTimeout(300_000);
  let failModel = true;
  const fetched: string[] = [];
  await context.route('**/*', async route => {
    const url = route.request().url();
    fetched.push(url);
    if (failModel && url.endsWith('/models/ner/onnx/model_quantized.onnx')) {
      await route.fulfill({ status: 503, body: 'Temporarily unavailable' });
    } else await route.continue();
  });
  await page.goto('/');
  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await page.getByRole('button', { name: 'Download automatic checks', exact: true }).click();
  await expect(page.getByText(/Saving local tools: file/)).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('HTTP 503', { timeout: 120_000 });
  await expect(choose).toBeDisabled();
  const completed = await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith('takip-core-'));
    if (!name) return [];
    return (await (await caches.open(name)).keys()).map(request => request.url);
  });
  expect(completed.length).toBeGreaterThan(0);
  await page.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration())?.installing);
  fetched.length = 0;
  failModel = false;
  await page.getByRole('button', { name: 'Download automatic checks', exact: true }).click();
  await expect(page.getByText('Automatic checks ready offline', { exact: true })).toBeVisible({ timeout: 240_000 });
  expect(fetched.filter(url => completed.includes(url))).toEqual([]);
  await expect(page.getByText('Editor and checks ready offline', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use manual covers instead', exact: true }).click();
  const useAutomatic = page.getByRole('button', { name: 'Use automatic checks', exact: true });
  await expect(useAutomatic).toBeVisible();
  await useAutomatic.click();
  await expect(page.getByText('Editor and checks ready offline', { exact: true })).toBeVisible();
});

test('fresh offline reload scans and exports with zero processing requests', async ({ page, context }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await enableAutomaticChecks(page);
  await expect(page.getByText('Editor and checks ready offline', { exact: true })).toBeVisible();
  const sample = await samplePhoto(page);
  await context.setOffline(true);
  await page.reload();
  await expect(choose).toBeEnabled({ timeout: 120_000 });
  const requests: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample-offline.png', mimeType: 'image/png', buffer: sample });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-category="face"]')).toHaveCount(1);
  await expect(page.locator('[data-category="qr_code"]')).toHaveCount(1);
  await continueToSave(page);
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save safe copy' }).click();
  expect((await download).suggestedFilename()).toBe('takip-safe-copy.png');
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
  await test.step('verify processing requests were served from the offline cache', async () => {
    await expectRequestsCached(page, requests);
  });

  // A suspended/restarted service worker must retain the cache-only processing guard.
  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await test.step('restore network emulation before stopping service workers', async () => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([
        context.setOffline(false),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Restoring network emulation timed out after 15 seconds.')), 15_000); }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  });
  await test.step('stop service workers', async () => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([
        cdp.send('ServiceWorker.stopAllWorkers'),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Stopping service workers timed out after 15 seconds.')), 15_000); }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  });
  const probe = await test.step('probe uncached request after service-worker restart', async () => {
    return await page.evaluate(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        await fetch('/__test_uncached_privacy_probe__', { signal: controller.signal });
        return 'allowed';
      } catch {
        return controller.signal.aborted ? 'timed out' : 'blocked';
      } finally {
        clearTimeout(timer);
      }
    });
  });
  expect(probe).toBe('blocked');
  // Chromium can retry a failed intercepted fetch; each blocked attempt is counted.
  await expect(page.getByTestId('network-counter')).toHaveText(/^0 network requests · [1-9]\d* blocked attempts$/);
});

test('WebKit caches local tools and reloads the app offline', async ({ baseURL }) => {
  test.setTimeout(300_000);
  const browser = await webkit.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await enableAutomaticChecks(page);
    expect(await page.evaluate(async () => {
      const name = (await caches.keys()).find(name => name.startsWith('takip-core-'));
      return name ? !!await (await caches.open(name)).match(new URL('models/ner/onnx/model_quantized.onnx', location.href).href) : false;
    })).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Cover before you share.' })).toBeVisible();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  } finally { await browser.close(); }
});

test('WebKit reloads offline and exports a manually covered photo', async ({ baseURL }) => {
  const browser = await webkit.launch();
  try {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    await chooseManualMode(page);
    const sample = await samplePhoto(page);
    await context.setOffline(true);
    await page.reload();
    await chooseManualMode(page);
    const requests: string[] = [];
    context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: sample });
    await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Not assessed', { exact: true })).toBeVisible();
    await expect(page.getByTestId('summary-source')).toHaveText('Manual editing');
    await page.getByRole('button', { name: 'Add cover', exact: true }).click();
    await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
    await expect(page.locator('[data-category="manual"]')).toHaveCount(1);
    await continueToSave(page);
    await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save safe copy' }).click();
    expect((await download).suggestedFilename()).toBe('takip-safe-copy.png');
    expect(requests).toEqual([]);
    await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
  } finally { await browser.close(); }
});

test('manual editor starts without heavy requests and edits offline', async ({ page, context }) => {
  const requests: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto('/');
  await chooseManualMode(page);
  expect(requests.filter(isToolRequest)).toEqual([]);

  const sample = await samplePhoto(page);
  await context.setOffline(true);
  await page.reload();
  await chooseManualMode(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample-manual.png', mimeType: 'image/png', buffer: sample });
  await expect(page.getByText('Not assessed', { exact: true })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
  await continueToSave(page);
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save safe copy' }).click();
  expect((await download).suggestedFilename()).toBe('takip-safe-copy.png');
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
});

test('cancelled automatic-check download can retry from saved files', async ({ page, context }) => {
  test.setTimeout(300_000);
  let heldRoute: Route | undefined;
  let releaseRoute: (() => void) | undefined;
  const intercepted = new Promise<void>(resolve => { releaseRoute = resolve; });
  await context.route('**/*', async route => {
    if (!heldRoute && isToolRequest(route.request().url())) {
      heldRoute = route;
      releaseRoute?.();
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Download automatic checks', exact: true })).toBeEnabled({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Download automatic checks', exact: true }).click();
  await intercepted;
  await page.getByRole('button', { name: 'Cancel download', exact: true }).click();
  await heldRoute?.abort('aborted').catch(() => {});
  await expect(page.getByRole('alert')).toContainText('Tool download cancelled', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeDisabled();
  await enableAutomaticChecks(page);
});
