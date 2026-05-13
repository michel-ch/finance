# Finch — documentation

Finch is a local-first personal finance cockpit. Multi-account, multi-currency, with
a forecasting engine and a privacy-blur toggle. Built per `master-spec.md`; the design
mockups live in `export_UI/`; the running implementation lives in `webapp/`.

This folder is the developer reference. Start with `getting-started.md`, then jump
to whichever topic you need.

## Two builds

Finch ships in two parallel builds that share the same source tree:

- **Production** — `C:\Users\mtx\desktop\Finance\` on port `8765`. New profiles start
  empty (just the 12 default categories). The app is for the user's real data.
- **Demo** — `C:\Users\mtx\desktop\Finance-demo\` on port `8766`. New profiles auto-seed
  the design mock data (5 accounts, 13 transactions, goals, budgets, recurring rules,
  holdings) so the UI looks alive immediately. Visually distinguished by a "DEMO" chip
  in the sidebar.

See [`demo-vs-production.md`](demo-vs-production.md) for the full contrast.

## Index

| File | What's in it |
|---|---|
| [`getting-started.md`](getting-started.md) | Run the app, system requirements, first-launch flow |
| [`demo-vs-production.md`](demo-vs-production.md) | Difference between the two builds and how to maintain both |
| [`architecture.md`](architecture.md) | Directory layout, runtime composition, how the pages boot |
| [`auth.md`](auth.md) | Profiles, login / signup / PIN, session lifecycle, settings persistence |
| [`data-model.md`](data-model.md) | The schema in `store.js`, seed behavior, how it maps to master-spec §9 |
| [`components.md`](components.md) | Atoms, screens, modals (incl. the bulk-delete modal) — how to use them and what they expect |
| [`adding-a-page.md`](adding-a-page.md) | Step-by-step recipe for landing a new desktop or mobile page |
| [`testing.md`](testing.md) | The 11 Playwright suites (143 tests), how to run them, what they cover |
| [`roadmap.md`](roadmap.md) | What ships in v1, what's deferred, open questions |

## One-paragraph summary

The app loads in any modern browser. There is **no build step** — pages are plain HTML
that pull React + Babel from a CDN, then evaluate the JSX components in `webapp/components/`
and `webapp/desktop/*.jsx`. Persistence is `localStorage` only, namespaced per profile.
The schema is multi-user-ready (every row has `profileId` + `householdId`) but the v1 UX
is single-profile — there is no profile picker. Run `start.bat` from the project root
and you'll land on the signup screen on first launch, then the dashboard from then on.

## When in doubt

- Spec contradiction → the file at the project root, `master-spec.md`, is the source of
  truth. If something here disagrees with it, fix this doc.
- Visual contradiction → `export_UI/` shows the intended look. Implementation matches it
  closely; differences are noted in `roadmap.md`.
- Anything else → `architecture.md` is the map.
