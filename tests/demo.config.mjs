import { defineConfig } from '@playwright/test';
export default defineConfig({ testMatch: 'demo-seed.spec.mjs', use: { headless: true, viewport: { width: 1280, height: 800 } }, reporter: 'line', timeout: 30000 });
