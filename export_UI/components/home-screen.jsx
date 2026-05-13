// Home / Dashboard — desktop.
// Hero net worth, account row, forecast peek, goals strip, upcoming bills, recent transactions.

const { MoneyDisplay, Sparkline, StatusPill, ProgressRing, Icon, Avatar, formatMoney } = window.FC;

window.FC.HomeScreen = function HomeScreen({ blurred, density, displayFont, data, onNav }) {
  const compact = density === 'compact';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 20 : 28 }}>
      {/* Page heading */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 6 }}>
        <h1 style={{
          margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600,
          letterSpacing: '-0.02em',
        }}>
          Bonjour, Margaux
        </h1>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)', paddingBottom: 6 }}>
          Wednesday, May 6 · {data.today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Hero + Forecast peek side by side */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20,
      }}>
        <HeroBlock data={data} blurred={blurred} displayFont={displayFont} />
        <ForecastPeekCard data={data} blurred={blurred} onNav={onNav} />
      </div>

      {/* Accounts row */}
      <Section
        title="Accounts"
        subtitle={`${data.accounts.length} accounts · ${data.profile.activeCurrencies.length} currencies`}
        action={<button className="fc-btn fc-btn-ghost" onClick={() => onNav('accounts')} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>View all <Icon name="chevron" size={14}/></button>}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        }}>
          {data.accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} blurred={blurred} />
          ))}
        </div>
      </Section>

      {/* Two-col: Goals + Bills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <Section
          title="Goals"
          subtitle="3 active · 1 needs attention"
          action={<button className="fc-btn fc-btn-ghost" onClick={() => onNav('goals')} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>View all <Icon name="chevron" size={14}/></button>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {data.goals.slice(0, 3).map(g => <GoalMiniCard key={g.id} goal={g} blurred={blurred} />)}
          </div>
        </Section>

        <Section
          title="Upcoming"
          subtitle="Next 5 bills"
          action={<button className="fc-btn fc-btn-ghost" onClick={() => onNav('recurring')} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>View all <Icon name="chevron" size={14}/></button>}
        >
          <div className="fc-card" style={{ padding: 4 }}>
            {data.bills.map((bill, i) => (
              <BillRow key={bill.id} bill={bill} blurred={blurred} last={i === data.bills.length - 1} />
            ))}
          </div>
        </Section>
      </div>

      {/* Recent transactions */}
      <Section
        title="Recent activity"
        subtitle="Last 7 days"
        action={<button className="fc-btn fc-btn-ghost" onClick={() => onNav('transactions')} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>View all <Icon name="chevron" size={14}/></button>}
      >
        <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
          {data.transactions.slice(0, 6).map((tx, i, arr) => (
            <TxRowCompact key={tx.id} tx={tx} blurred={blurred} last={i === arr.length - 1} />
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── Section header ──────────────────────────
function Section({ title, subtitle, action, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 600, letterSpacing: '-0.005em' }}>{title}</h2>
        {subtitle && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{subtitle}</span>}
        <span style={{ flex: 1 }} />
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Hero block ──────────────────────────────
function HeroBlock({ data, blurred, displayFont }) {
  const positive = data.netWorthDelta > 0;
  return (
    <div className="fc-card" style={{
      padding: 28,
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface) 60%, var(--accent-tint) 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase',
        }}>Net worth · in EUR</div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>5 accounts</span>
      </div>

      <MoneyDisplay
        amount={data.netWorthBase}
        currency="EUR"
        size="display"
        display={displayFont}
        blurred={blurred}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 6,
          background: positive ? 'var(--positive-soft)' : 'var(--negative-soft)',
          color: positive ? 'var(--positive)' : 'var(--negative)',
          fontSize: 13, fontWeight: 600,
        }}>
          <Icon name={positive ? 'arrow-up' : 'arrow-down'} size={12} />
          <span className="tabular">{blurred ? '••••' : formatMoney(Math.abs(data.netWorthDelta), 'EUR', { signed: false })}</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>vs last month</span>
        <span style={{ flex: 1 }} />
      </div>

      {/* Spark with axis */}
      <div style={{ marginTop: 4 }}>
        <Sparkline values={data.netWorthSpark} width={460} height={56} blurred={blurred} color="var(--accent)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span>Feb 6</span><span>Mar 6</span><span>Apr 6</span><span>May 6</span>
        </div>
      </div>
    </div>
  );
}

// ── Forecast peek card ──────────────────────
function ForecastPeekCard({ data, blurred, onNav }) {
  // lowest projected balance
  const all = data.forecast.projection;
  const low = all.reduce((min, p) => p.v < min.v ? p : min, all[0]);
  const lowDate = new Date(data.today);
  lowDate.setDate(lowDate.getDate() + low.d);
  const status = low.v < 0 ? 'off-track' : low.v < 1500 ? 'slipping' : 'on-track';
  const statusColor = status === 'off-track' ? 'var(--negative)' : status === 'slipping' ? 'var(--warning)' : 'var(--positive)';

  return (
    <button
      className="fc-card"
      onClick={() => onNav('forecast')}
      style={{
        padding: 24, textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'transform 150ms var(--ease), box-shadow 150ms var(--ease)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-raised)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase',
        }}>30-day forecast · lowest point</div>
      </div>

      <div>
        <MoneyDisplay amount={low.v} currency="EUR" size="h1" blurred={blurred} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          On <strong style={{ color: 'var(--text-primary)' }}>{lowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>, after rent + Adobe renewal
        </div>
      </div>

      {/* Mini forecast curve */}
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <MiniForecast data={data} blurred={blurred} statusColor={statusColor} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>5 events queued</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
          Open Forecast <Icon name="chevron" size={14} />
        </span>
      </div>
    </button>
  );
}

function MiniForecast({ data, blurred, statusColor }) {
  const w = 360, h = 64;
  const all = [...data.forecast.history.slice(-20), ...data.forecast.projection.slice(0, 30)];
  const split = 20;
  const min = Math.min(...all.map(p => p.v));
  const max = Math.max(...all.map(p => p.v));
  const range = max - min || 1;
  const xStep = w / (all.length - 1);
  const ys = all.map(p => h - ((p.v - min) / range) * (h - 8) - 4);
  const pastPath = ys.slice(0, split).map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * xStep).toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const futPath = ys.slice(split - 1).map((y, i) => `${i === 0 ? 'M' : 'L'}${((split - 1 + i) * xStep).toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ filter: blurred ? 'blur(4px)' : undefined, display: 'block' }}>
      <line x1={(split - 1) * xStep} x2={(split - 1) * xStep} y1="0" y2={h} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" />
      <path d={pastPath} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" />
      <path d={futPath}  fill="none" stroke={statusColor} strokeOpacity="0.85" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="3 3" />
      <circle cx={(split - 1) * xStep} cy={ys[split - 1]} r="2.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

// ── Account card ────────────────────────────
function AccountCard({ account, blurred }) {
  const typeIcons = { checking: 'wallet', savings: 'coins', brokerage: 'chart' };
  return (
    <div className="fc-card" style={{
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 150ms var(--ease), transform 150ms var(--ease)',
      cursor: 'pointer', minWidth: 0,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'var(--surface-sunken)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          <Icon name={typeIcons[account.type] || 'wallet'} size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 600 }}>
            {account.type}
          </div>
        </div>
      </div>
      <MoneyDisplay amount={account.balance} currency={account.currency} size="h2" blurred={blurred} />
      <Sparkline values={account.spark} width={180} height={20} blurred={blurred} />
    </div>
  );
}

// ── Goal mini card ──────────────────────────
function GoalMiniCard({ goal, blurred }) {
  const progress = goal.current / goal.target;
  const deadline = new Date(goal.deadline);
  return (
    <div className="fc-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ProgressRing value={progress} size={48} stroke={5} status={goal.status} showPercent={false} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14 }}>{goal.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {goal.title}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            by {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <MoneyDisplay amount={goal.current} currency="EUR" size="body" blurred={blurred} />
          <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {' / '}{formatMoney(goal.target, 'EUR')}
          </span>
        </div>
        <StatusPill status={goal.status} />
      </div>
    </div>
  );
}

// ── Bill row ────────────────────────────────
function BillRow({ bill, blurred, last }) {
  const date = new Date(bill.date);
  const today = new Date('2026-05-06');
  const days = Math.round((date - today) / 86400000);
  return (
    <div style={{
      padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>{bill.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bill.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          in {days}d · {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <MoneyDisplay amount={-bill.amount} currency={bill.currency} size="small" blurred={blurred} />
    </div>
  );
}

// ── Compact transaction row ─────────────────
function TxRowCompact({ tx, blurred, last }) {
  const isTransfer = tx.transfer;
  return (
    <div style={{
      padding: '10px 14px',
      display: 'grid', gridTemplateColumns: '32px 1fr auto auto', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--border)',
      opacity: tx.pending ? 0.7 : 1,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>{tx.cat_icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.merchant}
          </span>
          {tx.pending && <StatusPill status="pending" label="Pending" />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {tx.category} · {tx.account}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
      <MoneyDisplay
        amount={tx.amount}
        currency={tx.currency}
        size="small"
        colorize={!isTransfer}
        signed
        blurred={blurred}
      />
    </div>
  );
}
