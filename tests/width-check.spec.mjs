import { test, expect } from '@playwright/test';
const seed = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_w',name:'W',email:'w@w',passwordHash:'0',initials:'W',baseCurrency:'EUR',activeCurrencies:['EUR'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_w',loggedInAt:new Date().toISOString()}));
`;
test('main fills viewport at 2560', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('http://127.0.0.1:8765/desktop/transactions.html');
  await page.evaluate(seed);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('main'), { timeout: 8000 });
  const dim = await page.evaluate(() => {
    const m = document.querySelector('main');
    const r = m.getBoundingClientRect();
    return { w: r.width, maxWidth: getComputedStyle(m).maxWidth, viewport: window.innerWidth };
  });
  console.log('VIEWPORT', dim.viewport, 'MAIN', dim.w, 'MAXWIDTH', dim.maxWidth);
  expect(dim.w).toBeGreaterThan(2000);
});
