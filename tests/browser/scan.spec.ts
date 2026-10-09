import { test, expect } from '@playwright/test';
import { samplePhoto } from './sample';

test('real local OCR covers SAMPLE sensitive text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
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
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByText(/sensitive items found/)).toBeVisible({ timeout: 120_000 });
  for (const category of ['face', 'qr_code', 'barcode', 'full_name', 'birthday', 'tin', 'phone', 'email', 'address']) {
    await expect(page.locator(`[data-category="${category}"]`).first()).toBeVisible();
  }
});
