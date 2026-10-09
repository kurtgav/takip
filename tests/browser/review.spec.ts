import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { chooseManualMode, continueToSave, continueToWatermark, enableAutomaticChecks, expandDetails, samplePhoto } from './sample';

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

async function expectNoOverflow(page: Page): Promise<void> {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
}

test('reviews, edits, and exports a flattened metadata-free SAMPLE copy', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('./');
  await enableAutomaticChecks(page);

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
  await page.screenshot({ path: testInfo.outputPath('cover-collapsed.png'), fullPage: true });
  await expandDetails(page);
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

  await page.locator('.detection-list .chip').first().click();
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

  await continueToSave(page);
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

  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const automaticDetections = page.locator('.detection-list li:not([data-category="manual"])');
  while (await automaticDetections.count()) {
    await automaticDetections.first().getByRole('button', { name: /^Remove / }).click();
  }
  await expect(page.locator('.detection-list li')).toHaveCount(1);
  await expect(page.locator('[data-category="manual"]')).toHaveCount(1);
  await expect(page.getByText('Low risk', { exact: true })).toBeVisible();
  await expect(page.locator('.summary')).toHaveText('Nothing sensitive was detected, but this does not guarantee the image is safe. Review the image carefully before sharing.');
  await continueToSave(page);
  await expect(page.getByRole('checkbox', { name: /I checked the photo/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Save safe copy', exact: true })).toBeDisabled();
  await expect(page.getByText('Location data removed. Original stays on your device.')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('back navigation retains edits and later edits invalidate review confirmation', async ({ page }, testInfo) => {
  await page.goto('./');
  await chooseManualMode(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });

  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit detected details', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('list', { name: 'Detected items' })).toBeVisible();
  await continueToWatermark(page);
  const previewPixel = await page.locator('.photo-surface img').evaluate(async element => {
    const image = element as HTMLImageElement; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  });
  expect(previewPixel).toEqual([0x14, 0x28, 0x1f, 0xff]);
  await expect(page.getByRole('button', { name: /^Uncover / })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Add a purpose watermark' }).check();
  await page.getByLabel('Sending to', { exact: true }).fill('SAMPLE Recipient');
  await page.getByLabel('Purpose', { exact: true }).fill('SAMPLE verification');
  await expectNoOverflow(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('watermark-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('1 private detail covered', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Uncover / })).toHaveCount(0);
  await expectNoOverflow(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('save-ready.png'), fullPage: true });
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();

  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Sending to', { exact: true })).toHaveValue('SAMPLE Recipient');
  await expect(page.getByLabel('Purpose', { exact: true })).toHaveValue('SAMPLE verification');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-category="manual"] input')).toBeChecked();
  await page.locator('[data-category="manual"]').getByRole('button', { name: /^Remove / }).click();
  await expect(page.locator('[data-category="manual"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo remove', exact: true }).click();
  await expect(page.locator('[data-category="manual"] input')).toBeChecked();
  await page.locator('[data-category="manual"] input').uncheck();

  await continueToSave(page);
  await expect(page.getByText('Watermark for SAMPLE Recipient', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /I checked the photo/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Save safe copy', exact: true })).toBeDisabled();
});

test('watermark typing keeps the mobile form stable and inside the viewport', async ({ page }) => {
  await page.addInitScript(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      toBlob.call(this, blob => window.setTimeout(() => callback(blob), 500), type, quality);
    };
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('./');
  await chooseManualMode(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByRole('heading', { name: 'Check every detail' })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
  await continueToWatermark(page);
  await page.getByRole('checkbox', { name: 'Add a purpose watermark' }).check();

  const recipient = page.getByLabel('Sending to', { exact: true });
  await expect(recipient).toBeVisible();
  await expect(page.locator('.preview-status')).toHaveText('');
  const before = await recipient.evaluate(element => ({
    top: element.getBoundingClientRect().top + scrollY,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
  }));
  await recipient.pressSequentially('S');
  await expect(page.locator('.preview-status')).toHaveText('Updating covered preview…');
  const after = await recipient.evaluate(element => ({
    top: element.getBoundingClientRect().top + scrollY,
    right: element.getBoundingClientRect().right,
    focused: document.activeElement === element,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(after.top).toBeCloseTo(before.top, 0);
  expect(after.right).toBeLessThanOrEqual(320);
  expect(after.scrollWidth).toBeLessThanOrEqual(320);
  expect(after.focused).toBe(true);
  expect(before.fontSize).toBeGreaterThanOrEqual(16);
});
