// Desktop shell — sidebar nav + header. Hosts the active screen as children.

const { MoneyDisplay, Sparkline, StatusPill, ProgressRing, Icon, Avatar } = window.FC;

window.FC.DesktopShell = function DesktopShell({
  active, onNav, onTogglePrivacy, blurred,
  onToggleTheme, theme, accent, onSetAccent, density,
  children, profile, query, setQuery,
}) {
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
                <span className="tabular" style={{
                  fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.05em',
                  fontWeight: 500,
                }}>⌘{i + 1}</span>
              </button>
            );
          })}
        </nav>

        <div style={{
          padding: 12, borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar initials={profile.initials} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>switch profile</div>
          </div>
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
            <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>⌘K</span>
          </div>

          <div style={{ flex: 1 }} />

          <button
            className="fc-btn fc-btn-ghost"
            style={{ height: 34, padding: '0 10px', gap: 6 }}
            onClick={onTogglePrivacy}
            title="Toggle privacy blur (⌘B)"
          >
            <Icon name={blurred ? 'eye-off' : 'eye'} size={16} />
            <span style={{ fontSize: 12 }}>{blurred ? 'Hidden' : 'Visible'}</span>
          </button>

          <button className="fc-btn fc-btn-ghost" style={{ width: 34, height: 34, padding: 0 }} onClick={onToggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <button className="fc-btn fc-btn-ghost" style={{ width: 34, height: 34, padding: 0, position: 'relative' }}>
            <Icon name="bell" size={16} />
            <span style={{
              position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 3,
              background: 'var(--negative)',
            }} />
          </button>

          <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
            <Icon name="plus" size={16} />
            <span>Add transaction</span>
            <span className="tabular" style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>⌘N</span>
          </button>
        </header>

        <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto', maxWidth: 1320 }} className="fc-scroll">
          {children}
        </main>
      </div>
    </div>
  );
};
