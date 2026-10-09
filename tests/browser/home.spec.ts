import { test, expect } from '@playwright/test';
import { chooseManualMode } from './sample';

test('home offers camera and gallery without horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Take Photo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeVisible();
  await expect(page.locator('input[capture]')).toHaveAttribute('capture', 'environment');
  await expect(page.getByText('On-device · 0 uploads', { exact: true })).toBeVisible();
  const automaticSetup = page.getByRole('button', { name: 'Download automatic checks', exact: true });
  await expect(automaticSetup).toBeVisible({ timeout: 120_000 });
  const actionLabels = await page.locator('.photo-actions button').allTextContents();
  expect(actionLabels.indexOf('Download automatic checks')).toBeLessThan(actionLabels.indexOf('Take Photo'));
  await chooseManualMode(page);
  const session = await page.context().newCDPSession(page);
  const installability = await session.send('Page.getInstallabilityErrors');
  expect(installability.installabilityErrors).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('dark mode and unavailable WebGPU retain the standard local flow', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  await page.goto('/');
  await chooseManualMode(page);
  await expect(page.getByRole('button', { name: 'Download smart summary' })).toBeDisabled();
  await expect(page.getByText('This device uses the standard local summary.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(21, 20, 15)');
  await page.screenshot({ path: testInfo.outputPath('home-dark.png'), fullPage: true });
});

test('photo actions stay disabled while saved-check status is pending', async ({ page }) => {
  await page.addInitScript(() => {
    const postMessage = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function(message, transfer) {
      if ((message as { type?: string })?.type === 'TOOLS_STATUS') {
        setTimeout(() => Reflect.apply(postMessage, this, [message, transfer]), 1_500);
        return;
      }
      Reflect.apply(postMessage, this, [message, transfer]);
    };
  });
  await page.goto('/');
  await expect(page.getByText('Saving offline editor', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take Photo', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeDisabled();
  await expect(page.getByText('Manual editor ready offline', { exact: true })).toBeVisible({ timeout: 120_000 });
});
