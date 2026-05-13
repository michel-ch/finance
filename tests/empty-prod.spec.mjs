import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:8765';
// Seed a profile with NO data — categories only, simulating a fresh prod signup.
const seedEmpty = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_e',name:'Fresh User',email:'f@f.com',passwordHash:'0',initials:'FU',baseCurrency:'EUR',activeCurrencies:['EUR'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_e',loggedInAt:new Date().toISOString()}));
  localStorage.setItem('fc.data.p_e.categories', JSON.stringify([{id:'cat_dining',name:'Dining',icon:'🍽',color:'#f59e0b'}]));
`;
const PAGES = ['home','accounts','transactions','forecast','goals','budgets','cards','recurring','investments','networth','import','simulator','settings'];

for (const p of PAGES) {
  test(`prod empty: ${p} renders without crash`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/desktop/${p}.html`);
    await page.evaluate(seedEmpty);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#root')?.children?.length > 0, { timeout: 8000 });
    await page.waitForTimeout(500);
    expect(errors.filter(e => !/babel/i.test(e)), `console errors on ${p}`).toEqual([]);
  });
}
