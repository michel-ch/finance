# Screenshots

Visual reference for every page in the Finch app. Captured against the
production build at `http://localhost:8765/` with the demo data set seeded via
`FCStore.seedDemoData()` so screens are populated.

- **Desktop** captures are 1440 × 900 (full-page, so each PNG is the entire
  scrollable content, not just the viewport).
- **Mobile** captures are 390 × 844 (iPhone 14 pro-ish portrait, **viewport only**
  — the bottom tab bar is `position: fixed`, and Playwright's full-page mode
  doesn't reposition fixed elements for the expanded canvas, so viewport-only
  captures the bar at the correct visual position).
- **Auth** captures show the screens you see before signing in / before
  finishing onboarding / when the PIN lock kicks in.

## Desktop (`desktop/`)

| # | File | Page | URL |
|---|---|---|---|
| 01 | [01-home.png](desktop/01-home.png) | Home dashboard | `/desktop/home.html` |
| 02 | [02-accounts.png](desktop/02-accounts.png) | Accounts list | `/desktop/accounts.html` |
| 03 | [03-cards.png](desktop/03-cards.png) | Cards (debit + credit) | `/desktop/cards.html` |
| 04 | [04-transactions.png](desktop/04-transactions.png) | Transactions with filters | `/desktop/transactions.html` |
| 05 | [05-forecast.png](desktop/05-forecast.png) | Forecast + simulator | `/desktop/forecast.html` |
| 06 | [06-simulator.png](desktop/06-simulator.png) | "Can I afford?" simulator | `/desktop/simulator.html` |
| 07 | [07-goals.png](desktop/07-goals.png) | Goals with suggestions | `/desktop/goals.html` |
| 08 | [08-budgets.png](desktop/08-budgets.png) | Monthly budget envelopes | `/desktop/budgets.html` |
| 09 | [09-recurring.png](desktop/09-recurring.png) | Recurring rules | `/desktop/recurring.html` |
| 10 | [10-investments.png](desktop/10-investments.png) | Investments / holdings | `/desktop/investments.html` |
| 11 | [11-networth.png](desktop/11-networth.png) | Net worth over time | `/desktop/networth.html` |
| 12 | [12-import.png](desktop/12-import.png) | CSV import step 1 | `/desktop/import.html` |
| 13 | [13-settings.png](desktop/13-settings.png) | Full settings page | `/desktop/settings.html` |

## Mobile (`mobile/`)

| # | File | Page | URL |
|---|---|---|---|
| 01 | [01-home.png](mobile/01-home.png) | Mobile home | `/mobile/home.html` |
| 02 | [02-transactions.png](mobile/02-transactions.png) | Activity feed with account chips | `/mobile/transactions.html` |
| 03 | [03-forecast.png](mobile/03-forecast.png) | Mobile forecast (empty state shown) | `/mobile/forecast.html` |
| 04 | [04-goals.png](mobile/04-goals.png) | Mobile goals (tap to top-up) | `/mobile/goals.html` |
| 05 | [05-more.png](mobile/05-more.png) | "More" menu | `/mobile/more.html` |
| 06 | [06-add.png](mobile/06-add.png) | Full-page add-transaction form | `/mobile/add.html` |

## Auth (`auth/`)

| # | File | Page | URL |
|---|---|---|---|
| 01 | [01-login.png](auth/01-login.png) | Sign in | `/login.html` |
| 02 | [02-signup.png](auth/02-signup.png) | Create account | `/signup.html` |
| 03 | [03-pin.png](auth/03-pin.png) | PIN unlock | `/pin.html` |
| 04 | [04-onboarding.png](auth/04-onboarding.png) | 3-step onboarding | `/desktop/onboarding.html` |

## How these were captured

```js
// 1. Seed mock data into the running production server (port 8765)
window.FCStore.seedDemoData();

// 2. For each page: navigate, full-page screenshot
//    Desktop: 1440x900 viewport
//    Mobile:  390x844 viewport
```

The captures were taken via Playwright MCP. To re-shoot any page after a UI
change, start `start.bat`, open a browser to that page, and overwrite the file
in this folder.

## Note on data

The screenshots use the **demo seed** (5 accounts, 13 transactions, 4 goals,
7 budgets, 5 recurring rules, 4 holdings) so every screen has something to
render. A fresh production install starts empty — those screens render an empty
state with a CTA, not what's shown here.
