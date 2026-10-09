import { expect, test, type Page } from '@playwright/test';
import { chooseManualMode, continueToWatermark, samplePhoto } from './sample';

async function processing(page: Page, type: 'PROCESS_START' | 'PROCESS_END') {
  return page.evaluate(async messageType => {
    return await new Promise<{ requests?: number; blocked?: number; error?: string }>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Photo guard did not respond')); }, 5000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      navigator.serviceWorker.controller!.postMessage({ type: messageType }, [channel.port2]);
    });
  }, type);
}

async function probe(page: Page, method = 'GET') {
  return page.evaluate(async requestMethod => {
    try {
      await fetch(new URL('__security_probe__', location.href), {
        method: requestMethod,
        ...(requestMethod === 'POST' ? { body: 'SYNTHETIC-PRIVATE-DATA' } : {}),
        signal: AbortSignal.timeout(5000),
      });
      return 'allowed';
    } catch (error) {
      return error instanceof DOMException && error.name === 'TimeoutError' ? 'timed out' : 'blocked';
    }
  }, method);
}

test('photo guard covers all tabs, blocks writes, and only its owner can release it', async ({ page, context }) => {
  await page.goto('/');
  await chooseManualMode(page);
  const second = await context.newPage();
  await second.goto('/');
  await chooseManualMode(second);
  expect(await processing(page, 'PROCESS_START')).toEqual({ requests: 0, blocked: 0 });
  expect(await probe(page)).toBe('blocked');
  expect(await probe(page, 'POST')).toBe('blocked');
  expect(await probe(second)).toBe('blocked');
  expect(await processing(second, 'PROCESS_END')).toEqual({ requests: 0, blocked: 0 });
  expect(await probe(second)).toBe('blocked');
  expect(await page.evaluate(async () => (await fetch(new URL('index.html', location.href))).ok)).toBe(true);
  expect(await page.evaluate(async () => {
    const cache = await caches.open('takip-processing-guards');
    const guards = await cache.keys();
    return await Promise.all(guards.map(async key => (await cache.match(key))!.text()));
  })).toEqual([expect.stringMatching(/^[1-9]\d*$/)]);
  await page.close();
  expect(await probe(second)).toBe('allowed');
  expect(await probe(second, 'POST')).toBe('blocked');
  expect(await second.evaluate(async () => (await (await caches.open('takip-processing-guards')).keys()).length)).toBe(0);
});

async function savedState(page: Page) {
  return page.evaluate(async () => {
    const files: { cache: string; url: string; hash: string }[] = [];
    for (const name of (await caches.keys()).sort()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = (await cache.match(request))!;
        if (name === 'takip-processing-guards') {
          if (!/^\d+$/.test(await response.text())) throw new Error('Photo guard persisted non-numeric content');
          continue;
        }
        const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
        files.push({ cache: name, url: request.url, hash: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') });
      }
    }
    return {
      files: files.sort((left, right) => `${left.cache}/${left.url}`.localeCompare(`${right.cache}/${right.url}`)),
      local: { ...localStorage },
      session: { ...sessionStorage },
      databases: await indexedDB.databases(),
    };
  });
}

test('CSP blocks off-origin requests and photo editing persists only anonymous guards', async ({ page, context }) => {
  await page.goto('/');
  await chooseManualMode(page);
  const violation = await page.evaluate(async () => {
    const blocked = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Expected CSP violation did not occur')), 5000);
      document.addEventListener('securitypolicyviolation', event => { clearTimeout(timer); resolve(event.effectiveDirective); }, { once: true });
    });
    await fetch('https://privacy-probe.invalid/SYNTHETIC-PRIVATE-DATA').catch(() => {});
    return await blocked;
  });
  expect(violation).toBe('connect-src');
  const before = await savedState(page);
  expect(before.local).toEqual({});
  expect(before.session).toEqual({});
  expect(before.databases).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({
    name: 'SYNTHETIC-PRIVATE-PHOTO.png', mimeType: 'image/png', buffer: await samplePhoto(page),
  });
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toBeVisible();
  await continueToWatermark(page);
  await page.getByRole('checkbox', { name: 'Add a purpose watermark' }).check();
  await page.getByLabel('Sending to', { exact: true }).fill('SYNTHETIC PRIVATE RECIPIENT');
  await page.getByLabel('Purpose', { exact: true }).fill('SYNTHETIC PRIVATE PURPOSE');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox', { name: /I checked the photo/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save safe copy', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('takip-safe-copy.png');
  expect(await savedState(page)).toEqual(before);
  expect(await context.cookies()).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cover before you share.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your details. Your decision.' })).toHaveCount(0);
  expect(await savedState(page)).toEqual(before);
});
