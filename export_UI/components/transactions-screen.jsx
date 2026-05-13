// Transactions screen — search, filters, grouped-by-day list, multi-currency rows.

const { MoneyDisplay, StatusPill, Icon, formatMoney } = window.FC;

window.FC.TransactionsScreen = function TransactionsScreen({ blurred, density, data }) {
  const [filterAccount, setFilterAccount] = React.useState('all');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());

  const txs = data.transactions.filter(t => {
    if (filterAccount !== 'all' && t.account !== filterAccount) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by date
  const groups = {};
  txs.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const totalSpend = txs.filter(t => t.amount < 0 && !t.transfer).reduce((s, t) => s + (t.currencyConverted || t.amount), 0);
  const totalInflow = txs.filter(t => t.amount > 0 && !t.transfer).reduce((s, t) => s + (t.currencyConverted || t.amount), 0);

  const categories = ['all', ...new Set(data.transactions.map(t => t.category))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Transactions</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {txs.length} of {data.transactions.length} transactions · May 2026
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="fc-btn fc-btn-secondary" style={{ height: 34 }}>
          <Icon name="box" size={14} />
          Import CSV
        </button>
        <button className="fc-btn fc-btn-primary" style={{ height: 34 }}>
          <Icon name="plus" size={14} />
          Add
        </button>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SmallStat label="Inflow" value={totalInflow} blurred={blurred} colorize />
        <SmallStat label="Outflow" value={totalSpend} blurred={blurred} colorize />
        <SmallStat label="Net" value={totalInflow + totalSpend} blurred={blurred} colorize />
      </div>

      {/* Filter bar */}
      <div className="fc-card" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', height: 32, flex: 1, minWidth: 200,
          background: 'var(--surface-sunken)', borderRadius: 6,
        }}>
          <Icon name="search" size={14} color="var(--text-tertiary)" />
          <input
            placeholder="Search merchant, description, tag…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: 13 }}
          />
        </div>

        <FilterChip label="Account" value={filterAccount} options={['all', ...data.accounts.map(a => a.name)]} onChange={setFilterAccount} />
        <FilterChip label="Category" value={filterCategory} options={categories} onChange={setFilterCategory} />
        <FilterChip label="Date" value="May 2026" options={['May 2026', 'Apr 2026', 'Last 90d', 'Custom…']} onChange={() => {}} />
        <FilterChip label="Currency" value="all" options={['all', 'EUR', 'USD', 'GBP']} onChange={() => {}} />

        <button className="fc-btn fc-btn-ghost" style={{ height: 32, padding: '0 10px' }}>
          <Icon name="sliders" size={14} /> More
        </button>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div style={{
          padding: '10px 16px', borderRadius: 10,
          background: 'var(--accent-tint)', border: `1px solid var(--accent)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{selected.size} selected</span>
          <button className="fc-btn fc-btn-ghost" style={{ height: 28, fontSize: 12 }}>Recategorize</button>
          <button className="fc-btn fc-btn-ghost" style={{ height: 28, fontSize: 12 }}>Tag</button>
          <button className="fc-btn fc-btn-ghost" style={{ height: 28, fontSize: 12, color: 'var(--negative)' }}>Delete</button>
          <span style={{ flex: 1 }} />
          <button className="fc-btn fc-btn-ghost" style={{ height: 28, fontSize: 12 }} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* List */}
      <div className="fc-card" style={{ padding: 0, overflow: 'hidden' }}>
        {dates.map(date => {
          const dt = new Date(date);
          const dateLabel = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const dayTotal = groups[date].filter(t => !t.transfer).reduce((s, t) => s + (t.currencyConverted || t.amount), 0);
          return (
            <div key={date}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: 'var(--surface-sunken)',
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  {dateLabel}
                </span>
                <span style={{ flex: 1 }} />
                <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Day total: {blurred ? '••••' : formatMoney(dayTotal, 'EUR', { signed: true })}
                </span>
              </div>
              {groups[date].map((tx, i) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  blurred={blurred}
                  density={density}
                  selected={selected.has(tx.id)}
                  onToggle={() => {
                    setSelected(s => {
                      const n = new Set(s);
                      n.has(tx.id) ? n.delete(tx.id) : n.add(tx.id);
                      return n;
                    });
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function SmallStat({ label, value, blurred, colorize }) {
  return (
    <div className="fc-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
        <MoneyDisplay amount={value} currency="EUR" size="h2" blurred={blurred} colorize={colorize} signed />
      </div>
    </div>
  );
}

function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="fc-btn"
        style={{
          height: 32, padding: '0 10px', gap: 4, fontSize: 12,
          background: value !== 'all' ? 'var(--accent-tint)' : 'var(--surface)',
          color: value !== 'all' ? 'var(--accent)' : 'var(--text-secondary)',
          border: '1px solid var(--border)',
          fontWeight: 500,
        }}
      >
        <span style={{ color: value !== 'all' ? 'var(--accent)' : 'var(--text-tertiary)' }}>{label}:</span>
        <span style={{ fontWeight: 600 }}>{value === 'all' ? 'all' : value}</span>
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 8 }} />
          <div className="fc-card" style={{
            position: 'absolute', top: 38, left: 0,
            background: 'var(--surface)', boxShadow: 'var(--shadow-modal)',
            padding: 4, minWidth: 180, zIndex: 9,
          }}>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', padding: '7px 10px', borderRadius: 6,
                  textAlign: 'left', fontSize: 13,
                  background: opt === value ? 'var(--accent-tint)' : 'transparent',
                  color: opt === value ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TxRow({ tx, blurred, density, selected, onToggle }) {
  const isTransfer = tx.transfer;
  const compact = density === 'compact';
  const py = compact ? 8 : 12;
  const baseAmount = tx.currencyConverted ?? tx.amount;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 28px 1fr 220px 120px 140px',
      alignItems: 'center', gap: 12,
      padding: `${py}px 16px`,
      borderBottom: '1px solid var(--border)',
      opacity: tx.pending ? 0.85 : 1,
      background: selected ? 'var(--accent-tint)' : 'transparent',
      cursor: 'pointer',
      transition: 'background 100ms var(--ease)',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--surface-sunken)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
        style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
      />
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
      }}>{tx.cat_icon}</div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.merchant}
          </span>
          {tx.pending && <StatusPill status="pending" label="Pending" />}
          {isTransfer && <StatusPill status="forecast" label="Transfer" />}
        </div>
        {tx.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {tx.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: 'var(--surface-sunken)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', fontWeight: 500,
              }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: 'var(--surface-sunken)', border: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>{tx.category}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.account}{tx.card ? ` · ${tx.card}` : ''}
        </span>
      </div>

      <span className="tabular" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>

      <div style={{ textAlign: 'right' }}>
        {tx.currencyConverted ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <MoneyDisplay
              amount={tx.amount}
              currency={tx.currency}
              size="body"
              colorize={!isTransfer}
              signed
              blurred={blurred}
            />
            <span className="tabular" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              ≈ {blurred ? '••••' : formatMoney(tx.currencyConverted, 'EUR', { signed: true })}
            </span>
          </div>
        ) : (
          <MoneyDisplay
            amount={tx.amount}
            currency={tx.currency}
            size="body"
            colorize={!isTransfer}
            signed
            blurred={blurred}
          />
        )}
      </div>
    </div>
  );
}
