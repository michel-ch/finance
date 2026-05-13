# Adding a new page

A worked example: imagine you want to add a "Reports" screen at `desktop/reports.html`.

## 1. Create the screen component

If the screen is small, drop it into an existing screens file (e.g. `secondary-screens.jsx`).
For a substantial new screen, create `webapp/desktop/reports-screen.jsx`:

```js
(function () {
  const R = React;
  const FC = window.FC;
  const { Icon, MoneyDisplay } = FC;

  FC.ReportsScreen = function ReportsScreen({ blurred, data, onNav }) {
    return R.createElement('div', null, /* ... */);
  };
})();
```

Conventions:

- Self-IIFE so locals don't leak to globals.
- Expose the component on `window.FC.<Name>Screen`.
- Accept `{ blurred, density, displayFont, data, onNav }` — the same shape every screen
  receives.
- Read live data from `data.<table>`, not directly from `FCStore` (so `page.js` can
  refresh after a save).

## 2. Register the screen

Add an entry in `webapp/desktop/page.js`'s `screenMap`:

```js
var screenMap = {
  // ...
  reports: 'ReportsScreen',
};
```

## 3. Register the nav item

Add an entry to `navItems` in `webapp/components/desktop-shell.jsx`:

```js
{ id: 'reports', label: 'Reports', icon: 'chart' },
```

The shell's `onNav` callback already handles the cross-page navigation — it will
`location.href = 'reports.html'` for any id.

## 4. Create the HTML page

Copy `webapp/desktop/_template.html` to `webapp/desktop/reports.html` and:

- Replace `__TITLE__` with `Finch — Reports`.
- Replace `__ACTIVE__` with `reports`.
- Add your screen file to the script chain, after the screen components and before
  `page.js`:

```html
<script type="text/babel" src="../components/atoms.jsx"></script>
<!-- ... existing screen scripts ... -->
<script type="text/babel" src="reports-screen.jsx"></script>
<script type="text/babel" src="add-transaction.jsx"></script>
<script type="text/babel" src="crud-modals.jsx"></script>
<script type="text/babel" src="holding-form.jsx"></script>
<script src="page.js"></script>
```

## 5. Add a mobile entry (if applicable)

If the screen makes sense on mobile, mirror the desktop steps in `webapp/mobile/`:

- Create a `MobileReports` inner component in `mobile-screens.jsx`.
- Register it in `mobile/page.js`'s screen map.
- Create `mobile/reports.html` setting `FC_ACTIVE='reports'`.
- Add a row to the "More" mobile page or a new bottom-tab entry.

## 6. Need persistence?

If the screen reads data from a table that doesn't exist yet:

- Add the table name to the `TABLES` array in `webapp/store.js`.
- If it should be seeded from mock data, extend `FCStore.seedIfEmpty()`.
- Add it to `buildLiveData()` in `desktop/page.js`:

```js
var reports = fc.list('reports');
return { /* ... */, reports: reports.length ? reports : mock.reports || [] };
```

## 7. Need a CRUD form?

Reuse `crud-modals.jsx`'s pattern — see the `RecurringFormModal` for a clean reference.
Wire it to a new `fc:edit-report` event and add `fc:report-saved` to the
`buildLiveData` refresh listener in `page.js`.

## 8. Test it

Add a smoke case to `tests/smoke-verify.spec.mjs` (or run the existing one — it
auto-discovers from a list of pages, just add `reports` to the array).

```sh
cd tests
./node_modules/.bin/playwright.cmd test --config=smoke.config.mjs
```

If the new page shows up in the spec output as "renders without crash", you're done.

## Anti-patterns

- **Don't import a JSX file from another JSX file** — there is no module system.
  Use `window.FC.*`.
- **Don't put auth checks in the screen.** The page guard runs in `page.js` before
  any screen mounts. If a screen needs profile data, read `data.profile`.
- **Don't read from `FCStore` directly inside a screen for data that should refresh.**
  Use the `data` prop. Direct reads bypass `page.js`'s refresh-on-save logic.
- **Don't introduce new monetary rendering.** Use `MoneyDisplay`. If you find yourself
  writing `'$' + amount.toFixed(2)`, stop and use the atom — privacy blur + tabular
  numerals + multi-currency conversion are all already handled.
