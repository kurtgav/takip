import { readFile } from 'node:fs/promises';
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer';
import { expect, type Page } from '@playwright/test';

export async function enableAutomaticChecks(page: Page): Promise<void> {
  const download = page.getByRole('button', { name: 'Download automatic checks', exact: true });
  await expect(download).toBeEnabled({ timeout: 120_000 });
  await download.click();
  await expect(page.getByText('Automatic checks ready offline', { exact: true })).toBeVisible({ timeout: 240_000 });
}

export async function chooseManualMode(page: Page): Promise<void> {
  await expect(page.getByText('Manual editor ready offline', { exact: true })).toBeVisible({ timeout: 120_000 });
  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await expect(choose).toBeDisabled();
  await page.getByRole('button', { name: 'Use manual covers instead', exact: true }).click();
  await expect(choose).toBeEnabled();
}

export async function continueToWatermark(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add a purpose watermark' })).toBeFocused();
}

export async function continueToSave(page: Page): Promise<void> {
  await continueToWatermark(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your safe copy is ready' })).toBeFocused();
}

export async function expandDetails(page: Page): Promise<void> {
  const edit = page.getByRole('button', { name: 'Edit detected details', exact: true });
  await expect(edit).toBeVisible();
  if (await edit.getAttribute('aria-expanded') === 'false') await edit.click();
  await expect(edit).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('list', { name: 'Detected items' })).toBeVisible();
}

export async function expectRequestsCached(page: Page, requestUrls: string[]): Promise<void> {
  const origin = new URL(page.url()).origin;
  expect(requestUrls.filter(requestUrl => new URL(requestUrl).origin !== origin)).toEqual([]);
  const uncached = await page.evaluate(async urls => {
    const name = (await caches.keys()).find(cacheName => cacheName.startsWith('takip-core-'));
    if (!name) return urls;
    const cache = await caches.open(name);
    const cachedUrls = new Set((await cache.keys()).map(request => request.url));
    return urls.filter(url => !cachedUrls.has(url));
  }, requestUrls);
  expect(uncached).toEqual([]);
}

export async function samplePhoto(page: Page): Promise<Buffer> {
  const face = (await readFile('tests/assets/sample-synthetic-face.png')).toString('base64');
  prepareZXingModule({ overrides: { wasmBinary: await readFile('node_modules/zxing-wasm/dist/writer/zxing_writer.wasm') } });
  const qr = await writeBarcode('SAMPLE-FAKE-RECORD-ONLY', { format: 'QRCode', scale: 6 });
  const barcode = await writeBarcode('SAMPLE12345', { format: 'Code128', scale: 3 });
  if (qr.error || barcode.error) throw new Error('Synthetic code generation failed');
  const base64 = await page.evaluate(async ({ face, qr, barcode }) => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const draw = async (source: string, x: number, y: number, width: number, height: number) => {
      const img = new Image(); img.src = source; await img.decode(); ctx.drawImage(img, x, y, width, height);
    };
    ctx.fillStyle = '#000'; ctx.font = 'bold 36px Arial'; ctx.fillText('SAMPLE — FICTIONAL PRIVACY TEST', 45, 55);
    ctx.font = '30px Arial';
    ctx.fillText('Name: Sample Person', 45, 150);
    ctx.fillText('Date of Birth: 09/10/1998', 45, 230);
    ctx.fillText('TIN: 123-456-789', 45, 310);
    ctx.fillText('Mobile: 0917 000 0000', 45, 390);
    ctx.fillText('Email: sample@example.invalid', 45, 470);
    ctx.fillText('Sarah lives in London.', 45, 550);
    await draw(`data:image/png;base64,${face}`, 930, 120, 210, 230);
    await draw(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`, 880, 450, 230, 230);
    await draw(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcode)}`, 45, 620, 500, 120);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { face, qr: qr.svg, barcode: barcode.svg });
  return Buffer.from(base64, 'base64');
}
