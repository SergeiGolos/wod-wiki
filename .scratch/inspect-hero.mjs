import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const buttons = await page.$$('button[data-testid^="challenge-row-"]');
  const testIds = await Promise.all(buttons.map(b => b.getAttribute('data-testid')));
  const hero = await page.$('[data-section-id="wod-wiki"]');
  const heroHtml = hero ? await hero.innerHTML() : 'no hero';
  await page.screenshot({ path: '/tmp/hero-after-fix.png' });
  await page.close();
  console.log(JSON.stringify({ testIds, heroHtml: heroHtml.slice(0, 800) }, null, 2));
})();