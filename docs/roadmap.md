# Roadmap

What ships in v1, what doesn't, and the open questions inherited from
`master-spec.md` §29.

## Shipped in v1

### Accounts & sessions
- Email + password signup and login (local-only, casual privacy).
- Optional 4-digit PIN gate.
- Two parallel builds: production (empty signup) and demo (mock-seeded signup) that
  share the same source tree and run side by side on different ports.

### Pages & shell
- 14 desktop pages: home, accounts, cards, transactions, forecast, simulator, goals,
  budgets, recurring, investments, networth, import, onboarding, settings.
- 7 mobile pages with a real bottom-tab shell, FAB, and a working mobile add-transaction form.
- Sidebar nav for all 12 sections + bottom Settings cog.
- No 1320px width cap — `<main>` fills the available column on any monitor width.
- Empty states on Goals, Investments, Net Worth, Recurring, Cards, Forecast, Simulator
  (master-spec §22 partial coverage).

### Data entry & editing
- Add / edit transaction modal with currency override, transfer pairing, recurring-rule
  creation. Header button + Cmd/Ctrl+N + transaction-row click all open it.
- 5 CRUD modals (account / card / goal / budget / recurring) + holding form.
- **Bulk delete transactions** modal — filter by date range, account, category, currency,
  tag, amount range, type (expense/income/transfer/pending). Live preview shows matched
  count + first 5 example rows; two-click confirm when deleting all.
- **Select all + Delete** in the Transactions filter bar / selection bar — picks every
  row in the current filter and deletes via `FCStore.remove` so the new recompute step
  cascades correctly.
- **Holding delete** works for both id-based rows and legacy id-less seed rows
  (modal falls back to ticker-matching).
- 3-step CSV import flow with column mapping, duplicate detection, staging review, commit.
  Auto-detects the field separator (`,` / `;` / `\t` / `|`) and headerless files (toggle
  to override). Two columns can map to *Description* and are concatenated, so French bank
  exports with split debit/credit labels parse correctly. Step 3 is a spreadsheet view:
  the visible CSV columns sit on the left (ignored columns hidden by default with a
  "Show N ignored cols" toggle), and four accent-bordered columns are appended for
  editing — Description (text input), Category (dropdown), Tags (multi-value chip input
  with `<datalist>` autocomplete from existing transactions' tags + the `tags` table),
  and the parsed Amount. Opening / closing balance summary rows are detected via column-
  count outlier and surfaced in a banner above the table instead of being imported as
  transactions. New tags are persisted to the `tags` table on commit. A bulk
  "Tag selected" input applies a tag to every selected row at once. Description is split
  into two columns — the bank's original is read-only, the custom description is editable
  with a ↺ revert button when it diverges. **Category auto-suggestion** prefills the
  dropdown when a row's normalized description stem (or a tag the user just added) matches
  a previously-categorized transaction; suggested cells are accent-bordered with a ✨
  glyph and clear on manual override. **Inflow / outflow / net banner** shows the
  period (start-of-month → last date) plus totals across the staging rows, excluding
  the Transfer category, and recomputes live as rows are re-categorized. **Default
  account** picker at the top of step 3 — every committed row writes both `accountId`
  and `account` (name) so the Transactions screen's name-based filter sees imported rows.
- 3-step onboarding wired to `FCAuth` + `FCStore`.

### Investments
- Holdings list with **Avg buy** column + delta % under current price.
- **Export holdings as CSV** — Ticker / Name / Quantity / Currency / Avg buy / Price /
  Cost basis / Value / Unrealized P/L / P/L %.

### Net worth
- Allocation treemap derived from real account balances (top 5 + percentages).
- Liabilities panel sums credit-card cycle balances; "no active credit-card balance" row
  when zero.
- **Export PNG** — real PNG via `<canvas>.toBlob()` at 2× retina, with `var(--…)` colors
  resolved before rasterizing.

### Budgets
- Month navigation: ← / → arrows actually change month; "X days remaining" derived from
  the live calendar.
- **Per-row Reset button** — non-destructive: snaps `spentBaseline` to current spend so
  the bar drops to 0 without touching any transactions. Future txs in the same
  month/category fill it back up from zero.

### Data integrity
- **`FCStore.recompute()`** — single source of truth that re-derives `account.balance`,
  `goal.current`, `budget.spent`, and `card.cycleSpend` from the transactions table.
  Auto-fires after every cache-affecting mutation (including raw `set()` writes used by
  bulk delete). Idempotent. Legacy seeded balances are detected and back-filled via the
  `_recomputed` flag so visible values are preserved on first run.
- **Scoped recompute** — when the trigger is a self-mutation on a single row
  (`update('budgets', id, …)`), only that row gets re-derived; siblings keep their
  cached values. Tx mutations still cascade across every dependent row.
- **Transaction account normalization** — `TransactionsScreen` builds an `accountByAny`
  lookup keyed by both `id` and `name` and overrides each transaction's `account`
  display field on render, so the name-based Account filter recognizes rows from any
  of the three historical write formats (modal, modern import, legacy import that
  stored an id in the `account` slot). Read-side only; no data migration.

### Settings
- All 9 sections: User, Currencies, Categories, Import templates, Recurring rules, Backup,
  Appearance, Privacy, About.
- Backup → Export JSON / Restore JSON / **Clear all data** (wipes user-data tables, keeps
  credentials + categories).
- **Currency-in-use warning** when removing a currency tied to one or more accounts.

### UX polish
- Privacy blur (header eye + Cmd/Ctrl+B), persists per profile.
- Theme + accent (teal / indigo / amber) persist per profile.
- Keyboard shortcuts: Cmd/Ctrl + N / K / B / , / 1..9 (visible badge hints removed).
- Local-first persistence via `localStorage`, namespaced per profile.
- Dev server (`webapp/serve.py`) sends `Cache-Control: no-store`, so JSX edits show up on
  a normal refresh — no Ctrl+Shift+R needed.
- **Notification bell** in the header — click opens a popover listing bills due in the
  next 7 days, over-cap budgets, off-track / slipping goals, pending transactions, and
  overdrawn accounts. Each item navigates to its source page. Red dot only when at
  least one item is active.
- **No more page-level width caps on full-screen pages.** The Import screen previously
  capped its inner container at 1100px and Settings at 880px, leaving the right half of
  wide monitors empty. Both caps are gone, so the Import spreadsheet (8+ columns) and
  Settings forms now span the available column. Modals, the auth pages (login / signup /
  PIN), and the multi-step Onboarding flow keep their narrow widths intentionally.

### Tests
- 6 Playwright suites: `qa-auth`, `qa-pages-1` (home/accounts/cards/transactions),
  `qa-pages-2` (forecast/simulator/goals/budgets/recurring), `qa-pages-3`
  (investments/networth/import), `qa-settings` (settings + chrome + shortcuts),
  `empty-prod` (every page renders cleanly with zero user data).
- 143 tests, all green.

## Deferred — known gaps

These are the items the verification agents flagged but didn't ship in this iteration.
None are blockers for using the app.

### Functional

- **Account detail view** (master-spec §18.3). Today the Accounts list shows cards;
  clicking opens the edit form. The detail view with balance chart, linked-cards
  section, transactions tab, and monthly stats has not been built.
- **ETF benchmark comparison** (§18.10). "Choose benchmark" is intentionally disabled
  with a "coming soon" tooltip — ships with the price provider.
- **Recurring "skip next occurrence"** (§18.6). The `canSkip` flag exists; the
  per-rule "skip just next" inline action does not.
- **Budgets drill-down** (§18.7). Tapping a category opens the edit modal instead of
  showing the contributing transactions.
- **Onboarding finish prompt** (§18.1). The "Add a recurring expense to unlock
  forecasting →" prompt at the bottom of the home dashboard after first onboarding is
  not surfaced.
- **Right-click context menus** (§24). Transaction rows don't have a context menu yet.
- **Idle auto-lock**. The setting persists but no timer enforces it.
- **Toast system** (§22). Save flows close silently; a 2-second bottom-right toast
  per spec is not implemented.
- **"View as table" chart fallback** (§21, §26). Charts have no non-chart fallback.
- **Empty states for Transactions / Budgets list** (§22). The other list screens have
  one; these two still assume non-empty.

### Architectural

- **`FxProvider`**. `fxRateSnapshot` is hardcoded to 1. Adding `frankfurter.app` per
  spec §4 is the natural first step.
- **`PriceProvider`**. No live prices yet. `yahoo-finance2` primary + Stooq fallback
  per spec §7.
- **Credit-card settlement timing**. Cards are stored, but the forecast engine
  doesn't yet apply purchase → settlement-date timing per spec §3 / §8.
- **Layer 2 / Layer 3 forecasting**. Behavioral projection with variance bands and
  goal pressure-test suggestions are stubbed in the design but not computed from real
  rolling averages.
- **OCR import adapter**. Architecture supports it (everything goes through
  `ImportStaging`), but no OCR provider is wired.

### Polish

- A few `formatMoney(.+, 'EUR')` call sites still hard-code EUR instead of the entity's
  currency. Search `webapp/components/` to clean up.
- `MoneyDisplay` doesn't yet expose the spec'd `showCode` prop.
- Settings uses native `confirm()` / `prompt()` for destructive actions and PIN entry;
  a custom modal would be nicer.

## Open questions from `master-spec.md` §29

These are the explicit "don't silently choose" decisions. None blocks shipping v1; all
should be resolved before the relevant feature lands.

| # | Question | Default in this build |
|---|---|---|
| 1 | Default categories? | 12-category seed on every new profile (production); the seed is the only auto-data on signup. Full mock data only seeds in the **demo build** |
| 2 | Historical FX backfill on first import — eager or lazy? | Lazy (per-tx snapshot) |
| 3 | PIN scope — casual privacy or full encryption-at-rest? | **Casual privacy.** No encryption-at-rest |
| 4 | OCR target — local Tesseract or cloud? | Deferred; not yet wired |
| 5 | FX provider — abstract from day one? | Yes (per architecture); no provider yet |
| 6 | Crypto support in v1? | Schema supports it; no provider |
| 7 | Yahoo Finance failure tolerance | Deferred until provider lands |
| 8 | Mobile — Electron-only or Tauri/RN companion? | Web-first (no Electron); mobile responsive in-browser |
| 9 | Brand mark / logo | Single-glyph "ƒ" in a square; no formal mark |
| 10 | Accent color final pick | Teal default; indigo + amber available |
| 11 | Empty-state illustration style | Abstract (no mascots) |
| 12 | Chart library | Hand-rolled SVG (no Chart.js / Recharts yet) |
| 13 | Custom display font for hero numbers | Yes — `Fraunces` / `Newsreader` via Google Fonts |

## Migration notes

When the deferred items land, watch for these:

- Adding `FxProvider` changes `fxRateSnapshot` from a constant to a fetched value.
  Existing transactions will keep their (wrong) snapshot of `1` — flag a one-shot
  migration or accept that old rows show 1:1 conversion.
- Promoting `priceCache` and `fxCache` from per-profile to install-wide is a
  localStorage key rename, not a schema change.
- Multi-profile UI (profile picker) requires only Settings additions and a switcher;
  the schema is already namespaced by `profileId`.
