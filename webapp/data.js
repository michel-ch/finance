// Mock data for the finance cockpit — EU user, EUR base, multi-currency.
// All amounts are integers in minor units (cents) where shown as numbers,
// or already-formatted strings; components handle display.

window.FCData = (function () {
  const today = new Date('2026-05-06T10:00:00');

  const profile = {
    name: 'Margaux Lefèvre',
    initials: 'ML',
    baseCurrency: 'EUR',
    activeCurrencies: ['EUR', 'USD', 'GBP', 'JPY'],
  };

  const accounts = [
    { id: 'a1', name: 'BNP Courant',     type: 'checking',  currency: 'EUR', balance: 4287.42,  spark: gen(30, 4500, 200, -8) },
    { id: 'a2', name: 'Boursorama Épargne', type: 'savings', currency: 'EUR', balance: 18520.00, spark: gen(30, 17200, 60, 45) },
    { id: 'a3', name: 'Revolut USD',     type: 'checking',  currency: 'USD', balance: 1240.83,  spark: gen(30, 1100, 80, 5) },
    { id: 'a4', name: 'Trade Republic',  type: 'brokerage', currency: 'EUR', balance: 32140.55, spark: gen(30, 30200, 600, 65) },
    { id: 'a5', name: 'Monzo GBP',       type: 'checking',  currency: 'GBP', balance: 412.15,   spark: gen(30, 580, 60, -5) },
  ];

  // Net worth in base (EUR)
  const netWorthBase = 58420.15;
  const netWorthDelta = 1240.50; // vs last month
  const netWorthSpark = gen(90, 54000, 800, 50);

  const goals = [
    { id: 'g1', title: 'Tokyo trip',        target: 4000,   current: 2840, deadline: '2026-09-01', status: 'on-track',  icon: '✈',  contribMonthly: 250 },
    { id: 'g2', title: 'Apartment deposit', target: 25000,  current: 9120, deadline: '2027-03-01', status: 'slipping', icon: '🏠', contribMonthly: 600 },
    { id: 'g3', title: 'New laptop',        target: 2200,   current: 1980, deadline: '2026-06-15', status: 'on-track',  icon: '💻', contribMonthly: 200 },
    { id: 'g4', title: 'Emergency fund',    target: 12000,  current: 4200, deadline: '2027-12-01', status: 'off-track', icon: '🛟', contribMonthly: 200 },
  ];

  const bills = [
    { id: 'b1', name: 'Rent — 14 rue de la Roquette', amount: 1180, currency: 'EUR', date: '2026-05-08', account: 'BNP Courant',     icon: '🏠' },
    { id: 'b2', name: 'EDF Électricité',              amount: 87.40, currency: 'EUR', date: '2026-05-12', account: 'BNP Courant',     icon: '⚡' },
    { id: 'b3', name: 'Spotify Family',               amount: 17.99, currency: 'EUR', date: '2026-05-14', account: 'BNP Courant',     icon: '♪' },
    { id: 'b4', name: 'Adobe Creative Cloud',         amount: 59.99, currency: 'USD', date: '2026-05-15', account: 'Revolut USD',     icon: '◆' },
    { id: 'b5', name: 'Free Fibre',                   amount: 39.99, currency: 'EUR', date: '2026-05-18', account: 'BNP Courant',     icon: '◉' },
  ];

  const transactions = [
    { id: 't1',  date: '2026-05-06', merchant: 'Le Petit Cambodge',     category: 'Dining',       cat_icon: '🍜', amount: -28.40, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: ['paris'] },
    { id: 't2',  date: '2026-05-06', merchant: 'Salaire — Acme SAS',    category: 'Income',       cat_icon: '💼', amount: 3450.00, currency: 'EUR', account: 'BNP Courant',  card: null, tags: ['payroll'] },
    { id: 't3',  date: '2026-05-05', merchant: 'Monoprix',              category: 'Groceries',    cat_icon: '🛒', amount: -67.12, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: [] },
    { id: 't4',  date: '2026-05-05', merchant: 'Uber',                  category: 'Transport',    cat_icon: '🚗', amount: -14.80, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: [], pending: true },
    { id: 't5',  date: '2026-05-04', merchant: 'Apple Store',           category: 'Tech',         cat_icon: '◆',  amount: -129.00, currency: 'USD', currencyConverted: -118.62, account: 'Revolut USD', card: null, tags: [] },
    { id: 't6',  date: '2026-05-04', merchant: 'Boulangerie Utopie',    category: 'Dining',       cat_icon: '🥐', amount: -4.80,  currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: [] },
    { id: 't7',  date: '2026-05-03', merchant: 'Transfer → Épargne',    category: 'Transfer',     cat_icon: '⇆',  amount: -500.00, currency: 'EUR', account: 'BNP Courant',  card: null, tags: [], transfer: true },
    { id: 't8',  date: '2026-05-03', merchant: 'Transfer ← Courant',    category: 'Transfer',     cat_icon: '⇆',  amount: 500.00, currency: 'EUR', account: 'Boursorama Épargne', card: null, tags: [], transfer: true },
    { id: 't9',  date: '2026-05-02', merchant: 'Carrefour Express',     category: 'Groceries',    cat_icon: '🛒', amount: -22.45, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: [] },
    { id: 't10', date: '2026-05-02', merchant: 'Netflix',               category: 'Subscriptions',cat_icon: '▶',  amount: -17.99, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: ['recurring'] },
    { id: 't11', date: '2026-05-01', merchant: 'British Museum Shop',   category: 'Shopping',     cat_icon: '🛍', amount: -42.50, currency: 'GBP', currencyConverted: -49.83, account: 'Monzo GBP', card: null, tags: ['london'] },
    { id: 't12', date: '2026-05-01', merchant: 'Pret A Manger',         category: 'Dining',       cat_icon: '🥗', amount: -8.95,  currency: 'GBP', currencyConverted: -10.49, account: 'Monzo GBP', card: null, tags: ['london'] },
    { id: 't13', date: '2026-04-30', merchant: 'SNCF Connect',          category: 'Transport',    cat_icon: '🚆', amount: -89.00, currency: 'EUR', account: 'BNP Courant',  card: 'Visa •• 4421', tags: ['paris','london'] },
  ];

  // Forecast points: history (45 days) + projection (60 days)
  const forecast = (function () {
    const history = [];
    let v = 26500;
    for (let i = -45; i <= 0; i++) {
      v += rand(i) * 180;
      history.push({ d: i, v: round2(v), kind: 'past' });
    }
    const projection = [];
    let pv = v;
    const events = [
      { d: 2,  amount: -1180, label: 'Rent' },
      { d: 6,  amount: -87.4, label: 'EDF' },
      { d: 8,  amount: -17.99, label: 'Spotify' },
      { d: 9,  amount: -59.99, label: 'Adobe' },
      { d: 12, amount: -39.99, label: 'Free' },
      { d: 25, amount: 3450,  label: 'Salaire' },
      { d: 32, amount: -1180, label: 'Rent' },
      { d: 36, amount: -87.4, label: 'EDF' },
      { d: 38, amount: -17.99, label: 'Spotify' },
      { d: 39, amount: -59.99, label: 'Adobe' },
      { d: 55, amount: 3450,  label: 'Salaire' },
    ];
    for (let i = 1; i <= 60; i++) {
      pv += rand(i + 100) * 80;
      const ev = events.find(e => e.d === i);
      if (ev) pv += ev.amount;
      projection.push({ d: i, v: round2(pv), kind: 'forecast', event: ev || null });
    }
    return { history, projection, events };
  })();

  // Budgets — current month
  const budgets = [
    { id: 'bud1', cat: 'Groceries',     icon: '🛒', spent: 412,   budget: 600,  hard: false },
    { id: 'bud2', cat: 'Dining',        icon: '🍽', spent: 298,   budget: 250,  hard: false },
    { id: 'bud3', cat: 'Transport',     icon: '🚗', spent: 142,   budget: 200,  hard: false },
    { id: 'bud4', cat: 'Subscriptions', icon: '▶',  spent: 86,    budget: 120,  hard: true  },
    { id: 'bud5', cat: 'Shopping',      icon: '🛍', spent: 178,   budget: 300,  hard: false },
    { id: 'bud6', cat: 'Health',        icon: '✚',  spent: 44,    budget: 150,  hard: false },
    { id: 'bud7', cat: 'Entertainment', icon: '◐',  spent: 92,    budget: 150,  hard: false },
  ];

  // Profiles (Netflix-style)
  const profiles = [
    { id: 'p1', name: 'Margaux Lefèvre', initials: 'ML', color: '#0D9488', baseCurrency: 'EUR', activeCurrencies: ['EUR','USD','GBP','JPY'], pin: false, lastOpened: '2026-05-06', tx: 1240, accounts: 5 },
    { id: 'p2', name: 'Théo Mercier',    initials: 'TM', color: '#4F46E5', baseCurrency: 'EUR', activeCurrencies: ['EUR','CHF'],            pin: true,  lastOpened: '2026-04-28', tx: 412,  accounts: 3 },
    { id: 'p3', name: 'Side hustle',     initials: 'SH', color: '#B45309', baseCurrency: 'EUR', activeCurrencies: ['EUR','USD'],            pin: false, lastOpened: '2026-05-02', tx: 86,   accounts: 2 },
  ];

  // Cards (debit & credit)
  const cards = [
    { id: 'c1', name: 'Visa Premier',     last4: '4421', kind: 'credit', accountId: 'a1', accountName: 'BNP Courant',     network: 'visa',       billingDay: 12, cycleSpend: 1240.18, limit: 4000, statementDate: '2026-05-12', dueDate: '2026-05-26', settles: '2026-05-26', utilization: 0.31 },
    { id: 'c2', name: 'BNP Visa Débit',   last4: '8870', kind: 'debit',  accountId: 'a1', accountName: 'BNP Courant',     network: 'visa',       billingDay: null, cycleSpend: 412.40, limit: null, statementDate: null, dueDate: null, settles: 'instant', utilization: null },
    { id: 'c3', name: 'Revolut Metal',    last4: '0019', kind: 'debit',  accountId: 'a3', accountName: 'Revolut USD',     network: 'mastercard', billingDay: null, cycleSpend: 220.00, limit: null, statementDate: null, dueDate: null, settles: 'instant', utilization: null },
    { id: 'c4', name: 'Amex Gold',        last4: '1004', kind: 'credit', accountId: 'a1', accountName: 'BNP Courant',     network: 'amex',       billingDay: 5,  cycleSpend: 642.55, limit: 6000, statementDate: '2026-05-05', dueDate: '2026-05-22', settles: '2026-05-22', utilization: 0.11 },
  ];

  // Pending CSV import — staging rows
  const importStaging = {
    file: 'BNP_export_2026-04.csv',
    bank: 'BNP Paribas',
    rows: 47,
    duplicates: 4,
    needsCategory: 6,
    autoMatched: 37,
    rows_preview: [
      { id: 's1', date: '2026-04-28', desc: 'CARREFOUR EXPRESS PARIS 11', amount: -22.45, suggested: 'Groceries', confidence: 0.96, status: 'auto' },
      { id: 's2', date: '2026-04-28', desc: 'STRIPE *FOUDROYANT',          amount: -49.00, suggested: 'Subscriptions', confidence: 0.74, status: 'review' },
      { id: 's3', date: '2026-04-27', desc: 'VIR SEPA SALAIRE ACME SAS',   amount: 3450.00, suggested: 'Income', confidence: 0.99, status: 'auto' },
      { id: 's4', date: '2026-04-27', desc: 'MONOPRIX 0421',               amount: -67.12, suggested: 'Groceries', confidence: 0.91, status: 'auto' },
      { id: 's5', date: '2026-04-26', desc: 'UBER *TRIP HELP.UBER.CO',     amount: -14.80, suggested: 'Transport', confidence: 0.88, status: 'auto' },
      { id: 's6', date: '2026-04-26', desc: 'AMAZON EU SARL',              amount: -38.99, suggested: 'Shopping', confidence: 0.62, status: 'review' },
      { id: 's7', date: '2026-04-25', desc: 'BOULANGERIE UTOPIE',          amount: -4.80,  suggested: 'Dining', confidence: 0.93, status: 'auto' },
      { id: 's8', date: '2026-04-25', desc: 'VIR INST SOPHIE LEFEVRE',     amount: 220.00, suggested: '— uncategorized', confidence: 0.20, status: 'needs' },
      { id: 's9', date: '2026-04-24', desc: 'CARREFOUR EXPRESS PARIS 11',  amount: -22.45, suggested: 'Groceries · duplicate of 04-23', confidence: 0.99, status: 'duplicate' },
      { id: 's10', date: '2026-04-24', desc: 'NETFLIX.COM',                amount: -17.99, suggested: 'Subscriptions', confidence: 0.99, status: 'auto' },
    ],
  };

  // Investments — full lots & DCA plans for ETF compare screen
  const holdings = [
    { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World', exchange: 'XETRA', qty: 142, price: 118.42, basis: 102.10, currency: 'EUR' },
    { ticker: 'CSPX.L',  name: 'iShares Core S&P 500',   exchange: 'LSE',   qty: 45,  price: 542.10, basis: 480.00, currency: 'USD' },
    { ticker: 'EUNM.DE', name: 'iShares MSCI EM IMI',    exchange: 'XETRA', qty: 128, price: 32.85,  basis: 31.40, currency: 'EUR' },
    { ticker: 'BTC',     name: 'Bitcoin (cold)',         exchange: 'wallet', qty: 0.18, price: 64200, basis: 38000, currency: 'EUR' },
  ];

  return { today, profile, profiles, accounts, cards, goals, bills, transactions, forecast, budgets, holdings, importStaging, netWorthBase, netWorthDelta, netWorthSpark };

  // ─── helpers ───
  function gen(n, base, range, drift) {
    const arr = [];
    let v = base;
    for (let i = 0; i < n; i++) {
      v += rand(i) * range / 4 + drift;
      arr.push(round2(v));
    }
    return arr;
  }
  // Deterministic pseudo-random in [-1, 1]
  function rand(i) {
    const x = Math.sin(i * 9301 + 49297) * 233280;
    return (x - Math.floor(x)) * 2 - 1;
  }
  function round2(n) { return Math.round(n * 100) / 100; }
})();
