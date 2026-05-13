# Getting started

## Requirements

Either of:

- **Python 3** (any 3.x) — already shipped with most Windows installs as `py` or `python`.
- **Node.js** with `npx` — falls back to `npx http-server` if Python is missing.

That's it. There is no build step, no `npm install`, no compiler. The browser does the
JSX transform via Babel-standalone at load time.

## Run

There are two builds that can run side by side:

| Build | Folder | Launcher | URL |
|---|---|---|---|
| Production | `C:\Users\mtx\desktop\Finance\` | `start.bat` | `http://localhost:8765/` |
| Demo | `C:\Users\mtx\desktop\Finance-demo\` | `start.bat` | `http://localhost:8766/` |

Each `start.bat`:

1. Detects Python (or falls back to Node).
2. Starts `webapp/serve.py` — a static file host with `Cache-Control: no-store` so JSX
   edits land on a normal refresh.
3. Opens the splash page in your default browser.

If a port is already in use, edit the relevant `start.bat` and change `set PORT=...`.

## Stop

Run `down.bat` from the project root. It looks up the PID listening on **8765**
(production) and **8766** (demo) via `netstat -ano` and kills each one with
`taskkill /PID <pid> /F`. Safe to run when nothing is up — it just prints
`No dev server was running on ports 8765 or 8766` and exits cleanly. The Finch
folder and Finance-demo folder each carry an identical copy; running either one
stops both builds.

The **production build is for your real data** — new profiles start empty (just 12
default categories so the first transaction has something to pick from).

The **demo build is for design previews / screenshots** — new profiles auto-seed the
mock data so the UI is fully populated. The sidebar shows a "DEMO" chip so you can
tell at a glance which build you're in. See [`demo-vs-production.md`](demo-vs-production.md).

## What happens on first launch

The splash routes you based on local state:

| State | Lands on |
|---|---|
| No profile in localStorage | `signup.html` |
| Profile exists, signed out | `login.html` |
| Signed in, PIN locked | `pin.html` |
| Signed in, not yet onboarded | `desktop/onboarding.html` |
| Signed in, onboarded | `desktop/home.html` |

After signup you go through the 3-step onboarding (base currency → active currencies →
first account), then land on the home dashboard.

- **Production**: empty home dashboard apart from the one account you just created in
  onboarding. Add transactions / goals / budgets as you use the app.
- **Demo**: the home dashboard is fully populated with sample accounts, transactions,
  goals, budgets, and recurring rules so you can see what the app looks like in steady
  state without any data entry.

## Reset the app

Three ways to start fresh:

1. **In-app: Settings → Backup → "Clear all data"** — wipes accounts, transactions,
   goals, budgets, recurring rules, holdings, import staging. Keeps your credentials
   and the default categories. Recommended for clearing a profile that was auto-seeded
   under the old behavior.
2. **Hard reset via DevTools** — open Application → Local Storage → delete every key
   starting with `fc.`, or run:
   ```js
   Object.keys(localStorage).filter(k => k.startsWith('fc.')).forEach(k => localStorage.removeItem(k));
   ```
3. **Delete profile** — Settings → User → "Delete profile" wipes the profile entirely
   and routes you back to login.

The production and demo builds are on different ports (different origins), so each one
has its own isolated `localStorage`. Resetting one does not touch the other.

## Keyboard shortcuts

Once signed in, on any desktop page (the visible badge hints have been removed from
the UI; the shortcuts themselves still work):

| Shortcut | What it does |
|---|---|
| `Ctrl/Cmd + N` | New transaction |
| `Ctrl/Cmd + K` | Focus search |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + B` | Toggle privacy blur |
| `Ctrl/Cmd + 1..9` | Jump to nav item N |

## Common issues

- **Pages render blank** — check the console for a Babel error. Most often it's a JSX
  file that failed to parse; the file path will be in the message. The page won't crash
  but the screen registered after the broken file won't load.
- **"Wrong email or password" after signup** — passwords are case-sensitive and there is
  no recovery flow in v1. Use the reset block above to start over.
- **Server starts but browser opens to a 404** — confirm you ran `start.bat` from the
  project root, not from inside `webapp/`.
