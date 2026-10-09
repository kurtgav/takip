import { expect, test } from '@playwright/test';
import { samplePhoto } from './sample';

test('fresh offline reload scans and exports with zero processing requests', async ({ page, context }) => {
  await page.goto('/');
  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await expect(choose).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();
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
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save safe copy' }).click();
  expect((await download).suggestedFilename()).toBe('takip-safe-copy.png');
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
  expect(requests).toEqual([]);

  // A suspended/restarted service worker must retain the cache-only processing guard.
  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await context.setOffline(false);
  const blocked = await page.evaluate(async () => {
    try { await fetch('/__test_uncached_privacy_probe__'); return false; } catch { return true; }
  });
  expect(blocked).toBe(true);
  // Chromium can retry a failed intercepted fetch; each blocked attempt is counted.
  await expect(page.getByTestId('network-counter')).toHaveText(/^0 network requests · [1-9]\d* blocked attempts$/);
});
