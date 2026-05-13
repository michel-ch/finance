// Lighter screens for the rest: Accounts, Budgets, Recurring, Investments, Net Worth.
// Each is full-fidelity but we don't repeat the deep complexity of Forecast/Goals.

const { MoneyDisplay, Sparkline, StatusPill, Icon, formatMoney } = window.FC;

// ──────────────────────────────────────────────────────────
// Accounts

window.FC.AccountsScreen = function AccountsScreen({ blurred, data }) {
  const [filter, setFilter] = React.useState('all');
  const baseCurrency = (data.profile && data.profile.baseCurrency) || 'EUR';
  const accounts = data.accounts.filter(a => {
    if (filter === 'archived') return !!a.archived;
    if (filter === 'all') return !a.archived;
    return !a.archived && a.type === filter;
  });
  const visibleNonArchived = data.accounts.filter(a => !a.archived);
  const total = visibleNonArchived.reduce((s, a) => {
    const fx = a.currency === 'USD' ? 0.92 : a.currency === 'GBP' ? 1.17 : 1;
    return s + a.balance * fx;
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Accounts</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {visibleNonArchived.length} account{visibleNonArchived.length === 1 ? '' : 's'} · {blurred ? '••••' : formatMoney(total, baseCurrency)} total in {baseCurrency}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 8 }}>
          {['all', 'checking', 'savings', 'brokerage', 'archived'].map(t => (
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
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}
          onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-account'))}>
          <Icon name="plus" size={14} /> Add account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {accounts.map(acc => {
          const trend = acc.spark && acc.spark.length ? acc.spark[acc.spark.length - 1] - acc.spark[0] : 0;
          const positive = trend >= 0;
          return (
            <div key={acc.id} className="fc-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer' }}
              onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-account', { detail: { id: acc.id } }))}>
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
  const [monthOffset, setMonthOffset] = React.useState(0);
  const now = new Date();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewMonthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const daysRemaining = monthOffset === 0
    ? Math.max(0, daysInMonth - now.getDate())
    : monthOffset > 0 ? daysInMonth : 0;
  const remainingLabel = monthOffset === 0
    ? `${monthLabel} · ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
    : monthOffset > 0 ? `${monthLabel} · upcoming` : `${monthLabel} · closed`;

  // Show budgets tagged for this month, plus untagged legacy budgets (which act as
  // "every month" envelopes). If no budget has a month at all, fall back to showing
  // everything so the screen isn't empty for users who never set the field.
  const anyTagged = data.budgets.some(b => b.month);
  const monthlyBudgets = anyTagged
    ? data.budgets.filter(b => !b.month || b.month === viewMonthStr)
    : data.budgets;

  const totalSpent = monthlyBudgets.reduce((s, b) => s + b.spent, 0);
  const totalBudget = monthlyBudgets.reduce((s, b) => s + b.budget, 0);
  const overall = totalBudget ? totalSpent / totalBudget : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Budgets</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{remainingLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="fc-btn fc-btn-ghost" style={{ width: 32, height: 32, padding: 0 }}
            onClick={() => setMonthOffset(o => o - 1)} aria-label="Previous month">
            <Icon name="chevron" size={14} color="var(--text-tertiary)" style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
          <button className="fc-btn fc-btn-ghost" style={{ width: 32, height: 32, padding: 0 }}
            onClick={() => setMonthOffset(o => o + 1)} aria-label="Next month">
            <Icon name="chevron" size={14} />
          </button>
        </div>
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}
          onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-budget'))}>Edit budgets</button>
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
        {monthlyBudgets.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No budgets set for {monthLabel}. Click <strong>Edit budgets</strong> to add one.
          </div>
        )}
        {monthlyBudgets.map((b, i) => {
          const pct = b.spent / b.budget;
          const over = b.spent > b.budget;
          return (
            <div key={b.id} style={{
              padding: '14px 20px',
              display: 'grid', gridTemplateColumns: '32px 1fr 280px 140px 80px', alignItems: 'center', gap: 16,
              borderBottom: i === monthlyBudgets.length - 1 ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-budget', { detail: { id: b.id } }))}>
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
              <button
                type="button"
                className="fc-btn fc-btn-ghost"
                onClick={e => {
                  e.stopPropagation();
                  if (b.spent === 0) return;
                  if (!confirm('Reset progress for ' + (b.cat || 'this budget') + '? Transactions are kept; the bar restarts at 0.')) return;
                  window.FCStore.update('budgets', b.id, { spent: 0 });
                  window.dispatchEvent(new CustomEvent('fc:budget-saved'));
                }}
                disabled={b.spent === 0}
                title={b.spent === 0 ? 'Already at 0' : 'Reset progress to 0 (transactions kept)'}
                style={{
                  height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.3px', textTransform: 'uppercase',
                  color: b.spent === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  justifySelf: 'end',
                  cursor: b.spent === 0 ? 'not-allowed' : 'pointer',
                }}
              >Reset</button>
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
  const baseCurrency = (data.profile && data.profile.baseCurrency) || 'EUR';
  // Read live recurring rules from the store, falling back to whatever buildLiveData
  // passed in via data.bills (kept for backwards compat with the home-screen "Upcoming bills").
  const stored = (window.FCStore ? window.FCStore.list('recurring') : []) || [];
  const recurring = (stored.length ? stored : data.bills || []).map(r => Object.assign({
    freq: 'monthly',
  }, r));

  if (!recurring.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Recurring</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>0 active rules</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="fc-btn fc-btn-primary" style={{ height: 34 }}
            onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-recurring'))}>
            <Icon name="plus" size={14} /> Add rule
          </button>
        </div>
        <div className="fc-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔁</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>No recurring rules yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 18 }}>
            Add subscriptions and fixed expenses so the forecast can plan around them.
          </div>
        </div>
      </div>
    );
  }

  const annualized = recurring.reduce((s, r) => {
    const mult = r.freq === 'monthly' ? 12 : r.freq === 'weekly' ? 52 : r.freq === 'yearly' ? 1 : 12;
    return s + (r.amount || 0) * mult;
  }, 0);

  const groups = {
    monthly: recurring.filter(r => r.freq === 'monthly'),
    yearly: recurring.filter(r => r.freq === 'yearly'),
    weekly: recurring.filter(r => r.freq === 'weekly'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Recurring</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {recurring.length} active rule{recurring.length === 1 ? '' : 's'} · ≈&nbsp;{blurred ? '••••' : formatMoney(annualized, baseCurrency)}/year
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}
          onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-recurring'))}>
          <Icon name="plus" size={14} /> Add rule
        </button>
      </div>

      {Object.entries(groups).filter(([, rules]) => rules.length > 0).map(([freq, rules]) => (
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
                  cursor: 'pointer',
                }}
                onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-recurring', { detail: { id: r.id } }))}>
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
  // Refresh on save/delete from HoldingFormModal.
  const [, setTick] = React.useState(0);
  React.useEffect(function () {
    function onChg() { setTick(t => t + 1); }
    window.addEventListener('fc:holdings-changed', onChg);
    return function () { window.removeEventListener('fc:holdings-changed', onChg); };
  }, []);
  const stored = (window.FCStore ? window.FCStore.list('holdings') : []) || [];
  const baseCurrency = (data.profile && data.profile.baseCurrency) || 'EUR';

  if (!stored.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Investments</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>0 holdings</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="fc-btn fc-btn-primary" style={{ height: 34 }}
            onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-holding'))}>
            <Icon name="plus" size={14} /> Add holding
          </button>
        </div>
        <div className="fc-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Track your first holding</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 18 }}>Add a ticker, quantity, and cost basis. We'll show value, P/L, and an ETF benchmark comparison.</div>
        </div>
      </div>
    );
  }

  const holdings = stored.map(h => ({
    id: h.id,
    ticker: h.ticker,
    name: h.name || h.ticker,
    qty: h.qty != null ? h.qty : (h.quantity || 0),
    price: h.price != null ? h.price : (h.avgCost || h.basis || 0),
    basis: h.basis != null ? h.basis : (h.avgCost || 0),
    currency: h.currency || baseCurrency,
    _raw: h,
  }));

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
            {holdings.length} holding{holdings.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="fc-btn fc-btn-secondary"
          style={{ height: 34 }}
          onClick={() => exportHoldings(holdings, baseCurrency)}
          title="Download your holdings as CSV"
        >
          <Icon name="upload" size={14} /> Export CSV
        </button>
        <button
          className="fc-btn fc-btn-primary"
          style={{ height: 34 }}
          onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-holding'))}
        >
          <Icon name="plus" size={14} /> Add holding
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Portfolio value · in {baseCurrency}
          </div>
          <MoneyDisplay amount={totalValue} currency={baseCurrency} size="display" display={displayFont} blurred={blurred} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: pl >= 0 ? 'var(--positive-soft)' : 'var(--negative-soft)',
              color: pl >= 0 ? 'var(--positive)' : 'var(--negative)',
              fontSize: 13, fontWeight: 600,
            }}>
              <Icon name={pl >= 0 ? 'arrow-up' : 'arrow-down'} size={12} />
              <span className="tabular">{blurred ? '••••' : formatMoney(Math.abs(pl), baseCurrency)}</span>
              <span style={{ opacity: 0.7 }}>· {totalBasis ? (plPct * 100).toFixed(1) : '0.0'}%</span>
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>unrealized</span>
          </div>
          <FakeChart blurred={blurred} />
        </div>
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            ETF benchmark comparison
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Pick a benchmark ticker to replay your contribution schedule against it.
          </div>
          <button className="fc-btn fc-btn-secondary"
            disabled
            title="ETF benchmark comparison ships with the price provider — see roadmap.md"
            style={{ height: 34, alignSelf: 'flex-start', opacity: 0.6, cursor: 'not-allowed' }}>
            <Icon name="trend" size={14} /> Choose benchmark — coming soon
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, fontStyle: 'italic', marginTop: 'auto' }}>
            Compares only the contributions you actually made — not market timing differences.
          </div>
        </div>
      </div>

      <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '80px 1fr 80px 120px 120px 130px 110px', gap: 12,
          fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          <span>Ticker</span><span>Holding</span><span style={{textAlign:'right'}}>Qty</span>
          <span style={{textAlign:'right'}}>Avg buy</span>
          <span style={{textAlign:'right'}}>Price</span>
          <span style={{textAlign:'right'}}>Value</span><span style={{textAlign:'right'}}>P/L</span>
        </div>
        {holdings.map((h, i) => {
          const fx = h.currency === 'USD' ? 0.92 : 1;
          const value = h.qty * h.price * fx;
          const pl = h.qty * (h.price - h.basis) * fx;
          const priceChangePct = h.basis ? (h.price - h.basis) / h.basis : 0;
          return (
            <div key={h.id || h.ticker} onClick={() => h._raw && window.dispatchEvent(new CustomEvent('fc:edit-holding', { detail: h._raw }))} style={{
              padding: '14px 20px',
              display: 'grid', gridTemplateColumns: '80px 1fr 80px 120px 120px 130px 110px', gap: 12,
              alignItems: 'center', fontSize: 13,
              borderBottom: i === holdings.length - 1 ? 'none' : '1px solid var(--border)',
              cursor: h._raw ? 'pointer' : 'default',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                background: 'var(--accent-tint)', color: 'var(--accent)',
                padding: '3px 7px', borderRadius: 6, justifySelf: 'start',
              }}>{h.ticker}</span>
              <span>{h.name}</span>
              <span className="tabular" style={{textAlign:'right'}}>{h.qty}</span>
              <span className="tabular" style={{textAlign:'right', color: 'var(--text-secondary)'}}>
                {h.basis ? formatMoney(h.basis, h.currency) : '—'}
              </span>
              <span className="tabular" style={{textAlign:'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{formatMoney(h.price, h.currency)}</span>
                {h.basis ? (
                  <span style={{ fontSize: 10, color: priceChangePct >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                    {(priceChangePct >= 0 ? '+' : '') + (priceChangePct * 100).toFixed(1) + '%'}
                  </span>
                ) : null}
              </span>
              <span style={{textAlign:'right'}}><MoneyDisplay amount={value} currency={baseCurrency} size="body" blurred={blurred} /></span>
              <span style={{textAlign:'right'}}><MoneyDisplay amount={pl} currency={baseCurrency} size="body" colorize signed blurred={blurred} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function exportHoldings(holdings, baseCurrency) {
  if (!holdings || !holdings.length) return;
  const headers = ['Ticker', 'Name', 'Quantity', 'Currency', 'Average buy price', 'Current price', 'Cost basis', 'Current value', 'Unrealized P/L', 'P/L %'];
  function csvCell(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  const rows = holdings.map(h => {
    const fx = h.currency === 'USD' ? 0.92 : 1;
    const costBasis = h.qty * h.basis * fx;
    const value = h.qty * h.price * fx;
    const pl = value - costBasis;
    const plPct = costBasis ? (pl / costBasis) * 100 : 0;
    return [
      h.ticker || '',
      h.name || '',
      h.qty,
      h.currency || baseCurrency,
      h.basis,
      h.price,
      costBasis.toFixed(2),
      value.toFixed(2),
      pl.toFixed(2),
      plPct.toFixed(2),
    ].map(csvCell).join(',');
  });
  const csv = [headers.join(',')].concat(rows).join('\n') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'finch-holdings-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

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
  const accounts = data.accounts || [];
  const cards = data.cards || [];
  const baseCurrency = (data.profile && data.profile.baseCurrency) || 'EUR';

  // Liabilities: credit-card cycle balances. Loans not yet modeled.
  const cycleSpend = cards
    .filter(c => c.kind === 'credit')
    .reduce((s, c) => s + (c.cycleSpend || 0), 0);
  const liabilities = -cycleSpend;

  if (!accounts.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Net worth</h1>
        <div className="fc-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Add an account to see your net worth</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 18 }}>Net worth is auto-derived from account balances and holdings.</div>
          <a href="accounts.html" className="fc-btn fc-btn-primary" style={{ textDecoration: 'none' }}>
            <Icon name="plus" size={14} /> Add account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Net worth</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Auto-derived from your accounts</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}
          onClick={() => exportNetWorthPng()}>Export PNG</button>
      </div>

      <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <MoneyDisplay amount={data.netWorthBase} currency={baseCurrency} size="display" display={displayFont} blurred={blurred} />
          {data.netWorthDelta !== 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: data.netWorthDelta > 0 ? 'var(--positive-soft)' : 'var(--negative-soft)',
              color: data.netWorthDelta > 0 ? 'var(--positive)' : 'var(--negative)',
              fontSize: 14, fontWeight: 600,
            }}>
              <Icon name={data.netWorthDelta > 0 ? 'arrow-up' : 'arrow-down'} size={12} />
              <span className="tabular">{blurred ? '••••' : formatMoney(Math.abs(data.netWorthDelta), baseCurrency)}</span>
            </span>
          )}
        </div>
        <FakeChart blurred={blurred} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="fc-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Allocation</div>
          <Treemap accounts={accounts} baseCurrency={baseCurrency} blurred={blurred} />
        </div>
        <div className="fc-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Liabilities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.filter(c => c.kind === 'credit' && c.cycleSpend > 0).map(c => (
              <LiabRow key={c.id} label={(c.name || 'Credit card') + ' — current cycle'} amount={-(c.cycleSpend || 0)} currency={baseCurrency} blurred={blurred} />
            ))}
            {!cards.some(c => c.kind === 'credit' && c.cycleSpend > 0) && (
              <LiabRow label="No active credit-card balance" amount={0} currency={baseCurrency} blurred={blurred} dim />
            )}
            <LiabRow label="Loans" amount={0} currency={baseCurrency} blurred={blurred} dim />
          </div>
          <hr className="fc-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Total</span>
            <MoneyDisplay amount={liabilities} currency={baseCurrency} size="h2" colorize blurred={blurred} />
          </div>
        </div>
      </div>
    </div>
  );
};

function exportNetWorthPng() {
  const svg = document.querySelector('main svg');
  if (!svg) return;
  // Resolve var(--…) colors from computed style on the SVG so the rasterized
  // PNG carries the actual theme colors instead of the literal "var(--accent)".
  const cloned = svg.cloneNode(true);
  const cs = getComputedStyle(svg);
  cloned.querySelectorAll('*').forEach(el => {
    ['fill', 'stroke'].forEach(attr => {
      const v = el.getAttribute(attr);
      if (v && /^var\(/.test(v)) {
        const name = v.replace(/^var\(|\)$/g, '').trim();
        const resolved = cs.getPropertyValue(name) || cs.getPropertyValue(name.split(',')[0].trim());
        if (resolved) el.setAttribute(attr, resolved.trim());
      }
    });
  });
  const rect = svg.getBoundingClientRect();
  const w = Math.max(640, Math.ceil(rect.width));
  const h = Math.max(240, Math.ceil(rect.height));
  cloned.setAttribute('width', w);
  cloned.setAttribute('height', h);
  const xml = new XMLSerializer().serializeToString(cloned);
  const svgBlob = new Blob(['<?xml version="1.0"?>\n', xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;            // 2x for retina
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'finch-networth-' + new Date().toISOString().slice(0, 10) + '.png';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }, 'image/png');
  };
  img.onerror = function () { URL.revokeObjectURL(url); };
  img.src = url;
}

function LiabRow({ label, amount, currency, blurred, dim }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: dim ? 0.5 : 1 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <MoneyDisplay amount={amount} currency={currency || 'EUR'} size="body" colorize={!dim} blurred={blurred} />
    </div>
  );
}

function Treemap({ accounts, baseCurrency, blurred }) {
  // Sort by balance desc, take top 5; group the rest as "Other".
  const palette = ['var(--info)', 'var(--accent)', 'var(--positive)', 'var(--warning)', 'var(--negative)'];
  const sorted = (accounts || []).slice().sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const top = sorted.slice(0, 5);
  const total = sorted.reduce((s, a) => s + (a.balance || 0), 0) || 1;
  if (!top.length) {
    return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No accounts</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, filter: blurred ? 'blur(6px)' : undefined }}>
      {top.map((a, i) => {
        const pct = ((a.balance || 0) / total) * 100;
        return (
          <div key={a.id} style={{
            background: palette[i % palette.length], color: '#fff',
            padding: '10px 12px', borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            minHeight: 28 + Math.min(40, pct * 0.6),
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{a.name} · {pct.toFixed(0)}%</div>
            <div className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>{window.FC.formatMoney(a.balance || 0, a.currency || baseCurrency)}</div>
          </div>
        );
      })}
    </div>
  );
}
