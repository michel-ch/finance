# Data model

The schema follows master-spec §9. Every per-profile row lives in `localStorage` under
`fc.data.<profileId>.<table>`, JSON-encoded. The store API is `window.FCStore`.

## Tables

| Table | Purpose | Master-spec ref |
|---|---|---|
| `accounts` | Bank accounts, savings, brokerage, cash, crypto wallets | §3, §9 |
| `cards` | Debit/credit cards tied to an account | §3, §9 |
| `transactions` | All ledger entries; transfers are pairs linked by `transferPairId` | §3, §9 |
| `categories` | User's category list (seeded with 12 defaults) | §9 |
| `tags` | Free-form tags | §9 |
| `recurring` | Subscriptions and fixed expenses | §3, §9 |
| `goals` | Savings / pay-off / cap-spend / net-worth goals | §3, §9 |
| `budgets` | Monthly category envelopes | §3, §9 |
| `holdings` | Investment holdings with cost basis | §3, §9 |
| `dcaPlans` | Recurring DCA contribution plans | §3, §9 |
| `importStaging` | CSV rows pending review | §6, §9 |
| `importTemplates` | Saved bank parser column maps | §9 |
| `priceCache` | Symbol prices keyed by `(ticker, date, provider)` | §7 |
| `fxCache` | FX rate cache | §4 |

`priceCache` and `fxCache` are scoped install-wide in the spec; the v1 store keeps them
under the profile id for simplicity. Promote them when implementing `PriceProvider`.

## Profile shape

```js
{
  id: 'p_<timestamp>',
  name: 'Alex Doe',
  email: 'alex@example.com',
  passwordHash: '<hash>',
  initials: 'AD',
  baseCurrency: 'EUR',
  activeCurrencies: ['EUR', 'USD', 'GBP'],
  createdAt: '2026-05-07T19:30:00.000Z',
  pin: null | '<hash>',
  theme: 'light' | 'dark',
  accent: 'teal' | 'indigo' | 'amber',
  density: 'comfortable' | 'compact',
  privacyDefault: false,
  idleLockMinutes: 0,
  startBlurred: false,
  householdId: 'h_<timestamp>',
  onboarded: true,
}
```

## Transaction shape

The most important shape — see master-spec §4 (multi-currency) and §9 (data model).

```js
{
  id: 't_<random>',
  profileId, householdId,
  accountId,                  // FK → accounts.id
  cardId: null | string,      // FK → cards.id
  date: '2026-05-06',
  amountOriginal: -28.40,
  currencyOriginal: 'EUR',
  amountBase: -28.40,         // converted to profile baseCurrency at txn date
  fxRateSnapshot: 1,
  categoryId: 'cat_dining',
  tags: ['paris'],
  description: 'Le Petit Cambodge',
  recurringId: null | string,
  transferPairId: null | string,
  // Legacy/display fields kept for the existing screen renderers:
  merchant, category, cat_icon, account, card, currency, currencyConverted, amount, transfer, pending,
  createdAt, updatedAt,
}
```

The "legacy" fields exist because the screen components were written against the mock
data shape. They are populated by the AddTransactionModal and the seed loader, kept in
sync with the canonical fields. A future cleanup can drop them once the screen
renderers are updated.

The `account` legacy field deserves a specific note. Three write formats coexist on
disk: modal-created and post-fix imports store the account **name** in `account` and
the FK in `accountId`; pre-fix imports stored the **account id** in `account` and
omitted `accountId` entirely. `TransactionsScreen` defends against this by building
an `accountByAny` lookup keyed by both `id` and `name` and overriding `t.account` on
read so the name-based filter and row footer work uniformly. No write-time migration
is performed — only the rendered values are normalized.

Note: `account.balance`, `goal.current`, `budget.spent`, and `card.cycleSpend` are now
cache fields owned by `recompute()` (see below) — they should not be edited by hand.
Mutating them via `update(...)` works for one render cycle; the next call to recompute
will overwrite them from the source-of-truth tables.

## Public API — `FCStore`

```ts
window.FCStore = {
  profileId(): string | null,
  list(table): Row[],
  set(table, rows): void,
  get(table, id): Row | null,
  create(table, row): Row,         // assigns id + createdAt if missing
  update(table, id, patch): Row,   // shallow-merges, sets updatedAt
  remove(table, id): void,
  recompute(table?, id?): void,    // re-derive cached money fields; see below
  snapshot(): { profile, exportedAt, tables },  // for Settings → Backup → Export
  restore(blob): void,
  seedDefaultCategoriesIfEmpty(): void,  // production: just the 12 categories
  seedDemoData(): void,                  // demo: full mock seed
  seedIfEmpty(): void,                   // legacy alias → seedDefaultCategoriesIfEmpty
}
```

## Cached fields and `recompute()`

Several rows store derived money values that look like cache entries. `recompute()` is
the single source of truth that re-derives them from the authoritative tables
(transactions + opening balances). It runs **automatically** after every mutation
on `accounts`, `transactions`, `cards`, `goals`, `budgets` — including raw `set()`
writes — and on `restore()` and `seedDemoData()`. Idempotent.

| Row.field | Derived from | Notes |
|---|---|---|
| `account.balance` | `openingBalance + Σ(t.amountOriginal)` for txs on this account | Currency stays in the account's currency |
| `goal.current` | depends on `goal.type` | save → linked account balance · pay-off → `target − owed` · cap-spend → current-month spend in linked category · net-worth → sum of all balances |
| `budget.spent` | `max(0, rawSpend − spentBaseline)` for txs in `b.month` matching `b.categoryId` | See "Budget reset" below |
| `card.cycleSpend` | `Σ |t.amountOriginal|` for current-month expenses on this card | Matches by `t.cardId` or display string |

### Scoped recompute

`recompute(changedTable?, changedId?)` accepts an optional scope hint. When the
trigger is a **self-mutation** on a single row (e.g. the user clicks Reset on one
budget, or edits one account), only that row gets re-derived; siblings keep their
existing cached values. When the trigger is a **transaction** mutation (or any call
without scope, including raw `set()` for bulk delete), the recompute fans out across
every dependent row. This is what stops "Reset Groceries" from silently shifting all
the other budget bars to their tx-derived values at the same time.

### Legacy backfill (`_recomputed` flag)

Accounts seeded with `openingBalance: balance` (which would inflate the balance on
first recompute) are detected on first run by the absence of a `_recomputed` flag and
backfilled: `openingBalance = balance − sum_of_existing_txs`, so the visible balance
is preserved. After that the flag sticks and recompute trusts `openingBalance` as
the source of truth.

### Budget reset (`spentBaseline`, `_resetSpent`)

The Budgets screen has a per-row "Reset" button. Clicking it calls
`update('budgets', id, { _resetSpent: true })`; recompute snaps that budget's
`spentBaseline` to the current `rawSpend` and clears the sentinel. The progress bar
jumps to 0, **no transactions are deleted**, and future txs in the same month/category
fill the bar back up from zero. Other budgets are unaffected because of the scoped
recompute described above.

## FCData seed

`webapp/data.js` is design-time mock data. The store exposes two seed functions, and
each build picks one:

| Function | What it seeds | Used by |
|---|---|---|
| `seedDefaultCategoriesIfEmpty()` | The 12 default categories only | **Production** build |
| `seedDemoData()` | Categories + 5 accounts + 4 cards + 13 transactions + 4 goals + 7 budgets + 11 recurring rules (5 bills + 6 extras: Netflix / iCloud+ / NYT / GitHub Pro / Amazon Prime / Carte Visa Premier) + 4 holdings + DCA plans | **Demo** build |

The legacy `seedIfEmpty()` is kept as a backwards-compatible alias to
`seedDefaultCategoriesIfEmpty()` so any caller that doesn't know about the split
gets the safe (production) behavior.

The production build's `buildLiveData` (in `desktop/page.js`) does **not** fall back
to `window.FCData` for user-data tables. The demo build's `buildLiveData` keeps the
fallback so the design preview stays populated even if the seed hasn't run yet.

You can re-seed (or wipe) per-profile data via:

- `Settings → Backup → Clear all data` (recommended) — wipes accounts/transactions/etc.,
  keeps categories and credentials.
- `Settings → User → Delete profile` — wipes everything including credentials.
- DevTools — delete `fc.data.<profileId>.*` keys directly.

## Backup / restore

`Settings → Backup → Export as JSON` calls `FCStore.snapshot()` and downloads
`finch-backup-YYYY-MM-DD.json`. The file is the entire profile + all tables, no compression,
human-readable.

`Restore from JSON` calls `FCStore.restore(blob)`, which overwrites every table for the
active profile. A page reload immediately follows so the screens pick up the new data.

There is no merge mode — restore is destructive.

## What's not implemented

- **`fxRateSnapshot` is always 1.** No FX provider yet. Add via `FxProvider` interface
  per master-spec §4 — `frankfurter.app` is the spec's recommended free source.
- **`priceCache` is empty.** No `PriceProvider` yet. Yahoo + Stooq fallback per §7.
- **Credit-card settlement.** Cards are stored, but the forecast engine doesn't yet
  apply credit-purchase → settlement-date timing per master-spec §3 / §8.
- **Categorization rules.** `Settings → Recurring rules` is a placeholder. The
  rule-engine ships with bank import.
