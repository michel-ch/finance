// Forecast screen — the signature visualization.
// Aggregate balance line: solid past, dashed future, variance band, event markers,
// red zone shading, goal overlays, and a "Simulate purchase" what-if input.

const { MoneyDisplay, StatusPill, Icon, formatMoney } = window.FC;

window.FC.ForecastScreen = function ForecastScreen({ blurred, data, displayFont }) {
  const [horizon, setHorizon] = React.useState(60);
  const [activeAccounts, setActiveAccounts] = React.useState(
    Object.fromEntries((data.accounts || []).map(a => [a.id, true]))
  );
  const [sim, setSim] = React.useState({ enabled: false, amount: 450, day: 14, currency: 'EUR' });

  const horizons = [30, 60, 90, 180, 365];

  const fHistory = (data.forecast && data.forecast.history) || [];
  const fProjection = (data.forecast && data.forecast.projection) || [];
  const fEvents = (data.forecast && data.forecast.events) || [];

  if (!data.accounts.length || !fProjection.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Forecast</h1>
        <div className="fc-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Not enough data to forecast yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 18 }}>
            {!data.accounts.length
              ? 'Add an account first.'
              : 'Add at least one recurring expense to unlock the projection.'}
          </div>
          <div style={{ display: 'inline-flex', gap: 10 }}>
            <a href="accounts.html" className="fc-btn fc-btn-secondary" style={{ textDecoration: 'none' }}>Accounts</a>
            <a href="recurring.html" className="fc-btn fc-btn-primary" style={{ textDecoration: 'none' }}>Add recurring</a>
          </div>
        </div>
      </div>
    );
  }

  // build forecast points filtered by horizon and by accounts (mock: just scale)
  const accountFactor = data.accounts.length
    ? Object.values(activeAccounts).filter(Boolean).length / data.accounts.length
    : 0;
  const history = fHistory.map(p => ({ ...p, v: p.v * accountFactor }));
  const projection = fProjection
    .filter(p => p.d <= horizon)
    .map(p => ({ ...p, v: p.v * accountFactor }));

  // apply simulation
  const simProjection = sim.enabled
    ? projection.map(p => ({ ...p, v: p.d >= sim.day ? p.v - sim.amount : p.v }))
    : null;

  const lowest = projection.reduce((min, p) => p.v < min.v ? p : min, projection[0]);
  const lowestSim = simProjection ? simProjection.reduce((m, p) => p.v < m.v ? p : m, simProjection[0]) : null;
  const lowestDate = new Date(data.today); lowestDate.setDate(lowestDate.getDate() + lowest.d);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title + controls */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Forecast
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Layer&nbsp;1 deterministic · Layer&nbsp;2 behavioral variance band
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 8 }}>
          {horizons.map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                background: horizon === h ? 'var(--surface)' : 'transparent',
                color: horizon === h ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: horizon === h ? 'var(--shadow-card)' : 'none',
              }}
            >
              {h}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatTile label="Today's liquid" value={projection[0]?.v} blurred={blurred} display={displayFont} />
        <StatTile label="Projected end" value={projection[projection.length - 1]?.v} blurred={blurred} sub={`in ${horizon}d`} />
        <StatTile label="Lowest point" value={lowest.v} blurred={blurred}
          status={lowest.v < 0 ? 'off-track' : lowest.v < 1500 ? 'slipping' : 'on-track'}
          sub={lowestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <StatTile label="Net flow" value={projection[projection.length - 1]?.v - projection[0]?.v} blurred={blurred} signed colorize sub="across horizon" />
      </div>

      {/* Chart + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="fc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ChartLegend />
          <ForecastChart
            history={history}
            projection={projection}
            simProjection={simProjection}
            sim={sim}
            blurred={blurred}
            today={data.today}
            horizon={horizon}
          />
          {/* Simulator */}
          <SimulatorBar sim={sim} setSim={setSim} lowest={lowest} lowestSim={lowestSim} blurred={blurred} />
        </div>

        {/* Right rail: per-account toggles + event list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fc-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 10 }}>
              Include accounts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setActiveAccounts(s => ({ ...s, [acc.id]: !s[acc.id] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 8px', borderRadius: 6,
                    background: 'transparent', textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4,
                    background: activeAccounts[acc.id] ? 'var(--accent)' : 'var(--surface-sunken)',
                    border: `1px solid ${activeAccounts[acc.id] ? 'var(--accent)' : 'var(--border-strong)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-fg)', fontSize: 11,
                  }}>{activeAccounts[acc.id] ? '✓' : ''}</span>
                  <span style={{ fontSize: 13, flex: 1, color: activeAccounts[acc.id] ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {acc.name}
                  </span>
                  <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{acc.currency}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fc-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{
              padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Upcoming events
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{data.forecast.events.filter(e => e.d <= horizon).length} in horizon</span>
            </div>
            <div className="fc-scroll" style={{ overflow: 'auto', maxHeight: 320 }}>
              {data.forecast.events.filter(e => e.d <= horizon).map((ev, i) => {
                const dt = new Date(data.today); dt.setDate(dt.getDate() + ev.d);
                const positive = ev.amount > 0;
                return (
                  <div key={i} style={{
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: 3,
                      background: positive ? 'var(--positive)' : 'var(--accent)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{ev.label}</div>
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
        </div>
      </div>
    </div>
  );
};

function StatTile({ label, value = 0, sub, blurred, signed, colorize, status, display }) {
  return (
    <div className="fc-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          {label}
        </div>
        {status && <StatusPill status={status} />}
      </div>
      <MoneyDisplay amount={value} currency="EUR" size="h1" colorize={colorize} signed={signed} blurred={blurred} display={display} />
      {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  );
}

function ChartLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <Legend swatch={<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--accent)" strokeWidth="1.75"/></svg>} label="History" />
      <Legend swatch={<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="3 3"/></svg>} label="Layer 1 projection" />
      <Legend swatch={<div style={{ width: 20, height: 8, background: 'var(--forecast-band)', borderRadius: 1 }} />} label="Layer 2 variance" />
      <Legend swatch={<div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--text-secondary)' }} />} label="Event" />
      <Legend swatch={<div style={{ width: 20, height: 8, background: 'var(--negative-soft)', borderRadius: 1 }} />} label="Below zero" />
    </div>
  );
}
function Legend({ swatch, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {swatch}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// Main forecast chart

function ForecastChart({ history, projection, simProjection, sim, blurred, today, horizon }) {
  const w = 800, h = 320;
  const padL = 56, padR = 16, padT = 16, padB = 32;
  const innerW = w - padL - padR, innerH = h - padT - padB;

  const all = [...history, ...projection];
  // band: ±15% of projection from history's last value
  const histLast = history[history.length - 1].v;
  const band = projection.map(p => {
    const drift = p.d / horizon;
    const spread = histLast * 0.04 * Math.sqrt(p.d);
    return { d: p.d, low: p.v - spread, high: p.v + spread };
  });
  const allYs = [...all.map(p => p.v), ...band.map(b => b.low), ...band.map(b => b.high), 0];
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const yRange = maxY - minY || 1;
  const padFrac = 0.08;
  const yMin = minY - yRange * padFrac;
  const yMax = maxY + yRange * padFrac;
  const yR = yMax - yMin;

  const xMin = -history.length + 1;
  const xMax = horizon;
  const xR = xMax - xMin;

  const X = d => padL + ((d - xMin) / xR) * innerW;
  const Y = v => padT + (1 - (v - yMin) / yR) * innerH;
  const Xidx = (i, total) => padL + (i / (total - 1)) * innerW;

  // build paths
  const histPath = history.map((p, i) => {
    const x = X(p.d), y = Y(p.v);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const projPath = projection.map((p, i) => {
    const x = X(p.d), y = Y(p.v);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // history area
  const histArea = histPath + ` L${X(history[history.length-1].d).toFixed(1)} ${Y(yMin).toFixed(1)} L${X(history[0].d).toFixed(1)} ${Y(yMin).toFixed(1)} Z`;

  // band area
  const bandArea = (() => {
    const top = band.map((b, i) => `${i === 0 ? 'M' : 'L'}${X(b.d).toFixed(1)} ${Y(b.high).toFixed(1)}`).join(' ');
    const bot = [...band].reverse().map((b, i) => `L${X(b.d).toFixed(1)} ${Y(b.low).toFixed(1)}`).join(' ');
    return `${top} ${bot} Z`;
  })();

  // simulated path
  const simPath = simProjection
    ? simProjection.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.d).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ')
    : null;

  // y ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (yR * i) / yTickCount);
  // x ticks
  const xTickStep = horizon <= 30 ? 7 : horizon <= 90 ? 14 : horizon <= 180 ? 30 : 60;
  const xTicks = [];
  for (let d = -Math.floor(history.length / xTickStep) * xTickStep; d <= horizon; d += xTickStep) xTicks.push(d);

  // events within projection
  const eventsInWindow = projection.filter(p => p.event);

  // zero zone
  const showZeroZone = yMin < 0;

  return (
    <div style={{ position: 'relative', filter: blurred ? 'blur(6px)' : undefined }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* horizontal grid + y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={Y(t) + 4} textAnchor="end" fontSize="10" fill="var(--text-tertiary)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {t >= 1000 ? `${Math.round(t / 1000)}k` : t.toFixed(0)} €
            </text>
          </g>
        ))}

        {/* zero line if visible */}
        {showZeroZone && (
          <>
            <rect x={padL} y={Y(0)} width={innerW} height={Math.max(0, h - padB - Y(0))} fill="var(--negative-soft)" opacity="0.45" />
            <line x1={padL} x2={w - padR} y1={Y(0)} y2={Y(0)} stroke="var(--negative)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          </>
        )}

        {/* x ticks */}
        {xTicks.map((d, i) => {
          const dt = new Date(today); dt.setDate(dt.getDate() + d);
          const lbl = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <g key={i}>
              <line x1={X(d)} x2={X(d)} y1={padT} y2={h - padB} stroke="var(--grid-line)" strokeWidth="1" />
              <text x={X(d)} y={h - padB + 16} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">{lbl}</text>
            </g>
          );
        })}

        {/* today divider */}
        <line x1={X(0)} x2={X(0)} y1={padT} y2={h - padB} stroke="var(--text-tertiary)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 4" />
        <text x={X(0) + 6} y={padT + 12} fontSize="10" fill="var(--text-tertiary)" fontWeight="600">TODAY</text>

        {/* history area + line */}
        <path d={histArea} fill="var(--accent-tint)" shapeRendering="geometricPrecision" />
        <path d={histPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" shapeRendering="geometricPrecision" />

        {/* projection band */}
        <path d={bandArea} fill="var(--forecast-band)" />

        {/* projection line */}
        <path d={projPath} fill="none" stroke="var(--accent)" strokeOpacity="0.95" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="miter" strokeLinecap="butt" shapeRendering="geometricPrecision" />

        {/* simulation line */}
        {simPath && (
          <path d={simPath} fill="none" stroke="var(--negative)" strokeWidth="1.5" strokeDasharray="2 2" strokeLinejoin="miter" strokeLinecap="butt" shapeRendering="geometricPrecision" />
        )}

        {/* event markers */}
        {eventsInWindow.map((p, i) => {
          const x = X(p.d), y = Y(p.v);
          const isIncome = p.event.amount > 0;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y} y2={h - padB} stroke="var(--text-tertiary)" strokeOpacity="0.18" strokeWidth="1" />
              <circle cx={x} cy={y} r="4" fill="var(--surface)" stroke={isIncome ? 'var(--positive)' : 'var(--accent)'} strokeWidth="1.75" />
              <text x={x} y={y - 9} fontSize="9.5" fill="var(--text-secondary)" textAnchor="middle" fontWeight="500">{p.event.label}</text>
            </g>
          );
        })}

        {/* simulation marker */}
        {sim.enabled && (() => {
          const day = sim.day;
          const p = projection.find(pp => pp.d === day);
          if (!p) return null;
          return (
            <g>
              <line x1={X(day)} x2={X(day)} y1={padT} y2={h - padB} stroke="var(--negative)" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={X(day)} cy={Y(p.v - sim.amount)} r="5" fill="var(--negative)" stroke="var(--surface)" strokeWidth="2" />
              <text x={X(day)} y={padT + 12} fontSize="10" fontWeight="700" fill="var(--negative)" textAnchor="middle">SIM</text>
            </g>
          );
        })()}

        {/* today dot on projection */}
        <circle cx={X(0)} cy={Y(history[history.length-1].v)} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Simulator bar

function SimulatorBar({ sim, setSim, lowest, lowestSim, blurred }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      paddingTop: 16,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <button
        onClick={() => setSim(s => ({ ...s, enabled: !s.enabled }))}
        className="fc-btn"
        style={{
          background: sim.enabled ? 'var(--negative-soft)' : 'var(--accent-tint)',
          color: sim.enabled ? 'var(--negative)' : 'var(--accent)',
          border: `1px solid ${sim.enabled ? 'var(--negative)' : 'var(--accent)'}`,
          fontWeight: 600,
        }}
      >
        <Icon name="sparkles" size={14} />
        {sim.enabled ? 'Stop simulation' : 'Simulate a purchase'}
      </button>

      {sim.enabled && (
        <>
          <SimField label="Amount">
            <span className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>€</span>
            <input
              type="number" value={sim.amount}
              onChange={e => setSim(s => ({ ...s, amount: +e.target.value }))}
              style={{
                width: 80, height: 28, border: 'none', background: 'transparent',
                outline: 'none', fontWeight: 600, fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </SimField>
          <SimField label="In">
            <input
              type="range" min={1} max={horizon} value={Math.min(sim.day, horizon)}
              onChange={e => setSim(s => ({ ...s, day: +e.target.value }))}
              style={{ width: 120, accentColor: 'var(--negative)' }}
            />
            <span className="tabular" style={{ fontSize: 13, fontWeight: 600, minWidth: 32 }}>{Math.min(sim.day, horizon)}d</span>
          </SimField>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Impact on lowest point
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <MoneyDisplay amount={lowest.v} currency="EUR" size="small" blurred={blurred} />
              <Icon name="arrow" size={14} color="var(--text-tertiary)" />
              <MoneyDisplay amount={lowestSim?.v ?? lowest.v} currency="EUR" size="small" colorize={(lowestSim?.v ?? lowest.v) < 0} blurred={blurred} />
              <StatusPill
                status={(lowestSim?.v ?? lowest.v) < 0 ? 'off-track' : (lowestSim?.v ?? lowest.v) < 1500 ? 'slipping' : 'on-track'}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SimField({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px', height: 36,
      background: 'var(--surface-sunken)', borderRadius: 8,
      border: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600,
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>{label}</span>
      {children}
    </div>
  );
}
