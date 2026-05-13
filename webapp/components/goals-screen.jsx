// Goals screen — list with progress rings + status pills, and a detail view.

const { MoneyDisplay, StatusPill, ProgressRing, Icon, formatMoney } = window.FC;

window.FC.GoalsScreen = function GoalsScreen({ blurred, data, displayFont }) {
  const goals = data.goals || [];
  const firstSlipping = goals.find(g => g.status === 'slipping') || goals[0];
  const [activeId, setActiveId] = React.useState(firstSlipping ? firstSlipping.id : null);

  if (!goals.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Goals</h1>
        <div className="fc-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Set your first savings goal</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 18 }}>The app will tell you if you're on pace.</div>
          <button className="fc-btn fc-btn-primary"
            onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-goal'))}>
            <Icon name="plus" size={14} /> New goal
          </button>
        </div>
      </div>
    );
  }

  const active = goals.find(g => g.id === activeId) || goals[0];
  const progress = active.current / active.target;
  const monthsToTarget = (active.target - active.current) / (active.contribMonthly || 1);
  const projectedDate = new Date(data.today || Date.now());
  projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsToTarget));
  const deadlineDate = new Date(active.deadline);
  const slipMonths = Math.round((projectedDate - deadlineDate) / (1000 * 60 * 60 * 24 * 30));

  const totalCommitted = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

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
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}
          onClick={() => window.dispatchEvent(new CustomEvent('fc:edit-goal'))}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusPill status={g.status} />
                <span role="button" title="Edit goal"
                  onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('fc:edit-goal', { detail: { id: g.id } })); }}
                  style={{
                    width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-tertiary)', cursor: 'pointer',
                  }}>
                  <Icon name="settings" size={12} />
                </span>
              </div>
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

          {/* Pressure-test suggestions — derived from this goal's numbers */}
          {slipMonths > 0 && (() => {
            const ccy = active.currency || 'EUR';
            const remaining = Math.max(0, active.target - active.current);
            const monthsLeft = Math.max(1, Math.round((deadlineDate - new Date()) / (1000 * 60 * 60 * 24 * 30)));
            const requiredMonthly = Math.ceil(remaining / monthsLeft);
            const extraMonthly = Math.max(0, requiredMonthly - (active.contribMonthly || 0));
            return (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Concrete actions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Suggestion
                    label={`Add ${formatMoney(extraMonthly, ccy)}/month`}
                    detail={`Lift to ${formatMoney(requiredMonthly, ccy)}/mo to hit your deadline.`}
                    icon="↗"
                    onClick={() => {
                      if (!confirm(`Set monthly contribution to ${formatMoney(requiredMonthly, ccy)}?`)) return;
                      window.FCStore.update('goals', active.id, { contribMonthly: requiredMonthly });
                      window.dispatchEvent(new CustomEvent('fc:goal-saved'));
                    }}
                  />
                  <Suggestion
                    label={`Push deadline by ${slipMonths} ${slipMonths === 1 ? 'month' : 'months'}`}
                    detail={`Stay at ${formatMoney(active.contribMonthly || 0, ccy)}/mo, slip target.`}
                    icon="📅"
                    onClick={() => {
                      const newDate = new Date(deadlineDate);
                      newDate.setMonth(newDate.getMonth() + slipMonths);
                      const iso = newDate.toISOString().slice(0, 10);
                      const pretty = newDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      if (!confirm(`Push deadline to ${pretty}?`)) return;
                      window.FCStore.update('goals', active.id, { deadline: iso });
                      window.dispatchEvent(new CustomEvent('fc:goal-saved'));
                    }}
                  />
                  <Suggestion
                    label="One-time top-up"
                    detail={`${formatMoney(remaining, ccy)} lump closes the gap.`}
                    icon="◆"
                    onClick={() => {
                      const raw = prompt(`Top-up amount (${ccy}):`, String(remaining));
                      if (!raw) return;
                      const n = parseFloat(raw);
                      if (isNaN(n) || n <= 0) { alert('Enter a positive number.'); return; }
                      window.FCStore.update('goals', active.id, { current: (active.current || 0) + n });
                      window.dispatchEvent(new CustomEvent('fc:goal-saved'));
                    }}
                  />
                  <Suggestion
                    label="Redirect spending"
                    detail={`Trim variable categories by ${formatMoney(extraMonthly, ccy)}/mo.`}
                    icon="✂"
                    onClick={() => { location.href = 'budgets.html'; }}
                  />
                </div>
              </div>
            );
          })()}

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

function Suggestion({ label, detail, icon, onClick }) {
  return (
    <button
      className="fc-card-flat"
      onClick={onClick}
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
