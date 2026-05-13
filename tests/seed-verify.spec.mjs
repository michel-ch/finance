import { test, expect } from '@playwright/test';

const PROD = 'http://127.0.0.1:8765';
const DEMO = 'http://127.0.0.1:8766';

const seedSession = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_t',name:'Test User',email:'t@t.com',passwordHash:'0',initials:'TU',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_t',loggedInAt:new Date().toISOString()}));
`;

test('production: new profile starts with no accounts/transactions/goals', async ({ page }) => {
  await page.goto(`${PROD}/desktop/home.html`);
  await page.evaluate(seedSession);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
  await page.waitForTimeout(800);
  const counts = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('fc.data.p_t.accounts') || '[]').length,
    transactions: JSON.parse(localStorage.getItem('fc.data.p_t.transactions') || '[]').length,
    goals: JSON.parse(localStorage.getItem('fc.data.p_t.goals') || '[]').length,
    budgets: JSON.parse(localStorage.getItem('fc.data.p_t.budgets') || '[]').length,
    recurring: JSON.parse(localStorage.getItem('fc.data.p_t.recurring') || '[]').length,
    categories: JSON.parse(localStorage.getItem('fc.data.p_t.categories') || '[]').length,
  }));
  expect(counts.accounts, 'prod accounts should be 0').toBe(0);
  expect(counts.transactions, 'prod tx should be 0').toBe(0);
  expect(counts.goals, 'prod goals should be 0').toBe(0);
  expect(counts.budgets, 'prod budgets should be 0').toBe(0);
  expect(counts.recurring, 'prod recurring should be 0').toBe(0);
  expect(counts.categories, 'prod categories should be 12').toBe(12);
});

test('demo: new profile auto-seeds the mock data', async ({ page }) => {
  await page.goto(`${DEMO}/desktop/home.html`);
  await page.evaluate(seedSession);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
  await page.waitForTimeout(800);
  const counts = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('fc.data.p_t.accounts') || '[]').length,
    transactions: JSON.parse(localStorage.getItem('fc.data.p_t.transactions') || '[]').length,
    goals: JSON.parse(localStorage.getItem('fc.data.p_t.goals') || '[]').length,
    categories: JSON.parse(localStorage.getItem('fc.data.p_t.categories') || '[]').length,
  }));
  expect(counts.accounts, 'demo accounts should be > 0').toBeGreaterThan(0);
  expect(counts.transactions, 'demo tx should be > 0').toBeGreaterThan(0);
  expect(counts.goals, 'demo goals should be > 0').toBeGreaterThan(0);
  expect(counts.categories, 'demo categories should be 12').toBe(12);
});
