// Mobile screens — Home, Forecast, Transactions, plus a generic phone frame.
// Bottom tab bar, FAB, sheet-style add transaction.

const { MoneyDisplay, Sparkline, StatusPill, ProgressRing, Icon, Avatar, formatMoney } = window.FC;

// ──────────────────────────────────────────────────────────
// Phone frame (custom — not iOS-branded; lets us style chrome)

window.FC.PhoneFrame = function PhoneFrame({ children, label, statusBarDark, theme }) {
  const W = 390, H = 844;
  return (
    <div style={{
      width: W, height: H,
      position: 'relative',
      borderRadius: 44,
      background: '#0d0d0d',
      padding: 10,
      boxShadow: '0 30px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.4) inset',
      flex: 'none',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 36,
        overflow: 'hidden',
        background: 'var(--bg)',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Status bar */}
        <div style={{
          height: 44, padding: '0 24px 0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums', flex: 'none',
        }}>
          <span>9:41</span>
          <div style={{
            position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
            width: 110, height: 32, borderRadius: 18, background: '#0d0d0d',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="repeat" size={13} />
            <span style={{ fontSize: 11 }}>•••</span>
            <svg width="22" height="11" viewBox="0 0 22 11">
              <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" fill="none" opacity="0.5"/>
              <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/>
              <rect x="20" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="fc-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Bottom tab bar

function MobileTabs({ active, onNav }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'transactions', label: 'Activity', icon: 'list' },
    { id: 'forecast', label: 'Forecast', icon: 'trend' },
    { id: 'goals', label: 'Goals', icon: 'target' },
    { id: 'more', label: 'More', icon: 'grid' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '8px 12px 24px',
      background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 5,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 0',
            color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
          }}>
            <Icon name={t.icon} size={22} strokeWidth={isActive ? 2 : 1.75} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1px' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Mobile Home

window.FC.MobileHome = function MobileHome({ blurred, data, displayFont, onNav, onTogglePrivacy }) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={data.profile.initials} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Wednesday, May 6
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Bonjour, Margaux</div>
        </div>
        <button className="fc-btn fc-btn-ghost" onClick={onTogglePrivacy} style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}>
          <Icon name={blurred ? 'eye-off' : 'eye'} size={18} />
        </button>
        <button className="fc-btn fc-btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: 18, position: 'relative' }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: 3, background: 'var(--negative)' }} />
        </button>
      </div>

      <div style={{ padding: '0 20px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero */}
        <div className="fc-card" style={{
          padding: 20, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface) 60%, var(--accent-tint) 100%)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Net worth · EUR
          </div>
          <div style={{ marginTop: 6, marginBottom: 6 }}>
            <MoneyDisplay amount={data.netWorthBase} currency="EUR" size="display" display={displayFont} blurred={blurred} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 5,
              background: 'var(--positive-soft)', color: 'var(--positive)',
              fontSize: 12, fontWeight: 600,
            }}>
              <Icon name="arrow-up" size={11} />
              <span className="tabular">{blurred ? '••••' : formatMoney(data.netWorthDelta, 'EUR')}</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>vs last month</span>
          </div>
          <Sparkline values={data.netWorthSpark} width={320} height={42} blurred={blurred} color="var(--accent)" />
        </div>

        {/* Forecast peek */}
        <button onClick={() => onNav('forecast')} className="fc-card" style={{
          padding: 16, borderRadius: 16, textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--accent-tint)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="trend" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              30-day low
            </div>
            <MoneyDisplay amount={2840} currency="EUR" size="h2" blurred={blurred} />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              On May 18, after Adobe + Free
            </div>
          </div>
          <Icon name="chevron" size={16} color="var(--text-tertiary)" />
        </button>

        {/* Accounts horizontal scroll */}
        <div>
          <SectionHeader title="Accounts" actionLabel="All →" />
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto', padding: '0 0 4px',
            margin: '0 -20px', paddingLeft: 20, paddingRight: 20,
          }} className="fc-scroll">
            {data.accounts.map(acc => (
              <div key={acc.id} className="fc-card" style={{
                padding: 14, borderRadius: 16, minWidth: 180, flex: 'none',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'var(--surface-sunken)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={acc.type === 'savings' ? 'coins' : acc.type === 'brokerage' ? 'chart' : 'wallet'} size={12} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {acc.name}
                  </span>
                </div>
                <MoneyDisplay amount={acc.balance} currency={acc.currency} size="body" blurred={blurred} weight={600} />
                <Sparkline values={acc.spark} width={150} height={20} blurred={blurred} />
              </div>
            ))}
          </div>
        </div>

        {/* Goals strip */}
        <div>
          <SectionHeader title="Goals" actionLabel="All →" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.goals.slice(0, 3).map(g => (
              <div key={g.id} className="fc-card" style={{
                padding: 14, borderRadius: 16,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <ProgressRing value={g.current / g.target} size={44} stroke={4} status={g.status} showPercent={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{g.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                  </div>
                  <div className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {blurred ? '••••' : formatMoney(g.current, 'EUR')} / {blurred ? '••••' : formatMoney(g.target, 'EUR')}
                  </div>
                </div>
                <StatusPill status={g.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming bills */}
        <div>
          <SectionHeader title="Upcoming" subtitle="Next 5 days" actionLabel="All →" />
          <div className="fc-card" style={{ padding: 4, borderRadius: 16 }}>
            {data.bills.slice(0, 4).map((b, i) => (
              <div key={b.id} style={{
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: 'var(--surface-sunken)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>{b.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <MoneyDisplay amount={-b.amount} currency={b.currency} size="small" blurred={blurred} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button style={{
        position: 'absolute', right: 20, bottom: 92,
        height: 52, padding: '0 18px',
        borderRadius: 999,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35), 0 2px 8px rgba(13, 148, 136, 0.2)',
        fontSize: 14, fontWeight: 600,
        zIndex: 4,
      }}>
        <Icon name="plus" size={18} strokeWidth={2.25} />
        Add
      </button>

      <MobileTabs active="home" onNav={onNav} />
    </>
  );
};

function SectionHeader({ title, subtitle, actionLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 10, padding: '0 2px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{subtitle}</span>}
      </div>
      {actionLabel && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{actionLabel}</span>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Mobile Forecast (simplified, mini version of the desktop chart)

window.FC.MobileForecast = function MobileForecast({ blurred, data, onNav }) {
  const projection = data.forecast.projection.slice(0, 30);
  const lowest = projection.reduce((m, p) => p.v < m.v ? p : m, projection[0]);

  return (
    <>
      <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="fc-btn fc-btn-ghost" onClick={() => onNav('home')} style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}>
          <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', flex: 1 }}>Forecast</h1>
        <button className="fc-btn fc-btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}>
          <Icon name="filter" size={18} />
        </button>
      </div>

      <div style={{ padding: '0 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 10 }}>
          {[30, 60, 90, 365].map((h, i) => (
            <button key={h} style={{
              flex: 1, height: 30, borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              background: i === 0 ? 'var(--surface)' : 'transparent',
              color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: i === 0 ? 'var(--shadow-card)' : 'none',
            }}>{h}d</button>
          ))}
        </div>

        <div className="fc-card" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Lowest projected · {new Date(data.today.getTime() + lowest.d * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div style={{ marginTop: 4 }}>
            <MoneyDisplay amount={lowest.v} currency="EUR" size="h1" blurred={blurred}
              colorize={lowest.v < 0} />
          </div>
          <MobileForecastChart projection={projection} history={data.forecast.history} blurred={blurred} today={data.today} />
        </div>

        {/* Simulator card */}
        <div className="fc-card" style={{
          padding: 14, borderRadius: 16,
          background: 'var(--accent-tint)', borderColor: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}>
            <Icon name="sparkles" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Simulate a purchase</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>See how it changes your forecast</div>
          </div>
          <Icon name="chevron" size={16} color="var(--accent)" />
        </div>

        <SectionHeader title="Upcoming events" subtitle="next 30 days" />
        <div className="fc-card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
          {data.forecast.events.slice(0, 6).map((ev, i, arr) => {
            const dt = new Date(data.today); dt.setDate(dt.getDate() + ev.d);
            const positive = ev.amount > 0;
            return (
              <div key={i} style={{
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: positive ? 'var(--positive)' : 'var(--accent)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · in {ev.d}d
                  </div>
                </div>
                <MoneyDisplay amount={ev.amount} currency="EUR" size="small" colorize signed blurred={blurred} />
              </div>
            );
          })}
        </div>
      </div>

      <MobileTabs active="forecast" onNav={onNav} />
    </>
  );
};

function MobileForecastChart({ projection, history, blurred, today }) {
  const w = 320, h = 140;
  const padT = 14, padB = 18, padL = 6, padR = 6;
  const innerH = h - padT - padB;
  const all = [...history.slice(-15), ...projection];
  const split = 15;
  const min = Math.min(...all.map(p => p.v), 0);
  const max = Math.max(...all.map(p => p.v));
  const range = max - min || 1;
  const xStep = (w - padL - padR) / (all.length - 1);
  const Y = v => padT + (1 - (v - min) / range) * innerH;
  const X = i => padL + i * xStep;

  const histPath = all.slice(0, split).map((p, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const projPath = all.slice(split - 1).map((p, i) => `${i === 0 ? 'M' : 'L'}${X(split - 1 + i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const histArea = histPath + ` L${X(split - 1).toFixed(1)} ${Y(min).toFixed(1)} L${X(0).toFixed(1)} ${Y(min).toFixed(1)} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 12, filter: blurred ? 'blur(6px)' : undefined }} shapeRendering="geometricPrecision">
      <line x1={X(split - 1)} x2={X(split - 1)} y1={padT} y2={h - padB} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" />
      <text x={X(split - 1)} y={padT + 10} fontSize="9" fontWeight="600" fill="var(--text-tertiary)" textAnchor="middle">TODAY</text>
      <path d={histArea} fill="var(--accent-tint)" />
      <path d={histPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />
      <path d={projPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 2" strokeLinejoin="miter" strokeLinecap="butt" strokeOpacity="0.95" />
      <circle cx={X(split - 1)} cy={Y(all[split - 1].v)} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Mobile Transactions

window.FC.MobileTransactions = function MobileTransactions({ blurred, data, onNav }) {
  const groups = {};
  data.transactions.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', flex: 1 }}>Activity</h1>
        <button className="fc-btn fc-btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}>
          <Icon name="search" size={18} />
        </button>
        <button className="fc-btn fc-btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}>
          <Icon name="filter" size={18} />
        </button>
      </div>

      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto' }} className="fc-scroll">
        {['All accounts', 'BNP', 'Boursorama', 'Revolut'].map((c, i) => (
          <span key={c} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: i === 0 ? 'var(--accent-tint)' : 'var(--surface)',
            color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap',
          }}>{c}</span>
        ))}
      </div>

      <div style={{ padding: '0 0 100px' }}>
        {dates.map(date => {
          const dt = new Date(date);
          return (
            <div key={date}>
              <div style={{
                padding: '10px 20px',
                fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700,
                letterSpacing: '0.5px', textTransform: 'uppercase',
                background: 'var(--bg)',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                {dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {groups[date].map((tx, i, arr) => (
                <div key={tx.id} style={{
                  padding: '10px 20px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                  opacity: tx.pending ? 0.85 : 1,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, background: 'var(--surface-sunken)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flex: 'none',
                  }}>{tx.cat_icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.merchant}
                      </span>
                      {tx.pending && <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)',
                        background: 'var(--surface-sunken)', padding: '1px 5px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                      }}>Pending</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {tx.category}{tx.tags?.length ? ` · #${tx.tags[0]}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <MoneyDisplay
                      amount={tx.amount} currency={tx.currency}
                      size="small" colorize={!tx.transfer} signed blurred={blurred}
                    />
                    {tx.currencyConverted && (
                      <div className="tabular" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        ≈ {blurred ? '••••' : formatMoney(tx.currencyConverted, 'EUR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* FAB pill */}
      <button style={{
        position: 'absolute', right: 20, bottom: 92,
        height: 52, padding: '0 20px',
        borderRadius: 999,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35), 0 2px 8px rgba(13, 148, 136, 0.2)',
        fontSize: 14, fontWeight: 600,
        zIndex: 4,
      }}>
        <Icon name="plus" size={18} strokeWidth={2.25} />
        Add transaction
      </button>

      <MobileTabs active="transactions" onNav={onNav} />
    </>
  );
};

// ──────────────────────────────────────────────────────────
// Mobile Add transaction — bottom sheet

window.FC.MobileAddSheet = function MobileAddSheet({ blurred, data, onNav }) {
  return (
    <>
      {/* Dim background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        zIndex: 5,
      }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--surface)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '8px 20px 32px',
        zIndex: 6,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '8px auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Add transaction</h2>
          <button className="fc-btn fc-btn-ghost" onClick={() => onNav('transactions')} style={{ fontSize: 14 }}>Cancel</button>
        </div>

        {/* Big amount */}
        <div style={{
          padding: 20, borderRadius: 16, background: 'var(--surface-sunken)',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Amount</div>
            <div className="tabular" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>−</span>28.40
            </div>
          </div>
          <button style={{
            height: 36, padding: '0 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontWeight: 700, fontSize: 13,
          }}>EUR</button>
        </div>

        {/* Fields */}
        <div className="fc-card" style={{ padding: 0, borderRadius: 14, overflow: 'hidden' }}>
          <Field label="Date" value="Today, May 6" />
          <Field label="Account" value="BNP Courant — Visa •• 4421" />
          <Field label="Category" value="🍜  Dining" pillBg="var(--accent-tint)" pillFg="var(--accent)" />
          <Field label="Tags" value="#paris" />
          <Field label="Description" value="Le Petit Cambodge" last />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button style={{
            flex: 1, height: 40, borderRadius: 10,
            background: 'var(--surface-sunken)', color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="repeat" size={14} /> Make recurring
          </button>
          <button style={{
            flex: 1, height: 40, borderRadius: 10,
            background: 'var(--surface-sunken)', color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="arrow" size={14} /> Mark as transfer
          </button>
        </div>

        <button className="fc-btn fc-btn-primary" style={{
          width: '100%', height: 52, marginTop: 14, fontSize: 15, fontWeight: 600,
        }}>Save transaction</button>
      </div>
    </>
  );
};

function Field({ label, value, last, pillBg, pillFg }) {
  return (
    <div style={{
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 76 }}>{label}</span>
      {pillBg ? (
        <span style={{
          padding: '3px 10px', borderRadius: 999,
          background: pillBg, color: pillFg, fontSize: 13, fontWeight: 600,
        }}>{value}</span>
      ) : (
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{value}</span>
      )}
      <Icon name="chevron" size={14} color="var(--text-tertiary)" />
    </div>
  );
}
