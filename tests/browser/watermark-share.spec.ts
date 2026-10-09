import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { enableAutomaticChecks, samplePhoto } from './sample';

test.describe.configure({ timeout: 300_000 });

test('watermark appears in flattened export and unsupported sharing downloads', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true }));
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  const before = await page.locator('.photo-surface img').getAttribute('src');
  await page.getByRole('checkbox', { name: 'Add a purpose watermark' }).check();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await page.getByLabel('Sending to', { exact: true }).fill('SAMPLE Recipient');
  await page.getByLabel('Purpose', { exact: true }).fill('SAMPLE verification');
  await expect(page.locator('.photo-surface img')).not.toHaveAttribute('src', before!);
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share safe copy', exact: true }).click();
  const bytes = await readFile(await (await download).path());
  const changed = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(600, 100, 200, 500).data;
    let changed = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) changed++;
    return changed;
  }, bytes.toString('base64'));
  expect(changed).toBeGreaterThan(100);
  await expect(page.getByText('Location data removed. Original stays on your device.')).toBeVisible();
});

test('native share receives only the flattened PNG and cancellation is not success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: async (data: ShareData) => {
      if (data.files?.length !== 1 || data.files[0].type !== 'image/png' || data.files[0].name !== 'takip-safe-copy.png') throw new Error('Wrong shared file');
      throw new DOMException('Cancelled by synthetic test', 'AbortError');
    }, configurable: true });
  });
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  await page.getByRole('button', { name: 'Share safe copy', exact: true }).click();
  await expect(page.getByText('Share cancelled. Your covered copy is still here.')).toBeVisible();
  await expect(page.getByText('Location data removed. Original stays on your device.')).toHaveCount(0);
});
