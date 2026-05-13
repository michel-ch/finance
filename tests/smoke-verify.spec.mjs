import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:8765';
const seed = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_t',name:'Alex Doe',email:'a@a.com',passwordHash:'0',initials:'AD',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_t',loggedInAt:new Date().toISOString()}));
`;

const PAGES = ['home','accounts','transactions','forecast','goals','budgets','cards','recurring','investments','networth','import','simulator','settings'];

for (const p of PAGES) {
  test(`${p} renders without crash`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/desktop/${p}.html`);
    await page.evaluate(seed);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
    await page.waitForTimeout(500);
    const childrenCount = await page.evaluate(() => document.querySelector('#root').querySelectorAll('*').length);
    expect(childrenCount, 'page should render substantial content').toBeGreaterThan(20);
    expect(errors.filter(e => !/babel/i.test(e)), `console errors on ${p}`).toEqual([]);
  });
}
