# Architecture

The app is a static multi-page site. Each "page" is a separate `.html` file that loads
the same React shell with a different active screen. Persistence is `localStorage` only;
auth, store, and per-profile data are all client-side.

There are two parallel folders — `Finance/` (production) and `Finance-demo/` (demo
build with mock-seeded data) — that share 99% of the source. See
[`demo-vs-production.md`](demo-vs-production.md) for the diff.

## Directory layout

```
Finance/
├── master-spec.md              # Source of truth for product + design decisions
├── expense-app-plan.md         # Earlier rough plan; superseded by master-spec
├── start.bat                   # Single-command launcher
├── down.bat                    # Stops the dev server(s) on ports 8765 / 8766
├── export_UI/                  # Original design mockups (read-only reference)
├── docs/                       # You are here
├── tests/                      # Playwright suites + reports
└── webapp/                     # The shipped app
    ├── index.html              # Auth-aware splash that routes
    ├── login.html              # Email + password
    ├── signup.html             # Create profile + base/active currencies
    ├── pin.html                # 4-digit PIN unlock
    ├── auth.js                 # Profile + session API (FCAuth)
    ├── store.js                # Per-profile data API (FCStore)
    ├── data.js                 # Mock seed data (FCData)
    ├── tokens.css              # Design tokens, light + dark, accents
    ├── components/             # Shared screen components — written once, used by all
    │   ├── atoms.jsx           # MoneyDisplay, Sparkline, Icon, Avatar, …
    │   ├── desktop-shell.jsx   # Sidebar + header chrome
    │   ├── home-screen.jsx
    │   ├── forecast-screen.jsx
    │   ├── transactions-screen.jsx
    │   ├── goals-screen.jsx
    │   ├── secondary-screens.jsx   # Accounts, Budgets, NetWorth, Investments, Recurring
    │   ├── extra-screens.jsx       # Cards, Import, Simulator, Onboarding stub, Profile picker
    │   └── mobile-screens.jsx
    ├── desktop/                # One HTML per page + the shared bootstrap
    │   ├── _template.html
    │   ├── page.js             # Auth guard, store seeding, screen mounting, shortcuts
    │   ├── home.html ... settings.html  # 14 pages
    │   ├── add-transaction.jsx
    │   ├── crud-modals.jsx     # Account, Card, Goal, Budget, Recurring forms
    │   ├── holding-form.jsx
    │   ├── bulk-delete-tx.jsx  # Filter-and-delete transactions modal
    │   ├── import-flow.jsx     # Override of ImportScreen (3-step CSV flow)
    │   ├── onboarding-flow.jsx # Override of OnboardingScreen (wired)
    │   └── settings-screen.jsx
    ├── mobile/                 # Real mobile pages (no phone-frame demo)
    │   ├── page.js             # Mobile shell + bottom tab bar + FAB
    │   └── home.html ... more.html
    └── serve.py                # Tiny dev server: http.server with no-cache headers
                                # so JSX edits land on a normal refresh.
```

## Runtime composition

Every desktop HTML loads the same script chain:

```
auth.js          → defines window.FCAuth (login/logout/PIN/profile)
store.js         → defines window.FCStore (per-profile CRUD)
React UMD        → React + ReactDOM
Babel-standalone → in-browser JSX transform
data.js          → mock seed data on window.FCData
components/*.jsx → screens & atoms register on window.FC.*
desktop/*.jsx    → modals + screen overrides register on window.FC.*
desktop/page.js  → boots the React app, mounts shell + active screen + modals
```

`window.FC_ACTIVE` is set inline at the top of each HTML to tell `page.js` which screen
to render.

```html
<script>window.FC_ACTIVE='transactions';</script>
```

## How navigation works

There is no SPA router. The sidebar and bottom tab bar do real `location.href = ...`
navigations between HTML files. This means:

- Browser back/forward and bookmarks work.
- Each page reload re-runs the auth guard (no stale auth state).
- Cross-page state lives in `localStorage`, not in React.

## Data flow

```
            FCAuth (auth.js)               FCStore (store.js)
                  │                                │
                  │ profileId                      │ namespaced by profileId
                  └─────────────┬──────────────────┘
                                ▼
                page.js  buildLiveData(profile)
                                │
                                ▼ data prop
                       <Screen blurred=… data=… />
```

`buildLiveData` reads the active profile's tables from `FCStore`. The behavior is
build-specific:

- **Production**: empty user tables stay empty. `buildLiveData` does not fall back to
  `window.FCData` for accounts/transactions/goals/etc. The user sees their real data,
  including a real net worth derived from real account balances.
- **Demo**: the same `buildLiveData` retains a mock fallback (`accounts.length ? accounts : mock.accounts`) so the screens stay populated even before `seedDemoData()` runs.

The seed itself also branches by build:

- Production: `FCStore.seedDefaultCategoriesIfEmpty()` — only the 12 default categories.
- Demo: `FCStore.seedDemoData()` — full design mock (5 accounts, 13 transactions,
  goals, budgets, recurring, holdings).

When a modal saves a row, it dispatches a `fc:<table>-saved` event; `page.js` listens
for these and re-runs `buildLiveData` so the screens see the new row without a reload.

`FCStore` runs a `recompute()` step inside every cache-affecting mutation (create /
update / remove / restore / `set` for accounts / transactions / cards / goals / budgets).
That step re-derives `account.balance`, `goal.current`, `budget.spent`, and
`card.cycleSpend` from the transactions table before the dispatch fires, so screens
that read those fields see fresh values without doing any aggregation themselves.
Recompute is scope-aware: a self-mutation (`update('budgets', id, ...)`) only re-derives
that one row, while a tx mutation cascades across every dependent row. See
`docs/data-model.md` § "Cached fields and `recompute()`" for the formula details.

## Why no build step

The choice trades runtime cost (Babel parses JSX in the browser, ~250ms cold) for zero
toolchain. There is no `package.json` for the app itself, no `npm install`, no
TypeScript compile. `start.bat` works on a fresh Windows install with just Python.

This is appropriate because:

- The spec is local-first; the user runs the app locally, not from a CDN.
- The screen surface is small; the Babel cost is paid once per page load.
- Replacing Babel-standalone with a Vite build is a 1-day refactor when needed.

## What `start.bat` does

1. `cd webapp/`
2. Tries `py -3 serve.py 8765`, then `python serve.py 8765`, then `npx http-server -c-1`.
3. Opens `http://localhost:8765/index.html` in the default browser.

`webapp/serve.py` wraps Python's `http.server` with `Cache-Control: no-store` headers
so JSX edits show up on a normal refresh — you don't have to hard-reload after every
change. The demo build uses port 8766 with the same wrapper.

The server is a passive static file host. There is no backend.

## What `down.bat` does

1. Looks up the PID listening on port **8765** (production) and **8766** (demo)
   via `netstat -ano | findstr "LISTENING"`.
2. Kills each one with `taskkill /PID <pid> /F` and prints which build was stopped.
3. If neither port is in use, prints `No dev server was running on ports 8765 or
   8766` and exits cleanly — safe to double-click even when the app isn't running.

A copy lives at the root of both `Finance/` and `Finance-demo/`; running either
one stops both builds because the script targets both ports.
