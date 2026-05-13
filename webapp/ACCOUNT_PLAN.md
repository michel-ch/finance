# Account & settings implementation plan

> Built on top of the local-first multi-user-ready schema described in master-spec §5.
> v1 has a working **single-profile login**, **PIN gate**, and **full settings surface** — the
> profile picker UI is intentionally absent (per spec) but the underlying schema supports it.

## Pieces shipped in this change

| Piece | File | Status |
|---|---|---|
| Auth API (signup / login / logout / PIN) | `webapp/auth.js` | Implemented |
| Persistent data store (per profile) | `webapp/store.js` | Implemented |
| Session entry point | `webapp/index.html` | Implemented |
| Sign-in page | `webapp/login.html` | Implemented |
| Sign-up page (collects base + active currencies) | `webapp/signup.html` | Implemented |
| PIN unlock pad | `webapp/pin.html` | Implemented |
| Settings (all 9 sections) | `webapp/desktop/settings.html` + `settings-screen.jsx` | Implemented |
| Auth-guard + nav routing for every page | `webapp/desktop/page.js` | Implemented |
| Per-page bootstrap | `webapp/desktop/_template.html` → all pages | Implemented |
| Single-command launcher | `start.bat` | Implemented |

## Auth model

Local-only (per master-spec §12 "no data leaves the machine"). No server.
- `localStorage["fc.profiles.v1"]`: array of profiles. Multi-profile-ready; v1 will only
  ever hold one row in normal use, but the array shape lets a future profile picker land
  without migration.
- `localStorage["fc.session.v1"]`: `{ profileId, loggedInAt }`.
- `localStorage["fc.pinLocked.v1"]`: bool — true if a PIN is set and the page must gate.
- `localStorage["fc.data.<profileId>.<table>"]`: per-profile rows. Profile-id namespacing
  means deleting a profile is just dropping its keys.

Passwords + PIN are stored as a non-cryptographic hash. **This is a casual-privacy gate, not
real security**, matching the spec's open question on PIN scope (§29.3). Encryption-at-rest
is explicitly deferred.

## Routing

| Path | When | Lands on |
|---|---|---|
| `/index.html` | Always | Auto-routes: `signup` if no profile, `login` if logged out, `pin` if locked, `home` otherwise |
| `/signup.html` | First-launch / "Create one" link | Creates profile, signs in, routes to onboarding |
| `/login.html` | Logged out | Signs in, routes to PIN if set, else home |
| `/pin.html` | Session locked | 4-digit pad; on success → home |
| `/desktop/onboarding.html` | First post-signup launch | Currency + first account |
| `/desktop/home.html` … `/desktop/settings.html` | Logged in | Each page = one route |

Every desktop page calls `FCAuth.requireSession()` first. The shell's "switch profile"
button signs out and returns to the login screen — multi-profile flows arrive when the
spec opens that gate.

## Settings → master-spec §18.12 mapping

| Spec section | Implementation |
|---|---|
| User (display name, optional PIN) | Section 1 — name, email, PIN dialog |
| Currencies (base, active, can't remove a currency in use) | Section 2 — selector + chips, base-removal blocked |
| Categories (edit, add, archive) | Section 3 — list + add form |
| Import templates | Section 4 — placeholder + link to Import |
| Recurring rules (regex → category) | Section 5 — placeholder, lands with bank import |
| Backup (export / import JSON) | Section 6 — file download + restore |
| Appearance (theme, accent, density) | Section 7 — toggles persist to profile |
| Privacy (start blurred, idle lock) | Section 8 — toggle + minutes input |
| About (version, links) | Section 9 — version + storage size + created date |

## Open work post-merge

These are the natural follow-ups but not blockers:

- Idle-lock timer needs a per-page heartbeat (currently the value is stored but no timer
  enforces it).
- Recurring auto-categorize rules need the import staging table to be populated end-to-end.
- Sidebar order is persisted as a list in profile.sidebarOrder once the user reorders;
  the drag-handle UX is described in master-spec §17 but lives in a future iteration.
- "Edit categories" supports add + delete; reorder + archive arrive when categories pick
  up real-world traffic.
