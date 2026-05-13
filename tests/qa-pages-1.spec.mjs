// QA — Home / Accounts / Cards / Transactions
// Tests every interactive element on the four screens against the demo build (port 8766)
// for populated data, and a thin empty-state pass against production (port 8765).

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const DEMO = 'http://127.0.0.1:8766';
const PROD = 'http://127.0.0.1:8765';

const seedSession = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_q',name:'QA User',email:'q@q',passwordHash:'0',initials:'QU',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_q',loggedInAt:new Date().toISOString()}));
`;

const REPORT_PATH = path.resolve('qa-pages-1-report.json');
const RAW_LOG_PATH = path.resolve('qa-pages-1-raw.ndjson');

// Stale ndjson cleanup happens in qa-pages-1.global-setup.mjs (runs once before
// any worker, then never again — so per-describe re-imports don't wipe rows).

// Append every record as one ndjson line — concurrency-proof and survives
// process re-imports across describe blocks. Aggregated to JSON in afterAll.
function record(issue) {
  fs.appendFileSync(RAW_LOG_PATH, JSON.stringify(issue) + '\n');
}

async function bootDemo(page, screen) {
  // Seed BEFORE first navigation — addInitScript runs on every doc load, so the
  // auth.js guard won't bounce us to login.
  await page.addInitScript(seedSession);
  await page.goto(`${DEMO}/desktop/${screen}.html`);
  await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 10000 });
  await page.waitForTimeout(700); // let React effects settle (data render)
}

async function bootProd(page, screen) {
  await page.addInitScript(seedSession);
  await page.goto(`${PROD}/desktop/${screen}.html`);
  await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 10000 });
  await page.waitForTimeout(700);
}

// Fallback: capture every test outcome from testInfo, even if explicit record()
// was never reached (e.g. locator threw). The afterAll dedupes by (testTitle|page),
// so an explicit richer record() always wins over this fallback.
test.afterEach(async ({}, testInfo) => {
  const titleLower = testInfo.title.toLowerCase();
  const describePath = testInfo.titlePath.slice(0, -1).join(' ');
  const pageGuess = /home/.test(describePath) ? 'home'
    : /accounts/.test(describePath) ? 'accounts'
    : /cards/.test(describePath) ? 'cards'
    : /transactions/.test(describePath) ? 'transactions'
    : /empty/.test(describePath) ? titleLower.split(' ')[0]
    : 'unknown';
  record({
    test: '[fallback] ' + titleLower.slice(0, 80),
    page: pageGuess,
    pass: testInfo.status === 'passed',
    expected: 'test passed',
    actual: testInfo.status + (testInfo.error?.message ? ': ' + testInfo.error.message.split('\n')[0].slice(0, 200) : ''),
    filePath: 'tests/qa-pages-1.spec.mjs:' + (testInfo.line || 1),
    severity: 'high',
  });
});

test.afterAll(async () => {
  // Aggregate ndjson log → final JSON report.
  let lines = [];
  try { lines = fs.readFileSync(RAW_LOG_PATH, 'utf8').split('\n').filter(Boolean); } catch {}
  const all = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // Group: every fallback row owns one test slot (one-per-test). For each fallback row,
  // find the most recent NON-fallback row that came BEFORE it in the log (i.e. inside
  // the test body) and prefer that for richer details.
  const finals = [];
  let buffer = []; // explicit records since last fallback
  for (const r of all) {
    if (r.test && r.test.startsWith('[fallback] ')) {
      // Pick best from buffer if any; otherwise use fallback row itself.
      const explicit = buffer.length ? buffer[buffer.length - 1] : null;
      if (explicit) {
        // Prefer explicit detail but inherit fallback's pass status if explicit lacks one.
        finals.push(explicit);
      } else {
        finals.push(r);
      }
      buffer = [];
    } else {
      buffer.push(r);
    }
  }
  // Trailing explicit records that never had a fallback (e.g. afterEach didn't run).
  for (const r of buffer) finals.push(r);

  const out = {
    agent: 'home/accounts/cards/transactions',
    totalTests: finals.length,
    passed: finals.filter((i) => i.pass).length,
    failed: finals.filter((i) => !i.pass).length,
    issues: finals
      .filter((i) => !i.pass)
      .map((i) => ({
        test: i.test, page: i.page, expected: i.expected, actual: i.actual,
        filePath: i.filePath, severity: i.severity,
      })),
  };
  // Only write the report if this aggregation has more entries than any prior write
  // — Playwright fires afterAll per describe block, and we want the LAST/largest one.
  let prevTotal = 0;
  try { prevTotal = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')).totalTests || 0; } catch {}
  if (out.totalTests >= prevTotal) {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(out, null, 2));
  }
});

// (intentionally no automatic ndjson cleanup — leave raw log for debugging)

// ─────────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────────

test.describe('home.html (demo)', () => {
  test('Hero block renders + sparkline', async ({ page }) => {
    await bootDemo(page, 'home');
    const heroText = await page.locator('text=/Net worth/i').first().isVisible().catch(() => false);
    const sparkPresent = (await page.locator('main svg').count()) > 0;
    const ok = heroText && sparkPresent;
    record({
      test: 'hero-renders', page: 'home', pass: ok,
      expected: 'Hero "Net worth" + at least one SVG sparkline visible',
      actual: `heroText=${heroText} sparks=${sparkPresent}`,
      filePath: 'webapp/components/home-screen.jsx:108',
      severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Account-card click navigates to accounts.html', async ({ page }) => {
    await bootDemo(page, 'home');
    // First account card lives inside Accounts section grid; cards have cursor:pointer.
    // The home-screen AccountCard has NO onClick handler — it should but does not.
    // We click the first account card and expect navigation to accounts.html.
    const before = page.url();
    // Locate the account row's first card (under "Accounts" section heading).
    const card = page.locator('main >> text=/^Accounts$/').locator('xpath=ancestor::section').locator('div.fc-card').first();
    const exists = await card.count() > 0;
    if (!exists) {
      record({
        test: 'account-card-exists', page: 'home', pass: false,
        expected: 'At least one account card under Accounts section',
        actual: 'no card found',
        filePath: 'webapp/components/home-screen.jsx:45',
        severity: 'high',
      });
      return;
    }
    await card.click({ trial: false }).catch(() => {});
    await page.waitForTimeout(500);
    const navigated = page.url().includes('/accounts.html');
    record({
      test: 'account-card-click-navigates', page: 'home', pass: navigated,
      expected: 'click on account-card navigates to accounts.html',
      actual: `url after click = ${page.url()}`,
      filePath: 'webapp/components/home-screen.jsx:257',
      severity: 'high',
    });
    expect(navigated).toBe(true);
  });

  test('ForecastPeekCard click navigates to forecast.html', async ({ page }) => {
    await bootDemo(page, 'home');
    // ForecastPeekCard is a <button className="fc-card"> with an onNav('forecast') handler.
    // Identify it by the "30-day forecast" or "Open Forecast" text.
    const peek = page.locator('button.fc-card', { hasText: /Open Forecast|30-day forecast/i }).first();
    const exists = (await peek.count()) > 0;
    if (!exists) {
      record({
        test: 'forecast-peek-exists', page: 'home', pass: false,
        expected: 'ForecastPeekCard rendered',
        actual: 'not found',
        filePath: 'webapp/components/home-screen.jsx:161',
        severity: 'high',
      });
      return;
    }
    await peek.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(400);
    const ok = page.url().includes('/forecast.html');
    record({
      test: 'forecast-peek-click-navigates', page: 'home', pass: ok,
      expected: 'click navigates to forecast.html',
      actual: page.url(),
      filePath: 'webapp/components/home-screen.jsx:188',
      severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('"View all" Goals link navigates to goals.html', async ({ page }) => {
    await bootDemo(page, 'home');
    const btn = page.locator('button', { hasText: 'View all' }).nth(1); // Accounts is first, Goals second
    // Find the View all next to "Goals" header — use locator that scopes by section.
    const goalsBtn = page.locator('section', { has: page.locator('h2', { hasText: 'Goals' }) }).locator('button', { hasText: 'View all' }).first();
    await goalsBtn.click();
    await page.waitForTimeout(400);
    const ok = page.url().includes('/goals.html');
    record({
      test: 'view-all-goals', page: 'home', pass: ok,
      expected: 'navigates to goals.html', actual: page.url(),
      filePath: 'webapp/components/home-screen.jsx:56', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('"View all" Upcoming → recurring.html', async ({ page }) => {
    await bootDemo(page, 'home');
    const btn = page.locator('section', { has: page.locator('h2', { hasText: 'Upcoming' }) }).locator('button', { hasText: 'View all' }).first();
    await btn.click();
    await page.waitForTimeout(400);
    const ok = page.url().includes('/recurring.html');
    record({
      test: 'view-all-upcoming', page: 'home', pass: ok,
      expected: 'navigates to recurring.html', actual: page.url(),
      filePath: 'webapp/components/home-screen.jsx:66', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('"View all" Recent activity → transactions.html', async ({ page }) => {
    await bootDemo(page, 'home');
    const btn = page.locator('section', { has: page.locator('h2', { hasText: 'Recent activity' }) }).locator('button', { hasText: 'View all' }).first();
    await btn.click();
    await page.waitForTimeout(400);
    const ok = page.url().includes('/transactions.html');
    record({
      test: 'view-all-recent', page: 'home', pass: ok,
      expected: 'navigates to transactions.html', actual: page.url(),
      filePath: 'webapp/components/home-screen.jsx:80', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Header search input is focusable', async ({ page }) => {
    await bootDemo(page, 'home');
    const inp = page.locator('header input').first();
    await inp.click(); // user-style focus is more reliable than .focus() on some headless setups
    await page.waitForTimeout(80);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && el.tagName === 'INPUT' && (el.placeholder || '').toLowerCase().includes('search');
    });
    record({
      test: 'header-search-focusable', page: 'home', pass: focused,
      expected: 'header search input gains focus',
      actual: `focused=${focused}`,
      filePath: 'webapp/components/desktop-shell.jsx:121', severity: 'medium',
    });
    expect(focused).toBe(true);
  });

  test('Privacy toggle flips Visible/Hidden', async ({ page }) => {
    await bootDemo(page, 'home');
    // Button has text "Visible" or "Hidden"
    const btn = page.locator('header button', { hasText: /Visible|Hidden/ }).first();
    const before = await btn.innerText();
    await btn.click();
    await page.waitForTimeout(150);
    const after = await btn.innerText();
    const flipped = before !== after && /Visible|Hidden/.test(after);
    record({
      test: 'privacy-toggle', page: 'home', pass: flipped,
      expected: 'toggle flips Visible↔Hidden label',
      actual: `${before} → ${after}`,
      filePath: 'webapp/components/desktop-shell.jsx:136', severity: 'medium',
    });
    expect(flipped).toBe(true);
  });

  test('Theme toggle flips html data-theme', async ({ page }) => {
    await bootDemo(page, 'home');
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    // Sun/moon icon button — locate by being the next ghost button in header without text
    const themeBtn = page.locator('header button.fc-btn-ghost').nth(2); // search input not button; 0=Visible/Hidden, 1=theme, 2=bell
    // Buttons in header order: privacy(text), theme(icon), bell(icon), Add transaction(primary)
    // privacy is index 0 of header button.fc-btn-ghost; theme is index 1.
    const themeBtn2 = page.locator('header button.fc-btn-ghost').nth(1);
    await themeBtn2.click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    const ok = before !== after && (after === 'dark' || after === 'light');
    record({
      test: 'theme-toggle', page: 'home', pass: ok,
      expected: 'data-theme flips dark↔light',
      actual: `${before} → ${after}`,
      filePath: 'webapp/components/desktop-shell.jsx:143', severity: 'medium',
    });
    expect(ok).toBe(true);
  });

  test('"Add transaction" header button opens AddTransactionModal', async ({ page }) => {
    await bootDemo(page, 'home');
    const btn = page.locator('header button', { hasText: 'Add transaction' }).first();
    await btn.click();
    await page.waitForTimeout(300);
    const dlg = await page.locator('[role="dialog"]').count();
    const ok = dlg > 0;
    record({
      test: 'add-transaction-header', page: 'home', pass: ok,
      expected: 'role=dialog appears',
      actual: `dialog count=${dlg}`,
      filePath: 'webapp/components/desktop-shell.jsx:155', severity: 'high',
    });
    expect(ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────

test.describe('accounts.html (demo)', () => {
  test('"+ Add account" opens AccountFormModal', async ({ page }) => {
    await bootDemo(page, 'accounts');
    const btn = page.locator('main button', { hasText: 'Add account' }).first();
    await btn.click();
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const visible = await dlg.first().isVisible();
    const title = await dlg.locator('h2').first().innerText().catch(() => '');
    const ok = visible && /New account/i.test(title);
    record({
      test: 'add-account-opens-modal', page: 'accounts', pass: ok,
      expected: 'role=dialog with "New account" title',
      actual: `visible=${visible} title=${title}`,
      filePath: 'webapp/desktop/crud-modals.jsx:162', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Account card click opens edit modal with prefilled name', async ({ page }) => {
    await bootDemo(page, 'accounts');
    // First fc-card under main (the AccountsScreen has fc-card per account)
    const card = page.locator('main div.fc-card').first();
    await card.click();
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const visible = await dlg.first().isVisible().catch(() => false);
    let nameValue = '';
    if (visible) {
      nameValue = await dlg.locator('input').first().inputValue().catch(() => '');
    }
    const ok = visible && nameValue.length > 0;
    record({
      test: 'account-card-edit-modal', page: 'accounts', pass: ok,
      expected: 'dialog opens with name input prefilled',
      actual: `visible=${visible} name="${nameValue}"`,
      filePath: 'webapp/components/secondary-screens.jsx:54', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Filter chips clickable and present', async ({ page }) => {
    await bootDemo(page, 'accounts');
    const expected = ['all', 'checking', 'savings', 'brokerage'];
    let allFound = true;
    for (const label of expected) {
      const chip = page.locator('main button', { hasText: new RegExp(`^${label}$`, 'i') }).first();
      const present = await chip.count();
      if (present === 0) { allFound = false; break; }
      await chip.click().catch(() => {});
      await page.waitForTimeout(100);
    }
    record({
      test: 'filter-chips-all-types', page: 'accounts', pass: allFound,
      expected: 'all/checking/savings/brokerage chips present and clickable',
      actual: `allFound=${allFound}`,
      filePath: 'webapp/components/secondary-screens.jsx:30', severity: 'medium',
    });
    expect(allFound).toBe(true);
  });

  test('"archived" filter chip exists (per spec)', async ({ page }) => {
    await bootDemo(page, 'accounts');
    const archivedChip = page.locator('main button', { hasText: /^archived$/i }).first();
    const found = (await archivedChip.count()) > 0;
    record({
      test: 'archived-filter-chip', page: 'accounts', pass: found,
      expected: '"archived" filter chip exists',
      actual: `found=${found}`,
      filePath: 'webapp/components/secondary-screens.jsx:30', severity: 'medium',
    });
    // Don't fail the suite — record only; spec lists this but code lacks it.
  });

  test('Filter chip changes the rendered list count', async ({ page }) => {
    await bootDemo(page, 'accounts');
    const allCount = await page.locator('main > div > div').nth(1).locator('div.fc-card').count();
    // Click "savings" chip
    await page.locator('main button', { hasText: /^savings$/i }).first().click();
    await page.waitForTimeout(200);
    const filteredCount = await page.locator('main > div > div').nth(1).locator('div.fc-card').count();
    const changed = filteredCount !== allCount;
    record({
      test: 'filter-chip-changes-list', page: 'accounts', pass: changed,
      expected: 'filtered count differs from all',
      actual: `all=${allCount} savings=${filteredCount}`,
      filePath: 'webapp/components/secondary-screens.jsx:11', severity: 'low',
    });
    expect(changed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────────

test.describe('cards.html (demo)', () => {
  test('"+ Add card" opens CardFormModal', async ({ page }) => {
    await bootDemo(page, 'cards');
    const btn = page.locator('main button', { hasText: 'Add card' }).first();
    await btn.click();
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const title = await dlg.locator('h2').first().innerText().catch(() => '');
    const ok = (await dlg.first().isVisible()) && /New card/i.test(title);
    record({
      test: 'add-card-opens-modal', page: 'cards', pass: ok,
      expected: 'role=dialog "New card"',
      actual: `title=${title}`,
      filePath: 'webapp/desktop/crud-modals.jsx:284', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Credit card tile click opens edit modal', async ({ page }) => {
    await bootDemo(page, 'cards');
    // Try CreditCardTile first (has VISA/MC/AMEX chip and gradient bg) — they sit in
    // a 2-col grid under "Credit cards" h2 if any credit cards exist.
    const ccGrid = page.locator('main h2:has-text("Credit cards") + div').first();
    const ccTile = ccGrid.locator('> div').first();
    const ccExists = (await ccTile.count()) > 0;
    if (ccExists) {
      await ccTile.click();
    } else {
      // Fallback: any DebitCardTile
      const dcTile = page.locator('main h2:has-text("Debit cards") + div > div.fc-card').first();
      await dcTile.click();
    }
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const visible = await dlg.first().isVisible().catch(() => false);
    const title = visible ? await dlg.locator('h2').first().innerText() : '';
    const ok = visible && /Edit card/i.test(title);
    record({
      test: 'card-tile-edit-modal', page: 'cards', pass: ok,
      expected: 'dialog "Edit card"',
      actual: `visible=${visible} title=${title}`,
      filePath: 'webapp/components/extra-screens.jsx:316', severity: 'high',
    });
    expect(ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────

test.describe('transactions.html (demo)', () => {
  test('Search input filters list', async ({ page }) => {
    await bootDemo(page, 'transactions');
    // The list panel is the second fc-card after the filter card. Count rows before/after.
    const rowsBefore = await page.locator('main >> input[placeholder*="Search merchant" i]').count();
    expect(rowsBefore).toBeGreaterThan(0);
    const search = page.locator('main input[placeholder*="Search merchant" i]').first();
    // Read merchant text from first row to type something we know exists
    const firstMerchant = await page.locator('main span', { hasText: /\w/ }).nth(0).innerText().catch(() => '');
    const txCountBefore = await page.locator('main input[type="checkbox"]').count();
    await search.fill('zzzunlikelymerchant');
    await page.waitForTimeout(250);
    const txCountAfter = await page.locator('main input[type="checkbox"]').count();
    const filtered = txCountAfter < txCountBefore;
    record({
      test: 'search-filters-list', page: 'transactions', pass: filtered,
      expected: 'tx checkbox row count decreases when impossible search typed',
      actual: `before=${txCountBefore} after=${txCountAfter}`,
      filePath: 'webapp/components/transactions-screen.jsx:71', severity: 'high',
    });
    expect(filtered).toBe(true);
  });

  test('Account filter pill opens popover', async ({ page }) => {
    await bootDemo(page, 'transactions');
    const pill = page.locator('main button', { hasText: /^Account:/i }).first();
    const exists = (await pill.count()) > 0;
    if (!exists) {
      record({
        test: 'account-pill-exists', page: 'transactions', pass: false,
        expected: '"Account:" filter pill present', actual: 'not found',
        filePath: 'webapp/components/transactions-screen.jsx:78', severity: 'high',
      });
      return;
    }
    await pill.click();
    await page.waitForTimeout(150);
    // Popover renders a div.fc-card with options
    const popoverItems = await page.locator('main div.fc-card button').count();
    const ok = popoverItems > 1;
    record({
      test: 'account-pill-popover', page: 'transactions', pass: ok,
      expected: 'popover with options opens',
      actual: `optionCount=${popoverItems}`,
      filePath: 'webapp/components/transactions-screen.jsx:163', severity: 'medium',
    });
    expect(ok).toBe(true);
  });

  test('Category/Date/Currency pills clickable and have onClick', async ({ page }) => {
    await bootDemo(page, 'transactions');
    let allOk = true;
    for (const label of ['Category', 'Date', 'Currency']) {
      const pill = page.locator('main button', { hasText: new RegExp(`^${label}:`, 'i') }).first();
      const present = (await pill.count()) > 0;
      if (!present) { allOk = false; break; }
      await pill.click();
      await page.waitForTimeout(100);
      // Close again by clicking the backdrop (a fixed overlay)
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
      await page.waitForTimeout(80);
    }
    record({
      test: 'filter-pills-clickable', page: 'transactions', pass: allOk,
      expected: 'Category/Date/Currency pills present + clickable',
      actual: `allOk=${allOk}`,
      filePath: 'webapp/components/transactions-screen.jsx:79', severity: 'medium',
    });
    expect(allOk).toBe(true);
  });

  test('"Import CSV" navigates to import.html', async ({ page }) => {
    await bootDemo(page, 'transactions');
    const btn = page.locator('main button', { hasText: 'Import CSV' }).first();
    await btn.click();
    await page.waitForTimeout(400);
    const ok = page.url().includes('/import.html');
    record({
      test: 'import-csv-navigates', page: 'transactions', pass: ok,
      expected: 'navigates to import.html', actual: page.url(),
      filePath: 'webapp/components/transactions-screen.jsx:39', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('"Delete by filter" opens BulkDeleteTxModal', async ({ page }) => {
    await bootDemo(page, 'transactions');
    const btn = page.locator('main button', { hasText: 'Delete by filter' }).first();
    await btn.click();
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const ok = await dlg.first().isVisible().catch(() => false);
    record({
      test: 'delete-by-filter-opens', page: 'transactions', pass: ok,
      expected: 'role=dialog appears (BulkDeleteTxModal)',
      actual: `visible=${ok}`,
      filePath: 'webapp/desktop/bulk-delete-tx.jsx:147', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('"+ Add" opens AddTransactionModal', async ({ page }) => {
    await bootDemo(page, 'transactions');
    const btn = page.locator('main button.fc-btn-primary', { hasText: /^Add$/ }).first();
    await btn.click();
    await page.waitForTimeout(250);
    const dlg = page.locator('[role="dialog"]');
    const ok = await dlg.first().isVisible().catch(() => false);
    record({
      test: 'add-tx-button', page: 'transactions', pass: ok,
      expected: 'role=dialog appears',
      actual: `visible=${ok}`,
      filePath: 'webapp/components/transactions-screen.jsx:50', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Tx checkbox togglable (does not open modal)', async ({ page }) => {
    await bootDemo(page, 'transactions');
    const cb = page.locator('main input[type="checkbox"]').first();
    const before = await cb.isChecked();
    await cb.click();
    await page.waitForTimeout(120);
    const after = await cb.isChecked();
    const dlgs = await page.locator('[role="dialog"]').count();
    const ok = before !== after && dlgs === 0;
    record({
      test: 'tx-checkbox-toggle', page: 'transactions', pass: ok,
      expected: 'checkbox toggles without opening dialog',
      actual: `before=${before} after=${after} dlgs=${dlgs}`,
      filePath: 'webapp/components/transactions-screen.jsx:230', severity: 'medium',
    });
    expect(ok).toBe(true);
  });

  test('Tx row click dispatches fc:add-transaction with detail.id (edit)', async ({ page }) => {
    await bootDemo(page, 'transactions');
    // Hook a listener that captures detail.id
    await page.evaluate(() => {
      window.__editEvents = [];
      window.addEventListener('fc:add-transaction', (e) => {
        window.__editEvents.push(e.detail || null);
      });
    });
    // Click the merchant cell of the first row (avoid the checkbox).
    const firstRowMerchantCell = page.locator('main div >> nth=0').locator('span', { hasText: /\w/ }).nth(0);
    // Better: the TxRow grid has columns; click the merchant text-area child (3rd grid cell).
    // Find first row by checkbox parent, then click somewhere away from checkbox.
    const firstRow = page.locator('main >> input[type="checkbox"]').first().locator('xpath=..');
    // Click the "merchant" span area: third grid cell. Use the row's first non-checkbox grid cell area.
    const box = await firstRow.boundingBox();
    if (box) {
      // Click roughly in the middle (text area)
      await page.mouse.click(box.x + 400, box.y + box.height / 2);
    }
    await page.waitForTimeout(250);
    const events = await page.evaluate(() => window.__editEvents || []);
    const dlg = await page.locator('[role="dialog"]').count();
    const dispatched = events.length > 0 && events[events.length - 1] && events[events.length - 1].id;
    const ok = !!dispatched && dlg > 0;
    record({
      test: 'tx-row-click-edits', page: 'transactions', pass: ok,
      expected: 'click on tx row dispatches fc:add-transaction with detail.id and opens dialog',
      actual: `events=${JSON.stringify(events)} dlg=${dlg}`,
      filePath: 'webapp/components/transactions-screen.jsx:215', severity: 'high',
    });
    expect(ok).toBe(true);
  });

  test('Pending pill on pending tx', async ({ page }) => {
    await bootDemo(page, 'transactions');
    // StatusPill renders <span class="fc-pill"><span>◌</span>Pending</span> — text is "◌Pending"
    const pending = page.locator('main span.fc-pill', { hasText: /Pending/ });
    const count = await pending.count();
    const ok = count > 0;
    record({
      test: 'pending-pill', page: 'transactions', pass: ok,
      expected: 'at least one Pending pill rendered',
      actual: `count=${count}`,
      filePath: 'webapp/components/transactions-screen.jsx:248', severity: 'low',
    });
    expect(ok).toBe(true);
  });

  test('Multi-currency rows show original + base', async ({ page }) => {
    await bootDemo(page, 'transactions');
    // Look for ≈ EUR sub-line
    const approxEUR = page.locator('main >> text=/^≈/').first();
    const ok = (await approxEUR.count()) > 0;
    record({
      test: 'multi-currency-rows', page: 'transactions', pass: ok,
      expected: 'at least one row with "≈ …" base-currency line',
      actual: `count=${await approxEUR.count()}`,
      filePath: 'webapp/components/transactions-screen.jsx:281', severity: 'low',
    });
    expect(ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Empty-state checks (production server, fresh profile)
// ─────────────────────────────────────────────────────────────────

test.describe('empty state (prod)', () => {
  for (const screen of ['home', 'accounts', 'cards', 'transactions']) {
    test(`${screen} renders empty without crash`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await bootProd(page, screen);
      const childrenCount = await page.evaluate(() => document.querySelector('#root')?.querySelectorAll('*').length || 0);
      const realErrors = errors.filter((e) => !/babel/i.test(e));
      const ok = childrenCount > 30 && realErrors.length === 0;
      record({
        test: `empty-${screen}`, page: screen, pass: ok,
        expected: 'page renders without console errors',
        actual: `children=${childrenCount} errors=${JSON.stringify(realErrors)}`,
        filePath: `webapp/desktop/${screen}.html:1`,
        severity: 'high',
      });
      expect(ok).toBe(true);
    });
  }
});
