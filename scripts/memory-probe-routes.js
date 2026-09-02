// Isolated route-vs-Home control probe: does each route retain heap after GC?
// Run: playwright-cli -s=pgstress --raw run-code --filename=scripts/memory-probe-routes.js
async page => {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://localhost:5174/');
  await page.waitForTimeout(1000);
  // warm ALL routes
  for (const r of ['Library', 'Dashboards', 'Efforts']) {
    await page.getByRole('button', { name: r }).click();
    await page.waitForTimeout(1000);
  }
  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(1000);
  const sample = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(150);
    await client.send('HeapProfiler.collectGarbage');
    const { metrics } = await client.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
    return { route: page.url().replace('https://localhost:5174', '') || '/', heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(3), nodes: m.Nodes, listeners: m.JSEventListeners };
  };
  const records = [];
  records.push({ phase: 'warm-home', ...(await sample()) });
  const CYCLES = 8;
  for (const target of ['Library', 'Dashboards', 'Efforts']) {
    for (let i = 0; i < CYCLES; i++) {
      await page.getByRole('button', { name: target }).click();
      await page.waitForTimeout(700);
      records.push({ phase: target, cycle: i, ...(await sample()) });
      await page.getByRole('button', { name: 'Home' }).click();
      await page.waitForTimeout(700);
      records.push({ phase: 'Home', cycle: i, ...(await sample()) });
    }
  }
  return JSON.stringify(records);
}
