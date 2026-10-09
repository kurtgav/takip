import { test, expect } from '@playwright/test';

test('home offers camera and gallery without horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Take Photo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeVisible();
  await expect(page.locator('input[capture]')).toHaveAttribute('capture', 'environment');
  await expect(page.getByText('On-device · 0 uploads', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
