// HoldingFormModal — create / edit a single holding.
// Listens for `fc:edit-holding` (detail = holding object or null/undefined for new).
// Per master-spec §18.10 + §9 Holding schema.
//
// Exposes window.FC.HoldingFormModal for mounting in page.js.

(function () {
  const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

  function FormField({ label, hint, children }) {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {label}
        </span>
        {children}
        {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>}
      </label>
    );
  }

  window.FC.HoldingFormModal = function HoldingFormModal() {
    const [open, setOpen] = React.useState(false);
    const [editing, setEditing] = React.useState(null); // null = new
    const [form, setForm] = React.useState(blankForm());

    function blankForm() {
      return {
        ticker: '', name: '', currency: 'EUR',
        quantity: '', avgCost: '', accountId: '',
      };
    }

    React.useEffect(function () {
      function handler(e) {
        const h = (e && e.detail) || null;
        if (h) {
          setEditing(h);
          setForm({
            ticker: h.ticker || '',
            name: h.name || '',
            currency: h.currency || 'EUR',
            quantity: h.qty != null ? h.qty : (h.quantity != null ? h.quantity : ''),
            avgCost: h.avgCost != null ? h.avgCost : (h.basis != null ? h.basis : ''),
            accountId: h.accountId || '',
          });
        } else {
          setEditing(null);
          setForm(blankForm());
        }
        setOpen(true);
      }
      window.addEventListener('fc:edit-holding', handler);
      return function () { window.removeEventListener('fc:edit-holding', handler); };
    }, []);

    if (!open) return null;

    const FCStore = window.FCStore;
    const accounts = FCStore ? FCStore.list('accounts') : [];

    function close() { setOpen(false); setEditing(null); }
    function patch(p) { setForm(f => Object.assign({}, f, p)); }

    function save() {
      const ticker = (form.ticker || '').trim().toUpperCase();
      if (!ticker) return;
      const qty = parseFloat(form.quantity);
      const avg = parseFloat(form.avgCost);
      const payload = {
        ticker,
        name: (form.name || '').trim() || ticker,
        currency: form.currency || 'EUR',
        qty: isNaN(qty) ? 0 : qty,
        quantity: isNaN(qty) ? 0 : qty,
        avgCost: isNaN(avg) ? 0 : avg,
        basis: isNaN(avg) ? 0 : avg,
        accountId: form.accountId || null,
      };
      if (FCStore) {
        if (editing && editing.id) {
          FCStore.update('holdings', editing.id, payload);
        } else if (editing && editing.ticker) {
          // Legacy seed holding with no id — match by ticker, replace in place
          // and assign a fresh id so future edits/deletes use the fast path.
          const list = FCStore.list('holdings');
          const idx = list.findIndex(h => h.ticker === editing.ticker);
          if (idx >= 0) {
            const newId = list[idx].id || ('h_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4));
            list[idx] = Object.assign({}, list[idx], payload, { id: newId });
            FCStore.set('holdings', list);
          } else {
            FCStore.create('holdings', payload);
          }
        } else {
          FCStore.create('holdings', payload);
        }
        // Notify any screens to refresh
        window.dispatchEvent(new CustomEvent('fc:holdings-changed'));
      }
      close();
    }

    function destroy() {
      if (!editing || !FCStore) return close();
      if (!window.confirm('Remove this holding? This does not delete linked transactions.')) return;
      if (editing.id) {
        FCStore.remove('holdings', editing.id);
      } else if (editing.ticker) {
        // Legacy seed holding without an id — match by ticker.
        const remaining = FCStore.list('holdings').filter(h => h.ticker !== editing.ticker);
        FCStore.set('holdings', remaining);
      } else {
        return close();
      }
      window.dispatchEvent(new CustomEvent('fc:holdings-changed'));
      close();
    }

    return (
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="fc-card"
          style={{
            width: '100%', maxWidth: 520,
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {editing ? 'Edit holding' : 'Add holding'}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {editing ? 'Update ticker, quantity, or cost basis.' : 'Track a stock, ETF, or crypto position.'}
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'var(--surface-sunken)', color: 'var(--text-secondary)',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Ticker" hint="e.g. VWCE.DE, CSPX, BTC">
              <input
                value={form.ticker}
                onChange={e => patch({ ticker: e.target.value })}
                placeholder="VWCE"
                className="fc-input"
                style={{ height: 36, fontFamily: 'var(--font-mono)' }}
                autoFocus
              />
            </FormField>
            <FormField label="Currency">
              <select
                value={form.currency}
                onChange={e => patch({ currency: e.target.value })}
                className="fc-input"
                style={{ height: 36 }}
              >
                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Name">
                <input
                  value={form.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="Vanguard FTSE All-World"
                  className="fc-input"
                  style={{ height: 36 }}
                />
              </FormField>
            </div>

            <FormField label="Quantity">
              <input
                type="number"
                step="any"
                value={form.quantity}
                onChange={e => patch({ quantity: e.target.value })}
                placeholder="0"
                className="fc-input tabular"
                style={{ height: 36 }}
              />
            </FormField>
            <FormField label="Avg cost (per unit)">
              <input
                type="number"
                step="any"
                value={form.avgCost}
                onChange={e => patch({ avgCost: e.target.value })}
                placeholder="0.00"
                className="fc-input tabular"
                style={{ height: 36 }}
              />
            </FormField>

            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Linked account" hint="Optional — the brokerage account this holding lives in.">
                <select
                  value={form.accountId}
                  onChange={e => patch({ accountId: e.target.value })}
                  className="fc-input"
                  style={{ height: 36 }}
                >
                  <option value="">— None —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {editing && (
              <button
                onClick={destroy}
                className="fc-btn fc-btn-ghost"
                style={{ height: 36, color: 'var(--negative)' }}
              >
                Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={close} className="fc-btn fc-btn-ghost" style={{ height: 36 }}>Cancel</button>
            <button
              onClick={save}
              className="fc-btn fc-btn-primary"
              style={{ height: 36 }}
              disabled={!(form.ticker || '').trim()}
            >
              {editing ? 'Save changes' : 'Save holding'}
            </button>
          </div>
        </div>
      </div>
    );
  };
})();
