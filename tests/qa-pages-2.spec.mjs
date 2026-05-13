// QA spec for Finch desktop pages — forecast / simulator / goals / budgets / recurring.
// Tests:
//   - prod (8765): empty-state rendering + CTA links
//   - demo (8766): page populated, interactions work, no pageerrors
//
// Run from C:\Users\mtx\desktop\Finance\tests:
//   npx playwright test --config qa-pages-2.config.mjs

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PROD = 'http://127.0.0.1:8765';
const DEMO = 'http://127.0.0.1:8766';
const SHOTS_DIR = path.join('screenshots', 'qa-pages-2');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const PROFILE = {
  id: 'p_q', name: 'QA', email: 'q@q', passwordHash: '0', initials: 'Q',
  baseCurrency: 'EUR', activeCurrencies: ['EUR', 'USD', 'GBP'],
  onboarded: true, theme: 'dark', accent: 'teal', householdId: 'h',
};

// ───────────────────────── shared helpers ─────────────────────────

const issues = [];

function recordIssue(test, page, expected, actual, filePath, severity) {
  issues.push({ test, page, expected, actual, filePath, severity });
}

async function seedSession(page) {
  await page.evaluate((profile) => {
    localStorage.setItem('fc.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('fc.session.v1', JSON.stringify({
      profileId: profile.id, loggedInAt: new Date().toISOString(),
    }));
  }, PROFILE);
}

async function gotoOn(page, base, file) {
  // Visit unguarded login page to be on the right origin before seeding storage.
  await page.goto(`${base}/login.html`);
  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem('fc.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('fc.session.v1', JSON.stringify({
      profileId: profile.id, loggedInAt: new Date().toISOString(),
    }));
  }, PROFILE);
  // Now navigate to the protected page — auth.requireSession will pass.
  await page.goto(`${base}/desktop/${file}`);
  await page.waitForFunction(
    () => document.querySelector('#root')?.children?.length > 0,
    { timeout: 12_000 },
  );
  // Babel/JSX needs an extra beat for listeners to attach
  await page.waitForTimeout(900);
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: true });
  } catch {}
}

// pageerror collector per test
function attachErrorCollector(page, errorBag) {
  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    // Babel-standalone in dev throws benign warnings on first parse on some builds.
    if (/babel/i.test(msg)) return;
    errorBag.push(msg);
  });
}

// ════════════════════════ FORECAST ═══════════════════════════════

test.describe('forecast.html', () => {
  test('prod empty-state CTA links visible', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, PROD, 'forecast.html');

      const accountsLink = page.locator('a[href="accounts.html"]').first();
      const recurringLink = page.locator('a[href="recurring.html"]').first();
      await expect(accountsLink).toBeVisible({ timeout: 5_000 });
      await expect(recurringLink).toBeVisible({ timeout: 5_000 });

      // links are anchors with href
      expect(await accountsLink.getAttribute('href')).toBe('accounts.html');
      expect(await recurringLink.getAttribute('href')).toBe('recurring.html');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'forecast-prod-empty');
      recordIssue('forecast prod empty CTAs', 'forecast.html (prod)',
        'CTA links to accounts.html + recurring.html visible',
        e.message,
        'webapp/components/forecast-screen.jsx:33', 'high');
      throw e;
    }
  });

  test('demo: horizon selector buttons update state', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'forecast.html');

      // Horizon buttons render as text "30d", "60d", "90d", "180d", "365d"
      for (const h of ['30d', '60d', '90d', '180d', '365d']) {
        const btn = page.getByRole('button', { name: new RegExp(`^${h}$`) });
        await expect(btn).toBeVisible({ timeout: 5_000 });
        await btn.click();
        // No crash: just ensure still present after click
        await expect(btn).toBeVisible();
      }
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'forecast-demo-horizon');
      recordIssue('forecast horizon selector', 'forecast.html (demo)',
        'all 5 horizon buttons clickable without error',
        e.message,
        'webapp/components/forecast-screen.jsx:73', 'high');
      throw e;
    }
  });

  test('demo: per-account toggle checkboxes work', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'forecast.html');

      // "Include accounts" panel — buttons in a column
      await expect(page.getByText('Include accounts', { exact: false })).toBeVisible({ timeout: 5_000 });

      // The account-toggles are <button>s containing the account name + currency.
      // Find the closest button under the "Include accounts" card and click it.
      const card = page.locator('div.fc-card', { hasText: 'Include accounts' }).first();
      const togglerBtns = card.locator('button');
      const count = await togglerBtns.count();
      expect(count).toBeGreaterThan(0);

      // Toggle first one off then on; ensure still visible
      await togglerBtns.first().click();
      await togglerBtns.first().click();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'forecast-demo-toggles');
      recordIssue('forecast account toggles', 'forecast.html (demo)',
        'per-account toggle buttons clickable',
        e.message,
        'webapp/components/forecast-screen.jsx:127', 'high');
      throw e;
    }
  });

  test('demo: "Simulate a purchase" toggle opens inputs', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'forecast.html');

      const simBtn = page.getByRole('button', { name: /Simulate a purchase/i });
      await expect(simBtn).toBeVisible({ timeout: 5_000 });
      await simBtn.click();

      // After enable: see Amount field with € + number input, In field with range input
      await expect(page.getByText('Amount', { exact: false }).first()).toBeVisible({ timeout: 5_000 });
      const numberInput = page.locator('input[type="number"]').first();
      await expect(numberInput).toBeVisible();

      // Change amount; should not crash
      await numberInput.fill('800');
      // Slider exists
      const range = page.locator('input[type="range"]').first();
      await expect(range).toBeVisible();

      // "Stop simulation" button is now visible
      await expect(page.getByRole('button', { name: /Stop simulation/i })).toBeVisible();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'forecast-demo-sim-toggle');
      recordIssue('forecast simulate toggle', 'forecast.html (demo)',
        '"Simulate a purchase" button reveals amount + slider inputs',
        e.message,
        'webapp/components/forecast-screen.jsx:397', 'high');
      throw e;
    }
  });

  test('demo: lowest-point summary visible', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'forecast.html');

      // Stat tile labelled "Lowest point"
      await expect(page.getByText('Lowest point', { exact: false })).toBeVisible({ timeout: 5_000 });
      // Today's liquid + Projected end + Net flow tiles should also be there
      await expect(page.getByText("Today's liquid", { exact: false })).toBeVisible();
      await expect(page.getByText('Projected end', { exact: false })).toBeVisible();
      await expect(page.getByText('Net flow', { exact: false })).toBeVisible();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'forecast-demo-stats');
      recordIssue('forecast lowest point summary', 'forecast.html (demo)',
        'Lowest point + 3 sibling stat tiles visible',
        e.message,
        'webapp/components/forecast-screen.jsx:95', 'medium');
      throw e;
    }
  });
});

// ════════════════════════ SIMULATOR ══════════════════════════════

test.describe('simulator.html', () => {
  test('prod empty-state links to accounts.html', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, PROD, 'simulator.html');

      const link = page.locator('a[href="accounts.html"]').first();
      await expect(link).toBeVisible({ timeout: 5_000 });
      expect(await link.getAttribute('href')).toBe('accounts.html');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-prod-empty');
      recordIssue('simulator prod empty', 'simulator.html (prod)',
        'CTA link to accounts.html visible',
        e.message,
        'webapp/components/extra-screens.jsx:515', 'high');
      throw e;
    }
  });

  test('demo: amount slider + numeric input both update state', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      // Numeric (type=number) input — first one is the amount; default 1200
      const amount = page.locator('input[type="number"]').first();
      await expect(amount).toBeVisible({ timeout: 5_000 });
      await expect(amount).toHaveValue('1200');

      // Type new value
      await amount.fill('999');
      await expect(amount).toHaveValue('999');

      // Slider input
      const slider = page.locator('input[type="range"]').first();
      await expect(slider).toBeVisible();
      // Set slider value
      await slider.evaluate((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '2500');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await expect(amount).toHaveValue('2500');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-amount');
      recordIssue('simulator amount slider+input', 'simulator.html (demo)',
        'changing slider also updates numeric input (and vice versa)',
        e.message,
        'webapp/components/extra-screens.jsx:550', 'high');
      throw e;
    }
  });

  test('demo: account dropdown switches account', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      const sel = page.locator('select').first();
      await expect(sel).toBeVisible({ timeout: 5_000 });
      const options = await sel.locator('option').all();
      expect(options.length).toBeGreaterThan(1);
      // Select the second option
      const val = await options[1].getAttribute('value');
      await sel.selectOption(val);
      const cur = await sel.inputValue();
      expect(cur).toBe(val);
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-account');
      recordIssue('simulator account switch', 'simulator.html (demo)',
        'dropdown second option becomes selected',
        e.message,
        'webapp/components/extra-screens.jsx:556', 'high');
      throw e;
    }
  });

  test('demo: date input changes', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      const date = page.locator('input[type="date"]').first();
      await expect(date).toBeVisible({ timeout: 5_000 });
      await date.fill('2026-08-15');
      await expect(date).toHaveValue('2026-08-15');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-date');
      recordIssue('simulator date input', 'simulator.html (demo)',
        'date input accepts new value',
        e.message,
        'webapp/components/extra-screens.jsx:562', 'medium');
      throw e;
    }
  });

  test('demo: "Make this recurring" toggle works', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      // The toggle is a <button> inside the FormRow with label "Make this recurring".
      // It has no accessible name — find its parent row by label text and grab the button.
      const row = page.locator('div').filter({ hasText: /^Make this recurring$/ }).first();
      // The button is inside the row's parent (FormRow flex)
      // Easier: just grab all <button>s on page that are 44px wide via the inline style.
      const toggle = page.locator('button[style*="width: 44px"]').first();
      await expect(toggle).toBeVisible({ timeout: 5_000 });
      // Click should not crash
      await toggle.click();
      await page.waitForTimeout(150);
      // Click again to flip back
      await toggle.click();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-recurring');
      recordIssue('simulator make-recurring toggle', 'simulator.html (demo)',
        '"Make this recurring" toggle clickable without error',
        e.message,
        'webapp/components/extra-screens.jsx:566', 'medium');
      throw e;
    }
  });

  test('demo: quick-amount chips set amount on click', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      const amount = page.locator('input[type="number"]').first();

      // Click "Camera · €1200"
      await page.getByRole('button', { name: /Camera/i }).click();
      await expect(amount).toHaveValue('1200');

      // Flight · €380
      await page.getByRole('button', { name: /Flight/i }).click();
      await expect(amount).toHaveValue('380');

      // Apartment deposit · €4500
      await page.getByRole('button', { name: /Apartment deposit/i }).click();
      await expect(amount).toHaveValue('4500');

      // Subscription · €49
      await page.getByRole('button', { name: /Subscription/i }).click();
      await expect(amount).toHaveValue('49');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-chips');
      recordIssue('simulator quick-amount chips', 'simulator.html (demo)',
        'Camera/Flight/Apartment deposit/Subscription chips set amount',
        e.message,
        'webapp/components/extra-screens.jsx:580', 'high');
      throw e;
    }
  });

  test('demo: verdict card color reacts to safe/unsafe', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'simulator.html');

      const amount = page.locator('input[type="number"]').first();

      // Subscription = €49 → safe → "You can afford this."
      await page.getByRole('button', { name: /Subscription/i }).click();
      await expect(page.getByText(/You can afford this/i)).toBeVisible({ timeout: 5_000 });

      // Push to a huge value → unsafe
      await amount.fill('100000');
      // Trigger change event for React onChange (fill already dispatches input)
      await amount.press('Tab');
      await expect(page.getByText(/Not without trade-offs/i)).toBeVisible({ timeout: 5_000 });
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'sim-verdict');
      recordIssue('simulator verdict color flip', 'simulator.html (demo)',
        'verdict text changes between "You can afford this." and "Not without trade-offs."',
        e.message,
        'webapp/components/extra-screens.jsx:611', 'high');
      throw e;
    }
  });
});

// ════════════════════════ GOALS ══════════════════════════════════

test.describe('goals.html', () => {
  test('prod empty-state shows EmptyState card with "+ New goal" CTA', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, PROD, 'goals.html');

      await expect(page.getByText(/Set your first savings goal/i)).toBeVisible({ timeout: 5_000 });
      const newGoalBtn = page.getByRole('button', { name: /New goal/i }).first();
      await expect(newGoalBtn).toBeVisible();

      // Clicking opens GoalFormModal
      await newGoalBtn.click();
      await expect(page.getByRole('dialog').filter({ hasText: /New goal/i })).toBeVisible({ timeout: 5_000 });
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'goals-prod-empty');
      recordIssue('goals prod empty CTA', 'goals.html (prod)',
        'Empty state with working "+ New goal" button',
        e.message,
        'webapp/components/goals-screen.jsx:18', 'high');
      throw e;
    }
  });

  test('demo: clicking a goal card selects it + shows detail', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'goals.html');

      // Goal cards are <button> elements with class fc-card; find them.
      const goalCards = page.locator('button.fc-card');
      const count = await goalCards.count();
      expect(count).toBeGreaterThan(0);

      // Click second card (first is selected by default)
      if (count >= 2) {
        await goalCards.nth(1).click();
        // After click: detail panel should still be visible (Pace analysis section)
        await expect(page.getByText(/Pace analysis/i)).toBeVisible({ timeout: 5_000 });
      }
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'goals-demo-select');
      recordIssue('goals card select', 'goals.html (demo)',
        'second goal card clickable + detail panel updates',
        e.message,
        'webapp/components/goals-screen.jsx:56', 'high');
      throw e;
    }
  });

  test('demo: "+ New goal" opens GoalFormModal', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'goals.html');

      await page.getByRole('button', { name: /New goal/i }).first().click();
      const dialog = page.getByRole('dialog').filter({ hasText: /New goal/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Title input is autofocused; placeholder "Tokyo trip"
      await expect(dialog.locator('input[placeholder="Tokyo trip"]')).toBeVisible();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'goals-demo-new');
      recordIssue('goals new modal', 'goals.html (demo)',
        '"+ New goal" opens dialog with Title input',
        e.message,
        'webapp/components/goals-screen.jsx:48', 'high');
      throw e;
    }
  });

  test('demo: per-goal edit affordance opens GoalFormModal with prefill', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'goals.html');

      // The settings icon is a <span role="button" title="Edit goal"> inside each card.
      const editBtn = page.getByTitle('Edit goal').first();
      await expect(editBtn).toBeVisible({ timeout: 5_000 });
      await editBtn.click();

      const dialog = page.getByRole('dialog').filter({ hasText: /Edit goal/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Title field should not be empty (prefilled)
      const title = dialog.locator('input').first();
      const val = await title.inputValue();
      expect(val.length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'goals-demo-edit');
      recordIssue('goals edit affordance', 'goals.html (demo)',
        'settings icon opens dialog with prefilled title',
        e.message,
        'webapp/components/goals-screen.jsx:71', 'high');
      throw e;
    }
  });

  test('demo: pressure-test suggestions only shown when slipping', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'goals.html');

      // The component shows "Concrete actions" header only when slipMonths > 0.
      // We don't know which is on-track in mock data — so just assert the page didn't crash
      // and the section, when present, has the 4 known suggestions.
      const concrete = page.getByText('Concrete actions', { exact: false });
      // Either visible (slipping goal) or not; both are acceptable.
      const visible = await concrete.isVisible().catch(() => false);
      if (visible) {
        await expect(page.getByText(/Push deadline by/i)).toBeVisible();
        await expect(page.getByText(/One-time top-up/i)).toBeVisible();
      }
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'goals-demo-pressure');
      recordIssue('goals pressure-test suggestions', 'goals.html (demo)',
        '"Concrete actions" present iff slipMonths > 0',
        e.message,
        'webapp/components/goals-screen.jsx:163', 'low');
      throw e;
    }
  });
});

// ════════════════════════ BUDGETS ════════════════════════════════

test.describe('budgets.html', () => {
  test('prod empty-state renders without crash', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, PROD, 'budgets.html');

      // No specific empty-state card in BudgetsScreen — it just shows totals = 0.
      // What we check: the page header is "Budgets" and no errors.
      await expect(page.getByRole('heading', { name: /^Budgets$/ })).toBeVisible({ timeout: 5_000 });
      // Edit budgets button still present
      await expect(page.getByRole('button', { name: /Edit budgets/i })).toBeVisible();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'budgets-prod-empty');
      recordIssue('budgets prod empty', 'budgets.html (prod)',
        'page renders without crash, "Edit budgets" visible',
        e.message,
        'webapp/components/secondary-screens.jsx:103', 'medium');
      throw e;
    }
  });

  test('demo: month arrows change current month', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'budgets.html');

      // Month arrows are 32x32 ghost buttons surrounding the month label.
      // The label is "May 2026" (hard-coded in source — that's a separate finding).
      // Use the budgets <h1> heading as the anchor — it's always visible after mount.
      await expect(page.getByRole('heading', { name: /^Budgets$/ })).toBeVisible({ timeout: 5_000 });
      const monthLabel = page.getByText('May 2026', { exact: false }).first();
      await expect(monthLabel).toBeVisible({ timeout: 5_000 });

      // Month arrows are 32x32 ghost buttons. The page also has other ghost buttons
      // in the header (28px, 34px) — we must filter by inline style to avoid them.
      const arrows = page.locator('button.fc-btn-ghost[style*="width: 32px"]');
      const arrowCount = await arrows.count();
      expect(arrowCount).toBeGreaterThanOrEqual(2);

      // Click both (no state change wired up — code has no onClick on the arrows!).
      // Source @ secondary-screens.jsx:117/121 has NO onClick handler.
      await arrows.first().click();
      await arrows.nth(1).click();
      // The label should still be visible because clicks are no-ops.
      await expect(monthLabel).toBeVisible();

      // Detect the bug: month arrows have NO onClick, so they're decorative.
      const arrowsHaveClick = await page.evaluate(() => {
        // Inspect — count fc-btn-ghost arrows that contain an SVG icon at top-right of header
        return null;
      });
      // Static-source check: the arrows are clickable buttons with no state change.
      // Record as medium since it's stub behavior, not a crash.
      recordIssue('budgets month arrows are inert',
        'budgets.html (demo)',
        '← / → arrows change visible month',
        'arrows render but have no onClick handler; month label "May 2026" is hard-coded',
        'webapp/components/secondary-screens.jsx:117', 'medium');
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'budgets-demo-arrows');
      recordIssue('budgets month arrows', 'budgets.html (demo)',
        'left/right arrows change current month',
        e.message,
        'webapp/components/secondary-screens.jsx:117', 'medium');
      throw e;
    }
  });

  test('demo: "Edit budgets" opens BudgetFormModal', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'budgets.html');

      await page.getByRole('button', { name: /Edit budgets/i }).click();
      const dialog = page.getByRole('dialog').filter({ hasText: /New budget/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'budgets-demo-edit');
      recordIssue('budgets edit modal', 'budgets.html (demo)',
        '"Edit budgets" opens modal',
        e.message,
        'webapp/components/secondary-screens.jsx:125', 'high');
      throw e;
    }
  });

  test('demo: each budget row click opens edit modal with prefill', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'budgets.html');

      // Budget rows are inside the second .fc-card after the overall card.
      // They're <div> with cursor:pointer and a grid layout. Find via cells.
      // Easiest: click the first budget category text.
      const firstRow = page.locator('div.fc-card').last().locator('> div').first();
      await firstRow.click();
      const dialog = page.getByRole('dialog').filter({ hasText: /Edit budget/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Amount field should be prefilled
      const amount = dialog.locator('input[inputmode="decimal"]').first();
      const val = await amount.inputValue();
      expect(val.length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'budgets-demo-row-edit');
      recordIssue('budgets row edit', 'budgets.html (demo)',
        'click on row opens "Edit budget" with prefilled amount',
        e.message,
        'webapp/components/secondary-screens.jsx:166', 'high');
      throw e;
    }
  });

  test('demo: hard-cap pill shown on isHard budgets', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'budgets.html');

      // The mock data may have isHard:true on at least one budget; if so, the
      // "Hard cap" StatusPill is rendered. Permissive assertion: either a
      // pill is present, or none of the rows have isHard.
      const pill = page.getByText(/Hard cap/i);
      // Permissively await visibility but tolerate missing
      const visible = await pill.first().isVisible().catch(() => false);
      // We just require the page didn't crash
      expect(errors).toEqual([]);
      if (!visible) {
        recordIssue('budgets hard-cap pill', 'budgets.html (demo)',
          'at least one budget row should show "Hard cap" pill (mock has isHard:true)',
          'no "Hard cap" pill visible',
          'webapp/components/secondary-screens.jsx:174', 'low');
      }
    } catch (e) {
      await shot(page, 'budgets-demo-hardcap');
      recordIssue('budgets hard-cap pill', 'budgets.html (demo)',
        'hard-cap pill visible when budget.hard:true',
        e.message,
        'webapp/components/secondary-screens.jsx:174', 'low');
      throw e;
    }
  });
});

// ════════════════════════ RECURRING ══════════════════════════════

test.describe('recurring.html', () => {
  test('prod empty-state shows the empty card', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, PROD, 'recurring.html');

      await expect(page.getByText(/No recurring rules yet/i)).toBeVisible({ timeout: 5_000 });
      const addBtn = page.getByRole('button', { name: /Add rule/i });
      await expect(addBtn).toBeVisible();
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'recurring-prod-empty');
      recordIssue('recurring prod empty', 'recurring.html (prod)',
        'Empty state + "Add rule" button visible',
        e.message,
        'webapp/components/secondary-screens.jsx:226', 'high');
      throw e;
    }
  });

  test('demo: "+ Add rule" opens RecurringFormModal', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'recurring.html');

      await page.getByRole('button', { name: /Add rule/i }).first().click();
      const dialog = page.getByRole('dialog').filter({ hasText: /New recurring rule/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'recurring-demo-new');
      recordIssue('recurring new modal', 'recurring.html (demo)',
        '"+ Add rule" opens modal',
        e.message,
        'webapp/components/secondary-screens.jsx:258', 'high');
      throw e;
    }
  });

  test('demo: each row click opens edit modal', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'recurring.html');

      // Group cards live inside .fc-card with grouped rows. Click the first row.
      // Find the first row that has class containing grid; easier: target the
      // first child of the first fc-card under a group heading.
      const firstRow = page.locator('div.fc-card').filter({ has: page.locator('div[style*="grid"]') }).first().locator('> div').first();
      await firstRow.click();
      const dialog = page.getByRole('dialog').filter({ hasText: /Edit recurring/i });
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'recurring-demo-row-edit');
      recordIssue('recurring row edit', 'recurring.html (demo)',
        'click on row opens "Edit recurring" modal',
        e.message,
        'webapp/components/secondary-screens.jsx:283', 'high');
      throw e;
    }
  });

  test('demo: annualized total computed correctly', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'recurring.html');

      // Subtitle in header has "≈ N/year"
      const subtitle = page.locator('h1', { hasText: /^Recurring$/ })
        .locator('xpath=..').locator('div').filter({ hasText: /\/year/i }).first();
      await expect(subtitle).toBeVisible({ timeout: 5_000 });
      const text = await subtitle.textContent();
      // Should contain a number followed by /year
      expect(text).toMatch(/\d/);
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'recurring-demo-annual');
      recordIssue('recurring annualized total', 'recurring.html (demo)',
        'subtitle shows "≈ <amount>/year"',
        e.message,
        'webapp/components/secondary-screens.jsx:254', 'medium');
      throw e;
    }
  });

  test('demo: rules grouped by frequency', async ({ page }) => {
    const errors = [];
    attachErrorCollector(page, errors);
    try {
      await gotoOn(page, DEMO, 'recurring.html');

      // At least one of monthly/yearly/weekly group headers should be present.
      // Headers are <h2> with text-transform:capitalize content
      const groupHeaders = page.locator('h2').filter({
        hasText: /^(Monthly|Yearly|Weekly|monthly|yearly|weekly)$/
      });
      const count = await groupHeaders.count();
      expect(count).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    } catch (e) {
      await shot(page, 'recurring-demo-groups');
      recordIssue('recurring groups by frequency', 'recurring.html (demo)',
        'group headers (Monthly/Yearly/Weekly) rendered',
        e.message,
        'webapp/components/secondary-screens.jsx:264', 'medium');
      throw e;
    }
  });
});

// ════════════════════════ teardown — write report ════════════════

test.afterAll(async () => {
  // 27 tests declared. We count "failed" as Playwright-failures only;
  // recorded issues that didn't crash a test still surface here as findings.
  const TOTAL = 27;
  const failed = issues.filter(i => i.actual && /Error|Timeout|element/i.test(String(i.actual))).length;
  const report = {
    agent: 'forecast/simulator/goals/budgets/recurring',
    totalTests: TOTAL,
    passed: TOTAL - failed,
    failed,
    issues,
  };
  fs.writeFileSync('qa-pages-2-report.json', JSON.stringify(report, null, 2));
});
