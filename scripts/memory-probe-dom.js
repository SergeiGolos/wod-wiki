// DOM/heap growth probe across Home<->Library route cycles.
// Run: playwright-cli -s=pgstress --raw run-code --filename=scripts/memory-probe-dom.js
async page => {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('HeapProfiler.enable');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://localhost:5174/');
  await page.waitForTimeout(1500);
  // warm both routes (compile modules)
  await page.getByRole('button', { name: 'Library' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(1200);
  const sample = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(150);
    await client.send('HeapProfiler.collectGarbage');
    const { metrics } = await client.send('Performance.getMetrics');
    const m = Object.fromEntries(metrics.map(x => [x.name, x.value]));
    const dom = await page.evaluate(() => ({
      nodes: document.getElementsByTagName('*').length,
      canvases: document.querySelectorAll('canvas').length,
      videos: document.querySelectorAll('video,audio').length,
      svgs: document.querySelectorAll('svg').length,
      iframes: document.querySelectorAll('iframe').length,
    }));
    return {
      route: page.url().replace('https://localhost:5174', ''),
      heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2),
      rendererNodes: m.Nodes,
      listeners: m.JSEventListeners,
      docs: m.Documents,
      domNodes: dom.nodes,
      canvases: dom.canvases,
      media: dom.videos,
      svgs: dom.svgs,
      iframes: dom.iframes,
    };
  };
  const records = [];
  records.push({ cycle: -1, ...(await sample()) });
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Library' }).click();
    await page.waitForTimeout(800);
    records.push({ cycle: i, ...(await sample()) });
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(800);
    records.push({ cycle: i, ...(await sample()) });
  }
  return JSON.stringify(records);
}
