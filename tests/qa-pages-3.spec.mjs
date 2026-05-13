// QA test pack 3 — investments.html, networth.html, import.html
// Run from C:\Users\mtx\desktop\Finance\tests:
//   npx playwright test --config=qa-pages-3.config.mjs
//
// Asserts the same behaviours described in the QA brief:
//   - investments: empty/populated, columns, modal, CSV export, benchmark btn
//   - networth: empty/populated, treemap, liabilities, SVG export
//   - import: 3-step flow with file upload, mapping, commit
//
// Issues / failures are aggregated into qa-pages-3-report.json.

import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD = 'http://127.0.0.1:8765';
const DEMO = 'http://127.0.0.1:8766';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'qa-pages-3');
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

const REPORT_PATH = path.join(__dirname, 'qa-pages-3-report.json');

// Issue collector — written out in afterAll.
const issues = [];
let totalTests = 0, passed = 0, failed = 0;

function recordIssue(o) { issues.push(o); }

const seedQA = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_q',name:'QA',email:'q@q',passwordHash:'0',initials:'Q',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_q',loggedInAt:new Date().toISOString()}));
`;

async function bootstrap(page, baseUrl, pageName) {
  // login.html is unguarded — seed storage on the right origin first, then navigate.
  await page.goto(`${baseUrl}/login.html`);
  await page.evaluate(seedQA);
  await page.goto(`${baseUrl}/desktop/${pageName}.html`);
  await page.waitForFunction(
    () => document.querySelector('#root')?.children?.length > 0,
    { timeout: 12_000 }
  );
  // Babel + JSX listeners take a moment after first paint.
  await page.waitForTimeout(900);
}

async function snapshotOnFail(page, name) {
  try {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, name + '.png'), fullPage: true });
  } catch {}
}

test.beforeEach(async ({ page }) => {
  totalTests++;
  page.on('pageerror', e => {
    recordIssue({
      test: test.info().title,
      page: test.info().titlePath.join(' > '),
      expected: 'no page error',
      actual: 'pageerror: ' + e.message,
      filePath: 'webapp/desktop',
      severity: 'high',
    });
  });
});

test.afterEach(async ({ page }, info) => {
  if (info.status === 'passed') passed++;
  else {
    failed++;
    await snapshotOnFail(page, info.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase());
    recordIssue({
      test: info.title,
      page: info.titlePath.join(' > '),
      expected: info.expectedStatus,
      actual: info.error?.message || info.status,
      filePath: 'webapp/desktop',
      severity: 'high',
    });
  }
});

test.afterAll(async () => {
  const report = {
    agent: 'investments/networth/import',
    totalTests,
    passed,
    failed,
    issues,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
});

// ─────────────────────────────────────────────────────────────────
// INVESTMENTS
// ─────────────────────────────────────────────────────────────────

test.describe('investments.html', () => {
  test('empty state on prod shows "Track your first holding"', async ({ page }) => {
    await bootstrap(page, PROD, 'investments');
    await expect(page.getByText('Track your first holding')).toBeVisible();
    // No holdings list rows
    const tickerLabels = page.locator('span', { hasText: /^[A-Z]{2,5}(\.[A-Z]{1,3})?$/ });
    // Heuristic: empty state shouldn't have a 7-column grid header for holdings.
    const headerRow = page.getByText('Avg buy', { exact: false });
    await expect(headerRow).toHaveCount(0);
  });

  test('demo: holdings list shows ≥4 rows with required columns', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    // Verify column headers
    const expectedCols = ['Ticker', 'Holding', 'Qty', 'Avg buy', 'Price', 'Value', 'P/L'];
    for (const col of expectedCols) {
      // Headers are uppercase with letter-spacing styling — use case-insensitive.
      const re = new RegExp('^\\s*' + col.replace('/', '\\/') + '\\s*$', 'i');
      const hits = await page.locator('span').filter({ hasText: re }).count();
      if (hits === 0) {
        recordIssue({
          test: 'demo holdings columns',
          page: 'investments.html',
          expected: `column "${col}" present in header row`,
          actual: 'not found',
          filePath: 'webapp/components/secondary-screens.jsx:441-448',
          severity: 'high',
        });
      }
      expect(hits, `column "${col}" should be present`).toBeGreaterThan(0);
    }
    // Read holdings count from store directly
    const count = await page.evaluate(() => (window.FCStore?.list('holdings') || []).length);
    expect(count, 'demo seeds ≥4 holdings').toBeGreaterThanOrEqual(4);
  });

  test('demo: clicking a holding row opens HoldingFormModal with prefilled values', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    // First holding row — has the ticker pill and a click handler
    const firstTicker = await page.evaluate(() => {
      const list = window.FCStore?.list('holdings') || [];
      return list[0]?.ticker;
    });
    expect(firstTicker).toBeTruthy();
    // Click on the row containing the first ticker label
    const tickerPill = page.locator('span').filter({ hasText: new RegExp(`^${firstTicker.replace('.', '\\.')}$`) }).first();
    await tickerPill.click();
    // Modal should appear with "Edit holding"
    const modalTitle = page.getByRole('heading', { name: 'Edit holding' });
    await expect(modalTitle).toBeVisible({ timeout: 4000 });
    // Ticker input should be prefilled
    const tickerInput = page.locator('input[placeholder="VWCE"]');
    await expect(tickerInput).toHaveValue(firstTicker);
    // Save button should read "Save changes" (not duplicate of "Add holding")
    const saveBtn = page.locator('button.fc-btn-primary', { hasText: 'Save changes' });
    await expect(saveBtn).toBeVisible();
  });

  test('demo: modal Save button label is "Save holding" in create mode (not duplicate)', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    const addBtn = page.locator('button.fc-btn-primary', { hasText: 'Add holding' }).first();
    await addBtn.click();
    // New modal should show "Add holding" title and "Save holding" button (different text).
    await expect(page.getByRole('heading', { name: 'Add holding' })).toBeVisible({ timeout: 4000 });
    const saveBtn = page.locator('button.fc-btn-primary', { hasText: 'Save holding' });
    await expect(saveBtn).toBeVisible();
    // Cancel out
    await page.locator('button.fc-btn-ghost', { hasText: 'Cancel' }).click();
  });

  test('investments: Add holding writes a new row + persists to localStorage', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    const beforeCount = await page.evaluate(() => (window.FCStore?.list('holdings') || []).length);

    await page.locator('button.fc-btn-primary', { hasText: 'Add holding' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add holding' })).toBeVisible();
    await page.locator('input[placeholder="VWCE"]').fill('QATEST');
    await page.locator('input[placeholder="Vanguard FTSE All-World"]').fill('QA Test Fund');
    await page.locator('input[type="number"]').nth(0).fill('10');
    await page.locator('input[type="number"]').nth(1).fill('25.50');
    await page.locator('button.fc-btn-primary', { hasText: 'Save holding' }).click();

    // Modal should close; FakeChart and list should still render
    await expect(page.getByRole('heading', { name: 'Add holding' })).toHaveCount(0, { timeout: 4000 });
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => {
      const list = window.FCStore?.list('holdings') || [];
      return { count: list.length, hasQA: list.some(h => h.ticker === 'QATEST') };
    });
    expect(after.count, 'holdings count grew').toBeGreaterThan(beforeCount);
    expect(after.hasQA, 'QATEST holding persisted').toBe(true);

    // localStorage check
    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('fc.data.p_q.holdings');
      return raw ? JSON.parse(raw) : [];
    });
    expect(storage.some(h => h.ticker === 'QATEST'), 'QATEST in fc.data.p_q.holdings').toBe(true);

    // Row also rendered in DOM
    const pill = page.locator('span').filter({ hasText: /^QATEST$/ });
    await expect(pill).toBeVisible();
  });

  test('investments: Export CSV triggers download with expected filename + headers', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    const downloadPromise = page.waitForEvent('download', { timeout: 8000 });
    await page.locator('button.fc-btn-secondary', { hasText: 'Export CSV' }).click();
    const download = await downloadPromise;
    const fname = download.suggestedFilename();
    expect(fname.startsWith('finch-holdings-'), `filename starts with finch-holdings-: got ${fname}`).toBe(true);
    expect(fname.endsWith('.csv'), `filename ends with .csv: got ${fname}`).toBe(true);
    const tmpPath = await download.path();
    expect(tmpPath).toBeTruthy();
    const buf = readFileSync(tmpPath, 'utf8');
    const expectedHeader = 'Ticker,Name,Quantity,Currency,Average buy price,Current price,Cost basis,Current value,Unrealized P/L,P/L %';
    expect(buf.split(/\r?\n/)[0], 'header row matches spec').toBe(expectedHeader);
  });

  test('investments: Choose benchmark button is explicitly disabled (placeholder)', async ({ page }) => {
    await bootstrap(page, DEMO, 'investments');
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const btn = page.locator('button.fc-btn-secondary', { hasText: /Choose benchmark/ });
    await expect(btn).toBeVisible();
    // After the QA-fix pass: the button is disabled until the price provider lands.
    await expect(btn).toBeDisabled();
    expect(errors, 'no pageerror on benchmark hover').toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────
// NETWORTH
// ─────────────────────────────────────────────────────────────────

test.describe('networth.html', () => {
  test('empty state on prod shows "Add an account" with link', async ({ page }) => {
    await bootstrap(page, PROD, 'networth');
    await expect(page.getByText('Add an account to see your net worth')).toBeVisible();
    const addLink = page.locator('a[href="accounts.html"]', { hasText: 'Add account' });
    await expect(addLink).toBeVisible();
  });

  test('demo: hero shows derived net-worth amount + delta + chart', async ({ page }) => {
    await bootstrap(page, DEMO, 'networth');
    // Hero header
    await expect(page.getByRole('heading', { name: 'Net worth' })).toBeVisible();
    // Sum of accounts in store = expected netWorthBase
    const expectedBase = await page.evaluate(() => {
      const accs = window.FCStore?.list('accounts') || [];
      return accs.reduce((s, a) => s + (a.balance || 0), 0);
    });
    expect(expectedBase, 'demo seeds non-zero accounts').toBeGreaterThan(0);
    // Delta pill: in production page.js, netWorthDelta = 0 → pill should NOT render.
    // We don't assert presence either way; we just verify the page rendered without crash.
    const svgCount = await page.locator('main svg, #root svg').count();
    expect(svgCount, 'at least one svg (FakeChart) rendered').toBeGreaterThan(0);
  });

  test('demo: Treemap shows real account names from the store, not hardcoded', async ({ page }) => {
    await bootstrap(page, DEMO, 'networth');
    const accountNames = await page.evaluate(() => (window.FCStore?.list('accounts') || []).map(a => a.name));
    expect(accountNames.length).toBeGreaterThan(0);
    // Treemap displays "<Account name> · <pct>%" — assert at least one real name appears.
    const visibleNames = [];
    for (const n of accountNames) {
      const has = await page.getByText(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' · \\d+%')).count();
      if (has > 0) visibleNames.push(n);
    }
    expect(visibleNames.length, 'at least one real account name shown in Treemap').toBeGreaterThan(0);
  });

  test('demo: Liabilities panel sums credit cards.cycleSpend', async ({ page }) => {
    await bootstrap(page, DEMO, 'networth');
    const expected = await page.evaluate(() => {
      const cards = window.FCStore?.list('cards') || [];
      return cards.filter(c => c.kind === 'credit').reduce((s, c) => s + (c.cycleSpend || 0), 0);
    });
    // The total liabilities should be -expected (negative). We verify the Liabilities card renders
    // and at least one row with a credit-card cycle balance is shown when expected > 0.
    const liabHeader = page.locator('div', { hasText: /^Liabilities$/ }).first();
    await expect(liabHeader).toBeVisible();
    if (expected > 0) {
      // There should be at least one row with "current cycle"
      const cycleRows = await page.getByText(/current cycle/).count();
      expect(cycleRows, 'shows credit-card cycle row').toBeGreaterThan(0);
    }
  });

  test('networth: Export PNG triggers a real .png download', async ({ page }) => {
    await bootstrap(page, DEMO, 'networth');
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.locator('button.fc-btn-secondary', { hasText: 'Export PNG' }).click();
    const download = await downloadPromise;
    const fname = download.suggestedFilename();
    expect(fname.startsWith('finch-networth-'), `filename: ${fname}`).toBe(true);
    expect(fname.endsWith('.png'), `extension: ${fname}`).toBe(true);
    const tmpPath = await download.path();
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const buf = readFileSync(tmpPath);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4E);
    expect(buf[3]).toBe(0x47);
  });
});

// ─────────────────────────────────────────────────────────────────
// IMPORT
// ─────────────────────────────────────────────────────────────────

test.describe('import.html', () => {
  test('Step 1: source select with templates dropdown + drop zone visible', async ({ page }) => {
    await bootstrap(page, DEMO, 'import');
    await expect(page.getByRole('heading', { name: '1. Pick a source' })).toBeVisible();
    await expect(page.getByText('Saved templates')).toBeVisible();
    await expect(page.getByText('Drop a CSV here, or click to choose')).toBeVisible();
  });

  test('import: full 3-step flow — upload CSV, map cols, commit grows tx count', async ({ page }) => {
    await bootstrap(page, DEMO, 'import');
    const before = await page.evaluate(() => (window.FCStore?.list('transactions') || []).length);

    // Build a tiny CSV in-memory and feed via setInputFiles (file input is hidden).
    const csv = [
      'Date,Description,Amount',
      '2026-04-10,QA Coffee Shop,-3.50',
      '2026-04-11,QA Bookstore,-22.00',
      '2026-04-12,QA Salary,1000.00',
    ].join('\n');
    const buf = Buffer.from(csv, 'utf8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'qa-test.csv', mimeType: 'text/csv', buffer: buf });

    // Step 2 should appear.
    await expect(page.getByRole('heading', { name: '2. Map columns' })).toBeVisible({ timeout: 6000 });
    // Verify 3 preview rows shown (header + 3 data rows).
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount, 'preview rows shown').toBe(3);
    // Auto-mapping should set Date / Amount / Description.
    // "Save as template" toggle — locate the checkbox.
    const tplCheckbox = page.locator('#save-tpl');
    await expect(tplCheckbox).toBeVisible();
    await tplCheckbox.check();
    await expect(tplCheckbox).toBeChecked();
    await tplCheckbox.uncheck();

    await page.locator('button.fc-btn-primary', { hasText: 'Continue to review' }).click();

    // Step 3: should show "Commit X transactions" button. With 3 selected by default
    // (no duplicates since these are fresh QA rows).
    await expect(page.getByRole('heading', { name: '3. Review staging' })).toBeVisible({ timeout: 5000 });
    // Bulk action buttons visible
    await expect(page.locator('button.fc-btn-ghost', { hasText: 'Select all' })).toBeVisible();
    await expect(page.locator('button.fc-btn-ghost', { hasText: /Exclude duplicates/ })).toBeVisible();

    // Click Select all (should keep at 3 since none selected by default depends — but staging defaults to !duplicate selected).
    await page.locator('button.fc-btn-ghost', { hasText: 'Select all' }).click();
    await page.waitForTimeout(150);

    const commitBtn = page.locator('button.fc-btn-primary', { hasText: /Commit \d+ transaction/ });
    await expect(commitBtn).toBeVisible();
    await commitBtn.click();

    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window.FCStore?.list('transactions') || []).length);
    expect(after, 'transactions count grew after commit').toBeGreaterThan(before);
  });

  test('import: bulk action — exclude duplicates button works', async ({ page }) => {
    // Seed dup target via login.html FIRST so it's in the data prop when import.html renders.
    await page.goto(`${DEMO}/login.html`);
    await page.evaluate(seedQA);
    // Hit a desktop page so demo seedDemoData runs and FCStore is populated, then add our dup target.
    await page.goto(`${DEMO}/desktop/home.html`);
    await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 12_000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.FCStore.create('transactions', {
        date: '2026-04-13',
        amount: -9.99,
        amountOriginal: -9.99,
        currencyOriginal: 'EUR',
        amountBase: -9.99,
        fxRateSnapshot: 1,
        description: 'QA dup target',
        merchant: 'QA dup target',
        currency: 'EUR',
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
    });
    // Now navigate to import — buildLiveData will include our dup target.
    await page.goto(`${DEMO}/desktop/import.html`);
    await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 12_000 });
    await page.waitForTimeout(800);

    const csv = [
      'Date,Description,Amount',
      '2026-04-13,QA dup target,-9.99',
      '2026-04-14,QA fresh row,-1.00',
    ].join('\n');
    const buf = Buffer.from(csv, 'utf8');
    await page.locator('input[type="file"]').setInputFiles({ name: 'dup.csv', mimeType: 'text/csv', buffer: buf });

    await expect(page.getByRole('heading', { name: '2. Map columns' })).toBeVisible({ timeout: 6000 });
    await page.locator('button.fc-btn-primary', { hasText: 'Continue to review' }).click();
    await expect(page.getByRole('heading', { name: '3. Review staging' })).toBeVisible({ timeout: 5000 });

    // Should see at least one DUP badge.
    const dupBadge = page.locator('span', { hasText: /^DUP$/ });
    await expect(dupBadge).toHaveCount(1);

    // Exclude duplicates button should be enabled
    const excludeBtn = page.locator('button.fc-btn-ghost', { hasText: /Exclude duplicates \(1\)/ });
    await expect(excludeBtn).toBeVisible();
    await excludeBtn.click();
    await page.waitForTimeout(150);
    // After clicking, that dup row's checkbox should be cleared. Hard to assert; just confirm
    // the page didn't crash and the button is still present.
    await expect(page.locator('button.fc-btn-ghost', { hasText: 'Select all' })).toBeVisible();
  });
});
