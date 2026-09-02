// No-op control + sampled allocation attribution for Home<->Library drift.
// Run: playwright-cli -s=pgstress --raw run-code --filename=scripts/memory-probe-alloc.js
async page => {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://localhost:5174/');
  await page.waitForTimeout(1000);
  for (const r of ['Library', 'Dashboards', 'Efforts', 'Home']) {
    await page.getByRole('button', { name: r }).click();
    await page.waitForTimeout(900);
  }
  const sample = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(120);
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(80);
    const { metrics } = await client.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
    return +(m.JSHeapUsedSize / 1048576).toFixed(3);
  };
  // Part A: no-op control — re-click Home while on Home, 8x
  const noop = [];
  noop.push(await sample());
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(500);
    noop.push(await sample());
  }
  // Part B: sampled allocation profile across 12 Home<->Library cycles
  await client.send('HeapProfiler.startSampling', { samplingInterval: 16384 });
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(600);
  }
  await client.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(200);
  await client.send('HeapProfiler.collectGarbage');
  const { profile } = await client.send('HeapProfiler.stopSampling');
  const frames = new Map(); // nodeId -> {frame, parent nodeId}
  const walk = (node, parent) => {
    frames.set(node.id, { f: node.callFrame, p: parent });
    for (const c of node.children || []) walk(c, node.id);
  };
  walk(profile.head, null);
  const agg = new Map(); // top-frame key -> {size, count}
  for (const s of profile.samples) {
    const n = frames.get(s.nodeId);
    if (!n) continue;
    const f = n.f;
    const key = `${f.functionName || '(anon)'} @ ${f.url || 'internal'}:${f.lineNumber + 1}`;
    const cur = agg.get(key) || { size: 0, count: 0, stack: [] };
    cur.size += s.size; cur.count += s.count;
    if (!cur.stack.length) {
      // capture up to 5 ancestor frames
      const chain = [];
      let p = n.p;
      while (p != null && chain.length < 5) {
        const pn = frames.get(p);
        if (!pn) break;
        const pf = pn.f;
        chain.push(`${pf.functionName || '(anon)'} @ ${pf.url || 'internal'}:${pf.lineNumber + 1}`);
        p = pn.p;
      }
      cur.stack = chain;
    }
    agg.set(key, cur);
  }
  const top = [...agg.entries()]
    .map(([k, v]) => ({ alloc: k, retainedKB: +(v.size / 1024).toFixed(1), count: v.count, stack: v.stack }))
    .sort((a, b) => b.retainedKB - a.retainedKB)
    .slice(0, 40);
  const totalKB = +(profile.samples.reduce((a, s) => a + s.size, 0) / 1024).toFixed(0);
  return JSON.stringify({ noop, samplingInterval: 16384, totalRetainedKB: totalKB, top });
}
