// Core atoms — MoneyDisplay, Sparkline, StatusPill, ProgressRing, Icons.
// All respect the global privacy-blur state and theme tokens.

const FC = window.FC || (window.FC = {});

// ──────────────────────────────────────────────────────────
// Currency formatting

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF' };

FC.formatMoney = function (amount, currency = 'EUR', opts = {}) {
  const { signed = false, decimals = 2 } = opts;
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const abs = Math.abs(amount);
  const neg = amount < 0;
  const fixed = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // EUR uses suffix; others prefix
  const symFront = currency !== 'EUR';
  const body = symFront ? `${sym}${fixed}` : `${fixed} ${sym}`;
  if (signed && !neg) return `+${body}`;
  if (neg) return `−${body}`;
  return body;
};

// ──────────────────────────────────────────────────────────
// MoneyDisplay — single source of truth for monetary values

FC.MoneyDisplay = function MoneyDisplay({
  amount,
  currency = 'EUR',
  originalAmount,
  originalCurrency,
  size = 'body',         // 'display' | 'h1' | 'h2' | 'body' | 'small' | 'micro'
  colorize = false,
  signed = false,
  blurred = false,
  display = false,        // use display font?
  weight,                 // optional override
}) {
  const sizeMap = {
    display: { fontSize: 48, lineHeight: '56px', fontWeight: 600, letterSpacing: '-0.02em' },
    h1:      { fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.01em' },
    h2:      { fontSize: 20, lineHeight: '28px', fontWeight: 600 },
    body:    { fontSize: 15, lineHeight: '22px', fontWeight: 500 },
    small:   { fontSize: 13, lineHeight: '18px', fontWeight: 500 },
    micro:   { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' },
  };
  const sty = sizeMap[size] || sizeMap.body;
  if (weight) sty.fontWeight = weight;

  let color;
  if (colorize) {
    if (amount > 0) color = 'var(--positive)';
    else if (amount < 0) color = 'var(--negative)';
    else color = 'var(--text-primary)';
  }

  const formatted = FC.formatMoney(amount, currency, { signed });

  if (blurred) {
    // Replicate visual width with •
    const dotCount = Math.max(4, Math.round(formatted.length * 0.7));
    const dots = '•'.repeat(dotCount);
    return (
      <span
        className="tabular fc-money-blurred"
        style={{ ...sty, color, fontFamily: display ? 'var(--font-display)' : undefined }}
      >
        {dots}
      </span>
    );
  }

  const main = (
    <span
      className="tabular"
      style={{ ...sty, color, fontFamily: display ? 'var(--font-display)' : undefined }}
    >
      {formatted}
    </span>
  );

  if (originalAmount != null && originalCurrency && originalCurrency !== currency) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span className="tabular" style={{ ...sty, color }}>
          {FC.formatMoney(originalAmount, originalCurrency, { signed })}
        </span>
        <span className="tabular" style={{
          fontSize: 11, lineHeight: '14px', color: 'var(--text-tertiary)', fontWeight: 500,
        }}>
          ≈ {FC.formatMoney(amount, currency)}
        </span>
      </span>
    );
  }

  return main;
};

// ──────────────────────────────────────────────────────────
// Sparkline — tiny trend SVG

FC.Sparkline = function Sparkline({
  values, width = 80, height = 28, color, fillBelow = true, blurred = false,
}) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${width} ${height} L0 ${height} Z`;
  const stroke = color || (values[values.length - 1] >= values[0] ? 'var(--positive)' : 'var(--negative)');
  const fillId = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', filter: blurred ? 'blur(4px)' : undefined }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fillBelow && <path d={area} fill={`url(#${fillId})`} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="butt" strokeLinejoin="miter" shapeRendering="geometricPrecision" />
    </svg>
  );
};

// ──────────────────────────────────────────────────────────
// StatusPill — on-track / slipping / off-track + generic

FC.StatusPill = function StatusPill({ status = 'on-track', label, icon }) {
  const map = {
    'on-track':   { bg: 'var(--positive-soft)', fg: 'var(--positive)', dot: 'var(--positive)', text: label || 'On track',  ico: '●' },
    'slipping':   { bg: 'var(--warning-soft)',  fg: 'var(--warning)',  dot: 'var(--warning)',  text: label || 'Slipping',  ico: '◐' },
    'off-track':  { bg: 'var(--negative-soft)', fg: 'var(--negative)', dot: 'var(--negative)', text: label || 'Off track', ico: '✕' },
    'pending':    { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)', dot: 'var(--text-tertiary)', text: label || 'Pending', ico: '◌' },
    'forecast':   { bg: 'var(--accent-tint)', fg: 'var(--accent)', dot: 'var(--accent)', text: label || 'Forecast', ico: '◇' },
  };
  const s = map[status] || map['on-track'];
  return (
    <span className="fc-pill" style={{ background: s.bg, color: s.fg }}>
      <span style={{ fontSize: 8 }}>{icon || s.ico}</span>
      {s.text}
    </span>
  );
};

// ──────────────────────────────────────────────────────────
// ProgressRing — circular progress for goals

FC.ProgressRing = function ProgressRing({
  value = 0, size = 64, stroke = 6, color, trackColor, status,
  label, showPercent = true,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - Math.min(value, 1) * c;
  const finalColor = color || (
    status === 'off-track' ? 'var(--negative)' :
    status === 'slipping'  ? 'var(--warning)'  : 'var(--accent)'
  );
  const track = trackColor || 'var(--border)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={finalColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }}
        />
      </svg>
      {showPercent && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 80 ? 18 : 13, fontWeight: 600, color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {label || `${Math.round(value * 100)}%`}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Lucide-ish icons (1.5px stroke)

FC.Icon = function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }) {
  const paths = {
    home:        <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></>,
    wallet:      <><path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V6a2 2 0 0 1 2-2h11"/><circle cx="17" cy="14" r="1.4"/></>,
    list:        <><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6"  r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></>,
    trend:       <><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
    target:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></>,
    pie:         <><path d="M21 12a9 9 0 1 1-9-9v9h9Z"/><path d="M14 4.2A9 9 0 0 1 19.8 10H14V4.2Z"/></>,
    repeat:      <><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 20v-4h4"/></>,
    chart:       <><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/></>,
    coins:       <><circle cx="9" cy="9" r="6"/><path d="M14.5 8.5A6 6 0 0 1 21 14.5a6 6 0 0 1-9.5 5"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    eye:         <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    'eye-off':   <><path d="m3 3 18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 7 10 7a18 18 0 0 1-3 3.6"/><path d="M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8"/><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"/></>,
    plus:        <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    filter:      <><path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/></>,
    chevron:     <><path d="m9 6 6 6-6 6"/></>,
    'chevron-down': <><path d="m6 9 6 6 6-6"/></>,
    arrow:       <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    'arrow-up':  <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    'arrow-down':<><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></>,
    bell:        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21h4"/></>,
    calendar:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
    sparkles:    <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6 8 8M16 16l2.4 2.4M18.4 5.6 16 8M8 16l-2.4 2.4"/></>,
    sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon:        <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></>,
    check:       <><path d="m4 12 5 5L20 6"/></>,
    alert:       <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></>,
    lock:        <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    info:        <><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7h.01"/></>,
    upload:      <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></>,
    user:        <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    'credit-card':<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18"/><path d="M7 16h4"/></>,
    sim:         <><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="9"/></>,
    grid:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    sliders:     <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></>,
    play:        <><path d="m6 4 14 8-14 8V4Z"/></>,
    star:        <><path d="m12 2 3 7 7 .8-5.2 4.7L18.4 22 12 18l-6.4 4 1.6-7.5L2 9.8l7-.8L12 2Z"/></>,
    coffee:      <><path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z"/><path d="M17 11h2a3 3 0 0 1 0 6h-2"/><path d="M7 4v2M11 4v2"/></>,
    car:         <><path d="M5 15V9l1.5-3.5A2 2 0 0 1 8.3 4h7.4a2 2 0 0 1 1.8 1.5L19 9v6"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/><path d="M3 11h2M19 11h2"/></>,
    bag:         <><path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
    zap:         <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></>,
    drop:        <><path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/></>,
    'box':       <><path d="M3 7 12 3l9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>
      {paths[name] || null}
    </svg>
  );
};

// ──────────────────────────────────────────────────────────
// Avatar (initials)

FC.Avatar = function Avatar({ initials, size = 32, color }) {
  const bg = color || 'var(--accent)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: 'var(--accent-fg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, letterSpacing: '0.03em',
      flex: 'none',
    }}>
      {initials}
    </div>
  );
};
