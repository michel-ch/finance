// Settings screen — implements all 9 sections from master-spec §18.12.
// 1) User  2) Currencies  3) Categories  4) Import templates
// 5) Recurring rules  6) Backup  7) Appearance  8) Privacy  9) About

(function () {
  var R = React;
  var FC = window.FC;
  var Icon = FC.Icon;

  var ALL_CURRENCIES = [
    'EUR','USD','GBP','CHF','JPY','CAD','AUD','SEK','NOK','DKK',
    'PLN','CZK','HUF','RON','BGN','HRK','TRY','ILS','HKD','SGD',
    'NZD','MXN','BRL','ZAR','INR','KRW','CNY','AED','SAR',
  ];

  function Section(p) {
    return R.createElement('section', {
      style: {
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, marginBottom: 16,
      }
    },
      R.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
        p.icon && R.createElement(Icon, { name: p.icon, size: 16, color: 'var(--text-tertiary)' }),
        R.createElement('h2', {
          style: { margin: 0, fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' },
        }, p.title)
      ),
      p.subtitle && R.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 } }, p.subtitle),
      R.createElement('div', { style: { marginTop: p.subtitle ? 0 : 16 } }, p.children)
    );
  }

  function Field(p) {
    return R.createElement('div', { style: { marginBottom: 14 } },
      R.createElement('label', {
        style: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 },
      }, p.label),
      p.children,
      p.hint && R.createElement('div', { style: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 } }, p.hint)
    );
  }

  function Input(p) {
    return R.createElement('input', Object.assign({
      className: 'fc-input',
      style: { width: '100%' },
    }, p));
  }

  function Btn(p) {
    var variant = p.variant || 'secondary';
    var className = 'fc-btn fc-btn-' + variant;
    var props = Object.assign({}, p);
    delete props.variant;
    return R.createElement('button', Object.assign({ className: className, type: 'button' }, props), p.children);
  }

  function Toggle({ on, onChange, label }) {
    return R.createElement('button', {
      type: 'button',
      onClick: function () { onChange(!on); },
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, color: 'var(--text-primary)', fontSize: 14,
      },
    },
      R.createElement('span', {
        style: {
          width: 38, height: 22, borderRadius: 999,
          background: on ? 'var(--accent)' : 'var(--border-strong)',
          position: 'relative', transition: 'background 150ms var(--ease)',
        },
      },
        R.createElement('span', {
          style: {
            position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 8,
            background: 'var(--surface)', transition: 'left 150ms var(--ease)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          },
        })
      ),
      label && R.createElement('span', null, label)
    );
  }

  function Chip({ label, on, onClick }) {
    return R.createElement('button', {
      type: 'button',
      onClick: onClick,
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 28, padding: '0 12px', borderRadius: 999,
        border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
        background: on ? 'var(--accent-tint)' : 'var(--surface-sunken)',
        color: on ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', userSelect: 'none',
      },
    }, label);
  }

  FC.SettingsScreen = function SettingsScreen(props) {
    var profile = window.FCAuth.currentProfile() || {};
    var s1 = R.useState(profile);
    var p = s1[0], setProfile = s1[1];

    var s2 = R.useState('saved');
    var savedAt = s2[0], setSavedAt = s2[1];

    function update(patch) {
      var next = Object.assign({}, p, patch);
      setProfile(next);
      window.FCAuth.updateProfile(patch);
      setSavedAt(new Date().toLocaleTimeString());
    }

    function toggleCurrency(code) {
      var current = (p.activeCurrencies || []).slice();
      var i = current.indexOf(code);
      if (i >= 0) {
        if (code === p.baseCurrency) return alert('Base currency cannot be removed.');
        var inUse = (window.FCStore.list('accounts') || []).filter(function (a) {
          return a.currency === code && !a.archived;
        });
        if (inUse.length > 0) {
          var names = inUse.map(function (a) { return a.name; }).join(', ');
          var ok = confirm(inUse.length + ' account' + (inUse.length === 1 ? ' uses' : 's use') + ' ' + code + ': ' + names + '. Archive ' + (inUse.length === 1 ? 'it' : 'them') + ' before removing the currency.\n\nRemove ' + code + ' anyway?');
          if (!ok) return;
        }
        current.splice(i, 1);
      } else current.push(code);
      update({ activeCurrencies: current });
    }

    function exportBackup() {
      var blob = window.FCStore.snapshot();
      if (!blob) return;
      var data = JSON.stringify(blob, null, 2);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = 'finch-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    }

    function importBackup(e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          window.FCStore.restore(JSON.parse(reader.result));
          alert('Backup restored. Reloading…');
          location.reload();
        } catch (ex) { alert('Restore failed: ' + ex.message); }
      };
      reader.readAsText(f);
    }

    function clearAllData() {
      if (!confirm('Clear all accounts, transactions, goals, budgets, recurring rules, and holdings for this profile? Categories and your account credentials are kept. This cannot be undone.')) return;
      ['accounts', 'cards', 'transactions', 'goals', 'budgets', 'recurring', 'holdings', 'dcaPlans', 'importStaging']
        .forEach(function (t) { window.FCStore.set(t, []); });
      location.reload();
    }

    function setPin() {
      var pin = prompt('Set 4-digit PIN (leave blank to remove):');
      if (pin === null) return;
      if (pin && !/^\d{4}$/.test(pin)) return alert('PIN must be 4 digits.');
      window.FCAuth.setPin(pin || null);
      setProfile(Object.assign({}, p, { pin: pin ? '***' : null }));
    }

    function logout() {
      if (!confirm('Sign out?')) return;
      window.FCAuth.logout();
      location.replace('../login.html');
    }

    function deleteAccount() {
      if (!confirm('Permanently delete this profile and all of its data? This cannot be undone.')) return;
      var profiles = window.FCAuth.listProfiles().filter(function (x) { return x.id !== p.id; });
      // Remove all per-profile keys.
      Object.keys(localStorage).filter(function (k) { return k.indexOf('fc.data.' + p.id + '.') === 0; }).forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem('fc.profiles.v1', JSON.stringify(profiles));
      window.FCAuth.logout();
      location.replace('../login.html');
    }

    var categories = (window.FCStore && window.FCStore.list('categories')) || [];

    return R.createElement('div', null,
      R.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 } },
        R.createElement('div', null,
          R.createElement('div', { style: { fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 } }, 'Settings'),
          R.createElement('h1', { style: { margin: '4px 0 0', fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em' } }, 'Cabinet preferences')
        ),
        R.createElement('div', { style: { fontSize: 12, color: 'var(--text-tertiary)' } }, 'Last saved ' + savedAt)
      ),

      // 1. User
      R.createElement(Section, { title: 'User', subtitle: 'Display name and account credentials.', icon: 'wallet' },
        R.createElement(Field, { label: 'Display name' },
          R.createElement(Input, { value: p.name || '', onChange: function (e) { update({ name: e.target.value, initials: (e.target.value || 'U').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase() }); } })),
        R.createElement(Field, { label: 'Email' },
          R.createElement(Input, { value: p.email || '', onChange: function (e) { update({ email: e.target.value }); } })),
        R.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' } },
          R.createElement(Btn, { variant: 'secondary', onClick: setPin }, p.pin ? 'Change PIN' : 'Set up PIN'),
          R.createElement(Btn, { variant: 'secondary', onClick: logout }, 'Sign out'),
          R.createElement(Btn, { variant: 'ghost', onClick: deleteAccount, style: { color: 'var(--negative)' } }, 'Delete profile')
        )
      ),

      // 2. Currencies
      R.createElement(Section, { title: 'Currencies', subtitle: 'Base currency for totals; active currencies show in pickers.', icon: 'coins' },
        R.createElement(Field, { label: 'Base currency' },
          R.createElement('select', {
            className: 'fc-input', style: { width: 220 }, value: p.baseCurrency || 'EUR',
            onChange: function (e) { update({ baseCurrency: e.target.value }); }
          },
            ALL_CURRENCIES.map(function (c) { return R.createElement('option', { key: c, value: c }, c); })
          )
        ),
        R.createElement(Field, { label: 'Active currencies', hint: 'Click to toggle. Base currency is always active.' },
          R.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            ALL_CURRENCIES.map(function (c) {
              var on = (p.activeCurrencies || []).indexOf(c) >= 0;
              return R.createElement(Chip, { key: c, label: c, on: on, onClick: function () { toggleCurrency(c); } });
            })
          )
        )
      ),

      // 3. Categories
      R.createElement(Section, { title: 'Categories', subtitle: 'Used by transactions and budgets.', icon: 'pie' },
        R.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 12 } },
          categories.map(function (c) {
            return R.createElement('div', {
              key: c.id,
              style: {
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-sunken)', fontSize: 13,
              },
            },
              R.createElement('span', { style: { fontSize: 14 } }, c.icon),
              R.createElement('span', { style: { flex: 1 } }, c.name),
              R.createElement('button', {
                onClick: function () {
                  var rows = window.FCStore.list('categories').filter(function (r) { return r.id !== c.id; });
                  window.FCStore.set('categories', rows);
                  setProfile(Object.assign({}, p));
                },
                title: 'Remove',
                style: { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' },
              }, '×')
            );
          })
        ),
        R.createElement('form', {
          onSubmit: function (e) {
            e.preventDefault();
            var fd = new FormData(e.target);
            var name = (fd.get('name') || '').toString().trim();
            var icon = (fd.get('icon') || '').toString().trim() || '•';
            if (!name) return;
            window.FCStore.create('categories', { name: name, icon: icon, color: '#6b7280' });
            e.target.reset();
            setProfile(Object.assign({}, p));
          },
          style: { display: 'flex', gap: 8 },
        },
          R.createElement(Input, { name: 'icon', placeholder: '🏷', style: { width: 60 } }),
          R.createElement(Input, { name: 'name', placeholder: 'New category name', style: { flex: 1 } }),
          R.createElement(Btn, { variant: 'primary', type: 'submit' }, 'Add')
        )
      ),

      // 4. Import templates
      R.createElement(Section, { title: 'Import templates', subtitle: 'Saved column mappings per bank.', icon: 'upload' },
        R.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 } },
          (window.FCStore.list('importTemplates') || []).length
            ? null
            : 'No saved templates yet. Use Import → Custom CSV → Save as template.'
        ),
        R.createElement(Btn, { variant: 'secondary', onClick: function () { location.href = 'import.html'; } }, 'Open Import')
      ),

      // 5. Recurring rules
      R.createElement(Section, { title: 'Recurring rules', subtitle: 'Auto-categorize matching transactions on import.', icon: 'repeat' },
        R.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, 'Pattern → category mapping. Comes online with bank import.')
      ),

      // 6. Backup
      R.createElement(Section, { title: 'Backup', subtitle: 'Export all data as JSON. Import to restore.', icon: 'upload' },
        R.createElement('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          R.createElement(Btn, { variant: 'primary', onClick: exportBackup }, 'Export as JSON'),
          R.createElement('label', { className: 'fc-btn fc-btn-secondary', style: { cursor: 'pointer' } },
            'Restore from JSON',
            R.createElement('input', { type: 'file', accept: 'application/json', onChange: importBackup, style: { display: 'none' } })
          ),
          R.createElement(Btn, { variant: 'ghost', onClick: clearAllData, style: { color: 'var(--negative)' } }, 'Clear all data')
        )
      ),

      // 7. Appearance
      R.createElement(Section, { title: 'Appearance', subtitle: 'Theme, accent color, density.', icon: 'sun' },
        R.createElement(Field, { label: 'Theme' },
          R.createElement('div', { style: { display: 'flex', gap: 6 } },
            ['light', 'dark'].map(function (t) {
              return R.createElement(Chip, {
                key: t,
                label: t[0].toUpperCase() + t.slice(1),
                on: (p.theme || document.documentElement.dataset.theme) === t,
                onClick: function () { document.documentElement.dataset.theme = t; update({ theme: t }); },
              });
            })
          )
        ),
        R.createElement(Field, { label: 'Accent color' },
          R.createElement('div', { style: { display: 'flex', gap: 6 } },
            [['teal','Teal'], ['indigo','Indigo'], ['amber','Amber']].map(function (a) {
              var code = a[0], name = a[1];
              return R.createElement(Chip, {
                key: code,
                label: name,
                on: (p.accent || document.documentElement.dataset.accent) === code,
                onClick: function () { document.documentElement.dataset.accent = code; update({ accent: code }); },
              });
            })
          )
        ),
        R.createElement(Field, { label: 'Density' },
          R.createElement('div', { style: { display: 'flex', gap: 6 } },
            ['comfortable', 'compact'].map(function (d) {
              return R.createElement(Chip, {
                key: d, label: d[0].toUpperCase() + d.slice(1),
                on: (p.density || 'comfortable') === d,
                onClick: function () { update({ density: d }); },
              });
            })
          )
        )
      ),

      // 8. Privacy
      R.createElement(Section, { title: 'Privacy', subtitle: 'Blur amounts, lock with PIN, idle auto-lock.', icon: 'shield' },
        R.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          R.createElement('div', null,
            R.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Always start blurred'),
            R.createElement('div', { style: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 } }, 'Hide all monetary values on launch.')
          ),
          R.createElement(Toggle, { on: !!p.privacyDefault, onChange: function (v) { update({ privacyDefault: v }); } })
        ),
        R.createElement(Field, { label: 'Idle auto-lock (minutes)', hint: '0 to disable' },
          R.createElement(Input, {
            type: 'number', min: 0, max: 120, style: { width: 120 },
            value: p.idleLockMinutes || 0,
            onChange: function (e) { update({ idleLockMinutes: parseInt(e.target.value, 10) || 0 }); },
          })
        )
      ),

      // 9. About
      R.createElement(Section, { title: 'About', icon: 'info' },
        R.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 } },
          R.createElement('div', null, 'Finch · v0.1.0 · Local-first personal finance cockpit'),
          R.createElement('div', null, 'Storage: ', R.createElement('span', { className: 'tabular' }, ((JSON.stringify(localStorage).length / 1024) | 0) + ' KB local')),
          R.createElement('div', null, 'Profile created: ', new Date(p.createdAt || Date.now()).toLocaleString())
        )
      )
    );
  };
})();
