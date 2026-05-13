# Testing

Three Playwright suites live in `tests/`. They share a single Chromium install but
have separate configs so each can run in isolation.

## Layout

```
tests/
├── package.json               # Just @playwright/test, no app code
├── playwright.config.mjs      # Default config — locked to auth-nav.spec.mjs
├── crud.config.mjs            # Config for the CRUD suite
├── smoke.config.mjs           # Config for the per-page smoke suite
├── seed.config.mjs            # Config for the prod-vs-demo seed verifier
├── empty.config.mjs           # Config for the empty-state smoke suite
├── qa-auth.config.mjs         # Auth + onboarding QA
├── qa-pages-1.config.mjs      # Home / accounts / cards / transactions QA
├── qa-pages-2.config.mjs      # Forecast / simulator / goals / budgets / recurring QA
├── qa-pages-3.config.mjs      # Investments / networth / import QA
├── qa-settings.config.mjs     # Settings + sidebar + chrome + shortcuts QA
├── auth-nav.spec.mjs          # End-to-end auth + navigation
├── crud-flows.spec.mjs        # Add transaction, account, goal, budget, recurring, holding
├── visual.spec.mjs            # Screenshot impl vs reference (export_UI)
├── smoke-verify.spec.mjs      # Per-page render-without-crash check (with mock seed)
├── empty-prod.spec.mjs        # Per-page render-without-crash check (no user data)
├── seed-verify.spec.mjs       # Asserts prod profile starts empty, demo profile auto-seeds
├── qa-auth.spec.mjs           # 21 tests — every auth + onboarding click path
├── qa-pages-1.spec.mjs        # 31 tests — home/accounts/cards/transactions buttons
├── qa-pages-2.spec.mjs        # 27 tests — forecast/simulator/goals/budgets/recurring
├── qa-pages-3.spec.mjs        # 15 tests — investments + networth + import + downloads
├── qa-settings.spec.mjs       # 36 tests — every Settings section + chrome + shortcuts
├── *-report.json              # Per-suite JSON reports
└── screenshots/
    ├── impl/                  # Implementation screenshots
    ├── ref/                   # Reference (export_UI) screenshots
    ├── impl-mobile/
    └── ref-mobile/
    ├── qa-auth/, qa-pages-1/, qa-pages-2/, qa-pages-3/, qa-settings/
                                # Failure screenshots from each QA suite
```

## Prereqs

The production webapp must be running on `http://127.0.0.1:8765/`. Some suites also
need the demo build on `http://127.0.0.1:8766/` (e.g. `seed-verify`). Start each with
its respective `start.bat` from the project root before running tests.

Playwright is installed locally inside `tests/node_modules` (the workspace doesn't have
a top-level `package.json`). Browsers are installed once via Playwright's CLI.

## Run a suite

```sh
# From the project root:
cd tests

# Original suites
./node_modules/.bin/playwright.cmd test --config=playwright.config.mjs    # auth-nav (8)
./node_modules/.bin/playwright.cmd test --config=crud.config.mjs          # crud-flows (10)
./node_modules/.bin/playwright.cmd test --config=smoke.config.mjs         # smoke (13)
./node_modules/.bin/playwright.cmd test --config=empty.config.mjs         # empty (13)
./node_modules/.bin/playwright.cmd test --config=seed.config.mjs          # seed (2) — needs both servers
./node_modules/.bin/playwright.cmd test --config=playwright.config.mjs visual.spec.mjs  # visual

# QA sweep (added by the 5-agent button-by-button audit)
./node_modules/.bin/playwright.cmd test --config=qa-auth.config.mjs       # 21
./node_modules/.bin/playwright.cmd test --config=qa-pages-1.config.mjs    # 31 — slowest, ~75s
./node_modules/.bin/playwright.cmd test --config=qa-pages-2.config.mjs    # 27
./node_modules/.bin/playwright.cmd test --config=qa-pages-3.config.mjs    # 15 — covers downloads
./node_modules/.bin/playwright.cmd test --config=qa-settings.config.mjs   # 36
```

Each suite writes a `*-report.json` file. The visual suite writes screenshots to
`tests/screenshots/`.

## What each suite covers

### `auth-nav.spec.mjs`

Walks the full first-launch journey:

1. Splash routes empty localStorage → `signup.html`.
2. Signup creates a profile, lands on onboarding.
3. Onboarding 3-step flow lands on home.
4. All 12 sidebar destinations load with mounted React content.
5. Privacy blur toggle replaces values with `••••`.
6. Theme toggle flips `<html data-theme>`.
7. Logout redirects to `login.html`.

Per-page console errors are captured and reported.

### `crud-flows.spec.mjs`

Seeds a known profile via `localStorage.setItem`, then drives every CRUD modal:

- Add transaction via Cmd+N.
- Add transaction via header button.
- Add account, edit account, verify persistence in `localStorage`.
- Add goal, budget, recurring rule, holding.
- Toggle theme/accent in settings, reload, verify persistence.

### `visual.spec.mjs`

Spawns a second http-server on port 8766 serving `export_UI/`, then takes screenshot
pairs of the implementation and the reference at 1280×800 and 390×844. Reports
visible deviations and computes a basic "page is rendering substantial content"
metric (DOM children inside `#root`).

The second server is killed at end of run.

### `smoke-verify.spec.mjs`

The fastest one. Seeds a known profile, navigates to each of the 13 desktop pages,
asserts that `#root` has more than 20 descendant elements and that no `pageerror`
fired. Useful as a quick gate before merging.

### `empty-prod.spec.mjs`

The "production safety net" — seeds a profile with **only credentials and a single
category, no other data**, then navigates each page. This catches regressions where a
screen assumes a non-empty array (e.g. the simulator screen used to crash on
`accounts.find(a => a.id === 'a1')` for any user without the mock seed).

### `seed-verify.spec.mjs`

Drives both servers. Asserts:

- A fresh profile created against `http://127.0.0.1:8765/` (production) has zero
  accounts, transactions, goals, budgets, and recurring rules — but 12 categories.
- A fresh profile created against `http://127.0.0.1:8766/` (demo) has > 0 accounts,
  > 0 transactions, > 0 goals, and 12 categories.

This is the regression gate for the production-vs-demo seed split. Run it after any
change to `webapp/store.js` or to either build's `page.js`.

### `qa-*.spec.mjs` — the button-by-button QA sweep

5 specs split by page area, written by the 5-agent QA audit. Each one clicks every
visible interactive element (button, chip, row, link, keyboard shortcut), drives forms
to completion, captures `pageerror`, and writes a JSON report:

| Spec | Scope | Tests |
|---|---|---|
| `qa-auth.spec.mjs` | Splash routing + signup + login + PIN + onboarding 3 steps | 21 |
| `qa-pages-1.spec.mjs` | Home / Accounts / Cards / Transactions — every button + filter chip + row click + empty-state | 31 |
| `qa-pages-2.spec.mjs` | Forecast / Simulator / Goals / Budgets / Recurring — horizon picker, sliders, modals, month arrows, etc. | 27 |
| `qa-pages-3.spec.mjs` | Investments / Net Worth / Import — covers the CSV download for holdings, the PNG download for net worth, and the 3-step CSV import flow | 15 |
| `qa-settings.spec.mjs` | Settings (all 9 sections), the sidebar, the header chrome, and every keyboard shortcut | 36 |

143 tests total, all green at last run. Failure screenshots go to
`tests/screenshots/qa-<name>/`. JSON reports go to `tests/qa-<name>-report.json`
in the format `{ agent, totalTests, passed, failed, issues: [{test, page, expected, actual, filePath, severity}] }`.

## Updating the suites

The suites use Playwright's standard test runner. To add a case:

```js
test('new account creates a card option', async ({ page }) => {
  // ...
});
```

If you add a new page, the smoke suite picks it up — just add the page id to the
`PAGES` array at the top of `smoke-verify.spec.mjs`.

## Known limitations

- Tests run headless by default. Pass `--headed` if you need to watch.
- The visual suite is screenshot-only — there is no pixel diff. The agent that wrote
  it inspects images visually and reports differences in prose. A future improvement
  is to integrate `playwright-visual-comparisons` or similar.
- No CI yet. The suites assume a local server is up.
