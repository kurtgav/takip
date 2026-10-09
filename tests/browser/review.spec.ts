import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { samplePhoto } from './sample';

const PNG_SIGNATURE_BYTES = 8;
const PRIVATE_MARKER = 'TAKIP_PRIVATE_MARKER_SAMPLE_ONLY';
const forbiddenMetadataChunks = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt']);

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])) >>> 0, 8 + data.length);
  return chunk;
}

function withSyntheticMetadata(png: Buffer): Buffer {
  const ihdrLength = png.readUInt32BE(PNG_SIGNATURE_BYTES);
  const ihdrEnd = PNG_SIGNATURE_BYTES + 12 + ihdrLength;
  const marker = pngChunk('tEXt', Buffer.from(`Comment\0${PRIVATE_MARKER}`, 'latin1'));
  return Buffer.concat([png.subarray(0, ihdrEnd), marker, png.subarray(ihdrEnd)]);
}

function pngChunks(png: Buffer): string[] {
  assertPng(png);
  const chunks: string[] = [];
  let offset = PNG_SIGNATURE_BYTES;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > png.length) throw new Error(`Invalid PNG chunk ${type}`);
    chunks.push(type);
    offset = end;
    if (type === 'IEND') break;
  }
  return chunks;
}

function assertPng(png: Buffer): void {
  expect(png.subarray(0, PNG_SIGNATURE_BYTES)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

test('reviews, edits, and exports a flattened metadata-free SAMPLE copy', async ({ page }) => {
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/');

  const input = withSyntheticMetadata(await samplePhoto(page));
  expect(input.includes(Buffer.from(PRIVATE_MARKER))).toBe(true);
  expect(pngChunks(input)).toContain('tEXt');

  const choose = page.getByRole('button', { name: 'Choose Photo', exact: true });
  await expect(choose).toBeEnabled({ timeout: 60_000 });
  await page.getByLabel('Choose photo').setInputFiles({
    name: 'sample-with-synthetic-metadata.png',
    mimeType: 'image/png',
    buffer: input,
  });

  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('High risk', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Detected items' }).locator('li')).not.toHaveCount(0);

  const before = page.getByRole('button', { name: 'Before', exact: true });
  const after = page.getByRole('button', { name: 'After', exact: true });
  await before.click();
  await expect(before).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByAltText('Original photo before covers')).toBeVisible();
  await after.click();
  await expect(after).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByAltText('Photo with permanent covers preview')).toBeVisible();

  const firstToggle = page.getByRole('checkbox', { name: /^Cover / }).first();
  await firstToggle.uncheck();
  await expect(page.getByText(/1 detected item remains visible/)).toBeVisible();
  await firstToggle.check();
  await expect(page.getByText(/remains visible/)).toHaveCount(0);

  await page.locator('.chip').first().click();
  await expect(page.locator('.cover-hit.highlighted')).toHaveCount(1);

  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  const surface = page.locator('.photo-surface');
  const bounds = await surface.boundingBox();
  if (!bounds) throw new Error('Photo surface has no bounds');
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.75);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.85, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('[data-category="manual"]')).toHaveCount(1);
  await expect(page.locator('.cover-hit.highlighted')).toHaveAttribute('aria-label', /Manual cover/);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(os.tmpdir(), `takip-review-${width}.png`), fullPage: true });
  }

  const save = page.getByRole('button', { name: 'Save safe copy', exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  await expect(save).toBeEnabled({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download');
  await save.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('takip-safe-copy.png');
  const output = await readFile(await download.path());

  assertPng(output);
  expect(output.includes(Buffer.from(PRIVATE_MARKER))).toBe(false);
  expect(pngChunks(output).filter(type => forbiddenMetadataChunks.has(type))).toEqual([]);
  const pixel = await page.evaluate(async ({ image, x, y }) => {
    const bytes = Uint8Array.from(atob(image), character => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    return [...context.getImageData(x, y, 1, 1).data];
  }, { image: output.toString('base64'), x: 720, y: 640 });
  expect(pixel).toEqual([0x14, 0x28, 0x1f, 0xff]);
  await expect(page.getByText('Location data removed. Original stays on your device.')).toBeVisible();
  expect(browserErrors).toEqual([]);
});
