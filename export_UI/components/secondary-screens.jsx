// Lighter screens for the rest: Accounts, Budgets, Recurring, Investments, Net Worth.
// Each is full-fidelity but we don't repeat the deep complexity of Forecast/Goals.

const { MoneyDisplay, Sparkline, StatusPill, Icon, formatMoney } = window.FC;

// ──────────────────────────────────────────────────────────
// Accounts

window.FC.AccountsScreen = function AccountsScreen({ blurred, data }) {
  const [filter, setFilter] = React.useState('all');
  const accounts = data.accounts.filter(a =>
    filter === 'all' ? true : a.type === filter
  );
  const total = data.accounts.reduce((s, a) => {
    const fx = a.currency === 'USD' ? 0.92 : a.currency === 'GBP' ? 1.17 : 1;
    return s + a.balance * fx;
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Accounts</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            5 accounts · {blurred ? '••••' : formatMoney(total, 'EUR')} total in EUR
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 8 }}>
          {['all', 'checking', 'savings', 'brokerage'].map(t => (
            <button key={t}
              onClick={() => setFilter(t)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 6,
                fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                background: filter === t ? 'var(--surface)' : 'transparent',
                color: filter === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: filter === t ? 'var(--shadow-card)' : 'none',
              }}>{t}</button>
          ))}
        </div>
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="plus" size={14} /> Add account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {accounts.map(acc => {
          const trend = acc.spark[acc.spark.length - 1] - acc.spark[0];
          const positive = trend >= 0;
          return (
            <div key={acc.id} className="fc-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--surface-sunken)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}>
                  <Icon name={acc.type === 'savings' ? 'coins' : acc.type === 'brokerage' ? 'chart' : 'wallet'} size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.4px' }}>
                    {acc.type} · {acc.currency}
                  </div>
                </div>
                <button className="fc-btn fc-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                  <Icon name="chevron" size={14} />
                </button>
              </div>

              <MoneyDisplay amount={acc.balance} currency={acc.currency} size="h1" blurred={blurred} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 6px', borderRadius: 4,
                  background: positive ? 'var(--positive-soft)' : 'var(--negative-soft)',
                  color: positive ? 'var(--positive)' : 'var(--negative)',
                  fontSize: 11, fontWeight: 600,
                }}>
                  <Icon name={positive ? 'arrow-up' : 'arrow-down'} size={10} />
                  <span className="tabular">{blurred ? '••••' : `${positive ? '+' : '−'}${formatMoney(Math.abs(trend), acc.currency)}`}</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>30d</span>
                <span style={{ flex: 1 }} />
                <Sparkline values={acc.spark} width={140} height={28} blurred={blurred} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Budgets — monthly envelopes

window.FC.BudgetsScreen = function BudgetsScreen({ blurred, data }) {
  const totalSpent = data.budgets.reduce((s, b) => s + b.spent, 0);
  const totalBudget = data.budgets.reduce((s, b) => s + b.budget, 0);
  const overall = totalSpent / totalBudget;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Budgets</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>May 2026 · 6 days remaining</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="fc-btn fc-btn-ghost" style={{ width: 32, height: 32, padding: 0 }}>
            <Icon name="chevron" size={14} color="var(--text-tertiary)" style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 100, textAlign: 'center' }}>May 2026</span>
          <button className="fc-btn fc-btn-ghost" style={{ width: 32, height: 32, padding: 0 }}>
            <Icon name="chevron" size={14} />
          </button>
        </div>
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}>Edit budgets</button>
      </div>

      {/* Overall */}
      <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>This month</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <MoneyDisplay amount={totalSpent} currency="EUR" size="h1" blurred={blurred} />
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }} className="tabular">
                / {blurred ? '••••' : formatMoney(totalBudget, 'EUR')}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Remaining</div>
            <MoneyDisplay amount={totalBudget - totalSpent} currency="EUR" size="h2" blurred={blurred} />
          </div>
        </div>
        <div style={{ height: 10, background: 'var(--surface-sunken)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(100, overall * 100)}%`,
            background: overall > 1 ? 'var(--negative)' : overall > 0.85 ? 'var(--warning)' : 'var(--accent)',
            borderRadius: 5,
            transition: 'width 600ms var(--ease)',
          }} />
        </div>
      </div>

      <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
        {data.budgets.map((b, i) => {
          const pct = b.spent / b.budget;
          const over = b.spent > b.budget;
          return (
            <div key={b.id} style={{
              padding: '14px 20px',
              display: 'grid', gridTemplateColumns: '32px 1fr 280px 140px', alignItems: 'center', gap: 16,
              borderBottom: i === data.budgets.length - 1 ? 'none' : '1px solid var(--border)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--surface-sunken)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>{b.icon}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{b.cat}</span>
                {b.hard && <StatusPill status="off-track" label="Hard cap" icon="●" />}
              </div>
              <div>
                <div style={{ height: 8, background: 'var(--surface-sunken)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, pct * 100)}%`,
                    background: over ? 'var(--negative)' : pct > 0.85 ? 'var(--warning)' : 'var(--accent)',
                    transition: 'width 600ms var(--ease)',
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <MoneyDisplay amount={b.spent} currency="EUR" size="body" blurred={blurred} colorize={over} />
                <div className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  / {blurred ? '••••' : formatMoney(b.budget, 'EUR')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Recurring — list grouped by frequency, with annualized totals.

window.FC.RecurringScreen = function RecurringScreen({ blurred, data }) {
  const recurring = [
    ...data.bills.map(b => ({ ...b, freq: 'monthly' })),
    { id: 'r6', name: 'Netflix',           amount: 17.99, currency: 'EUR', date: '2026-05-22', account: 'BNP Courant', icon: '▶', freq: 'monthly' },
    { id: 'r7', name: 'iCloud+ 200GB',     amount: 2.99,  currency: 'EUR', date: '2026-05-23', account: 'BNP Courant', icon: '◇', freq: 'monthly' },
    { id: 'r8', name: 'New York Times',    amount: 17,    currency: 'USD', date: '2026-05-25', account: 'Revolut USD', icon: '◇', freq: 'monthly' },
    { id: 'r9', name: 'GitHub Pro',        amount: 4,     currency: 'USD', date: '2026-05-28', account: 'Revolut USD', icon: '◇', freq: 'monthly' },
    { id: 'r10', name: 'Amazon Prime',     amount: 69.90, currency: 'EUR', date: '2026-12-01', account: 'BNP Courant', icon: '◆', freq: 'yearly' },
    { id: 'r11', name: 'Carte Visa Premier',amount: 130,  currency: 'EUR', date: '2026-09-12', account: 'BNP Courant', icon: '◆', freq: 'yearly' },
  ];

  const annualized = recurring.reduce((s, r) => {
    const fx = r.currency === 'USD' ? 0.92 : 1;
    const mult = r.freq === 'monthly' ? 12 : r.freq === 'weekly' ? 52 : 1;
    return s + r.amount * mult * fx;
  }, 0);

  const groups = {
    monthly: recurring.filter(r => r.freq === 'monthly'),
    yearly: recurring.filter(r => r.freq === 'yearly'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Recurring</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            10 active rules · ≈&nbsp;{blurred ? '••••' : formatMoney(annualized, 'EUR')}/year
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="plus" size={14} /> Add rule
        </button>
      </div>

      {Object.entries(groups).map(([freq, rules]) => (
        <div key={freq}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8,
          }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, textTransform: 'capitalize' }}>{freq}</h2>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{rules.length} rules</span>
          </div>
          <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
            {rules.map((r, i) => {
              const fx = r.currency === 'USD' ? 0.92 : 1;
              const annual = r.amount * (r.freq === 'monthly' ? 12 : r.freq === 'weekly' ? 52 : 1) * fx;
              return (
                <div key={r.id} style={{
                  padding: '12px 16px',
                  display: 'grid', gridTemplateColumns: '32px 1fr 160px 120px 120px',
                  alignItems: 'center', gap: 12,
                  borderBottom: i === rules.length - 1 ? 'none' : '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: 'var(--surface-sunken)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>{r.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.account}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Next {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="tabular" style={{
                    fontSize: 11, color: 'var(--accent)', fontWeight: 600,
                    background: 'var(--accent-tint)', padding: '3px 8px', borderRadius: 999,
                    justifySelf: 'start',
                  }}>≈ {blurred ? '••••' : formatMoney(annual, 'EUR')}/yr</span>
                  <div style={{ textAlign: 'right' }}>
                    <MoneyDisplay amount={-r.amount} currency={r.currency} size="body" colorize blurred={blurred} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Investments

window.FC.InvestmentsScreen = function InvestmentsScreen({ blurred, data, displayFont }) {
  const holdings = [
    { ticker: 'VWCE', name: 'Vanguard FTSE All-World', qty: 142, price: 118.42, basis: 102.10, currency: 'EUR' },
    { ticker: 'CSPX', name: 'iShares S&P 500 (Acc)',   qty: 45,  price: 542.10, basis: 480.00, currency: 'USD' },
    { ticker: 'EUNM', name: 'iShares MSCI EM IMI',     qty: 128, price: 32.85,  basis: 31.40, currency: 'EUR' },
    { ticker: 'BTC',  name: 'Bitcoin (cold)',          qty: 0.18, price: 64200, basis: 38000, currency: 'EUR' },
  ];

  const totalValue = holdings.reduce((s, h) => {
    const fx = h.currency === 'USD' ? 0.92 : 1;
    return s + h.qty * h.price * fx;
  }, 0);
  const totalBasis = holdings.reduce((s, h) => {
    const fx = h.currency === 'USD' ? 0.92 : 1;
    return s + h.qty * h.basis * fx;
  }, 0);
  const pl = totalValue - totalBasis;
  const plPct = pl / totalBasis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Investments</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            4 holdings · Trade Republic
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}>
          <Icon name="trend" size={14} /> Compare with ETF
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Portfolio value · in EUR
          </div>
          <MoneyDisplay amount={totalValue} currency="EUR" size="display" display={displayFont} blurred={blurred} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: 'var(--positive-soft)', color: 'var(--positive)',
              fontSize: 13, fontWeight: 600,
            }}>
              <Icon name="arrow-up" size={12} />
              <span className="tabular">{blurred ? '••••' : formatMoney(pl, 'EUR')}</span>
              <span style={{ opacity: 0.7 }}>· {(plPct * 100).toFixed(1)}%</span>
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>unrealized</span>
          </div>
          <FakeChart blurred={blurred} />
        </div>
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            vs benchmark · VWCE
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Yours</div>
              <MoneyDisplay amount={totalValue} currency="EUR" size="h2" blurred={blurred} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>VWCE-only</div>
              <MoneyDisplay amount={totalValue * 0.96} currency="EUR" size="h2" blurred={blurred} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Δ</div>
              <MoneyDisplay amount={totalValue * 0.04} currency="EUR" size="h2" colorize signed blurred={blurred} />
            </div>
          </div>
          <FakeChart blurred={blurred} compare />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, fontStyle: 'italic' }}>
            Compares only the contributions you actually made — not market timing differences.
          </div>
        </div>
      </div>

      <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '80px 1fr 100px 140px 140px 120px', gap: 12,
          fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          <span>Ticker</span><span>Holding</span><span style={{textAlign:'right'}}>Qty</span>
          <span style={{textAlign:'right'}}>Price</span><span style={{textAlign:'right'}}>Value</span><span style={{textAlign:'right'}}>P/L</span>
        </div>
        {holdings.map((h, i) => {
          const fx = h.currency === 'USD' ? 0.92 : 1;
          const value = h.qty * h.price * fx;
          const pl = h.qty * (h.price - h.basis) * fx;
          return (
            <div key={h.ticker} style={{
              padding: '14px 20px',
              display: 'grid', gridTemplateColumns: '80px 1fr 100px 140px 140px 120px', gap: 12,
              alignItems: 'center', fontSize: 13,
              borderBottom: i === holdings.length - 1 ? 'none' : '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                background: 'var(--accent-tint)', color: 'var(--accent)',
                padding: '3px 7px', borderRadius: 6, justifySelf: 'start',
              }}>{h.ticker}</span>
              <span>{h.name}</span>
              <span className="tabular" style={{textAlign:'right'}}>{h.qty}</span>
              <span className="tabular" style={{textAlign:'right', color: 'var(--text-secondary)'}}>{formatMoney(h.price, h.currency)}</span>
              <span style={{textAlign:'right'}}><MoneyDisplay amount={value} currency="EUR" size="body" blurred={blurred} /></span>
              <span style={{textAlign:'right'}}><MoneyDisplay amount={pl} currency="EUR" size="body" colorize signed blurred={blurred} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function FakeChart({ blurred, compare }) {
  const w = 480, h = 140;
  const a = [], b = [];
  for (let i = 0; i < 60; i++) {
    a.push(50 + Math.sin(i * 0.18) * 30 + i * 0.6);
    b.push(50 + Math.sin(i * 0.25 + 1) * 20 + i * 0.5);
  }
  const min = Math.min(...a, ...b), max = Math.max(...a, ...b);
  const range = max - min;
  const path = (vals) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i/(vals.length-1))*w} ${h - ((v - min)/range)*(h-8) - 4}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ filter: blurred ? 'blur(6px)' : undefined }}>
      <path d={path(a)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      {compare && <path d={path(b)} fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Net Worth

window.FC.NetWorthScreen = function NetWorthScreen({ blurred, data, displayFont }) {
  const liabilities = -1240;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Net worth</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Auto-derived from your accounts</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}>Export PNG</button>
      </div>

      <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <MoneyDisplay amount={data.netWorthBase} currency="EUR" size="display" display={displayFont} blurred={blurred} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'var(--positive-soft)', color: 'var(--positive)',
            fontSize: 14, fontWeight: 600,
          }}>
            <Icon name="arrow-up" size={12} />
            <span className="tabular">{blurred ? '••••' : formatMoney(data.netWorthDelta, 'EUR')}</span>
          </span>
        </div>
        <FakeChart blurred={blurred} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="fc-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Allocation</div>
          <Treemap blurred={blurred} />
        </div>
        <div className="fc-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Liabilities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <LiabRow label="Visa Premier — current cycle" amount={-1240} blurred={blurred} />
            <LiabRow label="Loans" amount={0} blurred={blurred} dim />
          </div>
          <hr className="fc-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Total</span>
            <MoneyDisplay amount={liabilities} currency="EUR" size="h2" colorize blurred={blurred} />
          </div>
        </div>
      </div>
    </div>
  );
};

function LiabRow({ label, amount, blurred, dim }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: dim ? 0.5 : 1 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <MoneyDisplay amount={amount} currency="EUR" size="body" colorize={!dim} blurred={blurred} />
    </div>
  );
}

function Treemap({ blurred }) {
  const cells = [
    { name: 'BNP Courant', value: 4287, color: 'var(--accent)' },
    { name: 'Boursorama Épargne', value: 18520, color: 'var(--accent)' },
    { name: 'Trade Republic', value: 32140, color: 'var(--info)' },
    { name: 'Revolut USD', value: 1140, color: 'var(--accent)', light: true },
    { name: 'Monzo GBP', value: 482, color: 'var(--accent)', light: true },
  ];
  const total = cells.reduce((s, c) => s + c.value, 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, height: 200, filter: blurred ? 'blur(6px)' : undefined }}>
      <div style={{ gridRow: '1 / 3', background: 'var(--info)', color: 'white', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Trade Republic · 55%</div>
        <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>€32,140</div>
      </div>
      <div style={{ background: 'var(--accent)', color: 'var(--accent-fg)', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>Boursorama · 32%</div>
        <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>€18,520</div>
      </div>
      <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: 10, borderRadius: 8, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 4 }}>
        <div style={{ background: 'var(--accent-tint)', borderRadius: 6, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, fontWeight: 600 }}>BNP · 7%</div>
          <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>€4,287</div>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 4 }}>
          <div style={{ background: 'var(--accent-tint)', borderRadius: 4, padding: 4, fontSize: 9, fontWeight: 600 }}>USD 2%</div>
          <div style={{ background: 'var(--accent-tint)', borderRadius: 4, padding: 4, fontSize: 9, fontWeight: 600 }}>GBP 1%</div>
        </div>
      </div>
    </div>
  );
}
