import { test, expect } from '@playwright/test';
import { enableAutomaticChecks, samplePhoto } from './sample';

test.describe.configure({ timeout: 300_000 });

test('real local OCR covers SAMPLE sensitive text', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1000, 600);
    ctx.fillStyle = 'black'; ctx.font = 'bold 40px Arial';
    ctx.fillText('SAMPLE - MADE UP DETAILS', 50, 70);
    ctx.font = '32px Arial';
    ctx.fillText('Name: Sample Person', 50, 170);
    ctx.fillText('Mobile: 0917 000 0000', 50, 260);
    ctx.fillText('TIN: 123-456-789', 50, 350);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByText(/sensitive items found/)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('0 sensitive items found.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Photo with permanent covers preview' })).toBeVisible();
});

test('real face, small portrait, QR, barcode and NER detectors', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByText(/sensitive items found/)).toBeVisible({ timeout: 120_000 });
  for (const category of ['face', 'qr_code', 'barcode', 'full_name', 'birthday', 'tin', 'phone', 'email', 'address']) {
    await expect(page.locator(`[data-category="${category}"]`).first()).toBeVisible();
  }
});

test('automatic-check failure keeps the photo available for manual covering', async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes('pipeline.worker')) throw new Error('Synthetic pipeline startup failure');
        super(url, options);
      }
    };
  });
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'sample-fallback.png', mimeType: 'image/png', buffer: await samplePhoto(page),
  });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('Not assessed', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summary-source')).toHaveText('Manual editing');
  await expect(page.getByText('Automatic checks stopped. Your photo is still here; use Add cover to hide details manually.')).toBeVisible();
  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
  await expect(page.locator('[data-category="manual"]')).toHaveCount(1);
});
