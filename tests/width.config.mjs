import { defineConfig } from '@playwright/test';
export default defineConfig({ testMatch: 'width-check.spec.mjs', use: { headless: true }, reporter: 'line' });
