/**
 * Rollup driver integration test — real IndexedDB stack (fake-indexeddb
 * backing), same '?real' module-key seam as queryService.integration.test.ts.
 *
 * Defends the end-to-end contract (issue #736 acceptance): after a driver
 * run, `grain: 'rollup'` facts exist in the real V12 store and are served to
 * widgets by the Query Service through the real by-metric / by-timestamp
 * indexes — with values matching the window math over the store's actual
 * SessionLoad facts. Expectations are computed from live store contents
 * because sibling integration files share this process-global database.
 */
import { describe, expect, it } from 'bun:test';

import type { AnalyticsDataPoint } from '@/types/storage';
import type { IndexedDBService } from '@/services/db/IndexedDBService';
import { QueryService, type FactQueryStore } from '@/services/analytics/query';
import {
  computeWorkloadRollups,
  dailySessionLoads,
  dayBucket,
  DAY,
  runRollupDriver,
  rollupFactId,
  type RollupStore,
} from '@/services/analytics/rollup';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();
const RUN_ID = `rollup-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;
const day0 = Math.floor(1_700_000_000_000 / DAY);

function sessionLoadFact(id: string, day: number, value: number): AnalyticsDataPoint {
  return {
    id: `${RUN_ID}-${id}`,
    noteId,
    grain: 'summary',
    segmentId: 's1',
    segmentVersion: 1,
    resultId: `${RUN_ID}-${id}`,
    type: 'sessionLoad',
    metricKey: 'sessionLoad',
    value,
    unit: 'AU',
    label: 'Session Load',
    timestamp: day * DAY + 12 * 3_600_000,
    createdAt: day * DAY,
  };
}

const rollupStore: RollupStore = {
  getFactsByMetric: (metricKey) => service.getFactsByMetric(metricKey),
  saveAnalyticsPoints: (points) => service.saveAnalyticsPoints(points),
  deleteAnalyticsPoints: (ids) => service.deleteAnalyticsPoints(ids),
};

const queryStore: FactQueryStore = {
  getFactsByMetric: (metricKey) => service.getFactsByMetric(metricKey),
  getFactsByTimeRange: (start, end) => service.getFactsByTimeRange(start, end),
  getNoteTagLabels: async (id) => (await service.getTagsForNote(id)).map((tag) => tag.label),
};

describe('rollup driver over the real V12 fact store', () => {
  it('persists grain:rollup facts served by the Query Service, idempotent on re-open', async () => {
    // One training week + an older chronic-only day, near the sibling files'
    // fixture range (their facts fold into the dynamic expectations below).
    await service.saveAnalyticsPoints([
      sessionLoadFact('old', day0 - 10, 400),
      sessionLoadFact('a', day0, 100),
      sessionLoadFact('b', day0 + 2, 200),
      sessionLoadFact('c', day0 + 4, 300),
      sessionLoadFact('d', day0 + 6, 100),
    ]);

    const now = Date.now();
    const throughDay = dayBucket(now);

    const first = await runRollupDriver(rollupStore, { now });
    expect(first.written).toBe(first.facts);
    expect(first.facts).toBeGreaterThan(0);
    expect(first.deleted).toBe(0);

    // Re-open: nothing missing or stale → no writes, no deletes.
    const second = await runRollupDriver(rollupStore, { now: now + 3_600_000 });
    expect(second.written).toBe(0);
    expect(second.deleted).toBe(0);

    // Dynamic ground truth: the window math over the store's actual
    // SessionLoad facts (sibling files share this process-global database).
    const sessionFacts = (await service.getFactsByMetric('sessionLoad'))
      .filter((row) => row.grain !== 'rollup' && typeof row.value === 'number');
    const expected = computeWorkloadRollups(dailySessionLoads(sessionFacts), throughDay);
    expect(expected.length).toBe(first.days);

    // Every desired ACWR row exists in the real store at its deterministic id.
    const storedAcwr = await service.getFactsByMetric('calc.acwr');
    const acwrByDay = new Map(storedAcwr.map((row) => [row.timestamp / DAY, row]));
    for (const dayRollup of expected) {
      if (dayRollup.acwr === undefined) continue;
      const row = acwrByDay.get(dayRollup.day);
      expect(row).toBeDefined();
      expect(row!.id).toBe(rollupFactId('calc.acwr', dayRollup.day));
      expect(row!.grain).toBe('rollup');
      expect(row!.value).toBeCloseTo(dayRollup.acwr, 10);
    }

    // Widgets stay dumb queries: the Query Service serves the rollup facts
    // through the real indexes, {grain:rollup} filters, and the by-timestamp
    // range leg narrows the windows served.
    const query = new QueryService(queryStore);
    const all = await query.runQuery('avg:calc.monotony{grain:rollup}');
    expect(all.stages.selected).toBeGreaterThan(0);
    const expectedMonotony = expected.filter((r) => r.monotony !== undefined);
    expect(all.matched).toHaveLength(expectedMonotony.length);

    const ranged = await query.runQuery('avg:calc.acwr{grain:rollup}', {
      rangeStart: day0 * DAY,
      rangeEnd: (day0 + 6) * DAY + DAY - 1,
    });
    const expectedInRange = expected.filter(
      (r) => r.acwr !== undefined && r.day >= day0 && r.day <= day0 + 6,
    );
    expect(ranged.matched).toHaveLength(expectedInRange.length);
    if (expectedInRange.length > 0) {
      const handAvg =
        expectedInRange.reduce((s, r) => s + r.acwr!, 0) / expectedInRange.length;
      expect(ranged.scalar).toBeCloseTo(Math.round(handAvg * 100) / 100, 10);
    }

    // Timeseries shape a chart widget would consume.
    const series = await query.runQuery('avg:calc.acwr{grain:rollup} by {day}.rollup(1d)');
    const forDay0Plus6 = series.series[0]?.points.find((p) => dayBucket(p.ts - DAY / 2) === day0 + 6);
    const expectedDay = expected.find((r) => r.day === day0 + 6);
    if (expectedDay?.acwr !== undefined) {
      expect(forDay0Plus6).toBeDefined();
      expect(forDay0Plus6!.value).toBeCloseTo(Math.round(expectedDay.acwr * 100) / 100, 10);
    }
  });
});
