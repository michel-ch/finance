import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  testMatch: 'qa-pages-1.spec.mjs',
  globalSetup: path.join(__dirname, 'qa-pages-1.global-setup.mjs'),
  globalTeardown: path.join(__dirname, 'qa-pages-1.global-teardown.mjs'),
  use: { headless: true, viewport: { width: 1280, height: 800 } },
  reporter: 'line',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
});
