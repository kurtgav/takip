import { test, expect } from '@playwright/test';

test('home offers camera and gallery without horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Take Photo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeVisible();
  await expect(page.locator('input[capture]')).toHaveAttribute('capture', 'environment');
  await expect(page.getByText('On-device · 0 uploads', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
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
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Download smart summary' })).toBeDisabled();
  await expect(page.getByText('This device uses the standard local summary.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(19, 33, 28)');
  await page.screenshot({ path: testInfo.outputPath('home-dark.png'), fullPage: true });
});
