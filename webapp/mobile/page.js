// Shared mobile page bootstrap.
// Each mobile HTML sets `window.FC_ACTIVE` (e.g. 'home') and includes this script.
// Renders a real, full-viewport mobile shell — no PhoneFrame chrome.
//
// Layout:
//   [ top bar: title · privacy eye · theme toggle ]
//   [ main scroll: the active screen (chrome={false}) ]
//   [ bottom tab bar: Home · Activity · Forecast · Goals · More ]
//   [ FAB → mobile/add.html ]
//
// Inputs:  window.FC_ACTIVE (string)
// Outputs: mounts React into #root.

(function () {
  if (!window.FCAuth || !FCAuth.requireSession()) return;

  function loadOpts() {
    var p = FCAuth.currentProfile() || {};
    if (p.theme) document.documentElement.dataset.theme = p.theme;
    if (p.accent) document.documentElement.dataset.accent = p.accent;
    return p;
  }

  function navigateTo(id) {
    // Cross-page navigation via real URLs (back/forward + bookmarks work).
    // Anything inside the mobile/ folder maps to a sibling html file.
    var mobilePages = { home:1, transactions:1, forecast:1, goals:1, more:1, add:1 };
    if (mobilePages[id]) { location.href = id + '.html'; return; }
    if (id === 'profiles') { location.href = '../login.html'; return; }
    // Fall back to desktop equivalents for screens we haven't ported yet.
    location.href = '../desktop/' + id + '.html';
  }

  function buildLiveData(profile) {
    // Production: no mock fallback — empty user tables stay empty.
    var fc = window.FCStore;
    var mock = window.FCData || {};
    var accounts = fc.list('accounts');
    var netWorth = accounts.reduce(function (s, a) { return s + (a.balance || 0); }, 0);
    return {
      profile: {
        name: profile.name || 'You',
        initials: profile.initials || (profile.name || 'U').slice(0, 2).toUpperCase(),
        baseCurrency: profile.baseCurrency || 'EUR',
        activeCurrencies: profile.activeCurrencies || ['EUR'],
      },
      accounts: accounts,
      transactions: fc.list('transactions'),
      goals: fc.list('goals'),
      budgets: fc.list('budgets'),
      bills: fc.list('recurring'),
      holdings: fc.list('holdings'),
      categories: fc.list('categories'),
      forecast: { history: [], projection: [], events: [] },
      networthSpark: [],
      netWorthBase: netWorth,
      netWorthDelta: 0,
      today: new Date(),
      profiles: [],
    };
  }

  // Small inline subcomponents — only used here.
  function MobileTopBar({ title, blurred, onTogglePrivacy, onToggleTheme, theme }) {
    var R = React;
    var Icon = window.FC.Icon;
    return R.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--border)',
      },
    },
      R.createElement('h1', {
        style: { margin: 0, flex: 1, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' },
      }, title),
      R.createElement('button', {
        className: 'fc-btn fc-btn-ghost',
        onClick: onTogglePrivacy,
        'aria-label': blurred ? 'Show amounts' : 'Hide amounts',
        style: { width: 36, height: 36, padding: 0, borderRadius: 18 },
      }, R.createElement(Icon, { name: blurred ? 'eye-off' : 'eye', size: 18 })),
      R.createElement('button', {
        className: 'fc-btn fc-btn-ghost',
        onClick: onToggleTheme,
        'aria-label': 'Toggle theme',
        style: { width: 36, height: 36, padding: 0, borderRadius: 18 },
      }, R.createElement(Icon, { name: theme === 'dark' ? 'sun' : 'moon', size: 18 })),
    );
  }

  function BottomTabs({ active, onNav }) {
    var R = React;
    var Icon = window.FC.Icon;
    var tabs = [
      { id: 'home',         label: 'Home',     icon: 'home' },
      { id: 'transactions', label: 'Activity', icon: 'list' },
      { id: 'forecast',     label: 'Forecast', icon: 'trend' },
      { id: 'goals',        label: 'Goals',    icon: 'target' },
      { id: 'more',         label: 'More',     icon: 'grid' },
    ];
    return R.createElement('nav', {
      style: {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        padding: '6px 8px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        display: 'flex', justifyContent: 'space-around',
        zIndex: 40,
      },
    }, tabs.map(function (t) {
      var isActive = active === t.id;
      return R.createElement('button', {
        key: t.id,
        onClick: function () { onNav(t.id); },
        'aria-current': isActive ? 'page' : undefined,
        'aria-label': t.label,
        style: {
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '8px 4px',
          borderRadius: 10,
          background: isActive ? 'var(--accent-tint)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
          minHeight: 48,
        },
      },
        R.createElement(Icon, { name: t.icon, size: 22, strokeWidth: isActive ? 2 : 1.75 }),
        R.createElement('span', { style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1px' } }, t.label),
      );
    }));
  }

  function FAB({ onClick }) {
    var R = React;
    var Icon = window.FC.Icon;
    return R.createElement('button', {
      onClick: onClick,
      'aria-label': 'Add transaction',
      style: {
        position: 'fixed',
        right: 16,
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
        width: 56, height: 56,
        borderRadius: 28,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35), 0 2px 8px rgba(13, 148, 136, 0.2)',
        zIndex: 50,
        border: 'none',
      },
    }, R.createElement(Icon, { name: 'plus', size: 26, strokeWidth: 2.25 }));
  }

  // Title per screen.
  var TITLES = {
    home: 'Finch',
    transactions: 'Activity',
    forecast: 'Forecast',
    goals: 'Goals',
    more: 'More',
    add: 'Add transaction',
  };

  function boot() {
    if (!window.FC || !window.FC.MobileHome || !window.FC.Icon) {
      setTimeout(boot, 30);
      return;
    }

    var profile = loadOpts();
    if (window.FCStore) FCStore.seedIfEmpty();
    var data = buildLiveData(profile);

    function App() {
      var R = React;
      var initialBlur = profile.privacyDefault === true;
      var s = R.useState(initialBlur);
      var blurred = s[0], setBlurred = s[1];
      var ts = R.useState(document.documentElement.dataset.theme || 'dark');
      var theme = ts[0], setTheme = ts[1];

      function toggleTheme() {
        var next = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        setTheme(next);
        FCAuth.updateProfile({ theme: next });
      }

      var active = window.FC_ACTIVE || 'home';
      var screenProps = {
        blurred: blurred,
        data: data,
        displayFont: 'Geist',
        onNav: navigateTo,
        onTogglePrivacy: function () { setBlurred(function (b) { return !b; }); },
        chrome: false, // suppress the inner mobile screen's own tab bar + FAB
      };

      var ScreenEl;
      if (active === 'home')               ScreenEl = R.createElement(window.FC.MobileHome, screenProps);
      else if (active === 'transactions')  ScreenEl = R.createElement(window.FC.MobileTransactions, screenProps);
      else if (active === 'forecast')      ScreenEl = R.createElement(window.FC.MobileForecast, screenProps);
      else if (active === 'goals')         ScreenEl = R.createElement(window.FC.MobileGoals, screenProps);
      else if (active === 'more')          ScreenEl = R.createElement(window.FC.MobileMore, screenProps);
      else if (active === 'add')           ScreenEl = R.createElement(window.FC.MobileAdd, screenProps);
      else                                  ScreenEl = R.createElement(window.FC.MobileHome, screenProps);

      // Add screen takes over: no top bar / tabs / FAB (full-page form).
      if (active === 'add') {
        return R.createElement('div', {
          style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
        }, ScreenEl);
      }

      return R.createElement('div', {
        style: {
          minHeight: '100vh', minHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
        },
      },
        R.createElement(MobileTopBar, {
          title: TITLES[active] || 'Finch',
          blurred: blurred,
          onTogglePrivacy: function () { setBlurred(function (b) { return !b; }); },
          onToggleTheme: toggleTheme,
          theme: theme,
        }),
        R.createElement('main', {
          style: { flex: 1, position: 'relative', overflow: 'visible' },
        }, ScreenEl),
        R.createElement(FAB, { onClick: function () { navigateTo('add'); } }),
        R.createElement(BottomTabs, { active: active, onNav: navigateTo }),
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  }

  boot();
})();
