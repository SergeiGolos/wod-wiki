// Heap snapshot diff for the Storybook preview (wod-wiki).
//
// Usage (session already open on iframe.html):
//   playwright-cli -s=memstress --raw run-code --filename=scripts/memory-snapshot-diff.js | jq .
//
// Method: GC + HeapProfiler.takeHeapSnapshot (CDP), mount/unmount the target
// story CYCLES times via the addons channel (no reload), GC + snapshot again,
// then aggregate self_size by constructor name for both snapshots and return
// the top growers. Snapshots never leave the CLI process — only the diff.
async page => {
  const TARGET = 'playground--empty-workbench';
  const CYCLES = 20;

  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.enable');

  const visit = async id => {
    await page.evaluate(storyId => new Promise((resolve, reject) => {
      const ch = window.__STORYBOOK_ADDONS_CHANNEL__;
      const to = setTimeout(() => reject(new Error('render timeout: ' + storyId)), 20000);
      ch.once('storyRendered', () => { clearTimeout(to); resolve(); });
      ch.emit('setCurrentStory', { storyId, viewMode: 'story' });
    }), id);
    await page.waitForTimeout(100);
  };

  const takeSnapshot = async () => {
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(150);
    await client.send('HeapProfiler.collectGarbage');
    const chunks = [];
    const onChunk = c => chunks.push(c.chunk);
    client.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
    await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    client.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
    const snap = JSON.parse(chunks.join(''));
    const fields = snap.snapshot.meta.node_fields;
    const iType = fields.indexOf('type');
    const iName = fields.indexOf('name');
    const iSize = fields.indexOf('self_size');
    const stride = fields.length;
    const nodes = snap.nodes;
    const strings = snap.strings;
    const byName = new Map();
    for (let off = 0; off < nodes.length; off += stride) {
      const type = strings ? nodes[off + iType] : 0;
      const nameIdx = nodes[off + iName];
      const size = nodes[off + iSize];
      const key = strings[nameIdx] + ' <' + snap.snapshot.meta.node_types[0][type] + '>';
      byName.set(key, (byName.get(key) || 0) + size);
    }
    return byName;
  };

  const before = await takeSnapshot();
  for (let i = 0; i < CYCLES; i++) {
    await visit(TARGET);
    // alternate with a cheap story so TARGET fully unmounts each cycle
    await visit('gallery-wql-example-gallery--table-section');
  }
  const after = await takeSnapshot();

  const diff = [];
  for (const [name, sizeAfter] of after) {
    const sizeBefore = before.get(name) || 0;
    if (sizeAfter - sizeBefore > 4096) diff.push({ name, grewKB: +((sizeAfter - sizeBefore) / 1024).toFixed(1) });
  }
  diff.sort((a, b) => b.grewKB - a.grewKB);
  let totalGrew = 0;
  for (const [name, sizeAfter] of after) totalGrew += sizeAfter - (before.get(name) || 0);
  return JSON.stringify({ target: TARGET, cycles: CYCLES, totalGrewMB: +(totalGrew / 1048576).toFixed(1), top: diff.slice(0, 40) });
}
