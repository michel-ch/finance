// QA: settings.html + sidebar nav + header chrome + keyboard shortcuts.
// Scope: ONLY this agent's surface. Does NOT modify webapp source.
// Output: tests/qa-settings-report.json + screenshots/qa-settings/*.png on failures.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOTS = path.join(__dirname, 'screenshots', 'qa-settings');
const REPORT = path.join(__dirname, 'qa-settings-report.json');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────
// Aggregate report state. Each test pushes pass/fail rows into here.
// ─────────────────────────────────────────────────────────────────────────
const report = {
  agent: 'settings + chrome + shortcuts',
  totalTests: 0,
  passed: 0,
  failed: 0,
  issues: [],
};
function pass() { report.totalTests++; report.passed++; }
function fail(rec) {
  report.totalTests++; report.failed++;
  report.issues.push(rec);
}

test.afterAll(async () => {
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
});

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
const PROFILE = {
  id: 'p_q', name: 'QA User', email: 'q@q', passwordHash: '0', initials: 'QU',
  baseCurrency: 'EUR', activeCurrencies: ['EUR', 'USD', 'GBP'],
  onboarded: true, theme: 'dark', accent: 'teal', householdId: 'h',
  privacyDefault: false, idleLockMinutes: 0,
};

async function seedAndGoto(page, urlPath) {
  await page.goto('/login.html');
  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem('fc.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('fc.session.v1', JSON.stringify({
      profileId: profile.id, loggedInAt: new Date().toISOString(),
    }));
  }, PROFILE);
  await page.goto(urlPath);
  await page.waitForSelector('header', { timeout: 15_000 });
  // give Babel/JSX time to attach event listeners and render screen body
  await page.waitForTimeout(700);
}

async function shotOnFail(page, name) {
  try {
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  } catch (_) { /* ignore */ }
}

function attachPageError(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return errs;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. SIDEBAR NAVIGATION (12 items + bottom-right cog → settings)
// ─────────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'home',         label: 'Home' },
  { id: 'accounts',     label: 'Accounts' },
  { id: 'cards',        label: 'Cards' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'forecast',     label: 'Forecast' },
  { id: 'simulator',    label: 'Can I afford?' }, // sidebar label vs URL id
  { id: 'goals',        label: 'Goals' },
  { id: 'budgets',      label: 'Budgets' },
  { id: 'recurring',    label: 'Recurring' },
  { id: 'investments',  label: 'Investments' },
  { id: 'networth',     label: 'Net Worth' },
  { id: 'import',       label: 'Import' },
];

test('sidebar: 12 nav items navigate to <id>.html with #root populated', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');

  for (const item of NAV) {
    if (item.id === 'home') continue; // we are already on home
    const escaped = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const btn = page.locator('aside nav button', { hasText: new RegExp(escaped) }).first();
    try {
      await btn.click();
      await page.waitForURL(new RegExp(`/desktop/${item.id}\\.html$`), { timeout: 10_000 });
      // Wait for the React shell to actually mount on the new page. Babel/JSX
      // compilation takes a moment after URL change, so polling #root.children
      // immediately is racy.
      await page.waitForSelector('header', { timeout: 15_000 });
      const deadline = Date.now() + 8_000;
      let ok = false;
      while (Date.now() < deadline) {
        ok = await page.evaluate(() => {
          const r = document.querySelector('#root');
          return !!(r && r.children.length > 0);
        }).catch(() => false);
        if (ok) break;
        await page.waitForTimeout(150);
      }
      if (!ok) throw new Error('#root has no children');
      pass();
    } catch (e) {
      await shotOnFail(page, `sidebar-${item.id}`);
      fail({
        test: `sidebar nav: ${item.label}`,
        page: page.url(),
        expected: `/desktop/${item.id}.html with #root populated`,
        actual: e.message,
        filePath: 'webapp/components/desktop-shell.jsx:55',
        severity: 'high',
      });
    }
    // navigate back home for next iteration
    await page.goto('/desktop/home.html');
    await page.waitForSelector('header');
    await page.waitForTimeout(300);
  }
});

test('sidebar bottom: avatar shows profile.initials, name shows profile.name, cog goes to settings', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');

  // Avatar initials and profile name in the bottom block of the sidebar.
  try {
    const avatar = page.locator('aside').locator('text=QU').first();
    await expect(avatar).toBeVisible({ timeout: 5_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'sidebar-avatar-initials');
    fail({
      test: 'sidebar avatar shows profile.initials',
      page: page.url(),
      expected: 'Avatar text "QU"',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:92',
      severity: 'medium',
    });
  }
  try {
    const nameRow = page.locator('aside').getByText('QA User', { exact: true });
    await expect(nameRow).toBeVisible({ timeout: 5_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'sidebar-profile-name');
    fail({
      test: 'sidebar shows profile.name',
      page: page.url(),
      expected: '"QA User" text in sidebar bottom',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:95',
      severity: 'medium',
    });
  }

  // Cog → settings.html
  try {
    await page.locator('aside .fc-btn-ghost').last().click();
    await page.waitForURL(/settings\.html$/, { timeout: 10_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'sidebar-cog-to-settings');
    fail({
      test: 'sidebar bottom cog → settings.html',
      page: page.url(),
      expected: '/desktop/settings.html',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:99',
      severity: 'high',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 2. HEADER CHROME (search, privacy eye, theme toggle, bell, +Add tx)
// ─────────────────────────────────────────────────────────────────────────
test('header: search box accepts input', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  const searchInput = page.locator('header input').first();
  try {
    await searchInput.fill('abc');
    await expect(searchInput).toHaveValue('abc');
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-search');
    fail({
      test: 'header search input updates on type',
      page: page.url(),
      expected: 'value="abc"',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:121',
      severity: 'medium',
    });
  }
});

test('header: privacy eye toggles Visible↔Hidden and shows • masks', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  const eyeBtn = page.locator('header button[title*="privacy"]');
  try {
    const before = (await eyeBtn.textContent() || '').trim();
    await eyeBtn.click();
    const after = (await eyeBtn.textContent() || '').trim();
    expect(before).not.toEqual(after);
    expect(['Visible', 'Hidden']).toContain(before);
    expect(['Visible', 'Hidden']).toContain(after);
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-privacy-label');
    fail({
      test: 'header privacy eye toggles Visible↔Hidden',
      page: page.url(),
      expected: 'label flips between "Visible" and "Hidden"',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:140',
      severity: 'medium',
    });
  }

  // After click(s), at least one •••• mask should be present somewhere on home.
  try {
    // Ensure we're in the Hidden state before checking masks.
    const txt = (await eyeBtn.textContent() || '').trim();
    if (txt !== 'Hidden') await eyeBtn.click();
    const dotMasks = await page.locator('text=••••').count();
    if (dotMasks < 1) throw new Error(`expected at least 1 •••• mask, got ${dotMasks}`);
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-privacy-mask');
    fail({
      test: 'privacy on: monetary values masked with ••••',
      page: page.url(),
      expected: '≥1 •••• mask visible on home',
      actual: e.message,
      filePath: 'webapp/components/atoms.jsx:63',
      severity: 'low',
    });
  }
});

test('header: theme toggle flips data-theme between light and dark', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  // Header buttons in order: privacy, theme, bell, +Add. Theme is the icon-only
  // button between privacy and bell.
  const themeBtn = page.locator('header > button').nth(1);
  try {
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await themeBtn.click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toEqual(before);
    expect(['light', 'dark']).toContain(after);
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-theme');
    fail({
      test: 'header theme toggle flips data-theme',
      page: page.url(),
      expected: 'data-theme value changes',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:143',
      severity: 'medium',
    });
  }
});

test('header: bell does not crash when clicked (no handler)', async ({ page }) => {
  const errs = attachPageError(page);
  await seedAndGoto(page, '/desktop/home.html');
  // Bell is button #2 (after privacy and theme), before the primary +Add btn.
  const bellBtn = page.locator('header > button').nth(2);
  try {
    await bellBtn.click();
    await page.waitForTimeout(200);
    // Acceptable: no handler. Just verify no crash.
    if (errs.length) throw new Error(`pageerror: ${errs.join('; ')}`);
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-bell');
    fail({
      test: 'header bell click does not crash',
      page: page.url(),
      expected: 'no pageerror after click',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:147',
      severity: 'low',
    });
  }
});

test('header: + Add transaction opens AddTransactionModal', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  try {
    await page.getByRole('button', { name: /Add transaction/i }).first().click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'header-add-tx');
    fail({
      test: 'header +Add transaction opens modal',
      page: page.url(),
      expected: '[role=dialog] visible',
      actual: e.message,
      filePath: 'webapp/components/desktop-shell.jsx:155',
      severity: 'high',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 3. KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────
test('shortcut Ctrl+N opens AddTransactionModal', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  try {
    await page.keyboard.press('Control+n');
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'shortcut-ctrl-n');
    fail({
      test: 'Ctrl+N opens AddTransactionModal',
      page: page.url(),
      expected: '[role=dialog] visible',
      actual: e.message,
      filePath: 'webapp/desktop/page.js:112',
      severity: 'medium',
    });
  }
});

test('shortcut Ctrl+K focuses header search input', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  try {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(150);
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, parent: el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.tagName } : null;
    });
    expect(focusedTag && focusedTag.tag).toBe('INPUT');
    // It must be the header's search (in <header>)
    const inHeader = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      let cur = el;
      while (cur) { if (cur.tagName === 'HEADER') return true; cur = cur.parentElement; }
      return false;
    });
    expect(inHeader).toBe(true);
    pass();
  } catch (e) {
    await shotOnFail(page, 'shortcut-ctrl-k');
    fail({
      test: 'Ctrl+K focuses header search',
      page: page.url(),
      expected: 'document.activeElement is header <input>',
      actual: e.message,
      filePath: 'webapp/desktop/page.js:110',
      severity: 'medium',
    });
  }
});

test('shortcut Ctrl+, navigates to settings.html', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  try {
    await page.keyboard.press('Control+,');
    await page.waitForURL(/settings\.html$/, { timeout: 10_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'shortcut-ctrl-comma');
    fail({
      test: 'Ctrl+, navigates to settings',
      page: page.url(),
      expected: '/desktop/settings.html',
      actual: e.message,
      filePath: 'webapp/desktop/page.js:111',
      severity: 'medium',
    });
  }
});

test('shortcut Ctrl+B toggles privacy blur', async ({ page }) => {
  await seedAndGoto(page, '/desktop/home.html');
  try {
    const eyeBtn = page.locator('header button[title*="privacy"]');
    const before = (await eyeBtn.textContent() || '').trim();
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(150);
    const after = (await eyeBtn.textContent() || '').trim();
    expect(after).not.toEqual(before);
    pass();
  } catch (e) {
    await shotOnFail(page, 'shortcut-ctrl-b');
    fail({
      test: 'Ctrl+B toggles privacy',
      page: page.url(),
      expected: 'header eye label flips',
      actual: e.message,
      filePath: 'webapp/desktop/page.js:109',
      severity: 'medium',
    });
  }
});

test('shortcut Ctrl+1..9 navigates to the right page', async ({ page }) => {
  const map = {
    '1': 'home', '2': 'accounts', '3': 'cards', '4': 'transactions',
    '5': 'forecast', '6': 'simulator', '7': 'goals', '8': 'budgets', '9': 'recurring',
  };
  // Seed once.
  await seedAndGoto(page, '/desktop/home.html');
  for (const [key, target] of Object.entries(map)) {
    try {
      await page.keyboard.press(`Control+${key}`);
      await page.waitForURL(new RegExp(`/desktop/${target}\\.html$`), { timeout: 10_000 });
      // Wait for the new page to actually finish mounting before we move on.
      await page.waitForLoadState('load');
      await page.waitForSelector('header', { timeout: 15_000 });
      await page.waitForTimeout(300);
      pass();
    } catch (e) {
      await shotOnFail(page, `shortcut-ctrl-${key}`);
      fail({
        test: `Ctrl+${key} navigates to ${target}`,
        page: page.url(),
        expected: `/desktop/${target}.html`,
        actual: e.message,
        filePath: 'webapp/desktop/page.js:113',
        severity: 'medium',
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 4. SETTINGS — Section 1: User
// ─────────────────────────────────────────────────────────────────────────
test('settings User: edit display name persists to fc.profiles.v1', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Input 0 is the header search input. Display name is the first input
    // inside <main> (the User section).
    const nameInput = page.locator('main input').nth(0);
    await nameInput.fill('Renamed User');
    await nameInput.blur();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].name).toBe('Renamed User');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-user-name');
    fail({
      test: 'settings User: display name persists',
      page: page.url(),
      expected: 'profiles[0].name === "Renamed User"',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:196',
      severity: 'high',
    });
  }
});

test('settings User: edit email persists', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Input 0 of <main> is Display name; index 1 is Email.
    const emailInput = page.locator('main input').nth(1);
    await emailInput.fill('new@new.com');
    await emailInput.blur();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].email).toBe('new@new.com');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-user-email');
    fail({
      test: 'settings User: email persists',
      page: page.url(),
      expected: 'profiles[0].email === "new@new.com"',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:198',
      severity: 'medium',
    });
  }
});

test('settings User: Set up PIN button does not crash on dismiss', async ({ page }) => {
  const errs = attachPageError(page);
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Dismiss the prompt; if it returns null the code should no-op.
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: /Set up PIN/i }).click();
    await page.waitForTimeout(300);
    if (errs.length) throw new Error(`pageerror: ${errs.join('; ')}`);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-user-pin');
    fail({
      test: 'settings User: Set up PIN does not crash',
      page: page.url(),
      expected: 'no pageerror after prompt dismiss',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:158',
      severity: 'medium',
    });
  }
});

test('settings User: Sign out → confirm dialog → redirects to login.html', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /^Sign out$/i }).click();
    await page.waitForURL(/login\.html$/, { timeout: 10_000 });
    const session = await page.evaluate(() => localStorage.getItem('fc.session.v1'));
    expect(session).toBeNull();
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-user-signout');
    fail({
      test: 'settings User: Sign out clears session and redirects',
      page: page.url(),
      expected: 'login.html with fc.session.v1 cleared',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:166',
      severity: 'high',
    });
  }
});

test('settings User: Delete profile → confirm → wipes profile + redirects', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Delete profile/i }).click();
    await page.waitForURL(/login\.html$/, { timeout: 10_000 });
    const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(profiles.length).toBe(0);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-user-delete');
    fail({
      test: 'settings User: Delete profile wipes profile',
      page: page.url(),
      expected: 'profiles array empty + redirect to login',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:172',
      severity: 'high',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 5. SETTINGS — Section 2: Currencies
// ─────────────────────────────────────────────────────────────────────────
test('settings Currencies: change base currency persists', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const select = page.locator('select.fc-input').first();
    await select.selectOption('USD');
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].baseCurrency).toBe('USD');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-currency-base');
    fail({
      test: 'settings Currencies: base currency persists',
      page: page.url(),
      expected: 'profiles[0].baseCurrency === "USD"',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:209',
      severity: 'high',
    });
  }
});

test('settings Currencies: toggle non-base currency chip flips activeCurrencies', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // CHF is not in the seeded activeCurrencies — clicking adds it.
    const chip = page.locator('button', { hasText: /^CHF$/ }).first();
    await chip.click();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].activeCurrencies).toContain('CHF');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-currency-toggle');
    fail({
      test: 'settings Currencies: chip toggles activeCurrencies',
      page: page.url(),
      expected: '"CHF" in profiles[0].activeCurrencies',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:217',
      severity: 'medium',
    });
  }
});

test('settings Currencies: removing BASE currency is blocked with alert', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    let alerted = false;
    page.once('dialog', async (d) => { alerted = true; await d.accept(); });
    // EUR is the base currency. Clicking should trigger an alert and NOT remove it.
    const chip = page.locator('button', { hasText: /^EUR$/ }).first();
    await chip.click();
    await page.waitForTimeout(300);
    expect(alerted).toBe(true);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].activeCurrencies).toContain('EUR');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-currency-base-block');
    fail({
      test: 'settings Currencies: removing base currency blocked',
      page: page.url(),
      expected: 'alert fires; EUR remains in activeCurrencies',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:121',
      severity: 'medium',
    });
  }
});

test('settings Currencies: SPEC GAP — removing currency used by an account does NOT warn', async ({ page }) => {
  // Seed an account in USD, then try to remove USD. Per spec there should be a
  // warning. The current code only blocks the BASE currency. This test always
  // logs a finding (it never blocks the run) so the gap is captured in the report.
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Inject an account in USD via FCStore.
    await page.evaluate(() => {
      window.FCStore.create('accounts', { name: 'US Acct', currency: 'USD', balance: 100 });
    });
    let alerted = false;
    page.on('dialog', async (d) => { alerted = true; await d.accept(); });
    const chip = page.locator('button', { hasText: /^USD$/ }).first();
    await chip.click();
    await page.waitForTimeout(300);
    if (!alerted) {
      // Spec says: warn when removing currency used by an account. Currently silent.
      throw new Error('No warning when removing currency used by an account (USD) — spec gap');
    }
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-currency-spec-gap');
    fail({
      test: 'spec: warn when removing a currency used by an account',
      page: page.url(),
      expected: 'alert/confirm when removing USD while a USD account exists',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:117',
      severity: 'low',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 6. SETTINGS — Section 3: Categories
// ─────────────────────────────────────────────────────────────────────────
test('settings Categories: 12 seeded categories visible', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Force a seed (page.js calls seedIfEmpty, but settings.html is loaded
    // from the same path).
    const count = await page.evaluate(() => window.FCStore.list('categories').length);
    expect(count).toBe(12);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-categories-seed');
    fail({
      test: 'settings Categories: 12 seeded',
      page: page.url(),
      expected: 'FCStore.list("categories").length === 12',
      actual: e.message,
      filePath: 'webapp/store.js:155',
      severity: 'medium',
    });
  }
});

test('settings Categories: add new via inline form persists', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const form = page.locator('form').filter({ has: page.locator('input[name="name"]') }).first();
    await form.locator('input[name="icon"]').fill('🎯');
    await form.locator('input[name="name"]').fill('QA Testing');
    await form.getByRole('button', { name: /^Add$/i }).click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => window.FCStore.list('categories'));
    const found = stored.find((c) => c.name === 'QA Testing');
    expect(found).toBeTruthy();
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-categories-add');
    fail({
      test: 'settings Categories: add new persists',
      page: page.url(),
      expected: '"QA Testing" exists in categories table',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:252',
      severity: 'medium',
    });
  }
});

test('settings Categories: remove × deletes a category', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const before = await page.evaluate(() => window.FCStore.list('categories').length);
    // Click first × button inside the categories grid (button title='Remove').
    await page.locator('button[title="Remove"]').first().click();
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => window.FCStore.list('categories').length);
    expect(after).toBe(before - 1);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-categories-remove');
    fail({
      test: 'settings Categories: × removes',
      page: page.url(),
      expected: 'categories count drops by 1',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:240',
      severity: 'medium',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 7. SETTINGS — Section 4: Import templates
// ─────────────────────────────────────────────────────────────────────────
test('settings Import: "Open Import" navigates to import.html', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    await page.getByRole('button', { name: /Open Import/i }).click();
    await page.waitForURL(/import\.html$/, { timeout: 10_000 });
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-import');
    fail({
      test: 'settings Import: Open Import navigates',
      page: page.url(),
      expected: '/desktop/import.html',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:278',
      severity: 'low',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 8. SETTINGS — Section 5: Recurring rules (placeholder, just verify no crash)
// ─────────────────────────────────────────────────────────────────────────
test('settings Recurring rules: placeholder section does not crash', async ({ page }) => {
  const errs = attachPageError(page);
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Section heading visible, no errors.
    await expect(page.getByRole('heading', { name: 'Recurring rules' })).toBeVisible();
    await page.waitForTimeout(200);
    if (errs.length) throw new Error(`pageerror: ${errs.join('; ')}`);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-recurring');
    fail({
      test: 'settings Recurring rules: no crash',
      page: page.url(),
      expected: 'section heading visible, no errors',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:282',
      severity: 'low',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 9. SETTINGS — Section 6: Backup
// ─────────────────────────────────────────────────────────────────────────
test('settings Backup: Export as JSON triggers a finch-backup-* download', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 5_000 });
    await page.getByRole('button', { name: /Export as JSON/i }).click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^finch-backup-/);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-backup-export');
    fail({
      test: 'settings Backup: Export downloads finch-backup-*.json',
      page: page.url(),
      expected: 'filename starts with "finch-backup-"',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:127',
      severity: 'medium',
    });
  }
});

test('settings Backup: Restore from JSON has a file input', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const fileInput = page.locator('input[type="file"][accept="application/json"]');
    await expect(fileInput).toHaveCount(1);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-backup-restore');
    fail({
      test: 'settings Backup: Restore has file input',
      page: page.url(),
      expected: 'one input[type=file] for JSON restore',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:292',
      severity: 'medium',
    });
  }
});

test('settings Backup: Clear all data wipes user-data tables, keeps categories', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Seed some user-data rows so we have something to wipe.
    await page.evaluate(() => {
      window.FCStore.create('accounts', { name: 'A', balance: 1, currency: 'EUR' });
      window.FCStore.create('transactions', { amount: -1, currency: 'EUR' });
      window.FCStore.create('goals', { name: 'g' });
      window.FCStore.create('budgets', { cat: 'Dining' });
    });
    const before = await page.evaluate(() => ({
      accounts: window.FCStore.list('accounts').length,
      transactions: window.FCStore.list('transactions').length,
      goals: window.FCStore.list('goals').length,
      budgets: window.FCStore.list('budgets').length,
      categories: window.FCStore.list('categories').length,
    }));
    expect(before.accounts).toBeGreaterThan(0);

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /Clear all data/i }).click();
    // Page reloads after clear.
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);

    const after = await page.evaluate(() => ({
      accounts: window.FCStore.list('accounts').length,
      transactions: window.FCStore.list('transactions').length,
      goals: window.FCStore.list('goals').length,
      budgets: window.FCStore.list('budgets').length,
      categories: window.FCStore.list('categories').length,
    }));
    expect(after.accounts).toBe(0);
    expect(after.transactions).toBe(0);
    expect(after.goals).toBe(0);
    expect(after.budgets).toBe(0);
    expect(after.categories).toBe(before.categories); // kept
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-backup-clear');
    fail({
      test: 'settings Backup: Clear all data',
      page: page.url(),
      expected: 'user-data tables emptied, categories kept',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:151',
      severity: 'high',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 10. SETTINGS — Section 7: Appearance
// ─────────────────────────────────────────────────────────────────────────
test('settings Appearance: theme chips switch data-theme', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Click "Light" chip in the Appearance section.
    await page.locator('button', { hasText: /^Light$/ }).first().click();
    await page.waitForTimeout(200);
    let theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('light');

    // Click "Dark" chip.
    await page.locator('button', { hasText: /^Dark$/ }).first().click();
    await page.waitForTimeout(200);
    theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-appearance-theme');
    fail({
      test: 'settings Appearance: theme chips switch data-theme',
      page: page.url(),
      expected: 'data-theme flips light↔dark',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:300',
      severity: 'medium',
    });
  }
});

test('settings Appearance: accent chips switch data-accent', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    await page.locator('button', { hasText: /^Indigo$/ }).first().click();
    await page.waitForTimeout(200);
    let accent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(accent).toBe('indigo');

    await page.locator('button', { hasText: /^Amber$/ }).first().click();
    await page.waitForTimeout(200);
    accent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(accent).toBe('amber');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-appearance-accent');
    fail({
      test: 'settings Appearance: accent chips switch data-accent',
      page: page.url(),
      expected: 'data-accent flips through teal/indigo/amber',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:312',
      severity: 'medium',
    });
  }
});

test('settings Appearance: density chips update profile.density', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    await page.locator('button', { hasText: /^Compact$/ }).first().click();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].density).toBe('compact');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-appearance-density');
    fail({
      test: 'settings Appearance: density updates profile',
      page: page.url(),
      expected: 'profiles[0].density === "compact"',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:325',
      severity: 'low',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 11. SETTINGS — Section 8: Privacy
// ─────────────────────────────────────────────────────────────────────────
test('settings Privacy: Always start blurred toggle flips privacyDefault', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // The Privacy section toggle is the first <button> after the Privacy heading
    // that contains a track + thumb (transparent bg + 38x22 inner). Easier:
    // click the toggle in the Privacy section by locating "Always start blurred".
    const row = page.getByText('Always start blurred').locator('..').locator('..');
    await row.locator('button').last().click();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].privacyDefault).toBe(true);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-privacy-toggle');
    fail({
      test: 'settings Privacy: Always start blurred persists',
      page: page.url(),
      expected: 'profiles[0].privacyDefault === true',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:345',
      severity: 'medium',
    });
  }
});

test('settings Privacy: with privacyDefault=true reload starts blurred', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    // Programmatically flip privacyDefault to remove timing flakiness on the toggle.
    await page.evaluate(() => window.FCAuth.updateProfile({ privacyDefault: true }));
    await page.goto('/desktop/home.html');
    await page.waitForSelector('header');
    await page.waitForTimeout(500);
    // Header eye should now show "Hidden".
    const eyeText = (await page.locator('header button[title*="privacy"]').textContent() || '').trim();
    expect(eyeText).toBe('Hidden');
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-privacy-default-mount');
    fail({
      test: 'settings Privacy: privacyDefault → mount blurred',
      page: page.url(),
      expected: 'header shows "Hidden" on home mount',
      actual: e.message,
      filePath: 'webapp/desktop/page.js:84',
      severity: 'medium',
    });
  }
});

test('settings Privacy: Idle auto-lock minutes accepts integers', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    const numInput = page.locator('input[type="number"]').first();
    await numInput.fill('15');
    await numInput.blur();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
    expect(stored[0].idleLockMinutes).toBe(15);
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-privacy-idle');
    fail({
      test: 'settings Privacy: idleLockMinutes persists',
      page: page.url(),
      expected: 'profiles[0].idleLockMinutes === 15',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:347',
      severity: 'low',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 12. SETTINGS — Section 9: About (info-only, just verify text)
// ─────────────────────────────────────────────────────────────────────────
test('settings About: shows version, storage, and created date', async ({ page }) => {
  await seedAndGoto(page, '/desktop/settings.html');
  try {
    await expect(page.getByText(/Finch · v0\.1\.0/)).toBeVisible();
    await expect(page.getByText(/Storage:/)).toBeVisible();
    await expect(page.getByText(/Profile created:/)).toBeVisible();
    pass();
  } catch (e) {
    await shotOnFail(page, 'settings-about');
    fail({
      test: 'settings About: shows version+storage+created',
      page: page.url(),
      expected: 'Finch · v0.1.0 + Storage: + Profile created:',
      actual: e.message,
      filePath: 'webapp/desktop/settings-screen.jsx:357',
      severity: 'low',
    });
  }
});
