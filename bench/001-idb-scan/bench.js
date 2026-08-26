/**
 * bench.js — ticket 001 measurement harness (wayfinder: unified event store).
 *
 * Compares, on REAL IndexedDB in this browser:
 *   TODAY : flat fact store queried through indexes (by-metric / by-timestamp),
 *           mirroring packages/wql FactQueryStore legs.
 *   SCAN  : proposed unified model — result-shaped blobs fetched whole,
 *           parsed (structured-clone deserialize) and filtered in JS.
 *
 * Schema mirrors IndexedDBService.ts:105-122 (WQL-relevant subset).
 * Corpus: N results × M log events; fact rows derived with the same rule as
 * normalizeSummaryFacts (summary rows keyed metricKey[+effort] + segment rows).
 *
 * Results land in #status and window.__BENCH__ (JSON).
 */

const t0Page = performance.now();
window.addEventListener('error', (e) => {
  document.getElementById('status').textContent = `__ERROR__ ${e.message}`;
});
window.addEventListener('unhandledrejection', (e) => {
  document.getElementById('status').textContent = `__ERROR__ ${e.reason}`;
});
const statusEl = () => document.getElementById('status');

const Q = new URLSearchParams(location.search);
const N_RESULTS = parseInt(Q.get('results') ?? '2000', 10);
const N_EVENTS = parseInt(Q.get('events') ?? '30', 10);
const RUNS = parseInt(Q.get('runs') ?? '3', 10);
const EFFORTS = Array.from({ length: 25 }, (_, i) => `effort-${String(i).padStart(2, '0')}`);
const WEEK = 7 * 86_400_000;
const NOW = Date.now();
const WINDOW_START = NOW - 26 * WEEK;

// ── DB setup ────────────────────────────────────────────────────────────────
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('idb-bench', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const facts = db.createObjectStore('analytics', { keyPath: 'id' });
      facts.createIndex('by-metric', 'metricKey');
      facts.createIndex('by-timestamp', 'timestamp');
      facts.createIndex('by-value', ['metricKey', 'value']);
      facts.createIndex('by-effort', 'effortSlug');
      facts.createIndex('by-grain', 'grain');
      db.createObjectStore('results', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// clear() on hundreds of thousands of indexed rows is brutally slow;
// dropping the database rebuilds fresh almost instantly.
async function recreateDb() {
  await new Promise((res) => {
    const r = indexedDB.deleteDatabase('idb-bench');
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
  return openDb();
}

// ── Synthetic corpus ────────────────────────────────────────────────────────
function makeLogs(resultId, ts0) {
  const logs = [];
  for (let j = 0; j < N_EVENTS; j++) {
    const effort = EFFORTS[j % EFFORTS.length];
    logs.push({
      id: `${resultId}-o${j}`,
      outputType: 'analytics',
      timeSpan: { started: ts0 + j * 1000, ended: ts0 + j * 1000 + 900 },
      sourceBlockKey: 'analytics-summary',
      stackLevel: 0,
      metrics: [
        { type: 'label', value: 'Total Volume', image: 'Total Volume' },
        {
          type: 'volume',
          value: 100 + ((resultId * 31 + j * 17) % 190),
          unit: 'kg',
          metadata: { canonicalKey: 'totalVolume', effortSlug: effort, effortDiscipline: 'strength' },
        },
        { type: 'reps', value: (resultId + j) % 21, unit: 'reps' },
      ],
    });
  }
  return logs;
}

function deriveFactRows(resultId, ts0, logs) {
  const seen = new Map();
  for (const out of logs) {
    const label = out.metrics.find((m) => m.type === 'label');
    const val = out.metrics.find((m) => m.type !== 'label' && typeof m.value === 'number');
    if (!label || !val || val.type !== 'volume') continue;
    const meta = val.metadata ?? {};
    const metricKey = meta.canonicalKey ?? String(label.value).toLowerCase().replace(/\s+/g, '');
    const effort = meta.effortSlug;
    const key = effort ? `${metricKey}:effort=${effort}` : metricKey;
    seen.set(key, {
      id: `${resultId}-${key}`, resultId, noteId: `n${resultId % 700}`,
      blockContentId: `bc${resultId % 400}`, grain: 'summary',
      metricKey, value: val.value, unit: val.unit ?? 'kg',
      effortSlug: effort, discipline: meta.effortDiscipline,
      timestamp: ts0, createdAt: NOW,
    });
  }
  const rows = [...seen.values()];
  logs.forEach((out, j) => {
    const reps = out.metrics.find((m) => m.type === 'reps');
    rows.push({
      id: `${resultId}-seg${j}`, resultId, noteId: `n${resultId % 700}`,
      blockContentId: `bc${resultId % 400}`, grain: 'segment', metricKey: 'reps',
      value: reps.value, unit: 'reps', effortSlug: out.metrics[1].metadata.effortSlug,
      timestamp: out.timeSpan.started, createdAt: NOW,
    });
  });
  return rows;
}

async function generate(db) {
  const CHUNK = 250;
  let factCount = 0;
  for (let start = 0; start < N_RESULTS; start += CHUNK) {
    const tx = db.transaction(['analytics', 'results'], 'readwrite');
    const af = tx.objectStore('analytics');
    const rs = tx.objectStore('results');
    for (let i = start; i < Math.min(start + CHUNK, N_RESULTS); i++) {
      const ts0 = NOW - Math.floor(Math.random() * 182) * WEEK;
      const logs = makeLogs(i, ts0);
      rs.put({ id: `r${i}`, createdAt: ts0, data: { logs } });
      const facts = deriveFactRows(`r${i}`, ts0, logs);
      facts.forEach((f) => af.put(f));
      factCount += facts.length;
    }
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    statusEl().textContent = `generated ${Math.min(start + CHUNK, N_RESULTS)}/${N_RESULTS} results…`;
  }
  return factCount;
}

// ── Timing helpers ──────────────────────────────────────────────────────────
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
async function time(name, fn) {
  const runs = [];
  let info = {};
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    info = await fn();
    const ms = performance.now() - t0;
    runs.push(ms);
    statusEl().textContent = `${name}: run ${i + 1}/${RUNS} → ${ms.toFixed(0)}ms`;
  }
  return { medianMs: +median(runs).toFixed(1), minMs: +Math.min(...runs).toFixed(1), ...info };
}
const allIdx = (db, idx, range) =>
  new Promise((res, rej) => { const r = db.transaction('analytics').objectStore('analytics').index(idx).getAll(range); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const allStore = (db, store) =>
  new Promise((res, rej) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// Dashboard-sized query: totalVolume summaries, last 26w.
const inWindow = (row) => row.timestamp >= WINDOW_START && row.timestamp <= NOW;

async function s1_metricThenFilter(db) {
  const rows = await allIdx(db, 'by-metric', 'totalVolume');
  const kept = rows.filter((r) => r.grain === 'summary' && inWindow(r));
  return { rowsFetched: rows.length, kept: kept.length, sum: Math.round(kept.reduce((a, r) => a + r.value, 0)) };
}
async function s2_timeWindow(db) {
  const rows = await allIdx(db, 'by-timestamp', IDBKeyRange.bound(WINDOW_START, NOW));
  return { rowsFetched: rows.length };
}
async function s3_combinedSelect(db) {
  const byMetric = await allIdx(db, 'by-metric', 'totalVolume');
  const byTime = new Set((await allIdx(db, 'by-timestamp', IDBKeyRange.bound(WINDOW_START, NOW))).map((r) => r.id));
  const kept = byMetric.filter((r) => byTime.has(r.id) && r.grain === 'summary');
  return { kept: kept.length };
}
async function s4_scanFlatFacts(db) {
  const rows = await allStore(db, 'analytics');
  const kept = rows.filter((r) => r.metricKey === 'totalVolume' && r.grain === 'summary' && inWindow(r));
  return { rowsScanned: rows.length, kept: kept.length };
}
async function s5_scanResultBlobs(db) {
  const blobs = await allStore(db, 'results');
  let eventsScanned = 0, sum = 0, kept = 0;
  for (const blob of blobs) {
    if (!inWindow({ timestamp: blob.createdAt })) continue;
    for (const out of blob.data.logs) {
      eventsScanned++;
      const label = out.metrics.find((m) => m.type === 'label');
      const val = out.metrics.find((m) => m.type !== 'label' && typeof m.value === 'number');
      if (!label || !val || val.metadata?.canonicalKey !== 'totalVolume') continue;
      sum += val.value; kept++;
    }
  }
  return { blobsParsed: blobs.length, eventsScanned, kept, sum: Math.round(sum) };
}

// ── Main ────────────────────────────────────────────────────────────────────
statusEl().textContent = 'recreating db…';
const db = await recreateDb();
statusEl().textContent = `generating ${N_RESULTS} × ${N_EVENTS}…`;
const factRows = await generate(db);

const scenarios = [
  ['S1 today · by-metric + JS filter', s1_metricThenFilter],
  ['S2 today · by-timestamp window', s2_timeWindow],
  ['S3 today · combined SELECT (intersect)', s3_combinedSelect],
  ['S4 unified? · full scan of FLAT facts (no index)', s4_scanFlatFacts],
  ['S5 unified? · full scan of RESULT BLOBS + parse', s5_scanResultBlobs],
];
const out = { corpus: { results: N_RESULTS, eventsPerResult: N_EVENTS, factRows }, runs: RUNS, scenarios: {} };
for (const [name, fn] of scenarios) {
  out.scenarios[name] = await time(name, fn.bind(null, db));
}
const s3 = out.scenarios['S3 today · combined SELECT (intersect)'];
const s5 = out.scenarios['S5 unified? · full scan of RESULT BLOBS + parse'];
out.verdict = { indexedCombinedMs: s3.medianMs, blobScanMs: s5.medianMs, ratio: +(s5.medianMs / s3.medianMs).toFixed(1), passes2x: s5.medianMs <= 2 * s3.medianMs };
statusEl().textContent = '__DONE__\n' + JSON.stringify(out, null, 2);
window.__BENCH__ = out;
