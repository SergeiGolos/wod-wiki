import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

await page.goto('https://pluto.forest-adhara.ts.net:5173/journal', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Check for data-testid marker (tests HMR freshness)
const marker = await page.$('[data-testid="mobile-subheader"]');
console.log('data-testid marker found:', !!marker);

if (marker) {
  const cls = await marker.getAttribute('class');
  console.log('Subheader classes:', cls);
}

// Get all .sticky elements
const stickies = await page.$$eval('.sticky', els => 
  els.map(e => ({ tag: e.tagName, cls: e.className.substring(0, 200), testid: e.getAttribute('data-testid') }))
);
console.log('Sticky elements:');
for (const s of stickies) {
  console.log(`  ${s.tag} testid=${s.testid} cls=${s.cls}`);
}

// Scroll and recheck 
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(500);

await page.screenshot({ path: 'e2e/screenshots/sticky-after-scroll.png' });

if (marker) {
  const rect = await marker.boundingBox();
  console.log('\nAfter scroll - subheader boundingBox:', rect);
}

// Check all positions after scroll
const afterScroll = await page.$$eval('.sticky', els => 
  els.map(e => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { 
      tag: e.tagName, 
      testid: e.getAttribute('data-testid'),
      cls: e.className.substring(0, 100),
      top: cs.top,
      zIndex: cs.zIndex,
      rectTop: Math.round(r.top),
      height: Math.round(r.height),
    };
  })
);
console.log('\nAfter scroll positions:');
for (const s of afterScroll) {
  console.log(`  ${s.tag} testid=${s.testid} top=${s.top} z=${s.zIndex} rect.top=${s.rectTop} h=${s.height}`);
}

// Walk ancestors from the mobile-subheader specifically
const ancestors = await page.$$eval('[data-testid="mobile-subheader"]', els => {
  if (els.length === 0) return [];
  const el = els[0];
  const result = [];
  let current = el.parentElement;
  while (current && current !== document.documentElement) {
    const cs = getComputedStyle(current);
    result.push({
      tag: current.tagName,
      cls: current.className.substring(0, 120),
      overflow: cs.overflow,
      position: cs.position,
      isolation: cs.isolation,
    });
    current = current.parentElement;
  }
  return result;
});

if (ancestors.length > 0) {
  console.log('\nAncestors of mobile-subheader:');
  for (const a of ancestors) {
    const flags = [];
    if (a.overflow !== 'visible') flags.push('overflow:' + a.overflow);
    if (a.isolation !== 'auto') flags.push('isolation:' + a.isolation);
    console.log(`  ${a.tag} pos:${a.position} cls="${a.cls.split(' ').slice(0,5).join(' ')}" ${flags.join(' ')}`);
  }
}

await browser.close();
