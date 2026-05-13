// CRUD + Add-Transaction flow verification for Finch desktop webapp.
//
// Each test seeds a fresh profile + session into localStorage and exercises
// the user-visible UI (clicks, keyboard) — never internal globals — to catch
// broken modals, button-click failures, and persistence issues.
//
// Run from C:\Users\mtx\desktop\Finance:
//   npx playwright test tests/crud-flows.spec.mjs --reporter=line

import { test, expect } from '@playwright/test';

const PROFILE = {
  id: 'p_test',
  name: 'Test',
  email: 't@t.com',
  passwordHash: '2087887214',
  initials: 'T',
  baseCurrency: 'EUR',
  activeCurrencies: ['EUR', 'USD', 'GBP'],
  onboarded: true,
  theme: 'dark',
  accent: 'teal',
  householdId: 'h_test',
};

async function seedProfile(page) {
  // login.html is unguarded — perfect for seeding storage on the right origin.
  await page.goto('/login.html');
  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem('fc.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('fc.session.v1', JSON.stringify({
      profileId: profile.id, loggedInAt: new Date().toISOString(),
    }));
  }, PROFILE);
}

async function gotoFresh(page, path) {
  await seedProfile(page);
  await page.goto(path);
  // Wait for React mount — the desktop shell renders a header.
  await page.waitForSelector('header', { timeout: 15_000 });
  // Babel/JSX takes a moment after the header is up; give modals listeners time.
  await page.waitForTimeout(700);
}

const consoleErrors = [];
test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
});

// ─── 1) Add transaction via Cmd/Ctrl+N ──────────────────────────────────

test('add transaction via Ctrl+N keyboard shortcut', async ({ page }) => {
  await gotoFresh(page, '/desktop/home.html');

  // Press Ctrl+N
  await page.keyboard.press('Control+n');

  // Modal should open
  const modal = page.getByRole('dialog', { name: /transaction/i });
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Fill amount
  await page.locator('input[inputmode="decimal"]').first().fill('42.50');

  // Pick category Groceries (chip with text)
  await page.getByRole('button', { name: /Groceries/i }).first().click();

  // Account: first option already selected by default — leave as is.
  // Description
  await page.locator('textarea').fill('Test grocery');

  // Submit
  await page.getByRole('button', { name: /^Add transaction$/ }).click();

  // Modal closes
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  // localStorage now has one new tx with amount of magnitude 42.5
  const txs = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.transactions') || '[]'));
  const created = txs.find((t) => Math.abs(t.amountOriginal ?? t.amount ?? 0) === 42.5);
  expect(created, 'A tx with magnitude 42.50 should exist').toBeTruthy();

  // Visit transactions screen
  await page.goto('/desktop/transactions.html');
  await page.waitForSelector('header');
  await expect(page.getByText('Test grocery').first()).toBeVisible({ timeout: 5_000 });
});

// ─── 2) Add transaction via header button ───────────────────────────────

test('add transaction via header + Add transaction button', async ({ page }) => {
  await gotoFresh(page, '/desktop/home.html');

  await page.getByRole('button', { name: /Add transaction/i }).first().click();

  const modal = page.getByRole('dialog', { name: /transaction/i });
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Cancel
  await page.getByRole('button', { name: /^Cancel$/ }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });
});

// ─── 3) Add account ────────────────────────────────────────────────────

test('add account', async ({ page }) => {
  await gotoFresh(page, '/desktop/accounts.html');

  await page.getByRole('button', { name: /Add account/i }).click();
  const modal = page.locator('div[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Name field is autoFocus first input.
  await modal.locator('input').first().fill('Test Bank');

  // Type chip "checking" — already on by default but click to be sure.
  await modal.getByRole('button', { name: /^checking$/ }).click();

  // Currency select — pick EUR (first item by default).
  await modal.locator('select').first().selectOption({ label: 'EUR' });

  // Opening balance — last text input
  const inputs = modal.locator('input.tabular, input[inputmode="decimal"]');
  await inputs.last().fill('500');

  await modal.getByRole('button', { name: /Create account/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  // localStorage check
  const accs = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.accounts') || '[]'));
  const acc = accs.find((a) => a.name === 'Test Bank');
  expect(acc, 'Account "Test Bank" should be persisted').toBeTruthy();
  expect(acc.currency).toBe('EUR');
  expect(acc.openingBalance).toBe(500);

  // On screen
  await expect(page.getByText('Test Bank').first()).toBeVisible({ timeout: 5_000 });
});

// ─── 4) Edit account (uses account created above; here we create + edit
// in one test for isolation) ───────────────────────────────────────────

test('edit account: change name persists', async ({ page }) => {
  await gotoFresh(page, '/desktop/accounts.html');

  // Create one first
  await page.getByRole('button', { name: /Add account/i }).click();
  let modal = page.locator('div[role="dialog"]').last();
  await modal.locator('input').first().fill('Test Bank');
  await modal.locator('input.tabular, input[inputmode="decimal"]').last().fill('500');
  await modal.getByRole('button', { name: /Create account/i }).click();
  await expect(modal).not.toBeVisible();

  // Click the account to open edit modal
  await page.getByText('Test Bank').first().click();

  modal = page.locator('div[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Verify prefill: name input value is "Test Bank"
  await expect(modal.locator('input').first()).toHaveValue('Test Bank');

  // Change name
  await modal.locator('input').first().fill('Test Bank 2');
  await modal.getByRole('button', { name: /^Save$/ }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  // localStorage updated
  const accs = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.accounts') || '[]'));
  expect(accs.find((a) => a.name === 'Test Bank 2'), 'renamed account exists').toBeTruthy();
  expect(accs.find((a) => a.name === 'Test Bank'), 'old name should be gone').toBeFalsy();

  await expect(page.getByText('Test Bank 2').first()).toBeVisible({ timeout: 5_000 });
});

// ─── 5) Add goal ────────────────────────────────────────────────────────

test('add goal', async ({ page }) => {
  await gotoFresh(page, '/desktop/goals.html');

  await page.getByRole('button', { name: /New goal/i }).first().click();
  const modal = page.locator('div[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Title
  await modal.locator('input').first().fill('Vacation');

  // Target — first decimal input
  const tabularInputs = modal.locator('input.tabular, input[inputmode="decimal"]');
  await tabularInputs.first().fill('2000');

  // Deadline 6 months from today
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  const deadline = d.toISOString().slice(0, 10);
  await modal.locator('input[type="date"]').fill(deadline);

  await modal.getByRole('button', { name: /Create goal/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  const goals = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.goals') || '[]'));
  const g = goals.find((x) => x.title === 'Vacation');
  expect(g, 'Goal "Vacation" should exist in store').toBeTruthy();
  expect(g.target).toBe(2000);

  await expect(page.getByText('Vacation').first()).toBeVisible({ timeout: 5_000 });
});

// ─── 6) Add budget ─────────────────────────────────────────────────────

test('add budget via Edit budgets', async ({ page }) => {
  // Direct nav — seedIfEmpty will populate categories on first load.
  await gotoFresh(page, '/desktop/budgets.html');

  await page.getByRole('button', { name: /Edit budgets/i }).click();
  const modal = page.locator('div[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Pick first category in select (already selected). Set amount.
  const tabularInputs = modal.locator('input.tabular, input[inputmode="decimal"]');
  await tabularInputs.first().fill('300');

  await modal.getByRole('button', { name: /Create budget/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  const budgets = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.budgets') || '[]'));
  const b = budgets.find((x) => x.amount === 300 || x.budget === 300);
  expect(b, 'budget with amount 300 should be persisted').toBeTruthy();
});

// ─── 7) Add recurring ──────────────────────────────────────────────────

test('add recurring rule', async ({ page }) => {
  await gotoFresh(page, '/desktop/recurring.html');

  // Find the add button — it has plus icon + "Add". Try multiple labels.
  const addBtn = page.getByRole('button', { name: /Add recurring|New recurring|Add rule|New rule/i }).first();
  await addBtn.click();

  const modal = page.locator('div[role="dialog"]').last();
  await expect(modal).toBeVisible({ timeout: 5_000 });

  await modal.locator('input').first().fill('Netflix');
  const tabularInputs = modal.locator('input.tabular, input[inputmode="decimal"]');
  await tabularInputs.first().fill('15');

  // Frequency monthly chip — already default but click to be sure.
  await modal.getByRole('button', { name: /^monthly$/ }).click();

  await modal.getByRole('button', { name: /Create rule/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });

  const recs = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.recurring') || '[]'));
  const r = recs.find((x) => x.name === 'Netflix');
  expect(r, 'recurring "Netflix" should be persisted').toBeTruthy();
  expect(r.amount).toBe(15);
  expect(r.freq).toBe('monthly');
});

// ─── 8) Add holding ────────────────────────────────────────────────────

test('add holding', async ({ page }) => {
  await gotoFresh(page, '/desktop/investments.html');

  // Open via the page-header button.
  await page.getByRole('button', { name: /^Add holding$/ }).first().click();

  // Holding modal does not have role=dialog — it's a plain div. Wait for ticker input.
  const ticker = page.locator('input[placeholder="VWCE"]');
  await expect(ticker).toBeVisible({ timeout: 5_000 });

  // Modal scope: the .fc-card containing the ticker input.
  const modal = page.locator('.fc-card', { has: ticker });

  await ticker.fill('VWCE');
  await modal.locator('input[placeholder*="Vanguard"]').fill('Vanguard FTSE All-World');

  // Currency select (first select in modal)
  await modal.locator('select').first().selectOption('EUR').catch(() => {});

  // Quantity & avg cost
  const numInputs = modal.locator('input[type="number"]');
  await numInputs.nth(0).fill('10');
  await numInputs.nth(1).fill('100');

  // The modal's submit button is the last "Add holding" on the page.
  await modal.getByRole('button', { name: /^Add holding$/ }).click();

  // After save, modal closes and holding lands in the store.
  await expect(ticker).not.toBeVisible({ timeout: 5_000 });

  const holdings = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.data.p_test.holdings') || '[]'));
  const h = holdings.find((x) => x.ticker === 'VWCE');
  expect(h, 'holding VWCE should be persisted').toBeTruthy();
  expect(h.qty).toBe(10);
  expect(h.avgCost).toBe(100);
});

// ─── 9) Settings: theme + accent persistence across reload ─────────────

test('settings: theme light persists across reload', async ({ page }) => {
  await gotoFresh(page, '/desktop/settings.html');

  // Defensive: assert SettingsScreen actually mounted before clicking. If
  // settings.html falls back to HomeScreen (see screenMap in page.js), this
  // exposes the bug rather than failing on a confusing missing-button error.
  await expect(page.getByText('Appearance', { exact: true })).toBeVisible({ timeout: 5_000 });

  // Click "Light" chip in Appearance section.
  await page.getByRole('button', { name: /^Light$/ }).click();
  // Allow profile.update + localStorage to flush.
  await page.waitForTimeout(200);

  await page.reload();
  await page.waitForSelector('header');

  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('light');
});

test('settings: accent amber persists across reload', async ({ page }) => {
  await gotoFresh(page, '/desktop/settings.html');

  await expect(page.getByText('Appearance', { exact: true })).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: /^Amber$/ }).click();
  await page.waitForTimeout(200);

  await page.reload();
  await page.waitForSelector('header');

  const accent = await page.evaluate(() => document.documentElement.dataset.accent);
  expect(accent).toBe('amber');
});
