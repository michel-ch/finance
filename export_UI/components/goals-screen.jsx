// Goals screen — list with progress rings + status pills, and a detail view.

const { MoneyDisplay, StatusPill, ProgressRing, Icon, formatMoney } = window.FC;

window.FC.GoalsScreen = function GoalsScreen({ blurred, data, displayFont }) {
  const [activeId, setActiveId] = React.useState(data.goals[1].id); // open the slipping one

  const active = data.goals.find(g => g.id === activeId);
  const progress = active.current / active.target;
  const monthsToTarget = (active.target - active.current) / active.contribMonthly;
  const projectedDate = new Date(data.today);
  projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsToTarget));
  const deadlineDate = new Date(active.deadline);
  const slipMonths = Math.round((projectedDate - deadlineDate) / (1000 * 60 * 60 * 24 * 30));

  const totalCommitted = data.goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = data.goals.reduce((s, g) => s + g.target, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Goals</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {data.goals.length} active · {blurred ? '••••' : formatMoney(totalCommitted, 'EUR')} of {blurred ? '••••' : formatMoney(totalTarget, 'EUR')} committed
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="plus" size={14} /> New goal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {data.goals.map(g => (
          <button
            key={g.id}
            onClick={() => setActiveId(g.id)}
            className="fc-card"
            style={{
              padding: 16, textAlign: 'left',
              border: g.id === activeId ? `1.5px solid var(--accent)` : '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'transform 150ms var(--ease), border-color 150ms var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 22 }}>{g.icon}</div>
              <StatusPill status={g.status} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>{g.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                by {new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div>
              <div style={{
                height: 6, borderRadius: 3, background: 'var(--surface-sunken)', overflow: 'hidden', marginBottom: 6,
              }}>
                <div style={{
                  width: `${Math.min(100, (g.current / g.target) * 100)}%`,
                  height: '100%',
                  background: g.status === 'off-track' ? 'var(--negative)' : g.status === 'slipping' ? 'var(--warning)' : 'var(--accent)',
                  transition: 'width 600ms var(--ease)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <MoneyDisplay amount={g.current} currency="EUR" size="body" blurred={blurred} />
                <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  / {blurred ? '••••' : formatMoney(g.target, 'EUR')}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="fc-card" style={{ padding: 28, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <ProgressRing
            value={progress}
            size={180}
            stroke={14}
            status={active.status}
            label={`${Math.round(progress * 100)}%`}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{active.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em' }}>{active.title}</div>
          </div>
          <StatusPill status={active.status} />
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <KV label="Saved" value={<MoneyDisplay amount={active.current} currency="EUR" size="body" blurred={blurred} />} />
            <KV label="Target" value={<MoneyDisplay amount={active.target} currency="EUR" size="body" blurred={blurred} />} />
            <KV label="Per month" value={<MoneyDisplay amount={active.contribMonthly} currency="EUR" size="body" blurred={blurred} />} />
            <KV label="Deadline" value={
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            } />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status explanation */}
          <div style={{
            padding: 16, borderRadius: 12,
            background: active.status === 'off-track' ? 'var(--negative-soft)' : active.status === 'slipping' ? 'var(--warning-soft)' : 'var(--positive-soft)',
            color: active.status === 'off-track' ? 'var(--negative)' : active.status === 'slipping' ? 'var(--warning)' : 'var(--positive)',
            fontSize: 14, lineHeight: 1.55,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>
              Pace analysis
            </div>
            {active.status === 'on-track' ? (
              <>
                At your current pace of <strong>€{active.contribMonthly}/month</strong>, you'll reach this goal on{' '}
                <strong>{projectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                {' '} — comfortably before your deadline.
              </>
            ) : (
              <>
                At your current pace of <strong>€{active.contribMonthly}/month</strong>, you'll reach this goal on{' '}
                <strong>{projectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                {slipMonths > 0 && <> — <strong>{slipMonths} {slipMonths === 1 ? 'month' : 'months'} past</strong> your {deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} deadline.</>}
              </>
            )}
          </div>

          {/* Pressure-test suggestions */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              Concrete actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Suggestion
                label="Redirect from Dining"
                detail="€120/month will get you back on track"
                icon="🍽"
              />
              <Suggestion
                label="Push deadline by 4 months"
                detail="Stay at €600/mo, target Jul 2027"
                icon="📅"
              />
              <Suggestion
                label="Skip 2 next subscriptions"
                detail="Saves €76 this cycle"
                icon="▶"
              />
              <Suggestion
                label="One-time top-up"
                detail="€2,400 lump from savings"
                icon="◆"
              />
            </div>
          </div>

          {/* Contribution history mini chart */}
          <ContribHistory blurred={blurred} />
        </div>
      </div>
    </div>
  );
};

function KV({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Suggestion({ label, detail, icon }) {
  return (
    <button
      className="fc-card-flat"
      style={{
        padding: 12, textAlign: 'left',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: 'pointer',
        transition: 'border-color 150ms var(--ease), background 150ms var(--ease)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-tint)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flex: 'none',
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail}</div>
      </div>
      <Icon name="chevron" size={14} color="var(--text-tertiary)" />
    </button>
  );
}

function ContribHistory({ blurred }) {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const vals = [180, 250, 250, 250, 250, 250, 200];
  const max = Math.max(...vals);
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
        Contributions, last 7 months
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, filter: blurred ? 'blur(4px)' : undefined }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${(v / max) * 100}%`,
                background: i === vals.length - 1 ? 'var(--accent)' : 'var(--accent-tint)',
                border: i === vals.length - 1 ? 'none' : `1px solid var(--accent)`,
                borderRadius: 4,
                transition: 'height 600ms var(--ease)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{months[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
