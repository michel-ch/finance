import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'qa-pages-2.spec.mjs',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
  },
});
