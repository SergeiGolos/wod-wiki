// Capture a Chrome heap snapshot of the playground after N Home<->Library cycles.
// Usage: bun scripts/memory-snapshot-take.cjs [cycles=12] [out=/tmp/pg-snap.heapsnapshot]
const { chromium } = require('playwright');

const CYCLES = parseInt(process.argv[2] || '12', 10);
const OUT = process.argv[3] || '/tmp/pg-snap.heapsnapshot';
const BASE = 'https://localhost:5174';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');

  const heapMB = async () => {
    const { metrics } = await client.send('Performance.getMetrics');
    return +(Object.fromEntries(metrics.map(m => [m.name, m.value])).JSHeapUsedSize / 1048576).toFixed(2);
  };
  const gc = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(120);
    await client.send('HeapProfiler.collectGarbage');
  };

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  for (const r of ['Library', 'Dashboards', 'Efforts', 'Home']) {
    await page.getByRole('button', { name: r }).click();
    await page.waitForTimeout(800);
  }
  console.log('warm heap MB:', await heapMB());

  for (let i = 0; i < CYCLES; i++) {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(600);
  }
  await gc();
  await page.waitForTimeout(200);
  const before = await heapMB();
  console.log(`post-${CYCLES}-cycles heap MB:`, before);

  const chunks = [];
  client.on('HeapProfiler.addHeapSnapshotChunk', e => chunks.push(e.chunk));
  await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  const snap = chunks.join('');
  require('fs').writeFileSync(OUT, snap);
  console.log('snapshot bytes:', snap.length, '->', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
