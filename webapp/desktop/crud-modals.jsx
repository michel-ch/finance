// CRUD modals — Account / Card / Goal / Budget / Recurring.
// Each modal listens for `fc:edit-<table>` (CustomEvent with optional { id }).
// On save it dispatches `fc:<table>-saved` so screens can refresh.
//
// Visual language matches Settings: surface-raised, --r-modal radius, 480px wide.

(function () {
  const R = React;
  const FC = window.FC || (window.FC = {});

  // ───── helpers ──────────────────────────────────────────────

  function activeCurrencies() {
    const p = window.FCAuth && window.FCAuth.currentProfile();
    const list = p && p.activeCurrencies && p.activeCurrencies.length ? p.activeCurrencies : ['EUR', 'USD', 'GBP'];
    return list.slice();
  }

  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function thisMonth() { return new Date().toISOString().slice(0, 7); }

  function useEditEvent(eventName) {
    const [open, setOpen] = R.useState(false);
    const [editId, setEditId] = R.useState(null);
    R.useEffect(function () {
      function onOpen(e) {
        const detail = (e && e.detail) || {};
        setEditId(detail.id || null);
        setOpen(true);
      }
      window.addEventListener(eventName, onOpen);
      return function () { window.removeEventListener(eventName, onOpen); };
    }, [eventName]);
    R.useEffect(function () {
      if (!open) return;
      function onKey(e) { if (e.key === 'Escape') setOpen(false); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [open]);
    return { open, editId, close: function () { setOpen(false); } };
  }

  function dispatchSaved(table) {
    window.dispatchEvent(new CustomEvent('fc:' + table + '-saved'));
  }

  // ───── shared UI primitives ─────────────────────────────────

  function Modal({ open, onClose, title, subtitle, children }) {
    if (!open) return null;
    return (
      <div
        onMouseDown={function (e) { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '8vh 16px',
        }}
      >
        <div
          role="dialog"
          style={{
            width: '100%', maxWidth: 480,
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-modal)',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '20px 24px 8px' }}>
            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 600,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          <div style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  function Field({ label, hint, children }) {
    return (
      <div>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6,
        }}>{label}</label>
        {children}
        {hint && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
      </div>
    );
  }

  function Row({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>;
  }

  function Footer({ onCancel, onSave, onDelete, saveLabel, busy }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        {onDelete && (
          <button type="button" className="fc-btn fc-btn-ghost" onClick={onDelete}
            style={{ color: 'var(--negative)' }}>Delete</button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="fc-btn fc-btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="fc-btn fc-btn-primary" onClick={onSave} disabled={busy}>
          {saveLabel || 'Save'}
        </button>
      </div>
    );
  }

  function Chip({ label, on, onClick }) {
    return (
      <button type="button" onClick={onClick} style={{
        height: 30, padding: '0 12px', borderRadius: 999,
        border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
        background: on ? 'var(--accent-tint)' : 'var(--surface-sunken)',
        color: on ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>{label}</button>
    );
  }

  function Toggle({ on, onChange }) {
    return (
      <button type="button" onClick={function () { onChange(!on); }} style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--border-strong)',
        position: 'relative', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 8,
          background: 'var(--surface)', transition: 'left 150ms var(--ease)',
        }} />
      </button>
    );
  }

  function ToggleField({ label, hint, on, onChange }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Toggle on={on} onChange={onChange} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          {hint && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{hint}</div>}
        </div>
      </div>
    );
  }

  // ───── 1. Account ───────────────────────────────────────────

  FC.AccountFormModal = function AccountFormModal() {
    const ev = useEditEvent('fc:edit-account');
    const isEdit = !!ev.editId;
    const currencies = activeCurrencies();
    const empty = function () {
      return {
        name: '', type: 'checking', currency: currencies[0] || 'EUR',
        openingBalance: '', openingDate: todayIso(), archived: false,
      };
    };
    const [form, setForm] = R.useState(empty);
    const [err, setErr] = R.useState('');

    R.useEffect(function () {
      if (!ev.open) { setErr(''); return; }
      if (ev.editId) {
        const row = window.FCStore.get('accounts', ev.editId);
        if (row) {
          setForm({
            name: row.name || '',
            type: row.type || 'checking',
            currency: row.currency || (currencies[0] || 'EUR'),
            openingBalance: row.openingBalance != null ? String(row.openingBalance) : '',
            openingDate: (row.openingDate || todayIso()).slice(0, 10),
            archived: !!row.archived,
          });
        }
      } else {
        setForm(empty());
      }
    }, [ev.open, ev.editId]);

    function set(k, v) { setForm(function (f) { return Object.assign({}, f, { [k]: v }); }); }

    function save() {
      if (!form.name.trim()) { setErr('Name is required.'); return; }
      const bal = parseFloat(form.openingBalance);
      if (isNaN(bal)) { setErr('Opening balance must be a number.'); return; }
      const patch = {
        name: form.name.trim(),
        type: form.type,
        currency: form.currency,
        openingBalance: bal,
        openingDate: form.openingDate,
      };
      if (isEdit) {
        // Currency is immutable post-create, never include it in update.
        delete patch.currency;
        patch.archived = !!form.archived;
        window.FCStore.update('accounts', ev.editId, patch);
      } else {
        patch.archived = false;
        patch.balance = bal; // mirror for legacy screen consumers
        window.FCStore.create('accounts', patch);
      }
      dispatchSaved('account');
      ev.close();
    }

    function del() {
      if (!isEdit) return;
      if (!confirm('Delete this account? Linked transactions are kept.')) return;
      window.FCStore.remove('accounts', ev.editId);
      dispatchSaved('account');
      ev.close();
    }

    const types = ['checking', 'savings', 'brokerage', 'cash', 'crypto'];

    return (
      <Modal
        open={ev.open}
        onClose={ev.close}
        title={isEdit ? 'Edit account' : 'New account'}
        subtitle={isEdit ? 'Currency is immutable after creation.' : 'Real-world money container.'}
      >
        <Field label="Name">
          <input className="fc-input" value={form.name}
            onChange={function (e) { set('name', e.target.value); }} autoFocus />
        </Field>

        <Field label="Type">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {types.map(function (t) {
              return <Chip key={t} label={t} on={form.type === t} onClick={function () { set('type', t); }} />;
            })}
          </div>
        </Field>

        <Row>
          <Field label="Currency" hint={isEdit ? 'Immutable.' : null}>
            <select className="fc-input" value={form.currency} disabled={isEdit}
              onChange={function (e) { set('currency', e.target.value); }}>
              {currencies.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
          </Field>
          <Field label="Opening date">
            <input type="date" className="fc-input" value={form.openingDate}
              onChange={function (e) { set('openingDate', e.target.value); }} />
          </Field>
        </Row>

        <Field label="Opening balance">
          <input className="fc-input tabular" inputMode="decimal" value={form.openingBalance}
            onChange={function (e) { set('openingBalance', e.target.value); }} placeholder="0.00" />
        </Field>

        {isEdit && (
          <ToggleField label="Archived" hint="Hidden from lists; data retained."
            on={form.archived} onChange={function (v) { set('archived', v); }} />
        )}

        {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}

        <Footer onCancel={ev.close} onSave={save} onDelete={isEdit ? del : null}
          saveLabel={isEdit ? 'Save' : 'Create account'} />
      </Modal>
    );
  };

  // ───── 2. Card ──────────────────────────────────────────────

  FC.CardFormModal = function CardFormModal() {
    const ev = useEditEvent('fc:edit-card');
    const isEdit = !!ev.editId;
    const [accounts, setAccounts] = R.useState(function () { return window.FCStore.list('accounts') || []; });
    const empty = function () {
      const a = window.FCStore.list('accounts') || [];
      return {
        accountId: a.length ? a[0].id : '',
        kind: 'debit', billingDay: '15', creditLimit: '',
        name: '', last4: '',
      };
    };
    const [form, setForm] = R.useState(empty);
    const [err, setErr] = R.useState('');

    R.useEffect(function () {
      if (!ev.open) { setErr(''); return; }
      const fresh = window.FCStore.list('accounts') || [];
      setAccounts(fresh);
      if (ev.editId) {
        const row = window.FCStore.get('cards', ev.editId);
        if (row) {
          setForm({
            accountId: row.accountId || (accounts.length ? accounts[0].id : ''),
            kind: row.kind || 'debit',
            billingDay: row.billingDay != null ? String(row.billingDay) : '15',
            creditLimit: row.creditLimit != null ? String(row.creditLimit) : (row.limit != null ? String(row.limit) : ''),
            name: row.name || '',
            last4: row.last4 || '',
          });
        }
      } else {
        setForm(empty());
      }
    }, [ev.open, ev.editId]);

    function set(k, v) { setForm(function (f) { return Object.assign({}, f, { [k]: v }); }); }

    function save() {
      if (!form.accountId) { setErr('Pick a linked account.'); return; }
      if (!form.name.trim()) { setErr('Card name is required.'); return; }
      const acc = accounts.find(function (a) { return a.id === form.accountId; });
      const patch = {
        accountId: form.accountId,
        accountName: acc ? acc.name : '',
        kind: form.kind,
        name: form.name.trim(),
        last4: (form.last4 || '').replace(/\D/g, '').slice(-4),
      };
      if (form.kind === 'credit') {
        const day = parseInt(form.billingDay, 10);
        if (isNaN(day) || day < 1 || day > 31) { setErr('Billing day must be 1–31.'); return; }
        const lim = parseFloat(form.creditLimit);
        if (isNaN(lim) || lim <= 0) { setErr('Credit limit is required for credit cards.'); return; }
        patch.billingDay = day;
        patch.creditLimit = lim;
        patch.limit = lim;
      } else {
        patch.billingDay = null;
        patch.creditLimit = null;
      }
      if (isEdit) window.FCStore.update('cards', ev.editId, patch);
      else        window.FCStore.create('cards', patch);
      dispatchSaved('card');
      ev.close();
    }

    function del() {
      if (!isEdit) return;
      if (!confirm('Delete this card?')) return;
      window.FCStore.remove('cards', ev.editId);
      dispatchSaved('card');
      ev.close();
    }

    return (
      <Modal
        open={ev.open}
        onClose={ev.close}
        title={isEdit ? 'Edit card' : 'New card'}
        subtitle="Payment instrument tied to an account."
      >
        <Field label="Linked account">
          <select className="fc-input" value={form.accountId}
            onChange={function (e) { set('accountId', e.target.value); }}>
            {accounts.length === 0 && <option value="">(no accounts — create one first)</option>}
            {accounts.map(function (a) {
              return <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>;
            })}
          </select>
        </Field>

        <Field label="Kind">
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip label="Debit"  on={form.kind === 'debit'}  onClick={function () { set('kind', 'debit'); }} />
            <Chip label="Credit" on={form.kind === 'credit'} onClick={function () { set('kind', 'credit'); }} />
          </div>
        </Field>

        <Row>
          <Field label="Card name">
            <input className="fc-input" value={form.name}
              onChange={function (e) { set('name', e.target.value); }} placeholder="Visa Premier" />
          </Field>
          <Field label="Last 4">
            <input className="fc-input tabular" value={form.last4} maxLength={4} inputMode="numeric"
              onChange={function (e) { set('last4', e.target.value); }} placeholder="4421" />
          </Field>
        </Row>

        {form.kind === 'credit' && (
          <Row>
            <Field label="Billing day" hint="Day of month (1–31)">
              <input className="fc-input tabular" inputMode="numeric" value={form.billingDay}
                onChange={function (e) { set('billingDay', e.target.value); }} />
            </Field>
            <Field label="Credit limit">
              <input className="fc-input tabular" inputMode="decimal" value={form.creditLimit}
                onChange={function (e) { set('creditLimit', e.target.value); }} placeholder="4000" />
            </Field>
          </Row>
        )}

        {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}

        <Footer onCancel={ev.close} onSave={save} onDelete={isEdit ? del : null}
          saveLabel={isEdit ? 'Save' : 'Create card'} />
      </Modal>
    );
  };

  // ───── 3. Goal ──────────────────────────────────────────────

  FC.GoalFormModal = function GoalFormModal() {
    const ev = useEditEvent('fc:edit-goal');
    const isEdit = !!ev.editId;
    const currencies = activeCurrencies();
    const [accounts, setAccounts] = R.useState(function () { return window.FCStore.list('accounts') || []; });
    const [categories, setCategories] = R.useState(function () { return window.FCStore.list('categories') || []; });
    R.useEffect(function () {
      if (!ev.open) return;
      setAccounts(window.FCStore.list('accounts') || []);
      setCategories(window.FCStore.list('categories') || []);
    }, [ev.open]);

    const empty = function () {
      return {
        title: '', type: 'save',
        target: '', currency: currencies[0] || 'EUR',
        deadline: '', linkedAccountId: '', linkedCategoryId: '',
        contribMonthly: '',
      };
    };
    const [form, setForm] = R.useState(empty);
    const [err, setErr] = R.useState('');

    R.useEffect(function () {
      if (!ev.open) { setErr(''); return; }
      if (ev.editId) {
        const row = window.FCStore.get('goals', ev.editId);
        if (row) {
          setForm({
            title: row.title || '',
            type: row.type || 'save',
            target: row.target != null ? String(row.target) : '',
            currency: row.currency || (currencies[0] || 'EUR'),
            deadline: (row.deadline || '').slice(0, 10),
            linkedAccountId: row.linkedAccountId || '',
            linkedCategoryId: row.linkedCategoryId || '',
            contribMonthly: row.contribMonthly != null ? String(row.contribMonthly) : '',
          });
        }
      } else {
        setForm(empty());
      }
    }, [ev.open, ev.editId]);

    function set(k, v) { setForm(function (f) { return Object.assign({}, f, { [k]: v }); }); }

    function save() {
      if (!form.title.trim()) { setErr('Title is required.'); return; }
      const tgt = parseFloat(form.target);
      if (isNaN(tgt) || tgt <= 0) { setErr('Target must be a positive number.'); return; }
      if (!form.deadline) { setErr('Deadline is required.'); return; }
      const contrib = form.contribMonthly === '' ? 0 : parseFloat(form.contribMonthly);
      if (isNaN(contrib) || contrib < 0) { setErr('Monthly contribution must be a number.'); return; }

      const patch = {
        title: form.title.trim(),
        type: form.type,
        target: tgt,
        currency: form.currency,
        deadline: form.deadline,
        linkedAccountId: form.linkedAccountId || null,
        linkedCategoryId: form.linkedCategoryId || null,
        contribMonthly: contrib,
      };
      if (isEdit) {
        window.FCStore.update('goals', ev.editId, patch);
      } else {
        patch.current = 0;
        patch.status = 'on-track';
        patch.icon = '🎯';
        window.FCStore.create('goals', patch);
      }
      dispatchSaved('goal');
      ev.close();
    }

    function del() {
      if (!isEdit) return;
      if (!confirm('Delete this goal?')) return;
      window.FCStore.remove('goals', ev.editId);
      dispatchSaved('goal');
      ev.close();
    }

    const needsAccount = form.type === 'save' || form.type === 'pay-off';
    const needsCategory = form.type === 'cap-spend';

    const typeLabels = {
      save: 'Save by date',
      'pay-off': 'Pay off liability',
      'cap-spend': 'Cap spending',
      'net-worth': 'Reach net worth',
    };

    return (
      <Modal
        open={ev.open}
        onClose={ev.close}
        title={isEdit ? 'Edit goal' : 'New goal'}
      >
        <Field label="Title">
          <input className="fc-input" value={form.title} autoFocus
            onChange={function (e) { set('title', e.target.value); }} placeholder="Tokyo trip" />
        </Field>

        <Field label="Type">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(typeLabels).map(function (t) {
              return <Chip key={t} label={typeLabels[t]} on={form.type === t} onClick={function () { set('type', t); }} />;
            })}
          </div>
        </Field>

        <Row>
          <Field label="Target amount">
            <input className="fc-input tabular" inputMode="decimal" value={form.target}
              onChange={function (e) { set('target', e.target.value); }} placeholder="4000" />
          </Field>
          <Field label="Currency">
            <select className="fc-input" value={form.currency}
              onChange={function (e) { set('currency', e.target.value); }}>
              {currencies.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Deadline">
            <input type="date" className="fc-input" value={form.deadline}
              onChange={function (e) { set('deadline', e.target.value); }} />
          </Field>
          <Field label="Per month">
            <input className="fc-input tabular" inputMode="decimal" value={form.contribMonthly}
              onChange={function (e) { set('contribMonthly', e.target.value); }} placeholder="250" />
          </Field>
        </Row>

        {needsAccount && (
          <Field label="Linked account" hint="Where contributions land.">
            <select className="fc-input" value={form.linkedAccountId}
              onChange={function (e) { set('linkedAccountId', e.target.value); }}>
              <option value="">— none</option>
              {accounts.map(function (a) {
                return <option key={a.id} value={a.id}>{a.name}</option>;
              })}
            </select>
          </Field>
        )}

        {needsCategory && (
          <Field label="Linked category" hint="Spending in this category counts.">
            <select className="fc-input" value={form.linkedCategoryId}
              onChange={function (e) { set('linkedCategoryId', e.target.value); }}>
              <option value="">— none</option>
              {categories.map(function (c) {
                return <option key={c.id} value={c.id}>{c.name}</option>;
              })}
            </select>
          </Field>
        )}

        {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}

        <Footer onCancel={ev.close} onSave={save} onDelete={isEdit ? del : null}
          saveLabel={isEdit ? 'Save' : 'Create goal'} />
      </Modal>
    );
  };

  // ───── 4. Budget ────────────────────────────────────────────

  FC.BudgetFormModal = function BudgetFormModal() {
    const ev = useEditEvent('fc:edit-budget');
    const isEdit = !!ev.editId;
    const currencies = activeCurrencies();
    const [categories, setCategories] = R.useState(function () { return window.FCStore.list('categories') || []; });
    R.useEffect(function () { if (ev.open) setCategories(window.FCStore.list('categories') || []); }, [ev.open]);

    const empty = function () {
      return {
        categoryId: categories.length ? categories[0].id : '',
        month: thisMonth(),
        amount: '',
        currency: currencies[0] || 'EUR',
        isHard: false,
        rollover: false,
      };
    };
    const [form, setForm] = R.useState(empty);
    const [err, setErr] = R.useState('');

    R.useEffect(function () {
      if (!ev.open) { setErr(''); return; }
      if (ev.editId) {
        const row = window.FCStore.get('budgets', ev.editId);
        if (row) {
          setForm({
            categoryId: row.categoryId || (categories.length ? categories[0].id : ''),
            month: (row.month || thisMonth()).slice(0, 7),
            amount: row.amount != null ? String(row.amount) : (row.budget != null ? String(row.budget) : ''),
            currency: row.currency || (currencies[0] || 'EUR'),
            isHard: !!(row.isHard || row.hard),
            rollover: !!row.rollover,
          });
        }
      } else {
        setForm(empty());
      }
    }, [ev.open, ev.editId]);

    function set(k, v) { setForm(function (f) { return Object.assign({}, f, { [k]: v }); }); }

    function save() {
      if (!form.categoryId) { setErr('Pick a category.'); return; }
      const amt = parseFloat(form.amount);
      if (isNaN(amt) || amt < 0) { setErr('Amount must be a non-negative number.'); return; }
      const cat = categories.find(function (c) { return c.id === form.categoryId; });
      const patch = {
        categoryId: form.categoryId,
        month: form.month,
        amount: amt,
        currency: form.currency,
        isHard: form.isHard,
        rollover: form.rollover,
        // legacy mirrors for screens using old shape
        cat: cat ? cat.name : '',
        icon: cat ? cat.icon : '◯',
        budget: amt,
        spent: 0,
        hard: form.isHard,
      };
      if (isEdit) window.FCStore.update('budgets', ev.editId, patch);
      else        window.FCStore.create('budgets', patch);
      dispatchSaved('budget');
      ev.close();
    }

    function del() {
      if (!isEdit) return;
      if (!confirm('Delete this budget envelope?')) return;
      window.FCStore.remove('budgets', ev.editId);
      dispatchSaved('budget');
      ev.close();
    }

    return (
      <Modal
        open={ev.open}
        onClose={ev.close}
        title={isEdit ? 'Edit budget' : 'New budget'}
        subtitle="Monthly envelope per category."
      >
        <Field label="Category">
          <select className="fc-input" value={form.categoryId}
            onChange={function (e) { set('categoryId', e.target.value); }}>
            {categories.length === 0 && <option value="">(no categories yet)</option>}
            {categories.map(function (c) {
              return <option key={c.id} value={c.id}>{c.icon ? c.icon + ' ' : ''}{c.name}</option>;
            })}
          </select>
        </Field>

        <Row>
          <Field label="Month">
            <input type="month" className="fc-input" value={form.month}
              onChange={function (e) { set('month', e.target.value); }} />
          </Field>
          <Field label="Currency">
            <select className="fc-input" value={form.currency}
              onChange={function (e) { set('currency', e.target.value); }}>
              {currencies.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
          </Field>
        </Row>

        <Field label="Amount">
          <input className="fc-input tabular" inputMode="decimal" value={form.amount}
            onChange={function (e) { set('amount', e.target.value); }} placeholder="0.00" />
        </Field>

        <ToggleField label="Hard cap" hint="Block, don't just warn."
          on={form.isHard} onChange={function (v) { set('isHard', v); }} />
        <ToggleField label="Rollover" hint="Carry unused amount to next month."
          on={form.rollover} onChange={function (v) { set('rollover', v); }} />

        {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}

        <Footer onCancel={ev.close} onSave={save} onDelete={isEdit ? del : null}
          saveLabel={isEdit ? 'Save' : 'Create budget'} />
      </Modal>
    );
  };

  // ───── 5. Recurring ────────────────────────────────────────

  FC.RecurringFormModal = function RecurringFormModal() {
    const ev = useEditEvent('fc:edit-recurring');
    const isEdit = !!ev.editId;
    const currencies = activeCurrencies();
    const [accounts, setAccounts] = R.useState(function () { return window.FCStore.list('accounts') || []; });
    const [categories, setCategories] = R.useState(function () { return window.FCStore.list('categories') || []; });
    R.useEffect(function () {
      if (!ev.open) return;
      setAccounts(window.FCStore.list('accounts') || []);
      setCategories(window.FCStore.list('categories') || []);
    }, [ev.open]);

    const empty = function () {
      return {
        name: '',
        amount: '', currency: currencies[0] || 'EUR',
        freq: 'monthly',
        nextDate: todayIso(),
        accountId: accounts.length ? accounts[0].id : '',
        categoryId: '',
        endDate: '',
        canSkip: true,
      };
    };
    const [form, setForm] = R.useState(empty);
    const [err, setErr] = R.useState('');

    R.useEffect(function () {
      if (!ev.open) { setErr(''); return; }
      if (ev.editId) {
        const row = window.FCStore.get('recurring', ev.editId);
        if (row) {
          setForm({
            name: row.name || '',
            amount: row.amount != null ? String(row.amount) : '',
            currency: row.currency || (currencies[0] || 'EUR'),
            freq: row.freq || 'monthly',
            nextDate: (row.nextDate || row.date || todayIso()).slice(0, 10),
            accountId: row.accountId || (accounts.length ? accounts[0].id : ''),
            categoryId: row.categoryId || '',
            endDate: (row.endDate || '').slice(0, 10),
            canSkip: row.canSkip !== false,
          });
        }
      } else {
        setForm(empty());
      }
    }, [ev.open, ev.editId]);

    function set(k, v) { setForm(function (f) { return Object.assign({}, f, { [k]: v }); }); }

    function save() {
      if (!form.name.trim()) { setErr('Name is required.'); return; }
      const amt = parseFloat(form.amount);
      if (isNaN(amt) || amt <= 0) { setErr('Amount must be positive.'); return; }
      if (!form.nextDate) { setErr('Next date is required.'); return; }
      const acc = accounts.find(function (a) { return a.id === form.accountId; });
      const patch = {
        name: form.name.trim(),
        amount: amt,
        currency: form.currency,
        freq: form.freq,
        nextDate: form.nextDate,
        accountId: form.accountId || null,
        account: acc ? acc.name : '',
        categoryId: form.categoryId || null,
        endDate: form.endDate || null,
        canSkip: !!form.canSkip,
        icon: '◇',
        // legacy mirror
        date: form.nextDate,
      };
      if (isEdit) window.FCStore.update('recurring', ev.editId, patch);
      else        window.FCStore.create('recurring', patch);
      dispatchSaved('recurring');
      ev.close();
    }

    function del() {
      if (!isEdit) return;
      if (!confirm('Delete this recurring rule?')) return;
      window.FCStore.remove('recurring', ev.editId);
      dispatchSaved('recurring');
      ev.close();
    }

    const freqs = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

    return (
      <Modal
        open={ev.open}
        onClose={ev.close}
        title={isEdit ? 'Edit recurring' : 'New recurring rule'}
      >
        <Field label="Name">
          <input className="fc-input" value={form.name} autoFocus
            onChange={function (e) { set('name', e.target.value); }} placeholder="Spotify Family" />
        </Field>

        <Row>
          <Field label="Amount">
            <input className="fc-input tabular" inputMode="decimal" value={form.amount}
              onChange={function (e) { set('amount', e.target.value); }} placeholder="0.00" />
          </Field>
          <Field label="Currency">
            <select className="fc-input" value={form.currency}
              onChange={function (e) { set('currency', e.target.value); }}>
              {currencies.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
          </Field>
        </Row>

        <Field label="Frequency">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {freqs.map(function (f) {
              return <Chip key={f} label={f} on={form.freq === f} onClick={function () { set('freq', f); }} />;
            })}
          </div>
        </Field>

        <Row>
          <Field label="Next date">
            <input type="date" className="fc-input" value={form.nextDate}
              onChange={function (e) { set('nextDate', e.target.value); }} />
          </Field>
          <Field label="End date" hint="Optional">
            <input type="date" className="fc-input" value={form.endDate}
              onChange={function (e) { set('endDate', e.target.value); }} />
          </Field>
        </Row>

        <Field label="Account">
          <select className="fc-input" value={form.accountId}
            onChange={function (e) { set('accountId', e.target.value); }}>
            {accounts.length === 0 && <option value="">(no accounts yet)</option>}
            {accounts.map(function (a) {
              return <option key={a.id} value={a.id}>{a.name}</option>;
            })}
          </select>
        </Field>

        <Field label="Category">
          <select className="fc-input" value={form.categoryId}
            onChange={function (e) { set('categoryId', e.target.value); }}>
            <option value="">— none</option>
            {categories.map(function (c) {
              return <option key={c.id} value={c.id}>{c.icon ? c.icon + ' ' : ''}{c.name}</option>;
            })}
          </select>
        </Field>

        <ToggleField label="Allow skip" hint="Lets you skip the next occurrence without deleting the rule."
          on={form.canSkip} onChange={function (v) { set('canSkip', v); }} />

        {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}

        <Footer onCancel={ev.close} onSave={save} onDelete={isEdit ? del : null}
          saveLabel={isEdit ? 'Save' : 'Create rule'} />
      </Modal>
    );
  };

  // ───── Mount helper — exposed so page.js can render all 5 in one go.

  FC.CrudModals = function CrudModals() {
    return (
      <>
        <FC.AccountFormModal />
        <FC.CardFormModal />
        <FC.GoalFormModal />
        <FC.BudgetFormModal />
        <FC.RecurringFormModal />
      </>
    );
  };
})();
