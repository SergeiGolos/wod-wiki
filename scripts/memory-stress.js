// Memory stress test for Storybook preview (wod-wiki).
//
// Usage:
//   1. storybook dev server running on :6006
//   2. playwright-cli -s=memstress open "http://localhost:6006/iframe.html?id=playground--interval-starter&viewMode=story"
//   3. playwright-cli -s=memstress --raw run-code --filename=scripts/memory-stress.js > memory-stress-results.json
//
// Method: cycles every story N_PASSES times inside ONE preview document by
// emitting `setCurrentStory` on the addons channel (same mechanism the manager
// uses — no page reload, so leaks accumulate and stay measurable). After each
// render, forces a major GC over CDP (HeapProfiler.collectGarbage) and samples
// Performance.getMetrics (JSHeapUsedSize, Nodes, JSEventListeners, Documents).
// Pass 0 is a warmup (vite compile + caches) and is not measured.
async page => {
  const BASE = 'http://localhost:6006';
  const N_PASSES = 3;

  const storyIds = await page.evaluate(async base => {
    const index = await (await window.fetch(base + '/index.json')).json();
    return Object.entries(index.entries)
      .filter(([, e]) => e.type === 'story')
      .map(([id]) => id);
  }, BASE);

  // --- Chrome DevTools Protocol session (same protocol DevTools UI uses) ---
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');

  const sample = async () => {
    // double GC with a settle delay: let microtasks/dispose callbacks run
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

  const visitStory = async id => {
    await page.evaluate(storyId => new Promise((resolve, reject) => {
      const ch = window.__STORYBOOK_ADDONS_CHANNEL__;
      const to = setTimeout(() => reject(new Error('render timeout: ' + storyId)), 20000);
      ch.once('storyRendered', () => { clearTimeout(to); resolve(); });
      ch.emit('setCurrentStory', { storyId, viewMode: 'story' });
    }), id);
    await page.waitForTimeout(100); // let React commit/effects settle
  };

  const records = [];
  const errors = [];

  // Warmup pass: compile every story through vite, fill story-store caches.
  for (const id of storyIds) {
    try { await visitStory(id); } catch (e) { errors.push({ pass: -1, id, error: String(e) }); }
  }
  const baseline = await sample();

  for (let p = 0; p < N_PASSES; p++) {
    for (let i = 0; i < storyIds.length; i++) {
      const id = storyIds[i];
      try {
        await visitStory(id);
        const s = await sample();
        records.push({ pass: p, i, id, ...s });
      } catch (e) {
        errors.push({ pass: p, id, error: String(e) });
      }
    }
  }
  const final = await sample();

  return JSON.stringify({ storyCount: storyIds.length, passes: N_PASSES, baseline, final, records, errors });
}
