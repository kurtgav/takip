import { expect, test } from '@playwright/test';
import { enableAutomaticChecks, samplePhoto } from './sample';

test('guesses SAMPLE ID and applies explicit cover presets', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await enableAutomaticChecks(page);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await samplePhoto(page) });
  await expect(page.getByText('Looks like: ID', { exact: true })).toBeVisible({ timeout: 120_000 });

  await page.getByRole('button', { name: 'Add cover', exact: true }).click();
  await page.getByRole('button', { name: 'Cover entire photo', exact: true }).click();
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  await page.getByRole('button', { name: 'Seller verification', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /I checked the photo/ })).not.toBeChecked();
  await expect(page.locator('[data-category="manual"] input')).toBeChecked();
  await expect(page.locator('[data-category="full_name"] input').first()).not.toBeChecked();
  await expect(page.locator('[data-category="face"] input').first()).not.toBeChecked();
  await expect(page.locator('.detection-list input:checked')).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Cover all detected', exact: true }).click();
  const toggles = page.locator('.detection-list input');
  await expect(toggles).not.toHaveCount(0);
  await expect(page.locator('.detection-list input:not(:checked)')).toHaveCount(0);
});
