# Demo vs production

Finch maintains two parallel project folders that share the same source code with
two intentional differences.

| | Production | Demo |
|---|---|---|
| Folder | `C:\Users\mtx\desktop\Finance\` | `C:\Users\mtx\desktop\Finance-demo\` |
| Launcher | `start.bat` → port **8765** | `start.bat` → port **8766** |
| Browser title | `Finch — Home` | `Finch Demo — Home` |
| Sidebar brand | `Cabinet · Personal · EUR` | `Cabinet · DEMO · Sample data · EUR` |
| First-run seed | 12 default categories only | 12 categories + 5 accounts + 13 transactions + goals + budgets + recurring + holdings |
| Seed function | `FCStore.seedDefaultCategoriesIfEmpty()` | `FCStore.seedDemoData()` |
| `buildLiveData` mock fallback | None — empty stays empty | Falls back to `window.FCData` for design preview |
| Intended audience | The user's real finances | A reviewer / screenshot tour / design check |

The two builds can run **side by side**. Use the production build for your real data
and the demo build for screenshots, exploring features, or showing to others without
exposing real numbers.

## Why two builds, not a flag?

A runtime flag would be lighter, but the seed is per-profile and irreversible — once
the demo seed runs, deleting it from "real" data is messy. Two folders give a clean
mental model: *"this folder is the demo"*. Maintenance overhead is minimal because the
two folders share 99% of the code.

## How to make a change to both

The production folder is the source of truth. After any change there, sync the diff
into the demo folder. From the project root:

```sh
# Sync everything except the demo's intentional differences:
robocopy webapp ..\Finance-demo\webapp /MIR /XF page.js /XD node_modules
```

Then re-apply the demo's two intentional differences:

1. In `Finance-demo/webapp/desktop/page.js`, replace `FCStore.seedIfEmpty()` with
   `FCStore.seedDemoData()`.
2. In `Finance-demo/webapp/mobile/page.js`, replace `FCStore.seedIfEmpty()` with
   `FCStore.seedDemoData()`.
3. In `Finance-demo/webapp/components/desktop-shell.jsx`, the brand block reads
   "Cabinet · DEMO · Sample data" instead of "Cabinet · Personal".
4. In `Finance-demo/webapp/desktop/page.js`'s `buildLiveData`, the demo build keeps
   the mock fallback (`accounts.length ? accounts : mock.accounts || []`) so design
   previews stay populated even before the seed runs.

These four spots are the only diff. A future cleanup is to extract them into a
`webapp/build-config.js` that one line of `start.bat` swaps — for now the duplication
is small enough that the explicit folder split is clearer.

## Resetting either build

Open DevTools → Application → Local Storage and delete keys starting with `fc.`. The
two builds use the **same `localStorage` keys** but on different origins (different
ports), so resetting one does not affect the other.

You can also use **Settings → Backup → "Clear all data"** in the running app to clear
all user-data tables for the active profile while keeping the profile credentials and
the 12 default categories intact. This is the recommended path for users who signed
up under the old auto-seed behavior and want a clean slate without recreating their
profile.
