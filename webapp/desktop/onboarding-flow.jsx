// Onboarding flow — overrides window.FC.OnboardingScreen with the wired,
// 3-step persistence flow per master-spec §18.1. Loaded after extra-screens.jsx.
//
// Step 1: base currency       → FCAuth.updateProfile({ baseCurrency })
// Step 2: active currencies   → FCAuth.updateProfile({ activeCurrencies }) (always includes base)
// Step 3: first account       → FCStore.create('accounts', {...}) + onboarded:true → home.html

(function () {
  const ISO_CURRENCIES = [
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'GBP', name: 'Pound Sterling' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'PLN', name: 'Polish Zloty' },
    { code: 'CZK', name: 'Czech Koruna' },
    { code: 'HUF', name: 'Hungarian Forint' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'ILS', name: 'Israeli Shekel' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'MYR', name: 'Malaysian Ringgit' },
    { code: 'PHP', name: 'Philippine Peso' },
    { code: 'IDR', name: 'Indonesian Rupiah' },
    { code: 'TWD', name: 'Taiwan Dollar' },
  ];

  const COMMON_CODES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];

  const ACCOUNT_TYPES = [
    { id: 'checking',   label: 'Checking',      icon: 'wallet'  },
    { id: 'savings',    label: 'Savings',       icon: 'piggy'   },
    { id: 'brokerage',  label: 'Brokerage',     icon: 'chart'   },
    { id: 'cash',       label: 'Cash',          icon: 'banknote'},
    { id: 'crypto',     label: 'Crypto wallet', icon: 'coin'    },
  ];

  // Guess base from navigator.language ("en-US" → USD, "fr-FR" → EUR, etc).
  function guessBaseFromLocale() {
    const lang = (navigator.language || 'en-US').toLowerCase();
    const region = lang.split('-')[1] || '';
    const map = {
      us: 'USD', gb: 'GBP', ca: 'CAD', au: 'AUD', nz: 'NZD',
      ch: 'CHF', jp: 'JPY', cn: 'CNY', hk: 'HKD', sg: 'SGD',
      kr: 'KRW', in: 'INR', mx: 'MXN', br: 'BRL', za: 'ZAR',
      pl: 'PLN', cz: 'CZK', hu: 'HUF', tr: 'TRY', ae: 'AED',
      il: 'ILS', th: 'THB', my: 'MYR', ph: 'PHP', id: 'IDR',
      tw: 'TWD', se: 'SEK', no: 'NOK', dk: 'DKK',
    };
    if (map[region]) return map[region];
    // Fallback for euro-zone-ish or unknown — default EUR.
    return 'EUR';
  }

  window.FC.OnboardingScreen = function OnboardingScreen() {
    const R = React;
    const profile = (window.FCAuth && FCAuth.currentProfile()) || {};

    // Step state
    const [step, setStep] = R.useState(1);

    // Step 1: base currency
    const [base, setBase] = R.useState(profile.baseCurrency || guessBaseFromLocale());

    // Step 2: active currencies (always includes base)
    const initialActive = (profile.activeCurrencies && profile.activeCurrencies.length)
      ? profile.activeCurrencies
      : [profile.baseCurrency || guessBaseFromLocale()];
    const [active, setActive] = R.useState(new Set(initialActive));
    const [showMore, setShowMore] = R.useState(false);

    // Step 3: first account
    const [acctName, setAcctName] = R.useState('');
    const [acctType, setAcctType] = R.useState('checking');
    const [acctCurrency, setAcctCurrency] = R.useState(base);
    const [openingBalance, setOpeningBalance] = R.useState('');
    const [openingDate, setOpeningDate] = R.useState(new Date().toISOString().slice(0, 10));

    // Keep base in active set whenever base changes; default account currency to base.
    R.useEffect(() => {
      setActive(prev => {
        const s = new Set(prev);
        s.add(base);
        return s;
      });
      setAcctCurrency(c => c || base);
    }, [base]);

    function continueStep1() {
      FCAuth.updateProfile({ baseCurrency: base });
      // Ensure base is in active list immediately so step 2 shows it selected.
      setStep(2);
    }

    function continueStep2() {
      const list = Array.from(active);
      if (!list.includes(base)) list.push(base);
      FCAuth.updateProfile({ activeCurrencies: list });
      setStep(3);
    }

    function finishStep3() {
      const balanceNum = parseFloat(openingBalance);
      const safeBalance = isNaN(balanceNum) ? 0 : balanceNum;
      FCStore.create('accounts', {
        name: acctName.trim() || 'My account',
        type: acctType,
        currency: acctCurrency || base,
        balance: safeBalance,
        openingBalance: safeBalance,
        openingDate: new Date(openingDate).toISOString(),
        archived: false,
        spark: [],
      });
      FCAuth.updateProfile({ onboarded: true });
      location.href = 'home.html';
    }

    const cardStyle = {
      maxWidth: 520, margin: '0 auto', width: '100%',
      display: 'flex', flexDirection: 'column', gap: 24,
      padding: '24px 4px',
    };

    return (
      <div style={cardStyle}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
            Step {step} of 3
          </div>
          <h1 style={{
            margin: '6px 0 8px', fontSize: 32,
            fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.025em',
          }}>
            {step === 1 && 'Pick your base currency'}
            {step === 2 && 'Which currencies do you use?'}
            {step === 3 && 'Add your first account'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {step === 1 && 'Net worth and totals will be expressed in this currency. It\'s hard to change later.'}
            {step === 2 && 'These are the currencies you actually transact in. The base is always included.'}
            {step === 3 && 'A real-world container for money — a bank account, cash, or wallet.'}
          </p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="fc-card" style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 320, overflowY: 'auto' }} className="fc-scroll">
              {ISO_CURRENCIES.map(c => {
                const sel = base === c.code;
                return (
                  <button key={c.code} onClick={() => setBase(c.code)}
                    style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'),
                      background: sel ? 'var(--accent-tint)' : 'var(--surface)',
                      color: sel ? 'var(--accent)' : 'var(--text-primary)',
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, width: 42 }}>{c.code}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="fc-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>
              Common currencies
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COMMON_CODES.map(code => {
                const isBase = code === base;
                const isActive = active.has(code) || isBase;
                return (
                  <button key={code} onClick={() => {
                    if (isBase) return;
                    const s = new Set(active);
                    if (s.has(code)) s.delete(code); else s.add(code);
                    setActive(s);
                  }}
                    style={{
                      padding: '8px 14px', borderRadius: 999,
                      border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                      background: isActive ? 'var(--accent-tint)' : 'var(--surface)',
                      color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: isBase ? 'default' : 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    {code}
                    {isBase && <span style={{ fontSize: 9, opacity: 0.7 }}>BASE</span>}
                  </button>
                );
              })}
              <button onClick={() => setShowMore(v => !v)}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: '1px dashed var(--border-strong)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13,
                }}>
                {showMore ? '− Hide more' : '+ Add more'}
              </button>
            </div>

            {showMore && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                  All currencies
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxHeight: 220, overflowY: 'auto' }} className="fc-scroll">
                  {ISO_CURRENCIES.filter(c => !COMMON_CODES.includes(c.code)).map(c => {
                    const isBase = c.code === base;
                    const isActive = active.has(c.code) || isBase;
                    return (
                      <label key={c.code} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 6,
                        cursor: isBase ? 'default' : 'pointer',
                        background: isActive ? 'var(--surface-sunken)' : 'transparent',
                      }}>
                        <input type="checkbox" checked={isActive} disabled={isBase}
                          onChange={() => {
                            const s = new Set(active);
                            if (s.has(c.code)) s.delete(c.code); else s.add(c.code);
                            setActive(s);
                          }}
                          style={{ accentColor: 'var(--accent)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, width: 38 }}>{c.code}</span>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {active.size} selected (base always included)
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="fc-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Account name
              </div>
              <input className="fc-input" placeholder="e.g. Main checking"
                value={acctName} onChange={e => setAcctName(e.target.value)} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Type
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {ACCOUNT_TYPES.map(t => {
                  const sel = acctType === t.id;
                  return (
                    <button key={t.id} onClick={() => setAcctType(t.id)}
                      style={{
                        padding: '10px 6px', borderRadius: 8,
                        border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'),
                        background: sel ? 'var(--accent-tint)' : 'var(--surface)',
                        color: sel ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Currency
                </div>
                <select className="fc-input" value={acctCurrency}
                  onChange={e => setAcctCurrency(e.target.value)}>
                  {Array.from(active).concat(active.has(base) ? [] : [base]).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Opening date
                </div>
                <input type="date" className="fc-input" value={openingDate}
                  onChange={e => setOpeningDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Opening balance
              </div>
              <input type="number" inputMode="decimal" className="fc-input tabular"
                placeholder="0.00" value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          {step > 1 ? (
            <button className="fc-btn fc-btn-ghost" style={{ height: 38 }} onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          ) : <span />}

          {step === 1 && (
            <button className="fc-btn fc-btn-primary" style={{ height: 38, padding: '0 18px' }}
              disabled={!base} onClick={continueStep1}>
              Continue →
            </button>
          )}
          {step === 2 && (
            <button className="fc-btn fc-btn-primary" style={{ height: 38, padding: '0 18px' }}
              onClick={continueStep2}>
              Continue →
            </button>
          )}
          {step === 3 && (
            <button className="fc-btn fc-btn-primary" style={{ height: 38, padding: '0 18px' }}
              disabled={!acctName.trim()} onClick={finishStep3}>
              Finish
            </button>
          )}
        </div>

        {/* Bottom progress bar — 3 segments */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'var(--surface-sunken)',
              transition: 'background 200ms var(--ease)',
            }} />
          ))}
        </div>
      </div>
    );
  };
})();
