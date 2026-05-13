import { test, expect } from '@playwright/test';

const DEMO = 'http://127.0.0.1:8766';
const seedSession = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_d',name:'Demo User',email:'d@d.com',passwordHash:'0',initials:'DU',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_d',loggedInAt:new Date().toISOString()}));
`;

test('demo seeds every screen-relevant table', async ({ page }) => {
  await page.goto(`${DEMO}/desktop/home.html`);
  await page.evaluate(seedSession);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
  await page.waitForTimeout(800);
  const counts = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('fc.data.p_d.accounts') || '[]').length,
    cards: JSON.parse(localStorage.getItem('fc.data.p_d.cards') || '[]').length,
    transactions: JSON.parse(localStorage.getItem('fc.data.p_d.transactions') || '[]').length,
    goals: JSON.parse(localStorage.getItem('fc.data.p_d.goals') || '[]').length,
    budgets: JSON.parse(localStorage.getItem('fc.data.p_d.budgets') || '[]').length,
    recurring: JSON.parse(localStorage.getItem('fc.data.p_d.recurring') || '[]').length,
    holdings: JSON.parse(localStorage.getItem('fc.data.p_d.holdings') || '[]').length,
    categories: JSON.parse(localStorage.getItem('fc.data.p_d.categories') || '[]').length,
  }));
  expect(counts.accounts).toBeGreaterThan(0);
  expect(counts.cards, 'cards should now be seeded').toBeGreaterThan(0);
  expect(counts.transactions).toBeGreaterThan(0);
  expect(counts.goals).toBeGreaterThan(0);
  expect(counts.budgets).toBeGreaterThan(0);
  expect(counts.recurring, 'recurring should include bills + extras').toBeGreaterThanOrEqual(10);
  expect(counts.holdings).toBeGreaterThan(0);
  expect(counts.categories).toBe(12);
});

const PAGES = ['home','accounts','transactions','forecast','goals','budgets','cards','recurring','investments','networth','simulator','settings'];
for (const p of PAGES) {
  test(`demo: ${p} renders without crash + shows content`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${DEMO}/desktop/${p}.html`);
    await page.evaluate(seedSession);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
    await page.waitForTimeout(700);
    const childrenCount = await page.evaluate(() => document.querySelector('#root').querySelectorAll('*').length);
    expect(childrenCount, `${p}: substantial render`).toBeGreaterThan(40);
    expect(errors.filter(e => !/babel/i.test(e)), `${p}: no console errors`).toEqual([]);
  });
}
