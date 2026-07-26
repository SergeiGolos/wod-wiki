/**
 * Query Service integration test — real IndexedDB stack (fake-indexeddb
 * backing), same '?real' module-key seam as backfillV12.integration.test.ts.
 *
 * Defends the end-to-end contract: WQL executes against real V12 fact rows
 * through the real by-metric / by-timestamp indexes, and the 'tags' dimension
 * resolves through the real note_tags store.
 */
import { describe, expect, it } from 'bun:test';

import type { AnalyticsDataPoint } from '@/types/storage';
import type { IndexedDBService } from '@/services/db/IndexedDBService';
import { QueryService, type FactQueryStore } from '@/services/analytics/query';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();

const DAY = 86_400_000;
const day0 = Math.floor(1_700_000_000_000 / DAY) * DAY;
const RUN_ID = `wql-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;

function fact(id: string, metricKey: string, value: number, timestamp: number, extra: Partial<AnalyticsDataPoint> = {}): AnalyticsDataPoint {
  return {
    id: `${RUN_ID}-${id}`,
    noteId,
    grain: 'summary',
    segmentId: 's1',
    segmentVersion: 1,
    resultId: `${RUN_ID}-${id}`,
    type: metricKey,
    metricKey,
    value,
    label: metricKey,
    timestamp,
    createdAt: timestamp,
    ...extra,
  };
}

describe('QueryService over the real V12 fact store', () => {
  it('executes WQL end-to-end through by-metric + by-timestamp + note_tags', async () => {
    await service.setNoteTags(noteId, ['crossfit']);
    await service.saveAnalyticsPoints([
      fact('v1', 'totalVolume', 1000, day0 + 3_600_000, { discipline: 'strength', effortSlug: 'back-squat' }),
      fact('v2', 'totalVolume', 2000, day0 + DAY, { discipline: 'strength', effortSlug: 'back-squat' }),
      fact('v3', 'totalVolume', 3000, day0 + 8 * DAY, { discipline: 'strength', effortSlug: 'back-squat' }),
      fact('t1', 'tis', 72, day0 + 3_600_000, { discipline: 'strength' }),
    ]);

    const store: FactQueryStore = {
      getFactsByMetric: (metricKey) => service.getFactsByMetric(metricKey),
      getFactsByTimeRange: (start, end) => service.getFactsByTimeRange(start, end),
      getNoteTagLabels: async (id) => (await service.getTagsForNote(id)).map(tag => tag.label),
    };
    const query = new QueryService(store);
    const ours = (result: { matched: AnalyticsDataPoint[] }) =>
      result.matched.filter(row => row.id.startsWith(RUN_ID));

    // by-metric leg over real rows.
    const total = await query.runQuery(`sum:totalVolume{note:${noteId}}`);
    expect(total.scalar).toBe(6000);
    expect(ours(total)).toHaveLength(3);

    // Time-range leg intersects through the by-timestamp index.
    const ranged = await query.runQuery(`sum:totalVolume{note:${noteId}}`, {
      rangeStart: day0 + DAY,
      rangeEnd: day0 + 4 * DAY,
    });
    expect(ours(ranged)).toHaveLength(1);
    expect(ranged.scalar).toBe(2000);

    // note_tags dimension resolves through the real tag store.
    const tagged = await query.runQuery('sum:totalVolume{tags:crossfit}');
    expect(ours(tagged)).toHaveLength(3);
    expect(tagged.scalar).toBe(6000);

    // Rollup buckets hand-computed against real rows.
    const weekly = await query.runQuery(`sum:totalVolume{note:${noteId}}.rollup(1w)`);
    expect(weekly.series[0].points.map(p => p.value)).toEqual([3000, 3000]);
    expect(weekly.stages).toEqual({ selected: 3, buckets: 2, aggregated: 2, groups: 1 });
  });
});
