// Visual audit: capture impl + ref screenshots and basic render check
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
  'home', 'accounts', 'transactions', 'forecast', 'goals', 'budgets',
  'cards', 'recurring', 'investments', 'networth', 'import', 'simulator'
];

const IMPL_BASE = 'http://127.0.0.1:8765';
const REF_BASE = 'http://127.0.0.1:8766';
const ROOT = 'C:/Users/mtx/desktop/Finance/tests/screenshots';

const SEED_LS = `
  localStorage.setItem('fc.profiles.v1', JSON.stringify([{id:'p_t',name:'Test',email:'t@t.com',passwordHash:'0',initials:'T',baseCurrency:'EUR',activeCurrencies:['EUR','USD','GBP'],onboarded:true,theme:'dark',accent:'teal',householdId:'h'}]));
  localStorage.setItem('fc.session.v1', JSON.stringify({profileId:'p_t',loggedInAt:new Date().toISOString()}));
`;

async function shoot(page, url, file, isImpl) {
  if (isImpl) {
    // Seed LS by visiting origin first then setting before navigating to target
    await page.goto(IMPL_BASE + '/index.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(200);
    try { await page.evaluate(SEED_LS); } catch {}
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  // Wait for either a substantial #root render (impl, babel-mounted) or just give ref time
  await page.waitForFunction(() => {
    const r = document.querySelector('#root') || document.querySelector('main') || document.body;
    return r && r.querySelectorAll('*').length > 20;
  }, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: file, fullPage: false });
}

async function countRoot(page) {
  return await page.evaluate(() => {
    const root = document.querySelector('#root') || document.querySelector('main') || document.body;
    if (!root) return 0;
    return root.querySelectorAll('*').length;
  }).catch(() => 0);
}

const results = [];

(async () => {
  const browser = await chromium.launch();
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageDesk = await ctxDesktop.newPage();
  const pageMob = await ctxMobile.newPage();

  for (const p of PAGES) {
    const implUrl = `${IMPL_BASE}/desktop/${p}.html`;
    const refUrl = `${REF_BASE}/desktop/${p}.html`;

    // Desktop impl
    await shoot(pageDesk, implUrl, path.join(ROOT, 'impl', `${p}.png`), true);
    const implCount = await countRoot(pageDesk);
    // Desktop ref
    await shoot(pageDesk, refUrl, path.join(ROOT, 'ref', `${p}.png`), false);
    const refCount = await countRoot(pageDesk);

    // Mobile impl
    await shoot(pageMob, implUrl, path.join(ROOT, 'impl-mobile', `${p}.png`), true);
    // Mobile ref
    await shoot(pageMob, refUrl, path.join(ROOT, 'ref-mobile', `${p}.png`), false);

    const ok = implCount >= 5;
    results.push({ page: p, implCount, refCount, ok });
    console.log(`${p.padEnd(14)} impl=${implCount} ref=${refCount} ${ok ? 'OK' : 'FAIL'}`);
  }

  await browser.close();
  fs.writeFileSync(path.join(ROOT, '..', 'visual-results.json'), JSON.stringify(results, null, 2));
  const failures = results.filter(r => !r.ok);
  if (failures.length) {
    console.log('FAILURES:', failures.map(f => f.page).join(','));
    process.exit(1);
  }
})();
