// Memory stress test for the Wod.Wiki playground app.
//
// Usage:
//   1. playground dev server running (default Vite HTTPS port)
//   2. playwright-cli -s=pgstress open "https://localhost:5174/"
//   3. playwright-cli -s=pgstress --raw run-code --filename=scripts/memory-stress-playground.js > pg-stress.json
//
// Method: cycles through four top-level SPA routes by clicking the sidebar
// navigation (Home, Library, Dashboards, Efforts) — same document, so any
// per-route retained objects accumulate. After every transition we force a
// major GC over CDP and sample Performance.getMetrics.
async page => {
  const BASE = 'https://localhost:5174';
  const CYCLES = 10;
  const ROUTES = [
    { label: 'Home', url: /\/$/ },
    { label: 'Library', url: /\/library/ },
    { label: 'Dashboards', url: /\/dashboard/ },
    { label: 'Efforts', url: /\/effort/ },
  ];

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(BASE + '/');
  await page.waitForTimeout(1500);

  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');

  const sample = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(150);
    await client.send('HeapProfiler.collectGarbage');
    const { metrics } = await client.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
    return {
      t: Date.now(),
      heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(3),
      heapTotalMB: +(m.JSHeapTotalSize / 1048576).toFixed(3),
      nodes: m.Nodes,
      listeners: m.JSEventListeners,
      docs: m.Documents,
    };
  };

  const baseline = await sample();
  const records = [];

  for (let c = 0; c < CYCLES; c++) {
    for (const r of ROUTES) {
      try {
        await page.getByRole('button', { name: r.label }).click();
        await page.waitForURL(r.url, { timeout: 15000 });
        await page.waitForTimeout(1000);
      } catch (e) {
        records.push({ cycle: c, route: r.label, error: String(e) });
        continue;
      }
      records.push({ cycle: c, route: r.label, ...(await sample()) });
    }
  }
  const final = await sample();
  return JSON.stringify({ cycles: CYCLES, routes: ROUTES.map(r => r.label), baseline, final, records });
}
