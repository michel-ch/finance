// Add/Edit Transaction modal — desktop.
//
// Per master-spec §18.4 (Add/edit transaction) and §9 (data model).
//
// Listens on `window` for `fc:add-transaction`:
//   - new tx:    window.dispatchEvent(new CustomEvent('fc:add-transaction'))
//   - edit tx:   window.dispatchEvent(new CustomEvent('fc:add-transaction', { detail: { id: 'tx_…' } }))
//
// On save:
//   - persists via FCStore (create or update)
//   - for transfers, also writes the paired second tx, linked via transferPairId
//   - dispatches `fc:tx-saved` so screens can refresh
//
// Uses the same fields the existing transactions-screen.jsx renders — merchant,
// category, cat_icon, account, card, tags, transfer, currencyConverted — alongside
// the canonical §9 snapshot fields (amountOriginal, currencyOriginal, amountBase,
// fxRateSnapshot, categoryId).

const { Icon } = window.FC;

window.FC.AddTransactionModal = function AddTransactionModal() {
  const R = React;
  const [open, setOpen] = R.useState(false);
  const [editId, setEditId] = R.useState(null);

  // Form state — kept strings where possible to avoid input churn.
  const [amount, setAmount] = R.useState('');
  const [sign, setSign] = R.useState('-');               // '-' = expense, '+' = income
  const [currency, setCurrency] = R.useState('EUR');
  const [date, setDate] = R.useState(todayIso());
  const [accountId, setAccountId] = R.useState('');
  const [cardId, setCardId] = R.useState('');
  const [categoryId, setCategoryId] = R.useState('');
  const [tags, setTags] = R.useState([]);
  const [tagDraft, setTagDraft] = R.useState('');
  const [description, setDescription] = R.useState('');
  const [merchant, setMerchant] = R.useState('');
  const [isTransfer, setIsTransfer] = R.useState(false);
  const [transferToAccountId, setTransferToAccountId] = R.useState('');
  const [isRecurring, setIsRecurring] = R.useState(false);
  const [recurringFreq, setRecurringFreq] = R.useState('monthly');
  const [error, setError] = R.useState('');

  // Live snapshots from store. Re-read each open so we have the freshest data.
  const [accounts, setAccounts] = R.useState([]);
  const [cards, setCards] = R.useState([]);
  const [categories, setCategories] = R.useState([]);
  const [recentCategoryIds, setRecentCategoryIds] = R.useState([]);
  const [activeCurrencies, setActiveCurrencies] = R.useState(['EUR']);
  const [showCurrencyPicker, setShowCurrencyPicker] = R.useState(false);

  // Listen for the global event.
  R.useEffect(function () {
    function onOpen(e) {
      const id = (e && e.detail && e.detail.id) || null;
      openModal(id);
    }
    window.addEventListener('fc:add-transaction', onOpen);
    return function () { window.removeEventListener('fc:add-transaction', onOpen); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes.
  R.useEffect(function () {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return function () { window.removeEventListener('keydown', onKey); };
  }, [open]);

  function openModal(id) {
    const FC = window.FCStore;
    const profile = (window.FCAuth && window.FCAuth.currentProfile()) || {};
    const accts = (FC ? FC.list('accounts') : []).filter(function (a) { return !a.archived; });
    const cs = FC ? FC.list('cards') : [];
    const cats = FC ? FC.list('categories') : [];
    const txs = FC ? FC.list('transactions') : [];

    // Recent categories: most-used over the last 30 txs.
    const counts = {};
    txs.slice(0, 30).forEach(function (t) {
      if (t.categoryId) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    });
    const recent = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);

    setAccounts(accts);
    setCards(cs);
    setCategories(cats);
    setRecentCategoryIds(recent);
    setActiveCurrencies(profile.activeCurrencies || ['EUR']);
    setError('');

    if (id) {
      const tx = FC ? FC.get('transactions', id) : null;
      if (!tx) { setEditId(null); resetForNew(accts, profile); setOpen(true); return; }
      setEditId(id);
      const orig = tx.amountOriginal != null ? tx.amountOriginal : tx.amount;
      setSign(orig < 0 ? '-' : '+');
      setAmount(String(Math.abs(orig)));
      setCurrency(tx.currencyOriginal || tx.currency || 'EUR');
      setDate((tx.date || todayIso()).slice(0, 10));
      // accountId may be the legacy mock-data 'name' or a real id — try to match by name first.
      setAccountId(resolveAccountId(accts, tx));
      setCardId(resolveCardId(cs, tx));
      setCategoryId(tx.categoryId || '');
      setTags(Array.isArray(tx.tags) ? tx.tags.slice() : []);
      setTagDraft('');
      setDescription(tx.description || '');
      setMerchant(tx.merchant || '');
      setIsTransfer(!!tx.transfer || !!tx.transferPairId);
      setTransferToAccountId('');
      setIsRecurring(!!tx.recurringId);
      setRecurringFreq('monthly');
    } else {
      setEditId(null);
      resetForNew(accts, profile);
    }
    setOpen(true);
  }

  function resetForNew(accts, profile) {
    const first = accts[0];
    setSign('-');
    setAmount('');
    setCurrency((first && first.currency) || profile.baseCurrency || 'EUR');
    setDate(todayIso());
    setAccountId(first ? first.id : '');
    setCardId('');
    setCategoryId('');
    setTags([]);
    setTagDraft('');
    setDescription('');
    setMerchant('');
    setIsTransfer(false);
    setTransferToAccountId('');
    setIsRecurring(false);
    setRecurringFreq('monthly');
  }

  // When user changes account, default the currency to that account's currency
  // (only when creating a new tx — don't overwrite an explicit edit).
  R.useEffect(function () {
    if (!open || editId) return;
    const acct = accounts.find(function (a) { return a.id === accountId; });
    if (acct && acct.currency) setCurrency(acct.currency);
    // Reset card if it doesn't belong to the selected account.
    const accountCards = cards.filter(function (c) { return c.accountId === accountId; });
    if (cardId && !accountCards.find(function (c) { return c.id === cardId; })) setCardId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, open]);

  function close() { setOpen(false); }

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const numeric = parseFloat(String(amount).replace(',', '.'));
    if (!isFinite(numeric) || numeric <= 0) { setError('Amount must be a positive number.'); return; }
    if (!accountId) { setError('Pick an account.'); return; }
    if (isTransfer && !transferToAccountId) { setError('Pick the destination account for the transfer.'); return; }
    if (isTransfer && transferToAccountId === accountId) { setError('Transfer source and destination must differ.'); return; }

    const FC = window.FCStore;
    if (!FC) { setError('Store unavailable.'); return; }
    const profile = (window.FCAuth && window.FCAuth.currentProfile()) || {};
    const baseCurrency = profile.baseCurrency || 'EUR';

    const acct = accounts.find(function (a) { return a.id === accountId; });
    const card = cards.find(function (c) { return c.id === cardId; });
    const cat = categories.find(function (c) { return c.id === categoryId; });

    const signed = sign === '-' ? -Math.abs(numeric) : Math.abs(numeric);
    const fxRate = 1; // FX provider not wired in v1 — snapshot 1:1 per spec note.
    const amountBase = currency === baseCurrency ? signed : signed * fxRate;

    const baseSnapshot = {
      profileId: profile.id || null,
      householdId: profile.householdId || null,
      accountId: accountId,
      cardId: card ? card.id : null,
      date: date,
      amountOriginal: signed,
      currencyOriginal: currency,
      amountBase: amountBase,
      fxRateSnapshot: fxRate,
      categoryId: cat ? cat.id : null,
      tags: tags.slice(),
      description: description || '',
      // Mirror fields used by transactions-screen.jsx for rendering.
      amount: signed,
      currency: currency,
      currencyConverted: currency === baseCurrency ? null : amountBase,
      account: acct ? acct.name : '',
      card: card ? (card.name + (card.last4 ? ' •• ' + card.last4 : '')) : null,
      category: cat ? cat.name : '',
      cat_icon: cat ? (cat.icon || '•') : '•',
      merchant: merchant || description || (cat ? cat.name : 'Transaction'),
      transfer: isTransfer || undefined,
      pending: false,
    };

    if (isTransfer) {
      const dest = accounts.find(function (a) { return a.id === transferToAccountId; });
      const pairId = 'pair_' + Math.random().toString(36).slice(2, 10);
      const out = Object.assign({}, baseSnapshot, {
        amount: -Math.abs(numeric),
        amountOriginal: -Math.abs(numeric),
        amountBase: currency === baseCurrency ? -Math.abs(numeric) : -Math.abs(numeric) * fxRate,
        currencyConverted: currency === baseCurrency ? null : -Math.abs(numeric) * fxRate,
        merchant: 'Transfer → ' + (dest ? dest.name : 'Account'),
        transferPairId: pairId,
        transfer: true,
      });
      const inn = Object.assign({}, baseSnapshot, {
        accountId: transferToAccountId,
        account: dest ? dest.name : '',
        card: null,
        cardId: null,
        amount: Math.abs(numeric),
        amountOriginal: Math.abs(numeric),
        amountBase: currency === baseCurrency ? Math.abs(numeric) : Math.abs(numeric) * fxRate,
        currencyConverted: currency === baseCurrency ? null : Math.abs(numeric) * fxRate,
        merchant: 'Transfer ← ' + (acct ? acct.name : 'Account'),
        transferPairId: pairId,
        transfer: true,
      });

      if (editId) {
        // For transfers in edit mode we update the source row only — pairing of legacy
        // transfers may not exist, so we don't try to rewrite the (possibly missing) pair.
        FC.update('transactions', editId, out);
      } else {
        FC.create('transactions', out);
        FC.create('transactions', inn);
      }
    } else {
      if (editId) FC.update('transactions', editId, baseSnapshot);
      else FC.create('transactions', baseSnapshot);
    }

    if (isRecurring) {
      // Best-effort: also create a Recurring rule. Source-of-truth screen is §18.6.
      try {
        FC.create('recurring', {
          name: baseSnapshot.merchant,
          amount: Math.abs(numeric),
          currency: currency,
          freq: recurringFreq,
          nextDate: date,
          accountId: accountId,
          categoryId: cat ? cat.id : null,
          canSkip: true,
        });
      } catch (_) { /* non-blocking */ }
    }

    setOpen(false);
    window.dispatchEvent(new CustomEvent('fc:tx-saved'));
  }

  if (!open) return null;

  const accountCards = cards.filter(function (c) { return c.accountId === accountId; });
  const recentCats = recentCategoryIds
    .map(function (id) { return categories.find(function (c) { return c.id === id; }); })
    .filter(Boolean);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '6vh 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation(); }}
        role="dialog"
        aria-modal="true"
        aria-label={editId ? 'Edit transaction' : 'Add transaction'}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--surface-raised)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-modal)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {editId ? 'Edit transaction' : 'New transaction'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {editId ? 'Update the details and save.' : 'Log a manual entry. Imports stay separate.'}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="fc-btn fc-btn-ghost"
            style={{ width: 32, height: 32, padding: 0 }}
            aria-label="Close"
          >
            <Icon name="plus" size={16} color="currentColor" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Amount + currency */}
            <div>
              <Label>Amount</Label>
              <div style={{
                display: 'flex', alignItems: 'stretch', gap: 8,
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-input)',
                background: 'var(--surface)',
                overflow: 'visible',
                position: 'relative',
              }}>
                <button
                  type="button"
                  onClick={function () { setSign(function (s) { return s === '-' ? '+' : '-'; }); }}
                  title={sign === '-' ? 'Expense — click to flip to income' : 'Income — click to flip to expense'}
                  style={{
                    padding: '0 14px',
                    color: sign === '-' ? 'var(--negative)' : 'var(--positive)',
                    fontSize: 22, fontWeight: 600,
                    borderRight: '1px solid var(--border)',
                    background: 'transparent',
                  }}
                >
                  {sign}
                </button>
                <input
                  className="tabular"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={function (e) { setAmount(e.target.value); }}
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: 28, fontWeight: 600,
                    letterSpacing: '-0.01em',
                    padding: '12px 4px',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={function () { setShowCurrencyPicker(function (v) { return !v; }); }}
                  className="tabular"
                  style={{
                    padding: '0 14px',
                    fontSize: 13, fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'var(--surface-sunken)',
                    borderLeft: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {currency}
                  <Icon name="chevron-down" size={12} />
                </button>
                {showCurrencyPicker && (
                  <>
                    <div
                      onClick={function () { setShowCurrencyPicker(false); }}
                      style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                    />
                    <div className="fc-card" style={{
                      position: 'absolute', right: 0, top: '100%', marginTop: 4,
                      background: 'var(--surface)',
                      boxShadow: 'var(--shadow-modal)',
                      padding: 4, minWidth: 120, zIndex: 10,
                    }}>
                      {activeCurrencies.map(function (c) {
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={function () { setCurrency(c); setShowCurrencyPicker(false); }}
                            className="tabular"
                            style={{
                              display: 'block', width: '100%',
                              padding: '7px 10px', borderRadius: 6,
                              textAlign: 'left', fontSize: 13,
                              background: c === currency ? 'var(--accent-tint)' : 'transparent',
                              color: c === currency ? 'var(--accent)' : 'var(--text-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date + Account row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Date</Label>
                <input
                  type="date"
                  className="fc-input"
                  value={date}
                  onChange={function (e) { setDate(e.target.value); }}
                />
              </div>
              <div>
                <Label>Account</Label>
                <select
                  className="fc-input"
                  value={accountId}
                  onChange={function (e) { setAccountId(e.target.value); }}
                >
                  {accounts.length === 0 && <option value="">No accounts</option>}
                  {accounts.map(function (a) {
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.currency}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Card (only if account has cards) */}
            {accountCards.length > 0 && (
              <div>
                <Label>Card</Label>
                <select
                  className="fc-input"
                  value={cardId}
                  onChange={function (e) { setCardId(e.target.value); }}
                >
                  <option value="">— None —</option>
                  {accountCards.map(function (c) {
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.last4 ? ' •• ' + c.last4 : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Merchant */}
            <div>
              <Label>Merchant / payee</Label>
              <input
                className="fc-input"
                placeholder="e.g. Monoprix"
                value={merchant}
                onChange={function (e) { setMerchant(e.target.value); }}
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              {recentCats.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600,
                    letterSpacing: '0.4px', textTransform: 'uppercase',
                    alignSelf: 'center', marginRight: 2,
                  }}>Recent</span>
                  {recentCats.map(function (c) {
                    const active = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={function () { setCategoryId(c.id); }}
                        style={{
                          padding: '4px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 500,
                          border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                          background: active ? 'var(--accent-tint)' : 'var(--surface-sunken)',
                          color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <span>{c.icon || '•'}</span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map(function (c) {
                  const active = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={function () { setCategoryId(active ? '' : c.id); }}
                      style={{
                        padding: '4px 10px', borderRadius: 999,
                        fontSize: 12, fontWeight: 500,
                        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                        background: active ? 'var(--accent-tint)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span>{c.icon || '•'}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
                {categories.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    No categories yet — add some in Settings.
                  </span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                padding: '6px 8px', minHeight: 36,
                border: '1px solid var(--border)', borderRadius: 'var(--r-input)',
                background: 'var(--surface)',
              }}>
                {tags.map(function (t) {
                  return (
                    <span key={t} style={{
                      padding: '2px 8px', borderRadius: 999,
                      fontSize: 12, fontWeight: 500,
                      background: 'var(--surface-sunken)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      #{t}
                      <button
                        type="button"
                        onClick={function () { setTags(function (xs) { return xs.filter(function (x) { return x !== t; }); }); }}
                        style={{
                          color: 'var(--text-tertiary)', fontSize: 13,
                          padding: 0, background: 'transparent',
                        }}
                        aria-label={'Remove tag ' + t}
                      >×</button>
                    </span>
                  );
                })}
                <input
                  placeholder={tags.length === 0 ? 'Add tag and press Enter' : ''}
                  value={tagDraft}
                  onChange={function (e) { setTagDraft(e.target.value); }}
                  onKeyDown={function (e) {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const t = tagDraft.trim().replace(/^#/, '');
                      if (t && tags.indexOf(t) < 0) setTags(tags.concat([t]));
                      setTagDraft('');
                    } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
                      setTags(tags.slice(0, -1));
                    }
                  }}
                  style={{
                    flex: 1, minWidth: 80,
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description (optional)</Label>
              <textarea
                className="fc-input"
                rows={2}
                value={description}
                onChange={function (e) { setDescription(e.target.value); }}
                placeholder="Anything you'll want to remember later"
                style={{ height: 'auto', padding: 10, resize: 'vertical', minHeight: 56 }}
              />
            </div>

            {/* Toggles row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Toggle
                checked={isTransfer}
                onChange={setIsTransfer}
                label="Mark as transfer"
                hint="Move money between two of your accounts."
              />
              {isTransfer && (
                <div style={{ paddingLeft: 32 }}>
                  <Label>Transfer to</Label>
                  <select
                    className="fc-input"
                    value={transferToAccountId}
                    onChange={function (e) { setTransferToAccountId(e.target.value); }}
                  >
                    <option value="">Pick destination account</option>
                    {accounts.filter(function (a) { return a.id !== accountId; }).map(function (a) {
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.currency}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <Toggle
                checked={isRecurring}
                onChange={setIsRecurring}
                label="Mark as recurring"
                hint="Add a rule that repeats this on a schedule."
              />
              {isRecurring && (
                <div style={{ paddingLeft: 32 }}>
                  <Label>Frequency</Label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['daily', 'weekly', 'monthly', 'yearly'].map(function (f) {
                      const active = recurringFreq === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={function () { setRecurringFreq(f); }}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8,
                            fontSize: 12, fontWeight: 500,
                            border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                            background: active ? 'var(--accent-tint)' : 'var(--surface)',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            textTransform: 'capitalize',
                          }}
                        >{f}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--negative-soft)', color: 'var(--negative)',
                fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="alert" size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-tertiary)' }}>
              Esc to cancel
            </span>
            <button
              type="button"
              onClick={close}
              className="fc-btn fc-btn-secondary"
              style={{ height: 36 }}
            >Cancel</button>
            <button
              type="submit"
              className="fc-btn fc-btn-primary"
              style={{ height: 36 }}
            >
              {editId ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Internal helpers (not exported)

function Label(props) {
  return (
    <label style={{
      display: 'block',
      fontSize: 11, fontWeight: 600,
      letterSpacing: '0.4px', textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: 6,
    }}>{props.children}</label>
  );
}

function Toggle(props) {
  const on = !!props.checked;
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer',
    }}>
      <span
        onClick={function () { props.onChange(!on); }}
        style={{
          width: 36, height: 20, borderRadius: 999,
          background: on ? 'var(--accent)' : 'var(--border-strong)',
          position: 'relative',
          transition: 'background 150ms var(--ease)',
          flex: 'none',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          transition: 'left 150ms var(--ease)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{props.label}</span>
        {props.hint && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{props.hint}</span>
        )}
      </span>
    </label>
  );
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function resolveAccountId(accts, tx) {
  if (!tx) return '';
  if (tx.accountId) {
    const byId = accts.find(function (a) { return a.id === tx.accountId; });
    if (byId) return byId.id;
  }
  if (tx.account) {
    const byName = accts.find(function (a) { return a.name === tx.account; });
    if (byName) return byName.id;
  }
  return accts[0] ? accts[0].id : '';
}

function resolveCardId(cards, tx) {
  if (!tx) return '';
  if (tx.cardId) {
    const byId = cards.find(function (c) { return c.id === tx.cardId; });
    if (byId) return byId.id;
  }
  if (tx.card) {
    // tx.card in legacy shape is a string like "Visa •• 4421"
    const byName = cards.find(function (c) {
      const display = c.name + (c.last4 ? ' •• ' + c.last4 : '');
      return display === tx.card || c.name === tx.card;
    });
    if (byName) return byName.id;
  }
  return '';
}
