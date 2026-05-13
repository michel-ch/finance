# Auth & sessions

## Concepts

- **Profile** — one row in `localStorage["fc.profiles.v1"]`. Holds name, email, password
  hash, base currency, active currencies, theme/accent, PIN hash, privacy preferences.
  In v1 there is normally only one profile. The schema is multi-user-ready so a
  profile-picker UI can ship without migration (per master-spec §5).
- **Session** — `localStorage["fc.session.v1"]` is `{ profileId, loggedInAt }`.
- **PIN lock** — `localStorage["fc.pinLocked.v1"]` is a boolean. Only meaningful when
  the active profile has a PIN set; resets to `true` on every fresh login.

This is **casual privacy**, not real security. Passwords and PINs are stored as a
non-cryptographic hash via `auth.js#hash`. The data is not encrypted at rest. See
master-spec §29.3 ("PIN scope") for the deferred decision on real encryption.

## Public API — `FCAuth`

Defined in `webapp/auth.js`. Available globally as `window.FCAuth`.

| Method | Returns | Notes |
|---|---|---|
| `listProfiles()` | `Profile[]` | Reads from `localStorage`, never throws |
| `hasAnyProfile()` | `bool` | True after first signup |
| `currentProfile()` | `Profile \| null` | Looks up the session's profileId |
| `isLoggedIn()` | `bool` | Equivalent to `currentProfile() != null` |
| `isPinLocked()` | `bool` | False if no PIN set |
| `setPinLocked(b)` | — | Toggle the lock flag |
| `signup({ name, email, password, baseCurrency, activeCurrencies })` | `Profile` | Creates a profile, signs in. Throws on duplicate email |
| `login(email, password)` | `Profile` | Throws on bad credentials |
| `logout()` | — | Clears session + PIN-lock flag |
| `updateProfile(patch)` | `Profile \| null` | Shallow-merges into current profile |
| `setPin(pin)` | — | Pass empty string / null to remove |
| `verifyPin(pin)` | `bool` | True if no PIN set, or hash matches |
| `firstRoute()` | `string` | URL the splash should redirect to |
| `requireSession({...})` | `bool` | Page guard — see below |

## Page guard

Every protected page calls `FCAuth.requireSession()` at the top of its bootstrap.

```js
if (!window.FCAuth || !FCAuth.requireSession()) return;
```

The guard:

- Redirects to `login.html` if no session.
- Redirects to `pin.html` if the session is PIN-locked.
- Otherwise returns `true` and the page renders.

`webapp/desktop/page.js` and `webapp/mobile/page.js` both call this before doing
anything else.

## Routing logic

```
splash (index.html)
   │
   │   localStorage state
   ├── no profile        → signup.html
   ├── logged out        → login.html
   ├── logged in, locked → pin.html
   ├── not onboarded     → desktop/onboarding.html
   └── ready             → desktop/home.html
```

`FCAuth.firstRoute()` encodes this. It is the only place that decides the splash
destination.

## Login / signup forms

Both forms are vanilla HTML + a small inline `<script>`. No React, no shared bundle —
this keeps the auth flow loadable even if a JSX file later fails to parse.

Failures show inline as a `<div class="err">` below the submit button. There is no
toast or alert.

## PIN

Signup creates a profile with `pin: null`. The user opts in from `Settings → User → Set up PIN`.

- 4 digits, validated client-side.
- Hashed with the same lightweight hash as passwords.
- After login, if a PIN exists the user is sent to `pin.html` before any data screen.
- The PIN pad in `pin.html` is keyboard-accessible and exits to login on "Sign out".

## Idle auto-lock

`Settings → Privacy → Idle auto-lock (minutes)` writes `idleLockMinutes` on the profile.
The value is persisted but the timer is not yet wired into the desktop shell — flagged
as a known gap in `roadmap.md`.

## Logout

Three entry points:

- `Settings → User → Sign out`
- The PIN screen's "Sign out" link
- Programmatically: `FCAuth.logout()`

All three clear `fc.session.v1` and `fc.pinLocked.v1`, then redirect to `login.html`.
Per-profile data (`fc.data.<profileId>.*`) is **not** cleared — it is only cleared
when the user explicitly deletes the profile from settings.

## Signup → empty state, not seeded

In the **production build**, signup creates the profile and then seeds **only the 12
default categories** so the first transaction has something to pick from. Accounts,
transactions, goals, budgets, recurring rules, and holdings all start empty. This is
intentional — the user's real data should not be polluted with sample rows.

In the **demo build**, signup also runs `FCStore.seedDemoData()` which fills every
table from `window.FCData` so the app looks alive immediately. This is purposeful for
screenshots and design previews; see [`demo-vs-production.md`](demo-vs-production.md).

If you signed up under the old (pre-fix) behavior and ended up with auto-seeded sample
data in your production profile, **Settings → Backup → "Clear all data"** wipes every
user-data table while keeping your credentials and the default categories.

## Multi-user-ready schema

Even though the v1 UX is single-profile, every per-profile localStorage key is namespaced
by the profile id:

```
fc.data.<profileId>.accounts
fc.data.<profileId>.transactions
fc.data.<profileId>.goals
…
```

This means a future profile picker only needs to:

1. Add a Profiles section in Settings.
2. Add a switcher in the sidebar / header.
3. Optionally add a launch picker.

No data migration is required.
