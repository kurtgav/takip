import { test, expect } from '@playwright/test';
import { chooseManualMode, enableAutomaticChecks, expandDetails, samplePhoto } from './sample';

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
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });
  await expandDetails(page);
  await expect(page.getByText(/sensitive items found/)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('0 sensitive items found.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Photo with permanent covers preview' })).toBeVisible();
});

test('real face, small portrait, QR, barcode and structured field detectors', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });
  await expandDetails(page);
  await expect(page.getByText(/sensitive items found/)).toBeVisible({ timeout: 120_000 });
  for (const category of ['face', 'qr_code', 'barcode', 'full_name', 'birthday', 'tin', 'phone', 'email']) {
    await expect(page.locator(`[data-category="${category}"]`).first()).toBeVisible();
  }
  await expect(page.locator('[data-category="possible_name"], [data-category="possible_location"]')).toHaveCount(0);
});

test('free-form model suggestions do not claim a verified name or home address', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black'; ctx.font = '36px Arial';
    ctx.fillText('Sarah lives in London and works in Paris.', 50, 180);
    ctx.fillText('This is a fictional sentence for a privacy test.', 50, 280);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'fictional-text.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-category="possible_location"]').first()).toBeVisible();
  await expect(page.locator('[data-category="address"], [data-category="full_name"]')).toHaveCount(0);
  await expect(page.getByText(/model suggestions, not verified personal details/)).toBeVisible();
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

test('first-run manual result can close the photo and return to explicit setup', async ({ page, context }) => {
  test.setTimeout(300_000);
  const requests: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto('/');
  await chooseManualMode(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'sample-recovery.png', mimeType: 'image/png', buffer: await samplePhoto(page),
  });
  await expect(page.getByText('Not assessed', { exact: true })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Close photo and set up checks', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cover before you share.' })).toBeVisible();
  await expect(page.getByText('Not assessed', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download automatic checks', exact: true })).toBeVisible();
  const requestsAfterRecovery = requests.length;
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(requestsAfterRecovery);
});

test('missing saved tools return to setup before opening the photo', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  const sample = await samplePhoto(page);
  await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith('takip-core-'))!;
    await (await caches.open(name)).delete('models/face.tflite');
  });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'sample-missing-tools.png', mimeType: 'image/png', buffer: sample,
  });
  await expect(page.getByRole('alert')).toContainText('Automatic checks are no longer saved on this device.');
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download automatic checks', exact: true })).toBeEnabled();
  await expect(page.getByText('Not assessed', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Photo with permanent covers preview' })).toHaveCount(0);
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
});

test('real receipt OCR separates customer contacts from merchant numbers on shared rows', async ({ page }) => {
  await page.goto('/');
  await enableAutomaticChecks(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 700;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black'; ctx.font = '34px Arial';
    ['OFFICIAL RECEIPT - SAMPLE ONLY', 'VAT CASH CHANGE',
      'Email: sample@example.invalid Order: 123', 'Phone: 0917-000-0000 Terminal: 7',
      'TIN: 123-456-789-000', 'Reference Number: 4111111111111111',
      'Terminal ID: 0917-234-5678', 'Order No.: 0917-345-6789',
    ].forEach((line, index) => ctx.fillText(line, 40, 70 + index * 75));
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'sample-receipt.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
  });
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-category="email"]')).toHaveCount(1);
  await expect(page.locator('[data-category="phone"]')).toHaveCount(1);
  await expect(page.locator('[data-category="tin"], [data-category="card_number"]')).toHaveCount(0);
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
});
