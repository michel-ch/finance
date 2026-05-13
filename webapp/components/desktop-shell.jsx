// Desktop shell — sidebar nav + header. Hosts the active screen as children.

const { MoneyDisplay, Sparkline, StatusPill, ProgressRing, Icon, Avatar } = window.FC;

window.FC.DesktopShell = function DesktopShell({
  active, onNav, onTogglePrivacy, blurred,
  onToggleTheme, theme, accent, onSetAccent, density,
  children, profile, query, setQuery,
}) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifications = buildNotifications();

  const navItems = [
    { id: 'home',         label: 'Home',         icon: 'home' },
    { id: 'accounts',     label: 'Accounts',     icon: 'wallet' },
    { id: 'cards',        label: 'Cards',        icon: 'credit-card' },
    { id: 'transactions', label: 'Transactions', icon: 'list' },
    { id: 'forecast',     label: 'Forecast',     icon: 'trend',  highlight: true },
    { id: 'simulator',    label: 'Can I afford?', icon: 'sim' },
    { id: 'goals',        label: 'Goals',        icon: 'target' },
    { id: 'budgets',      label: 'Budgets',      icon: 'pie' },
    { id: 'recurring',    label: 'Recurring',    icon: 'repeat' },
    { id: 'investments',  label: 'Investments',  icon: 'chart' },
    { id: 'networth',     label: 'Net Worth',    icon: 'coins' },
    { id: 'import',       label: 'Import',       icon: 'upload' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{
          padding: '20px 16px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
            letterSpacing: '-0.04em',
          }}>
            ƒ
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Cabinet</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>Personal · EUR</div>
          </div>
        </div>

        <nav style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {navItems.map((it, i) => {
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => onNav(it.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: isActive ? 'var(--accent-tint)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  position: 'relative',
                  transition: 'background 120ms var(--ease), color 120ms var(--ease)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-sunken)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
                    background: 'var(--accent)', borderRadius: 2,
                  }} />
                )}
                <Icon name={it.icon} size={18} />
                <span style={{ flex: 1 }}>{it.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{
          padding: 12, borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            type="button"
            onClick={() => onNav('profiles')}
            title="Switch profile"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left', color: 'inherit',
            }}
          >
            <Avatar initials={profile.initials} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>switch profile</div>
            </div>
          </button>
          <button className="fc-btn fc-btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={() => onNav('settings')}>
            <Icon name="settings" size={16} />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 60,
          padding: '0 28px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 5, backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0 12px', height: 34, width: 320,
          }}>
            <Icon name="search" size={16} color="var(--text-tertiary)" />
            <input
              placeholder="Search transactions, accounts, goals…"
              value={query} onChange={e => setQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: 13, color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <button
            className="fc-btn fc-btn-ghost"
            style={{ height: 34, padding: '0 10px', gap: 6 }}
            onClick={onTogglePrivacy}
            title="Toggle privacy blur"
          >
            <Icon name={blurred ? 'eye-off' : 'eye'} size={16} />
            <span style={{ fontSize: 12 }}>{blurred ? 'Hidden' : 'Visible'}</span>
          </button>

          <button className="fc-btn fc-btn-ghost" style={{ width: 34, height: 34, padding: 0 }} onClick={onToggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="fc-btn fc-btn-ghost"
              style={{ width: 34, height: 34, padding: 0, position: 'relative' }}
              onClick={() => setNotifOpen(o => !o)}
              title={notifications.length === 0 ? 'No notifications' : notifications.length + ' notification' + (notifications.length === 1 ? '' : 's')}
            >
              <Icon name="bell" size={16} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 3,
                  background: 'var(--negative)',
                }} />
              )}
            </button>
            {notifOpen && (
              <>
                <div
                  onClick={() => setNotifOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                />
                <div
                  className="fc-card"
                  style={{
                    position: 'absolute', top: 42, right: 0,
                    width: 340, maxHeight: 460, overflowY: 'auto',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-card)',
                    boxShadow: 'var(--shadow-modal)',
                    padding: 0, zIndex: 50,
                  }}
                >
                  <div style={{
                    padding: '14px 16px 10px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <strong style={{ fontSize: 14, fontWeight: 600 }}>Notifications</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {notifications.length === 0 ? 'All clear' : notifications.length + ' active'}
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                      Nothing to flag right now.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => { setNotifOpen(false); onNav(n.nav); }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '10px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'transparent', border: 'none',
                          borderBottom: '1px solid var(--border)', cursor: 'pointer',
                          color: 'var(--text-primary)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-sunken)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: n.tone === 'warn' ? 'var(--negative-soft)' : 'var(--surface-sunken)',
                          color: n.tone === 'warn' ? 'var(--negative)' : 'var(--text-secondary)',
                          fontSize: 13, flex: 'none',
                        }}>{n.icon}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)' }}>{n.meta}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <button
            className="fc-btn fc-btn-primary"
            style={{ height: 34 }}
            onClick={() => window.dispatchEvent(new CustomEvent('fc:add-transaction'))}
          >
            <Icon name="plus" size={16} />
            <span>Add transaction</span>
          </button>
        </header>

        <main style={{ flex: 1, width: '100%', padding: '28px 32px 60px', overflow: 'auto' }} className="fc-scroll">
          {children}
        </main>
      </div>
    </div>
  );
};

// Derive bell-icon notifications from the live store. Categories:
//   – bills due in the next 7 days (recurring.nextDate)
//   – budgets where spent > cap
//   – goals flagged off-track or slipping
//   – pending transactions
//   – overdrawn (negative) account balances
function buildNotifications() {
  if (!window.FCStore) return [];
  const items = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7 = new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  (window.FCStore.list('recurring') || []).forEach(r => {
    if (!r.nextDate) return;
    const d = String(r.nextDate).slice(0, 10);
    if (d >= todayStr && d <= in7) {
      items.push({
        id: 'bill-' + r.id, icon: r.icon || '◇', tone: 'info',
        title: (r.name || 'Bill') + ' due',
        meta: d + ' · ' + (r.amount != null ? r.amount : '') + ' ' + (r.currency || ''),
        nav: 'recurring',
      });
    }
  });

  (window.FCStore.list('budgets') || []).forEach(b => {
    const cap = b.amount != null ? b.amount : b.budget;
    if (cap && b.spent > cap) {
      items.push({
        id: 'budget-' + b.id, icon: '!', tone: 'warn',
        title: (b.cat || 'Budget') + ' over cap',
        meta: Math.round(b.spent) + ' / ' + cap + ' ' + (b.currency || 'EUR'),
        nav: 'budgets',
      });
    }
  });

  (window.FCStore.list('goals') || []).forEach(g => {
    if (g.status === 'off-track' || g.status === 'slipping') {
      items.push({
        id: 'goal-' + g.id, icon: g.icon || '◎',
        tone: g.status === 'off-track' ? 'warn' : 'info',
        title: g.title || 'Goal',
        meta: g.status === 'off-track' ? 'Off track' : 'Slipping',
        nav: 'goals',
      });
    }
  });

  const pending = (window.FCStore.list('transactions') || []).filter(t => t.pending);
  if (pending.length > 0) {
    items.push({
      id: 'pending-tx', icon: '⏱', tone: 'info',
      title: pending.length + ' pending transaction' + (pending.length === 1 ? '' : 's'),
      meta: 'Awaiting clearance',
      nav: 'transactions',
    });
  }

  (window.FCStore.list('accounts') || []).forEach(a => {
    if (typeof a.balance === 'number' && a.balance < 0 && !a.archived) {
      items.push({
        id: 'overdrawn-' + a.id, icon: '!', tone: 'warn',
        title: (a.name || 'Account') + ' overdrawn',
        meta: a.balance.toFixed(2) + ' ' + (a.currency || ''),
        nav: 'accounts',
      });
    }
  });

  return items;
}
