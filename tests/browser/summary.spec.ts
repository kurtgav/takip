import { expect, test } from '@playwright/test';
import { enableAutomaticChecks, expectRequestsCached, samplePhoto } from './sample';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-features=Vulkan'] } });

test('optional local LLM produces a bounded explanation without processing requests', async ({ page, context }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', event => { if (event.data?.type === 'error') console.info('Worker initialization error:', event.data.error); });
      }
    };
  });
  page.on('console', message => { if (message.text().startsWith('Worker initialization error:')) console.info(message.text()); });
  await page.goto('/');
  await enableAutomaticChecks(page);
  const sample = await samplePhoto(page);
  const summarySection = page.locator('section.smart-summary').filter({ has: page.getByRole('heading', { name: 'Optional smart summary' }) });
  await summarySection.getByRole('button', { name: 'Download smart summary' }).click();
  await expect(summarySection.getByRole('status')).toContainText(/Smart summary ready on this device|Smart summary is unavailable/, { timeout: 240_000 });
  await expect(page.getByRole('button', { name: 'Smart summary ready', exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Choose Photo', exact: true })).toBeEnabled({ timeout: 120_000 });
  await summarySection.getByRole('button', { name: 'Download smart summary' }).click();
  await expect(summarySection.getByRole('status')).toContainText(/Smart summary ready on this device|Smart summary is unavailable/, { timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Smart summary ready', exact: true })).toBeVisible();
  const requests: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'sample-llm.png', mimeType: 'image/png', buffer: sample });
  await expect(page.getByTestId('summary-source')).toContainText('Local model summary', { timeout: 45_000 });
  const text = await page.locator('.summary').innerText();
  expect(text.split(/[.!?](?:\s|$)/).filter(Boolean).length).toBeLessThanOrEqual(3);
  expect(text).not.toContain('Sample Person');
  expect(text).not.toContain('sample@example.invalid');
  await expect(page.getByTestId('network-counter')).toHaveText('0 network requests · 0 blocked attempts');
  await expectRequestsCached(page, requests);
});
