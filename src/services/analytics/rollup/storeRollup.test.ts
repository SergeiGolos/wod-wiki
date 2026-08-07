/**
 * storeRollup unit tests — store-scope composed calcs (#877) replacing the
 * lazy rollupDriver. Same fixtures and contract as the legacy driver tests
 * (grain:'rollup' rows, deterministic ids, idempotent re-runs, stale-row
 * deletion), plus an explicit bit-exact parity proof against the
 * workloadRollup.ts reference math (acceptance: 100% parity).
 */
import { describe, expect, it } from 'bun:test';

import type { AnalyticsDataPoint } from '@/types/storage';
import { runStoreRollup, rollupFactId, type StoreRollupStore } from './storeRollup';
import { computeWorkloadRollups, dailySessionLoads, dayBucket, DAY } from './workloadRollup';

function sessionLoadFact(id: string, day: number, value: number): AnalyticsDataPoint {
  return {
    id: `fact-${id}`,
    noteId: 'note-a',
    grain: 'summary',
    segmentId: 's1',
    segmentVersion: 1,
    resultId: `result-${id}`,
    type: 'sessionLoad',
    metricKey: 'sessionLoad',
    value,
    unit: 'AU',
    label: 'Session Load',
    timestamp: day * DAY + 12 * 3_600_000, // midday inside the day bucket
    createdAt: day * DAY,
  };
}

interface FakeStore extends StoreRollupStore {
  rows: Map<string, AnalyticsDataPoint>;
  writeCalls: AnalyticsDataPoint[][];
  deleteCalls: string[][];
}

function makeStore(seed: AnalyticsDataPoint[] = []): FakeStore {
  const rows = new Map(seed.map((r) => [r.id, r]));
  const fake: FakeStore = {
    rows,
    writeCalls: [],
    deleteCalls: [],
    getFactsByMetric: async (metricKey) => [...rows.values()].filter((r) => r.metricKey === metricKey),
    saveAnalyticsPoints: async (points) => {
      fake.writeCalls.push(points);
      for (const p of points) rows.set(p.id, p);
    },
    deleteAnalyticsPoints: async (ids) => {
      fake.deleteCalls.push(ids);
      for (const id of ids) rows.delete(id);
    },
  };
  return fake;
}

// Fixture: one training week — 100/200/300/100 AU on days 0/2/4/6,
// "now" midday of day 6. Days 0..6 each produce acwr + monotony + strain +
// ctl + atl + tsb.
const NOW = 6 * DAY + 12 * 3_600_000;
const WEEK = [sessionLoadFact('a', 0, 100), sessionLoadFact('b', 2, 200), sessionLoadFact('c', 4, 300), sessionLoadFact('d', 6, 100)];

describe('runStoreRollup', () => {
  it('writes grain:rollup rows with deterministic ids and hand-computed values', async () => {
    const store = makeStore(WEEK);
    const summary = await runStoreRollup(store, { now: NOW });

    expect(summary.days).toBe(7);
    expect(summary.facts).toBe(42); // 7 days × 6 metrics
    expect(summary.written).toBe(42);
    expect(summary.deleted).toBe(0);

    const acwr6 = store.rows.get(rollupFactId('calc.acwr', 6))!;
    expect(acwr6.grain).toBe('rollup');
    expect(acwr6.value).toBeCloseTo(4, 10); // acute 100 / chronic 25
    expect(acwr6.timestamp).toBe(6 * DAY);
    expect(acwr6.unit).toBe('ratio');
    expect(acwr6.metricKey).toBe('calc.acwr');
    expect(acwr6.type).toBe('calc.acwr');

    expect(store.rows.get(rollupFactId('calc.monotony', 6))!.value).toBeCloseTo(0.93541, 4);
    expect(store.rows.get(rollupFactId('calc.strain', 6))!.value).toBeCloseTo(654.79003, 4);
    expect(store.rows.get(rollupFactId('calc.strain', 6))!.unit).toBe('AU');
  });

  it('derives PMC loads as EWMAs of daily sessionLoad (#905)', async () => {
    const store = makeStore(WEEK);
    await runStoreRollup(store, { now: NOW });

    // Reference recursion over the zero-filled day domain 0..6, gain 1/N:
    //   v_d = v_{d-1} + (load_d − v_{d-1}) / N, seeded at 0.
    const loads = [100, 0, 200, 0, 300, 0, 100];
    const ewma = (n: number): number[] => {
      let prev = 0;
      return loads.map((load) => (prev = prev + (load - prev) / n));
    };
    const ctl = ewma(42);
    const atl = ewma(7);

    for (let day = 0; day <= 6; day++) {
      expect(store.rows.get(rollupFactId('calc.ctl', day))!.value).toBeCloseTo(ctl[day], 10);
      expect(store.rows.get(rollupFactId('calc.atl', day))!.value).toBeCloseTo(atl[day], 10);
      expect(store.rows.get(rollupFactId('calc.tsb', day))!.value).toBeCloseTo(ctl[day] - atl[day], 10);
    }
    // Spot values: ATL reacts fast (66.86 after the 300 AU day), CTL lags.
    expect(store.rows.get(rollupFactId('calc.atl', 6))!.value).toBeCloseTo(66.86, 2);
    expect(store.rows.get(rollupFactId('calc.ctl', 6))!.value).toBeCloseTo(15.57, 2);
    expect(store.rows.get(rollupFactId('calc.tsb', 6))!.unit).toBe('AU');
    expect(store.rows.get(rollupFactId('calc.ctl', 6))!.metricLabel).toBe('Chronic Training Load (CTL)');
  });

  it('matches the workloadRollup reference math bit-for-bit (parity proof, #864)', async () => {
    const store = makeStore([sessionLoadFact('old', -10, 400), ...WEEK]);
    await runStoreRollup(store, { now: NOW });

    const sessionFacts = [sessionLoadFact('old', -10, 400), ...WEEK];
    const reference = computeWorkloadRollups(dailySessionLoads(sessionFacts), dayBucket(NOW));
    for (const rollup of reference) {
      if (rollup.acwr !== undefined) {
        expect(store.rows.get(rollupFactId('calc.acwr', rollup.day))!.value).toBe(rollup.acwr);
      }
      if (rollup.monotony !== undefined) {
        expect(store.rows.get(rollupFactId('calc.monotony', rollup.day))!.value).toBe(rollup.monotony);
      }
      if (rollup.strain !== undefined) {
        expect(store.rows.get(rollupFactId('calc.strain', rollup.day))!.value).toBe(rollup.strain);
      }
    }
  });

  it('is idempotent: an unchanged re-run writes and deletes nothing, createdAt survives', async () => {
    const store = makeStore(WEEK);
    await runStoreRollup(store, { now: NOW });
    const before = new Map([...store.rows.entries()].map(([id, r]) => [id, r.createdAt]));

    const second = await runStoreRollup(store, { now: NOW + 3_600_000 }); // same day
    expect(second.written).toBe(0);
    expect(second.deleted).toBe(0);
    expect(store.writeCalls).toHaveLength(1);
    for (const [id, createdAt] of before) {
      expect(store.rows.get(id)?.createdAt).toBe(createdAt);
    }
  });

  it('recomputes only stale windows when a SessionLoad fact changes', async () => {
    // An older chronic-only load (day -10) keeps ACWR non-degenerate: with
    // all loads inside one week, sum7 == sum28 and ACWR would be 4 for every
    // day regardless of changes.
    const store = makeStore([sessionLoadFact('old', -10, 400), ...WEEK]);
    await runStoreRollup(store, { now: NOW });

    // +50 AU on day 3: only days 3..6 have day 3 inside their 28-day lookback.
    store.rows.set('fact-e', sessionLoadFact('e', 3, 50));
    const rerun = await runStoreRollup(store, { now: NOW });

    // 4 stale days × 3 window metrics, plus the EWMA loads: the recursion
    // makes every day ≥ 3 stale for ctl/atl/tsb too (4 × 3).
    expect(rerun.written).toBe(24);
    expect(rerun.deleted).toBe(0);
    const rewrittenIds = new Set(store.writeCalls[1].map((r) => r.id));
    for (const day of [3, 4, 5, 6]) {
      for (const key of ['calc.acwr', 'calc.monotony', 'calc.strain', 'calc.ctl', 'calc.atl', 'calc.tsb']) {
        expect(rewrittenIds.has(rollupFactId(key, day))).toBe(true);
      }
    }
    // Day 2 is outside the stale span — untouched. Before: sum7 = 300,
    // sum28 = 700 → ACWR (300/7)/(700/28) ≈ 1.71429.
    expect(store.rows.get(rollupFactId('calc.acwr', 2))!.value).toBeCloseTo(1.71429, 4);
    // Day 6 after: sum7 = 750, sum28 = 1150 → ACWR (750/7)/(1150/28) ≈ 2.60870.
    expect(store.rows.get(rollupFactId('calc.acwr', 6))!.value).toBeCloseTo(2.60870, 4);
    // Monotony moves: new mean 750/7, sd over [100,0,200,50,300,0,100].
    const mean = 750 / 7;
    const sq = [100, 0, 200, 50, 300, 0, 100].reduce((s, v) => s + (v - mean) ** 2, 0);
    expect(store.rows.get(rollupFactId('calc.monotony', 6))!.value).toBeCloseTo(mean / Math.sqrt(sq / 7), 10);
  });

  it('deletes rollup rows when their windows stop producing values', async () => {
    const store = makeStore(WEEK);
    await runStoreRollup(store, { now: NOW });

    for (const id of ['fact-a', 'fact-b', 'fact-c', 'fact-d']) store.rows.delete(id);
    const rerun = await runStoreRollup(store, { now: NOW });

    expect(rerun.written).toBe(0);
    expect(rerun.deleted).toBe(42);
    expect([...store.rows.keys()].filter((id) => id.startsWith('rollup:'))).toHaveLength(0);
  });

  it('advances windows when "now" moves to a later day', async () => {
    const store = makeStore(WEEK);
    await runStoreRollup(store, { now: NOW });

    // A week later: days 7..13 enter (chronic still fed by the training week).
    const rerun = await runStoreRollup(store, { now: NOW + 7 * DAY });
    expect(rerun.written).toBeGreaterThan(0);
    expect(rerun.deleted).toBe(0);
    const day13 = store.rows.get(rollupFactId('calc.acwr', 13))!;
    // acute = 0 (rest week), chronic = 700/28 = 25 → ACWR 0.
    expect(day13.value).toBe(0);
  });

  it('ignores non-numeric and rollup-grain rows on the sessionLoad leg', async () => {
    const bogus: AnalyticsDataPoint = { ...sessionLoadFact('x', 1, 999), value: 'high' };
    const strayRollup: AnalyticsDataPoint = { ...sessionLoadFact('y', 1, 999), grain: 'rollup' };
    const store = makeStore([sessionLoadFact('a', 0, 100), bogus, strayRollup]);
    const summary = await runStoreRollup(store, { now: NOW });
    // Only the one honest 100 AU day feeds the windows.
    expect(summary.days).toBe(7);
    expect(store.rows.get(rollupFactId('calc.acwr', 6))!.value).toBeCloseTo(4, 10);
  });
});
