import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './tests/browser', timeout: 180_000, workers: 1,
  outputDir: path.join(os.tmpdir(), 'takip-playwright'),
  use: { baseURL: 'http://localhost:4173', headless: true, viewport: { width: 390, height: 844 } },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: false },
});
