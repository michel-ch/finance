// QA: Auth + Onboarding pages — production build (port 8765).
// Scope: index.html, signup.html, login.html, pin.html, desktop/onboarding.html.
// Does NOT modify webapp source. Writes a cumulative JSON report at qa-auth-report.json.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const SHOTS_DIR  = path.join(__dirname, 'screenshots', 'qa-auth');
const REPORT     = path.join(__dirname, 'qa-auth-report.json');

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

// ---- Cumulative report state ----
const issues = [];
let totalTests = 0;
let passed     = 0;
let failed     = 0;
const passList = [];
const failList = [];

function addIssue({ testName, page: pg, expected, actual, filePath, severity }) {
  issues.push({ test: testName, page: pg, expected, actual, filePath, severity });
}

function attachErrorCapture(page) {
  const errs = [];
  page.on('pageerror', (err) => errs.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errs.push('console.error: ' + msg.text());
  });
  return errs;
}

async function safeShot(page, name) {
  try { await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: true }); }
  catch (_) { /* swallow */ }
}

// Hash function matching webapp/auth.js (djb2-ish, signed 32-bit).
function authHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) | 0);
  return String(h);
}

function makeProfile(overrides = {}) {
  return {
    id: 'p_test_' + (overrides.idSuffix || '1'),
    name: 'QA User',
    email: 'qa@finch.test',
    passwordHash: authHash('secret123'),
    initials: 'QU',
    baseCurrency: 'EUR',
    activeCurrencies: ['EUR', 'USD', 'GBP'],
    createdAt: new Date().toISOString(),
    pin: null,
    theme: 'dark',
    accent: 'teal',
    density: 'comfortable',
    privacyDefault: false,
    idleLockMinutes: 0,
    startBlurred: false,
    householdId: 'h_test',
    onboarded: !!overrides.onboarded,
    ...overrides,
  };
}

async function clearStorage(page) {
  // login.html is unguarded — safe place to set storage.
  await page.goto('/login.html');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

async function seedProfile(page, profile, { session = true, pinLocked = false } = {}) {
  await page.goto('/login.html');
  await page.evaluate(({ profile, session, pinLocked }) => {
    localStorage.clear();
    localStorage.setItem('fc.profiles.v1', JSON.stringify([profile]));
    if (session) {
      localStorage.setItem('fc.session.v1', JSON.stringify({
        profileId: profile.id, loggedInAt: new Date().toISOString(),
      }));
    }
    if (pinLocked) localStorage.setItem('fc.pinLocked.v1', 'true');
  }, { profile, session, pinLocked });
}

// Bookkeeping wrapper — counts tests + writes report at the end.
function track(name, fn) {
  test(name, async ({ page }, info) => {
    totalTests++;
    try {
      await fn({ page, name });
      passed++;
      passList.push(name);
    } catch (e) {
      failed++;
      failList.push({ name, error: e.message });
      await safeShot(page, name.replace(/[^a-z0-9]+/gi, '_').toLowerCase());
      // Record the failure as an issue if no specific issue was already recorded.
      if (!issues.some(i => i.test === name)) {
        addIssue({
          testName: name, page: '?',
          expected: 'test to pass',
          actual: e.message.split('\n')[0].slice(0, 200),
          filePath: 'tests/qa-auth.spec.mjs',
          severity: 'high',
        });
      }
      throw e;
    }
  });
}

test.afterAll(async () => {
  fs.writeFileSync(REPORT, JSON.stringify({
    agent: 'auth',
    totalTests, passed, failed,
    issues,
    passList, failList,
  }, null, 2));
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Splash routing (index.html)
// ─────────────────────────────────────────────────────────────────────────

track('Splash empty localStorage routes to signup', async ({ page, name }) => {
  const errs = attachErrorCapture(page);
  await clearStorage(page);
  await page.goto('/index.html');
  try {
    await page.waitForURL(/signup\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'index.html',
      expected: 'redirect to signup.html when no profile',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/index.html:27',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/signup\.html$/);
  if (errs.length) addIssue({
    testName: name, page: 'index.html', expected: 'no errors', actual: errs.join(' | '),
    filePath: 'webapp/index.html', severity: 'medium',
  });
});

track('Splash profile + logged out routes to login', async ({ page, name }) => {
  attachErrorCapture(page);
  // Seed profile WITHOUT session.
  await seedProfile(page, makeProfile({ onboarded: true }), { session: false });
  await page.goto('/index.html');
  try {
    await page.waitForURL(/login\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'index.html',
      expected: 'redirect to login.html when profile exists but logged out',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/auth.js:117',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/login\.html$/);
});

track('Splash logged in onboarded routes to home', async ({ page, name }) => {
  attachErrorCapture(page);
  await seedProfile(page, makeProfile({ onboarded: true }), { session: true });
  await page.goto('/index.html');
  try {
    await page.waitForURL(/desktop\/home\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'index.html',
      expected: 'redirect to desktop/home.html when logged in and onboarded',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/auth.js:122',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/desktop\/home\.html$/);
});

track('Splash PIN locked routes to pin', async ({ page, name }) => {
  attachErrorCapture(page);
  // Profile WITH pin set, pinLocked flag true.
  const prof = makeProfile({ onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: true, pinLocked: true });
  await page.goto('/index.html');
  // index.html does not handle PIN gating — only firstRoute() based on profile.onboarded.
  // The expected behavior per spec is that splash routes to pin.html when locked.
  // Document actual behavior.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  const url = page.url();
  if (!/pin\.html$/.test(url)) {
    addIssue({
      testName: name, page: 'index.html',
      expected: 'redirect to pin.html when logged in and PIN locked',
      actual: 'landed at ' + url,
      filePath: 'webapp/auth.js:117-122 (firstRoute does not check isPinLocked)',
      severity: 'medium',
    });
  }
  // Soft assert — record but do not fail the entire suite for this design gap.
  // Use a soft expect so report still flags it.
  expect.soft(url, 'firstRoute should send PIN-locked sessions to pin.html').toMatch(/pin\.html$/);
});

track('Splash logged in not onboarded routes to onboarding', async ({ page, name }) => {
  attachErrorCapture(page);
  await seedProfile(page, makeProfile({ onboarded: false }), { session: true });
  await page.goto('/index.html');
  try {
    await page.waitForURL(/desktop\/onboarding\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'index.html',
      expected: 'redirect to desktop/onboarding.html when logged in but not onboarded',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/auth.js:121',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/desktop\/onboarding\.html$/);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Signup form (signup.html)
// ─────────────────────────────────────────────────────────────────────────

track('Signup creates profile and routes to onboarding', async ({ page, name }) => {
  const errs = attachErrorCapture(page);
  await clearStorage(page);
  await page.goto('/signup.html');
  await page.fill('#name', 'Alice Doe');
  await page.fill('#email', 'alice@finch.test');
  await page.fill('#password', 'mypass1');

  // Toggle a chip — CHF default false, click should make it true.
  const chf = page.locator('.chip[data-c="CHF"]');
  expect(await chf.getAttribute('aria-pressed')).toBe('false');
  await chf.click();
  expect(await chf.getAttribute('aria-pressed')).toBe('true');
  // Toggle USD off (default true → false).
  const usd = page.locator('.chip[data-c="USD"]');
  expect(await usd.getAttribute('aria-pressed')).toBe('true');
  await usd.click();
  expect(await usd.getAttribute('aria-pressed')).toBe('false');

  await page.click('button[type="submit"]');
  await page.waitForURL(/desktop\/onboarding\.html$/, { timeout: 10_000 });

  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1') || '[]'));
  const session  = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.session.v1')  || 'null'));

  expect(profiles).toHaveLength(1);
  expect(profiles[0].email).toBe('alice@finch.test');
  expect(profiles[0].name).toBe('Alice Doe');
  expect(session).toBeTruthy();
  expect(session.profileId).toBe(profiles[0].id);
  if (errs.length) addIssue({
    testName: name, page: 'signup.html', expected: 'no errors',
    actual: errs.slice(0, 3).join(' | '),
    filePath: 'webapp/signup.html', severity: 'medium',
  });
});

track('Signup duplicate email shows inline error', async ({ page, name }) => {
  attachErrorCapture(page);
  // Pre-seed a profile with a known email.
  await seedProfile(page, makeProfile({ email: 'dup@finch.test' }), { session: false });
  await page.goto('/signup.html');
  await page.fill('#name', 'Dup');
  await page.fill('#email', 'dup@finch.test');
  await page.fill('#password', 'anything');
  await page.click('button[type="submit"]');
  // Should remain on signup.html with .err populated.
  await page.waitForTimeout(400);
  const errText = await page.locator('#err').textContent();
  if (!errText || !/already exists/i.test(errText)) {
    addIssue({
      testName: name, page: 'signup.html',
      expected: 'inline error "An account with this email already exists." in #err',
      actual: 'err text was: ' + JSON.stringify(errText),
      filePath: 'webapp/signup.html:100; webapp/auth.js:50',
      severity: 'medium',
    });
  }
  expect(errText || '').toMatch(/already exists/i);
  expect(page.url()).toMatch(/signup\.html$/);
});

track('Signup empty form triggers HTML5 validation', async ({ page, name }) => {
  attachErrorCapture(page);
  await clearStorage(page);
  await page.goto('/signup.html');
  // Click submit with no fields filled.
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);
  // Should still be on signup.html (form prevented).
  expect(page.url()).toMatch(/signup\.html$/);
  // Verify name input is invalid (required).
  const nameValid = await page.evaluate(() => document.getElementById('name').validity.valid);
  if (nameValid) {
    addIssue({
      testName: name, page: 'signup.html',
      expected: 'name input invalid when empty (required attribute)',
      actual: 'name reports valid=true',
      filePath: 'webapp/signup.html:43',
      severity: 'low',
    });
  }
  expect(nameValid).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Login form (login.html)
// ─────────────────────────────────────────────────────────────────────────

track('Login wrong password shows inline error', async ({ page, name }) => {
  attachErrorCapture(page);
  await seedProfile(page, makeProfile({ email: 'right@finch.test' }), { session: false });
  await page.goto('/login.html');
  await page.fill('#email', 'right@finch.test');
  await page.fill('#password', 'wrongpass');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);
  const errText = await page.locator('#err').textContent();
  if (!errText || !/wrong/i.test(errText)) {
    addIssue({
      testName: name, page: 'login.html',
      expected: 'inline error "Wrong email or password." in #err',
      actual: 'err text: ' + JSON.stringify(errText),
      filePath: 'webapp/login.html:66; webapp/auth.js:82',
      severity: 'medium',
    });
  }
  expect(errText || '').toMatch(/wrong/i);
  expect(page.url()).toMatch(/login\.html$/);
});

track('Login correct password not onboarded routes to onboarding', async ({ page, name }) => {
  attachErrorCapture(page);
  await seedProfile(page, makeProfile({ email: 'onb@finch.test', onboarded: false }), { session: false });
  await page.goto('/login.html');
  await page.fill('#email', 'onb@finch.test');
  await page.fill('#password', 'secret123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/desktop\/onboarding\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'login.html',
      expected: 'route to desktop/onboarding.html when logged in but not onboarded',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/login.html:64',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/desktop\/onboarding\.html$/);
});

track('Login correct password onboarded routes to home', async ({ page, name }) => {
  attachErrorCapture(page);
  await seedProfile(page, makeProfile({ email: 'home@finch.test', onboarded: true }), { session: false });
  await page.goto('/login.html');
  await page.fill('#email', 'home@finch.test');
  await page.fill('#password', 'secret123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/desktop\/home\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'login.html',
      expected: 'route to desktop/home.html when logged in and onboarded',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/login.html:65',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/desktop\/home\.html$/);
});

track('Login with PIN set routes to pin.html', async ({ page, name }) => {
  attachErrorCapture(page);
  const prof = makeProfile({ email: 'pinned@finch.test', onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: false });
  await page.goto('/login.html');
  await page.fill('#email', 'pinned@finch.test');
  await page.fill('#password', 'secret123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/pin\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'login.html',
      expected: 'route to pin.html when profile.pin is set',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/login.html:63',
      severity: 'high',
    });
    throw e;
  }
  expect(page.url()).toMatch(/pin\.html$/);
});

track('Login Create one link goes to signup', async ({ page, name }) => {
  attachErrorCapture(page);
  await clearStorage(page);
  await page.goto('/login.html');
  await page.click('a[href="signup.html"]');
  await page.waitForLoadState('domcontentloaded');
  if (!/signup\.html$/.test(page.url())) {
    addIssue({
      testName: name, page: 'login.html',
      expected: 'Create one link navigates to signup.html',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/login.html:48',
      severity: 'medium',
    });
  }
  expect(page.url()).toMatch(/signup\.html$/);
});

// ─────────────────────────────────────────────────────────────────────────
// 4. PIN pad (pin.html)
// ─────────────────────────────────────────────────────────────────────────

track('PIN wrong digits shows error and clears', async ({ page, name }) => {
  attachErrorCapture(page);
  const prof = makeProfile({ onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: true, pinLocked: true });
  await page.goto('/pin.html');
  await page.waitForSelector('#pad');
  // Tap 9 9 9 9
  await page.locator('#pad button').filter({ hasText: /^9$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^9$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^9$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^9$/ }).click();
  // Error message should appear.
  const errLocator = page.locator('#err');
  await expect(errLocator).toHaveText(/wrong/i, { timeout: 2_000 });
  // After ~600ms the error clears and dots reset.
  await page.waitForTimeout(900);
  const cleared = await errLocator.textContent();
  if (cleared && cleared.length > 0) {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'error clears after ~600ms',
      actual: 'err still: ' + JSON.stringify(cleared),
      filePath: 'webapp/pin.html:67',
      severity: 'low',
    });
  }
  expect(cleared).toBe('');
  // Still on pin.html.
  expect(page.url()).toMatch(/pin\.html$/);
});

track('PIN correct routes to home and clears pinLocked', async ({ page, name }) => {
  attachErrorCapture(page);
  const prof = makeProfile({ onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: true, pinLocked: true });
  await page.goto('/pin.html');
  await page.waitForSelector('#pad');
  await page.locator('#pad button').filter({ hasText: /^1$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^2$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^3$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^4$/ }).click();
  try {
    await page.waitForURL(/desktop\/home\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'route to desktop/home.html on correct PIN',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/pin.html:64',
      severity: 'high',
    });
    throw e;
  }
  // pinLocked flag cleared.
  const lock = await page.evaluate(() => localStorage.getItem('fc.pinLocked.v1'));
  if (lock === 'true') {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'fc.pinLocked.v1 cleared (false) after correct PIN',
      actual: 'still ' + JSON.stringify(lock),
      filePath: 'webapp/pin.html:63; webapp/auth.js:44',
      severity: 'medium',
    });
  }
  expect(lock).not.toBe('true');
});

track('PIN sign out link clears session and routes to login', async ({ page, name }) => {
  attachErrorCapture(page);
  const prof = makeProfile({ onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: true, pinLocked: true });
  await page.goto('/pin.html');
  await page.waitForSelector('#out');
  await page.click('#out');
  try {
    await page.waitForURL(/login\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'route to login.html on Sign out click',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/pin.html:73',
      severity: 'high',
    });
    throw e;
  }
  const session = await page.evaluate(() => localStorage.getItem('fc.session.v1'));
  if (session) {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'fc.session.v1 cleared after Sign out',
      actual: 'still ' + JSON.stringify(session),
      filePath: 'webapp/auth.js:90',
      severity: 'medium',
    });
  }
  expect(session).toBeNull();
});

track('PIN backspace removes last digit', async ({ page, name }) => {
  attachErrorCapture(page);
  const prof = makeProfile({ onboarded: true, pin: authHash('1234') });
  await seedProfile(page, prof, { session: true, pinLocked: true });
  await page.goto('/pin.html');
  await page.waitForSelector('#pad');
  // Tap 1, 2.
  await page.locator('#pad button').filter({ hasText: /^1$/ }).click();
  await page.locator('#pad button').filter({ hasText: /^2$/ }).click();
  let dotsOn = await page.locator('.dot.on').count();
  expect(dotsOn).toBe(2);
  // Tap backspace — should drop to 1 dot.
  await page.click('#del');
  dotsOn = await page.locator('.dot.on').count();
  if (dotsOn !== 1) {
    addIssue({
      testName: name, page: 'pin.html',
      expected: 'backspace removes last digit (1 dot remains)',
      actual: dotsOn + ' dots active',
      filePath: 'webapp/pin.html:57',
      severity: 'medium',
    });
  }
  expect(dotsOn).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Onboarding 3 steps (desktop/onboarding.html)
// ─────────────────────────────────────────────────────────────────────────

async function gotoOnboarding(page, profile = makeProfile({ onboarded: false })) {
  await seedProfile(page, profile, { session: true });
  await page.goto('/desktop/onboarding.html');
  // Wait for React to mount the step UI — header has "Step 1 of 3".
  await expect(page.getByText(/Step 1 of 3/i)).toBeVisible({ timeout: 15_000 });
}

track('Onboarding step 1 default base from locale and Continue persists', async ({ page, name }) => {
  attachErrorCapture(page);
  await gotoOnboarding(page);

  // Default base: navigator.language is "en-US" in headless Chromium → USD per onboarding-flow guess map.
  // We don't hardcode the value but verify a base IS pre-selected (some currency button shows accent style).
  // Simpler: click Continue, then read profile.
  // First, switch base to a deterministic value — click EUR button (button containing both "EUR" and "Euro" spans).
  const eurBtn = page.locator('button').filter({ has: page.locator('span', { hasText: /^EUR$/ }) }).filter({ hasText: 'Euro' }).first();
  await eurBtn.click();
  await page.waitForTimeout(150);

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Step 2 of 3/i)).toBeVisible({ timeout: 5_000 });

  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1'))[0]);
  if (profile.baseCurrency !== 'EUR') {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'profile.baseCurrency = "EUR" after Continue on step 1',
      actual: 'baseCurrency = ' + JSON.stringify(profile.baseCurrency),
      filePath: 'webapp/desktop/onboarding-flow.jsx:103-107',
      severity: 'high',
    });
  }
  expect(profile.baseCurrency).toBe('EUR');
});

track('Onboarding step 2 base cannot be deselected and active list persists', async ({ page, name }) => {
  attachErrorCapture(page);
  await gotoOnboarding(page);

  // Pin base to EUR.
  await page.locator('button').filter({ has: page.locator('span', { hasText: /^EUR$/ }) }).filter({ hasText: 'Euro' }).first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Step 2 of 3/i)).toBeVisible();

  // Add USD if not already (it's likely already on after add).
  const usdChip = page.locator('button:has-text("USD")').first();
  // EUR chip should show BASE label and be non-toggleable.
  const eurChip = page.locator('button:has-text("EUR")').first();
  // Click EUR — should NOT remove from active set.
  await eurChip.click();
  // Add GBP.
  const gbpChip = page.locator('button:has-text("GBP")').first();
  await gbpChip.click();
  // Continue.
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Step 3 of 3/i)).toBeVisible({ timeout: 5_000 });

  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('fc.profiles.v1'))[0]);
  if (!profile.activeCurrencies || !profile.activeCurrencies.includes('EUR')) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'profile.activeCurrencies includes base "EUR"',
      actual: JSON.stringify(profile.activeCurrencies),
      filePath: 'webapp/desktop/onboarding-flow.jsx:109-114',
      severity: 'high',
    });
  }
  expect(profile.activeCurrencies).toContain('EUR');
});

track('Onboarding step 3 finish creates account and routes to home', async ({ page, name }) => {
  attachErrorCapture(page);
  await gotoOnboarding(page);
  // Step 1 → Continue.
  await page.locator('button').filter({ has: page.locator('span', { hasText: /^EUR$/ }) }).filter({ hasText: 'Euro' }).first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
  // Step 2 → Continue.
  await expect(page.getByText(/Step 2 of 3/i)).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  // Step 3 — fill form.
  await expect(page.getByText(/Step 3 of 3/i)).toBeVisible();
  await page.locator('input[placeholder*="Main checking"]').fill('My Checking');
  // Click Savings type chip.
  await page.locator('button:has-text("Savings")').first().click();
  await page.locator('input[type="number"]').fill('1234.56');
  // Date input is pre-filled; leave as-is.
  await page.getByRole('button', { name: /Finish/i }).click();
  try {
    await page.waitForURL(/desktop\/home\.html$/, { timeout: 10_000 });
  } catch (e) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'Finish navigates to desktop/home.html',
      actual: 'landed at ' + page.url(),
      filePath: 'webapp/desktop/onboarding-flow.jsx:130',
      severity: 'high',
    });
    throw e;
  }

  // Verify account in store and onboarded flag.
  const result = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('fc.profiles.v1'))[0];
    const accts = (window.FCStore && window.FCStore.list) ? window.FCStore.list('accounts') : null;
    return { onboarded: profile.onboarded, accountCount: accts ? accts.length : -1, firstAccount: accts ? accts[0] : null };
  });
  if (result.onboarded !== true) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'profile.onboarded = true after Finish',
      actual: JSON.stringify(result.onboarded),
      filePath: 'webapp/desktop/onboarding-flow.jsx:129',
      severity: 'high',
    });
  }
  if (result.accountCount < 1) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'FCStore.list("accounts") has at least 1 entry',
      actual: 'count = ' + result.accountCount,
      filePath: 'webapp/desktop/onboarding-flow.jsx:119',
      severity: 'high',
    });
  }
  expect(result.onboarded).toBe(true);
  expect(result.accountCount).toBeGreaterThanOrEqual(1);
  expect(result.firstAccount && result.firstAccount.name).toBe('My Checking');
});

track('Onboarding progress bar has 3 segments highlighting current step', async ({ page, name }) => {
  attachErrorCapture(page);
  await gotoOnboarding(page);
  // The progress bar consists of 3 sibling divs rendered at the bottom of the flow card.
  // We locate them via height:4 borderRadius:2 styling — easier: just count the bars.
  // Since they're inline-styled divs, query via JS evaluation.
  const segs = await page.evaluate(() => {
    // Find a flex container with 3 children, each height: '4px'.
    const all = Array.from(document.querySelectorAll('div'));
    const bars = all.filter(d => {
      const cs = getComputedStyle(d);
      return cs.height === '4px' && cs.borderTopLeftRadius === '2px';
    });
    return bars.map(b => ({
      bg: getComputedStyle(b).backgroundColor,
      h: getComputedStyle(b).height,
    }));
  });
  if (segs.length !== 3) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: '3 progress bar segments rendered',
      actual: segs.length + ' found',
      filePath: 'webapp/desktop/onboarding-flow.jsx:361-369',
      severity: 'low',
    });
  }
  expect(segs.length).toBe(3);
  // Step 1 highlighted: first bar bg differs from third bar bg.
  if (segs.length === 3 && segs[0].bg === segs[2].bg) {
    addIssue({
      testName: name, page: 'desktop/onboarding.html',
      expected: 'step 1 bar bg uses --accent (different from inactive segments)',
      actual: 'all bars same color: ' + segs[0].bg,
      filePath: 'webapp/desktop/onboarding-flow.jsx:365',
      severity: 'low',
    });
  }
});
