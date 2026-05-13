# Components

The component library follows master-spec §19. Atoms live in
`webapp/components/atoms.jsx`; screens are split across the other files in
`webapp/components/`; modals and overrides are in `webapp/desktop/*.jsx`.

All components register on `window.FC.*` rather than via JS modules. This is a
consequence of using Babel-standalone — there are no imports. To use a component,
read it off `window.FC` at call time.

```js
const { MoneyDisplay, Sparkline, Icon } = window.FC;
```

## Atoms — `components/atoms.jsx`

| Atom | Purpose | Notable props |
|---|---|---|
| `formatMoney(amount, currency, opts?)` | Currency-aware formatter (function, not component) | `signed`, `decimals` |
| `MoneyDisplay` | Single source of truth for monetary values. Always tabular numerals; honors blur in both single-currency and dual-currency render paths | `amount`, `currency`, `originalAmount`, `originalCurrency`, `size`, `colorize`, `signed`, `blurred`, `display` |
| `Sparkline` | Tiny trend SVG | `values`, `width`, `height`, `color`, `blurred` |
| `StatusPill` | Goal status (on-track / slipping / off-track) | `status` |
| `ProgressRing` | Circular progress indicator | `value` (0..1), `size` |
| `Icon` | Outlined Lucide-style icons. ~42 names: home, wallet, list, trend, target, pie, repeat, chart, coins, settings, eye, eye-off, plus, search, filter, chevron, chevron-down, arrow, arrow-up, arrow-down, bell, calendar, sparkles, sun, moon, check, alert, lock, info, upload, user, credit-card, sim, grid, sliders, play, star, coffee, car, bag, zap, drop, box, **trash**, **x** | `name`, `size`, `color`, `strokeWidth` |
| `Avatar` | Initials in a circle | `initials`, `size`, `color` |

### `MoneyDisplay` rules

- Always uses `font-variant-numeric: tabular-nums` so columns align.
- When `originalCurrency` is set and differs from `currency`, renders both: original on
  top, base-currency conversion below as `≈ €X.XX`.
- When `blurred` is true, replaces the value with `••••` of comparable visual width.
  Both single-currency and dual-currency branches honor this (fixed in this build).
- `size` accepts `display | h1 | h2 | body | small | micro`.

## Screens

Each screen is a function component on `window.FC.<Name>Screen`. They all accept
roughly the same shape:

```js
function HomeScreen({ blurred, density, displayFont, data, onNav }) { ... }
```

| Screen | File | Master-spec ref |
|---|---|---|
| `HomeScreen` | `home-screen.jsx` | §18.2 |
| `AccountsScreen` | `secondary-screens.jsx` | §18.3 |
| `TransactionsScreen` | `transactions-screen.jsx` | §18.4 |
| `ImportScreen` | `extra-screens.jsx`, overridden by `desktop/import-flow.jsx` | §18.5 |
| `RecurringScreen` | `secondary-screens.jsx` | §18.6 |
| `BudgetsScreen` | `secondary-screens.jsx` | §18.7 |
| `GoalsScreen` | `goals-screen.jsx` | §18.8 |
| `ForecastScreen` | `forecast-screen.jsx` | §18.9 |
| `InvestmentsScreen` | `secondary-screens.jsx` | §18.10 |
| `NetWorthScreen` | `secondary-screens.jsx` | §18.11 |
| `SettingsScreen` | `desktop/settings-screen.jsx` | §18.12 |
| `OnboardingScreen` | `extra-screens.jsx`, overridden by `desktop/onboarding-flow.jsx` | §18.1 |
| `CardsScreen` | `extra-screens.jsx` | §18.3 (cards subsection) |
| `SimulatorScreen` | `extra-screens.jsx` | §18.9 ("Can I afford this?") |
| `ProfilePickerScreen` | `extra-screens.jsx` | §5 (deferred UX) |

### The "override" pattern

Some screens were stubbed in the original `extra-screens.jsx`. Functional implementations
land via files in `webapp/desktop/`:

- `onboarding-flow.jsx` overrides `FC.OnboardingScreen` to wire the 3 steps to `FCAuth`
  and `FCStore`.
- `import-flow.jsx` overrides `FC.ImportScreen` to implement the real CSV pipeline.
  The parser auto-detects the field separator (`,` / `;` / `\t` / `|`) and whether the
  first row is a header (heuristic: a row is a header iff none of its cells parses as a
  date — toggle exposed in step 2). Step 2 uses content-based field inference for
  headerless files; mapping two columns to *Description* concatenates them so a French
  bank's split debit/credit labels merge into one. Step 3 renders a spreadsheet view of
  the parsed rows. Behavior:
  - **Balance rows are skipped.** `detectSkipRows` flags rows whose column count is < 70%
    of the modal — typically the opening / closing balance summary lines bank exports
    bookend their CSV with. The captured open/close numbers surface in a banner above
    the table so the user still sees them; they are *not* imported as transactions.
  - **Ignored columns are hidden.** Columns mapped to `ignore` in step 2 are dropped from
    the table by default ("Show N ignored cols" toggle in the action bar restores them).
    Each visible header shows the column name + its mapped purpose underneath in accent.
  - **Two description columns side by side**: a read-only **Description** column shows
    the bank's original (concatenated from every CSV column mapped to *description*),
    and an editable **Custom description** column carries the value that actually gets
    persisted. Each staging row stores both `description` (editable, defaults to the
    original) and `descriptionOriginal` (read-only reference). When the two diverge a
    small ↺ button appears next to the input to restore the original.
  - **Per-row editing** in accent-bordered columns: **Custom description** (text input),
    **Category** (single-value dropdown — kept as a select because it's the field budgets
    aggregate by), and **Tags** (multi-value chip input via the `TagInput` component —
    Enter or comma commits, Backspace on empty input removes the last chip). A shared
    `<datalist>` provides type-ahead autocomplete from existing transactions' tags +
    the `tags` table; new tags are written into `tags` on commit so they show up next time.
  - **Default account picker.** A required select at the top of step 3 — every committed
    row writes both `accountId` (FK) and `account` (display name resolved from
    `accounts[].name`) so the Transactions screen's name-based filter recognizes
    imported rows. Initialized from any row that already carries an `accountId` (CSV
    column mapped to *Account*), otherwise the first non-archived account. Per-row
    overrides are intentionally not exposed here — uncommon need, and the existing
    Edit Transaction modal handles single-row reassignment after commit.
  - **Inflow / outflow / net banner.** Above the bulk-action bar, a card shows the
    period (start-of-month of the earliest date → latest date seen, including the
    skipped balance rows) plus live **Inflow** / **Outflow** / **Net** totals computed
    across the staging rows. The Transfer category is excluded — internal account moves
    aren't real income or expense — and a counter on the right shows how many transfer
    rows were dropped from the sum. The totals recompute as the user re-categorizes
    rows, so flagging a row as Transfer immediately removes it from the totals.
  - **Category auto-suggestion.** `buildCategoryIndex(existingTx)` builds two maps from
    already-categorized transactions: `byDesc` (normalized description stem → most-common
    `categoryId`) and `byTag` (tag → most-common `categoryId`). The `descKey` helper
    normalizes a description by stripping the bank's `CB` prefix, embedded dates,
    `*` separators, and extra whitespace, so `CB MP*CARREFOUR 22/04/26` and
    `CB MP*CARREFOUR 30/04/26` both reduce to `mp carrefour`. `buildStaging` looks the
    new row's stem up and prefills `categoryId` when it matches; the dropdown gets an
    accent border and a ✨ glyph next to it. The `TagInput` `onChange` does the same
    lookup against `byTag` whenever the user adds a tag — if the row still carries a
    suggestion (or is uncategorized), the dropdown updates. Manually picking a category
    or running the bulk *Categorize selected* clears the suggestion flag.
  - **Bulk-tag selected** input next to the bulk-categorize selector — type a tag and
    press Enter to add it to every selected row.
  - The raw CSV row is carried on each staging entry as `_raw` so the spreadsheet always
    reflects the original file.

The override is just `FC.X = function ...` evaluated **after** the original. Order of
script tags in the HTML matters.

## Modals — `webapp/desktop/`

| Modal | Trigger event | File |
|---|---|---|
| `AddTransactionModal` | `fc:add-transaction` (with optional `{detail:{id}}`) | `add-transaction.jsx` |
| `AccountFormModal` | `fc:edit-account` | `crud-modals.jsx` |
| `CardFormModal` | `fc:edit-card` | `crud-modals.jsx` |
| `GoalFormModal` | `fc:edit-goal` | `crud-modals.jsx` |
| `BudgetFormModal` | `fc:edit-budget` | `crud-modals.jsx` |
| `RecurringFormModal` | `fc:edit-recurring` | `crud-modals.jsx` |
| `HoldingFormModal` | `fc:edit-holding` | `holding-form.jsx` |
| `BulkDeleteTxModal` | `fc:bulk-delete-tx` | `bulk-delete-tx.jsx` |

All eight are mounted globally in `desktop/page.js` so they're available from any page.
They listen for their event, prefill on edit (when `detail.id` is set), and dispatch a
matching `fc:<table>-saved` event on submit so `page.js` can refresh `liveData`.

### `BulkDeleteTxModal`

Triggered from the Transactions header "Delete by filter" button. Filters available:
date from / date to, account, category, currency, tag-contains, min/max amount, and
type chips (expense / income / transfer / pending). Live preview shows the matched
count and first 5 example rows before commit. Deleting all transactions or running with
no filters set requires a two-click confirm.

The Card / Goal / Budget / Recurring modals re-read `accounts` and `categories` from
`FCStore` each time they open (in a `useEffect` keyed on `ev.open`) — so creating an
account and immediately opening the Card modal shows the new account in the dropdown
without a page reload.

### `HoldingFormModal`

Triggered from the Investments page (header "Add holding" or click any ticker row to
edit). Fields: ticker / name / currency / quantity / avg cost / linked account. The
Delete button works for both id-based rows and legacy seed rows missing an `id` —
the latter fall back to ticker matching, so existing demo profiles can delete
holdings without re-seeding.

### `TransactionsScreen`

Reads `data.transactions` and `data.accounts` and applies a read-side **account
normalization** before filtering or rendering. Three historical write formats coexist:

| Origin | `accountId` | `account` |
|---|---|---|
| Modal-created | id | name |
| Modern import (post-fix) | id | name |
| Legacy import (pre-fix) | *missing* | id (string that happens to look like an account id) |

The screen builds a single `accountByAny` map keyed by **both** `id` and `name`, then
resolves each row in priority order:

```js
const acct = (t.accountId && accountByAny[t.accountId])
          || (t.account   && accountByAny[t.account]);
if (acct?.name && t.account !== acct.name) override t.account = acct.name;
```

So the `Account` filter (which compares `t.account === filterAccount` against names from
`data.accounts.map(a => a.name)`) and the row footer (`{tx.account}`) work for all three
shapes — including the legacy-import case where neither field originally held the name.
No data is rewritten on disk; this is purely a defensive normalization on each render.

## Per-row controls on list screens

| Screen | Inline action |
|---|---|
| `TransactionsScreen` | "Select all (N)" button in the filter bar; selection bar Delete now actually removes via `FCStore.remove` and dispatches `fc:tx-saved`. |
| `BudgetsScreen` | Per-row "Reset" button. Confirms, then sets `_resetSpent: true` via `update`; recompute snaps `spentBaseline` to current `rawSpend` so the bar drops to 0. Click is `e.stopPropagation()`'d so the row's edit-modal doesn't also open. Disabled when `b.spent === 0`. |
| `InvestmentsScreen` | Click any ticker row → opens `HoldingFormModal` with Delete. |

### Opening a modal

From any screen:

```js
// New
window.dispatchEvent(new CustomEvent('fc:edit-goal'));

// Edit
window.dispatchEvent(new CustomEvent('fc:edit-goal', { detail: { id: goal.id } }));
```

## Desktop shell — `webapp/components/desktop-shell.jsx`

The header bell is a working notifications popover (no longer a static red dot).
Items are derived from the store on every render of the shell:

| Source | Item |
|---|---|
| `recurring.nextDate` ≤ 7 days from today | "{name} due — {date} · {amount}" |
| `budget.spent > budget.amount` | "{cat} over cap — {spent}/{cap}" |
| `goal.status` ∈ {`off-track`, `slipping`} | "{title} — Off track / Slipping" |
| Any tx with `pending: true` | "N pending transactions" |
| `account.balance < 0` (non-archived) | "{name} overdrawn — {balance}" |

Each item is clickable and navigates to its source page (`onNav('budgets')`, etc.).
The red dot only renders when `notifications.length > 0`. The popover uses a
`position: fixed; inset: 0` backdrop for click-outside-to-close.

`buildNotifications()` is colocated at the bottom of the same file — adding a new
notification source is a single `items.push(...)` call.

## Mobile shell — `webapp/mobile/page.js`

Self-contained — does not pull `desktop/page.js`. Renders:

- A top bar with title + privacy-blur eye + theme toggle.
- The active mobile screen (uses the inner `Mobile*` components from
  `mobile-screens.jsx`, **without** the demo phone frame).
- A sticky bottom tab bar (Home / Activity / Forecast / Goals / More).
- A FAB bottom-right that links to `add.html`.

Cross-page nav uses real URLs (`home.html`, `transactions.html`, ...) so back/forward
work and the auth guard re-runs on each navigation.

## What's missing from §19

The audit (`tests/`) flagged these as not yet extracted into shared atoms:

- `CategoryChip` — category labels are inlined as plain text in some screens.
- `SegmentedControl` — tab strips are ad-hoc buttons.
- `EmptyState` — list screens use one-off empty UI; not yet a shared atom (Goals has
  one inline; Transactions/Accounts/Budgets do not).
- `KeyValueGrid` — detail screens hand-roll `display: grid` rows.
- `Sheet` — for filters / multi-select; not yet implemented.
- A shared `Modal` / `BottomSheet` — each modal redefines its own backdrop wrapper.

These are tracked in `roadmap.md`.
