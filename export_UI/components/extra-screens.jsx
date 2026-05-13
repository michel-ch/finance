// Additional screens: Profile picker, Onboarding, Cards, Import, Simulator,
// plus ETF benchmark compare. All exported to window.FC.

const { MoneyDisplay, Sparkline, StatusPill, Icon, Avatar, formatMoney } = window.FC;

// ────────────────────────────────────────────────────────────
// Profile picker — Netflix-style, full bleed.

window.FC.ProfilePickerScreen = function ProfilePickerScreen({ data, onNav }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      margin: '-28px -32px -60px',
      padding: '80px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
      background: 'radial-gradient(ellipse at top, var(--accent-tint), transparent 60%), var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Finch</div>
        <h1 style={{ margin: '8px 0 6px', fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.025em' }}>Who's tracking?</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Pick a profile. Each one has fully isolated accounts and data.</p>
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.profiles.map(p => (
          <button key={p.id} onClick={() => onNav('home')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'transform 160ms var(--ease)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{
              width: 132, height: 132, borderRadius: 22,
              background: p.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 600, letterSpacing: '-0.03em',
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
              position: 'relative',
            }}>
              {p.initials}
              {p.pin && (
                <span style={{
                  position: 'absolute', bottom: 8, right: 8,
                  width: 22, height: 22, borderRadius: 11,
                  background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="lock" size={11} color="#fff" />
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
              <div className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {p.accounts} accounts · {p.tx} tx · {p.baseCurrency}
              </div>
            </div>
          </button>
        ))}
        <button onClick={() => onNav('onboarding')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            background: 'transparent', border: 'none', cursor: 'pointer',
            opacity: 0.6, transition: 'opacity 160ms',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
          <div style={{
            width: 132, height: 132, borderRadius: 22,
            background: 'var(--surface)', border: '2px dashed var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <Icon name="plus" size={42} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>Add profile</div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
        <button className="fc-btn fc-btn-ghost" style={{ height: 36, fontSize: 13 }}>Manage profiles</button>
        <button className="fc-btn fc-btn-ghost" style={{ height: 36, fontSize: 13 }}>Restore from backup</button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Onboarding — base + active currencies.

window.FC.OnboardingScreen = function OnboardingScreen({ onNav }) {
  const allCurrencies = [
    { code: 'EUR', name: 'Euro',                 symbol: '€', region: 'Europe' },
    { code: 'USD', name: 'US Dollar',            symbol: '$', region: 'Americas' },
    { code: 'GBP', name: 'Pound Sterling',       symbol: '£', region: 'Europe' },
    { code: 'CHF', name: 'Swiss Franc',          symbol: 'Fr.', region: 'Europe' },
    { code: 'JPY', name: 'Japanese Yen',         symbol: '¥', region: 'Asia' },
    { code: 'SEK', name: 'Swedish Krona',        symbol: 'kr', region: 'Europe' },
    { code: 'CAD', name: 'Canadian Dollar',      symbol: 'C$', region: 'Americas' },
    { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$', region: 'Oceania' },
    { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$', region: 'Asia' },
  ];
  const [base, setBase] = React.useState('EUR');
  const [active, setActive] = React.useState(new Set(['EUR', 'USD', 'GBP']));
  const toggle = (code) => {
    if (code === base) return;
    const s = new Set(active);
    s.has(code) ? s.delete(code) : s.add(code);
    setActive(s);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 20 }}>
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= 2 ? 'var(--accent)' : 'var(--surface-sunken)',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Step 2 of 4</div>
        <h1 style={{ margin: '6px 0 8px', fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.025em' }}>Set your currencies</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Pick a <b>base currency</b> for totals and net worth, plus the small set of <b>active currencies</b> you actually use.
          You can change the active list later — but the base is hard to change.
        </p>
      </div>

      <div className="fc-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Base currency</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {['EUR', 'USD', 'GBP', 'CHF'].map(c => (
            <button key={c} onClick={() => setBase(c)}
              style={{
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid ' + (base === c ? 'var(--accent)' : 'var(--border)'),
                background: base === c ? 'var(--accent-tint)' : 'var(--surface)',
                color: base === c ? 'var(--accent)' : 'var(--text-primary)',
                textAlign: 'left', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{c}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{allCurrencies.find(x => x.code === c).name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fc-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Active currencies</div>
          <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{active.size} selected</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {allCurrencies.map(c => {
            const isBase = c.code === base;
            const isActive = active.has(c.code) || isBase;
            return (
              <label key={c.code} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, cursor: isBase ? 'default' : 'pointer',
                background: isActive ? 'var(--surface-sunken)' : 'transparent',
                opacity: isBase ? 0.6 : 1,
              }}>
                <input type="checkbox" checked={isActive} disabled={isBase}
                  onChange={() => toggle(c.code)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, width: 38 }}>{c.code}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{c.name}</span>
                {isBase && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--accent)' }}>BASE</span>}
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{c.region}</span>
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-sunken)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <Icon name="info" size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          FX rates from <span style={{ fontFamily: 'var(--font-mono)' }}>frankfurter.app</span> (ECB-based, free). Every cross-currency transaction snapshots the rate at its date so historical net worth stays stable.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="fc-btn fc-btn-ghost" style={{ height: 38 }} onClick={() => onNav('profiles')}>← Back</button>
        <button className="fc-btn fc-btn-primary" style={{ height: 38, padding: '0 18px' }} onClick={() => onNav('home')}>
          Continue → <span style={{ opacity: 0.7, marginLeft: 6 }}>Accounts</span>
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Cards — debit + credit, with credit settlement timeline.

window.FC.CardsScreen = function CardsScreen({ blurred, data }) {
  const credit = data.cards.filter(c => c.kind === 'credit');
  const debit  = data.cards.filter(c => c.kind === 'debit');
  const totalLiab = credit.reduce((s, c) => s + c.cycleSpend, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Cards</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {data.cards.length} cards · {credit.length} credit cycle{credit.length === 1 ? '' : 's'} pending settlement
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="plus" size={14} /> Add card
        </button>
      </div>

      {/* Credit settlement summary */}
      <div className="fc-card" style={{ padding: 24, display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Pending credit liability</div>
          <MoneyDisplay amount={-totalLiab} currency="EUR" size="display" colorize blurred={blurred} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Settles against <b>BNP Courant</b> on the dates below. The forecast already accounts for this.
          </div>
        </div>
        <div style={{ width: 360 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>Upcoming settlements</div>
          {credit.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <CardChip kind={c.network} small />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name} •• {c.last4}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(c.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · cycle ends {new Date(c.statementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
              <MoneyDisplay amount={-c.cycleSpend} currency="EUR" size="body" colorize blurred={blurred} />
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ margin: '4px 0 -8px', fontSize: 16, fontWeight: 600 }}>Credit cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {credit.map(c => <CreditCardTile key={c.id} card={c} blurred={blurred} />)}
      </div>

      <h2 style={{ margin: '4px 0 -8px', fontSize: 16, fontWeight: 600 }}>Debit cards</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {debit.map(c => <DebitCardTile key={c.id} card={c} blurred={blurred} />)}
      </div>
    </div>
  );
};

function CardChip({ kind, small }) {
  const labels = { visa: 'VISA', mastercard: 'MC', amex: 'AMEX' };
  const colors = { visa: '#1a1f71', mastercard: '#eb001b', amex: '#016fd0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: small ? 32 : 44, height: small ? 22 : 28,
      borderRadius: 4, background: colors[kind] || 'var(--surface-sunken)',
      color: '#fff', fontSize: small ? 9 : 11, fontWeight: 700, letterSpacing: '0.04em',
      fontFamily: 'var(--font-mono)',
    }}>{labels[kind]}</span>
  );
}

function CreditCardTile({ card, blurred }) {
  return (
    <div style={{
      borderRadius: 14,
      padding: 20,
      color: '#fff',
      background: 'linear-gradient(135deg, #1f2937, #0b1220)',
      display: 'flex', flexDirection: 'column', gap: 14,
      minHeight: 200, position: 'relative', overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at top right, var(--accent-tint), transparent 60%)',
        opacity: 0.25, pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{card.name}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>{card.accountName}</div>
        </div>
        <CardChip kind={card.network} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '0.18em', opacity: 0.85 }}>•••• •••• •••• {card.last4}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, opacity: 0.55, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Cycle spend</div>
          <div className="tabular" style={{ fontSize: 18, fontWeight: 600, filter: blurred ? 'blur(6px)' : undefined }}>
            {formatMoney(card.cycleSpend, 'EUR')}
          </div>
          <div style={{ fontSize: 10, opacity: 0.6 }}>of {formatMoney(card.limit, 'EUR')} limit</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, opacity: 0.55, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Settles</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
      </div>
      {/* Utilization bar */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 8, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{ width: `${card.utilization * 100}%`, height: '100%', background: card.utilization > 0.7 ? 'var(--negative)' : '#fff', borderRadius: 2 }} />
      </div>
    </div>
  );
}

function DebitCardTile({ card, blurred }) {
  return (
    <div className="fc-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <CardChip kind={card.network} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{card.name} <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>•• {card.last4}</span></div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{card.accountName} · settles instantly</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>This month</div>
        <MoneyDisplay amount={-card.cycleSpend} currency="EUR" size="body" colorize blurred={blurred} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Import staging — review CSV rows before commit.

window.FC.ImportScreen = function ImportScreen({ data, blurred }) {
  const s = data.importStaging;
  const [filter, setFilter] = React.useState('all');
  const filtered = s.rows_preview.filter(r => filter === 'all' ? true : r.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Import review</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{s.file}</span> · {s.bank} · {s.rows} rows
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-ghost" style={{ height: 34 }}>Reject all</button>
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="check" size={14} /> Approve {s.rows - s.duplicates}
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SummaryStat label="Auto-categorized" value={s.autoMatched} accent="var(--positive)" />
        <SummaryStat label="Need review"      value={s.needsCategory} accent="var(--warning)" />
        <SummaryStat label="Duplicates"       value={s.duplicates} accent="var(--negative)" />
        <SummaryStat label="Total rows"       value={s.rows} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--surface-sunken)', borderRadius: 8, alignSelf: 'flex-start' }}>
        {[
          ['all', 'All'],
          ['auto', 'Auto'],
          ['review', 'Review'],
          ['needs', 'Uncategorized'],
          ['duplicate', 'Duplicates'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            height: 28, padding: '0 12px', borderRadius: 6,
            fontSize: 12, fontWeight: 600,
            background: filter === v ? 'var(--surface)' : 'transparent',
            color: filter === v ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: filter === v ? 'var(--shadow-card)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '24px 90px 1fr 110px 200px 100px 80px', gap: 12,
          fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
          background: 'var(--surface-sunken)',
        }}>
          <span></span><span>Date</span><span>Description</span><span style={{ textAlign: 'right' }}>Amount</span><span>Suggested category</span><span>Confidence</span><span></span>
        </div>
        {filtered.map((r, i) => (
          <div key={r.id} style={{
            padding: '10px 16px',
            display: 'grid', gridTemplateColumns: '24px 90px 1fr 110px 200px 100px 80px', gap: 12,
            alignItems: 'center', fontSize: 13,
            borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border)',
            opacity: r.status === 'duplicate' ? 0.55 : 1,
          }}>
            <input type="checkbox" defaultChecked={r.status !== 'duplicate'} style={{ accentColor: 'var(--accent)' }} />
            <span className="tabular" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.date.slice(5)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</span>
            <span style={{ textAlign: 'right' }}>
              <MoneyDisplay amount={r.amount} currency="EUR" size="body" colorize blurred={blurred} />
            </span>
            <span style={{
              fontSize: 12, padding: '3px 8px', borderRadius: 999,
              background: r.status === 'needs' ? 'var(--warning-soft)' : 'var(--accent-tint)',
              color: r.status === 'needs' ? 'var(--warning)' : 'var(--accent)',
              fontWeight: 500, justifySelf: 'start',
            }}>{r.suggested}</span>
            <ConfidenceBar value={r.confidence} />
            <StatusPill status={
              r.status === 'auto' ? 'on-track' :
              r.status === 'review' ? 'slipping' :
              r.status === 'needs' ? 'slipping' :
              'off-track'
            } label={r.status} icon="●" />
          </div>
        ))}
      </div>
    </div>
  );
};

function SummaryStat({ label, value, accent }) {
  return (
    <div className="fc-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
      <div className="tabular" style={{ fontSize: 26, fontWeight: 600, color: accent || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.85 ? 'var(--positive)' : value >= 0.6 ? 'var(--warning)' : 'var(--negative)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--surface-sunken)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span className="tabular" style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// "Can I afford this?" simulator — full screen.

window.FC.SimulatorScreen = function SimulatorScreen({ data, blurred, displayFont }) {
  const [amount, setAmount] = React.useState(1200);
  const [from, setFrom] = React.useState('a1');
  const [date, setDate] = React.useState('2026-05-20');
  const [recurring, setRecurring] = React.useState(false);

  const acc = data.accounts.find(a => a.id === from);
  const projectedLow = acc.balance - amount - 350;
  const safe = projectedLow > 200;
  const goalsImpact = data.goals.slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Can I afford this?</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Simulate a purchase against your forecast and goals.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Form */}
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Amount</label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 24, color: 'var(--text-tertiary)' }}>€</span>
              <input type="number" value={amount} onChange={e => setAmount(+e.target.value || 0)}
                className="tabular"
                style={{
                  fontSize: 38, fontFamily: 'var(--font-display)', fontWeight: 600,
                  border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--text-primary)', width: '100%', letterSpacing: '-0.02em',
                }} />
            </div>
            <input type="range" min="50" max="6000" step="50" value={amount}
              onChange={e => setAmount(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)', marginTop: 8 }} />
          </div>

          <FormRow label="From">
            <select value={from} onChange={e => setFrom(e.target.value)} className="fc-input">
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormRow>

          <FormRow label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="fc-input" />
          </FormRow>

          <FormRow label="Make this recurring">
            <button onClick={() => setRecurring(!recurring)} style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: recurring ? 'var(--accent)' : 'var(--surface-sunken)',
              position: 'relative', transition: 'background 160ms',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: recurring ? 22 : 2,
                width: 20, height: 20, borderRadius: 10, background: '#fff',
                transition: 'left 160ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </FormRow>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {[
              ['Camera', 1200],
              ['Flight', 380],
              ['Apartment deposit', 4500],
              ['Subscription', 49],
            ].map(([l, v]) => (
              <button key={l} onClick={() => setAmount(v)} style={{
                fontSize: 11, padding: '5px 10px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>{l} · €{v}</button>
            ))}
          </div>
        </div>

        {/* Verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fc-card" style={{
            padding: 24,
            background: safe ? 'var(--positive-soft)' : 'var(--negative-soft)',
            borderColor: safe ? 'var(--positive)' : 'var(--negative)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: safe ? 'var(--positive)' : 'var(--negative)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={safe ? 'check' : 'alert'} size={18} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: safe ? 'var(--positive)' : 'var(--negative)', letterSpacing: '-0.01em' }}>
                  {safe ? 'You can afford this.' : 'Not without trade-offs.'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Projected lowest balance over the next 60 days: <b className="tabular">{formatMoney(projectedLow, 'EUR')}</b>
                </div>
              </div>
            </div>
            <div style={{ height: 90, background: 'var(--surface)', borderRadius: 8, padding: 12, position: 'relative', overflow: 'hidden' }}>
              <ForecastMini blurred={blurred} amount={amount} />
            </div>
          </div>

          <div className="fc-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>Impact on goals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {goalsImpact.map(g => {
                const slip = Math.round(amount / g.contribMonthly * 30);
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: 'var(--surface-sunken)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>{g.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{g.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Slips by ~{slip} days · still {new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>+{slip}d</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fc-btn fc-btn-secondary" style={{ height: 36, flex: 1 }}>Save scenario</button>
            <button className="fc-btn fc-btn-primary"   style={{ height: 36, flex: 1 }}>Add as planned tx</button>
          </div>
        </div>
      </div>
    </div>
  );
};

function FormRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 120 }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function ForecastMini({ amount, blurred }) {
  const w = 600, h = 66;
  const pts = [];
  let v = 4287;
  for (let i = 0; i < 60; i++) {
    v += (Math.sin(i * 0.5) * 80) - 30;
    if (i === 14) v -= amount;
    pts.push(v);
  }
  const min = Math.min(...pts), max = Math.max(...pts);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * w} ${h - ((p - min) / (max - min || 1)) * (h - 8) - 4}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ filter: blurred ? 'blur(4px)' : undefined }}>
      <line x1={(14 / 59) * w} y1="0" x2={(14 / 59) * w} y2={h} stroke="var(--negative)" strokeWidth="1" strokeDasharray="2 2" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx={(14 / 59) * w} cy={h - ((pts[14] - min) / (max - min || 1)) * (h - 8) - 4} r="3" fill="var(--negative)" />
    </svg>
  );
}

// add an alert + check + lock + info icon support if missing — atoms.jsx covers core ones
