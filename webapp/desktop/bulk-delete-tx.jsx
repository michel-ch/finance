// Bulk delete transactions — filter by date / account / category / currency / tag /
// amount / type. Live preview shows matched count and first 5 examples before commit.
//
// Trigger: dispatch `fc:bulk-delete-tx` (no detail needed).
// On commit: writes filtered transactions back to FCStore and dispatches `fc:tx-saved`.

(function () {
  const R = React;
  const FC = window.FC || (window.FC = {});

  function todayIso() { return new Date().toISOString().slice(0, 10); }

  function fmtMoney(amount, currency) {
    return (FC.formatMoney ? FC.formatMoney(amount, currency || 'EUR') : (amount + ' ' + (currency || '')));
  }

  function matchesFilter(tx, f) {
    // Each non-empty filter narrows the match. Empty filter = no constraint on that field.
    if (f.dateFrom && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date > f.dateTo) return false;
    if (f.accountId) {
      const accMatch = tx.accountId === f.accountId
        || (!tx.accountId && tx.account === f.accountName);
      if (!accMatch) return false;
    }
    if (f.categoryId) {
      const catMatch = tx.categoryId === f.categoryId
        || (!tx.categoryId && (tx.category || '').toLowerCase() === (f.categoryName || '').toLowerCase());
      if (!catMatch) return false;
    }
    if (f.currency && (tx.currencyOriginal || tx.currency) !== f.currency) return false;
    if (f.tag) {
      const tags = tx.tags || [];
      if (!tags.some(t => (t || '').toLowerCase().includes(f.tag.toLowerCase()))) return false;
    }
    if (f.amountMin !== '' && f.amountMin != null) {
      if (Math.abs(tx.amountOriginal != null ? tx.amountOriginal : tx.amount || 0) < parseFloat(f.amountMin)) return false;
    }
    if (f.amountMax !== '' && f.amountMax != null) {
      if (Math.abs(tx.amountOriginal != null ? tx.amountOriginal : tx.amount || 0) > parseFloat(f.amountMax)) return false;
    }
    if (f.types && f.types.length) {
      const a = tx.amountOriginal != null ? tx.amountOriginal : (tx.amount || 0);
      const isTransfer = !!tx.transferPairId || !!tx.transfer;
      const isPending = !!tx.pending;
      const kind = isTransfer ? 'transfer' : a > 0 ? 'income' : 'expense';
      const matchesKind = f.types.includes(kind) || (f.types.includes('pending') && isPending);
      if (!matchesKind) return false;
    }
    return true;
  }

  FC.BulkDeleteTxModal = function BulkDeleteTxModal() {
    const [open, setOpen] = R.useState(false);
    const [accounts, setAccounts] = R.useState([]);
    const [categories, setCategories] = R.useState([]);
    const [transactions, setTransactions] = R.useState([]);
    const [filter, setFilter] = R.useState(emptyFilter());
    const [confirming, setConfirming] = R.useState(false);

    function emptyFilter() {
      return {
        dateFrom: '', dateTo: '',
        accountId: '', accountName: '',
        categoryId: '', categoryName: '',
        currency: '',
        tag: '',
        amountMin: '', amountMax: '',
        types: [],
      };
    }

    R.useEffect(function () {
      function onOpen() {
        if (!window.FCStore) return;
        setAccounts(window.FCStore.list('accounts') || []);
        setCategories(window.FCStore.list('categories') || []);
        setTransactions(window.FCStore.list('transactions') || []);
        setFilter(emptyFilter());
        setConfirming(false);
        setOpen(true);
      }
      window.addEventListener('fc:bulk-delete-tx', onOpen);
      return function () { window.removeEventListener('fc:bulk-delete-tx', onOpen); };
    }, []);

    R.useEffect(function () {
      if (!open) return;
      function onKey(e) { if (e.key === 'Escape') setOpen(false); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [open]);

    function update(patch) { setFilter(f => Object.assign({}, f, patch)); setConfirming(false); }
    function toggleType(t) {
      setFilter(f => {
        const has = f.types.includes(t);
        return Object.assign({}, f, { types: has ? f.types.filter(x => x !== t) : f.types.concat([t]) });
      });
      setConfirming(false);
    }

    if (!open) return null;

    const matched = transactions.filter(tx => matchesFilter(tx, filter));
    const total = transactions.length;
    const allMatch = matched.length === total && total > 0;
    const hasFilter =
      filter.dateFrom || filter.dateTo || filter.accountId || filter.categoryId ||
      filter.currency || filter.tag || filter.amountMin !== '' || filter.amountMax !== '' ||
      filter.types.length > 0;

    function commit() {
      // Two-click confirmation when deleting all transactions OR when no filter is set.
      if ((allMatch || !hasFilter) && !confirming) {
        setConfirming(true);
        return;
      }
      const remainingIds = new Set(matched.map(t => t.id));
      const remaining = transactions.filter(t => !remainingIds.has(t.id));
      window.FCStore.set('transactions', remaining);
      window.dispatchEvent(new Event('fc:tx-saved'));
      setOpen(false);
    }

    const inputStyle = {
      width: '100%', height: 36, padding: '0 10px',
      border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--surface)', color: 'var(--text-primary)',
      fontSize: 13, outline: 'none', fontFamily: 'inherit',
    };
    const labelStyle = {
      display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
      textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6,
    };

    return (
      <div
        onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 220,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '6vh 16px', overflowY: 'auto',
        }}
      >
        <div role="dialog" aria-labelledby="bulk-del-title" style={{
          width: '100%', maxWidth: 560,
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-modal)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 24px 12px' }}>
            <h2 id="bulk-del-title" style={{
              margin: 0, fontSize: 18, fontWeight: 600,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>Delete transactions by filter</h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Empty fields are not constraining. Set at least one to narrow the match — or leave them all blank to delete everything.
            </div>
          </div>

          <div style={{ padding: '8px 24px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Date from</label>
              <input type="date" style={inputStyle} value={filter.dateFrom}
                onChange={e => update({ dateFrom: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Date to</label>
              <input type="date" style={inputStyle} value={filter.dateTo}
                onChange={e => update({ dateTo: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Account</label>
              <select style={inputStyle} value={filter.accountId}
                onChange={e => {
                  const id = e.target.value;
                  const acc = accounts.find(a => a.id === id);
                  update({ accountId: id, accountName: acc ? acc.name : '' });
                }}>
                <option value="">Any account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={filter.categoryId}
                onChange={e => {
                  const id = e.target.value;
                  const cat = categories.find(c => c.id === id);
                  update({ categoryId: id, categoryName: cat ? cat.name : '' });
                }}>
                <option value="">Any category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{(c.icon || '•') + '  ' + c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Currency</label>
              <select style={inputStyle} value={filter.currency}
                onChange={e => update({ currency: e.target.value })}>
                <option value="">Any currency</option>
                {Array.from(new Set(transactions.map(t => t.currencyOriginal || t.currency).filter(Boolean))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tag contains</label>
              <input type="text" style={inputStyle} value={filter.tag} placeholder="e.g. paris"
                onChange={e => update({ tag: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Min amount</label>
              <input type="number" inputMode="decimal" style={inputStyle} value={filter.amountMin} placeholder="0"
                onChange={e => update({ amountMin: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Max amount</label>
              <input type="number" inputMode="decimal" style={inputStyle} value={filter.amountMax} placeholder="∞"
                onChange={e => update({ amountMax: e.target.value })} />
            </div>

            <div style={{ gridColumn: '1 / 3' }}>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ['expense', 'Expense'],
                  ['income', 'Income'],
                  ['transfer', 'Transfer'],
                  ['pending', 'Pending only'],
                ].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => toggleType(k)} style={{
                    height: 30, padding: '0 12px', borderRadius: 999,
                    border: '1px solid ' + (filter.types.includes(k) ? 'var(--accent)' : 'var(--border)'),
                    background: filter.types.includes(k) ? 'var(--accent-tint)' : 'var(--surface-sunken)',
                    color: filter.types.includes(k) ? 'var(--accent)' : 'var(--text-primary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div style={{
            margin: '0 24px 16px', padding: '12px 14px',
            background: matched.length > 0 ? 'var(--negative-soft)' : 'var(--surface-sunken)',
            border: '1px solid ' + (matched.length > 0 ? 'var(--negative)' : 'var(--border)'),
            borderRadius: 10, fontSize: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: matched.length ? 8 : 0 }}>
              <strong style={{ color: matched.length > 0 ? 'var(--negative)' : 'var(--text-primary)' }}>
                {matched.length === 0
                  ? 'No transactions match — refine your filters.'
                  : 'Will permanently delete ' + matched.length + ' of ' + total + ' transactions.'}
              </strong>
            </div>
            {matched.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {matched.slice(0, 5).map(t => (
                  <li key={t.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span className="tabular" style={{ width: 86, color: 'var(--text-tertiary)' }}>{t.date}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant || t.description || '(no description)'}
                    </span>
                    <span className="tabular">{fmtMoney(t.amountOriginal != null ? t.amountOriginal : t.amount, t.currencyOriginal || t.currency)}</span>
                  </li>
                ))}
                {matched.length > 5 && (
                  <li style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    …and {matched.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="fc-btn fc-btn-ghost"
              onClick={() => { setFilter(emptyFilter()); setConfirming(false); }}>
              Reset filters
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="fc-btn fc-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" onClick={commit}
              disabled={matched.length === 0}
              className="fc-btn"
              style={{
                background: matched.length === 0 ? 'var(--surface-sunken)' : 'var(--negative)',
                color: matched.length === 0 ? 'var(--text-tertiary)' : '#fff',
                cursor: matched.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}>
              {matched.length === 0
                ? 'Delete'
                : confirming
                  ? 'Click again to confirm — delete ' + matched.length
                  : 'Delete ' + matched.length + ' transaction' + (matched.length === 1 ? '' : 's')}
            </button>
          </div>
        </div>
      </div>
    );
  };
})();
