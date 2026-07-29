/**
 * Query Service tests — the four-stage WQL physical plan over fact rows.
 *
 * Defends the observable contracts:
 *   1. SELECT is index-first: by-metric is always fetched; by-timestamp only
 *      when a range is given; the two legs intersect by row id.
 *   2. Structured tag matcher: exact / negated / wildcard filters over fact
 *      fields; 'tags' resolves through the note_tags store.
 *   3. BUCKET: time dims and rollup periods define time buckets.
 *   4. AGGREGATE: all seven aggregators, hand-computed.
 *   5. GROUP: tag-dimension fan-out, virtual dims (day/week/session), '(none)'.
 *   6. Stage telemetry (selected / buckets / aggregated / groups) + scalar.
 */
import { describe, expect, it } from 'bun:test';
import type { AnalyticsDataPoint } from '@/types/storage';
import { QueryService, type FactQueryStore } from './QueryService';
import { queryResultToGridRows } from './gridAdapter';
import { MetricType } from '@/core/models/Metric';

const DAY = 86_400_000;
const WEEK = 7 * DAY;
// A clean day boundary so bucket math is hand-computable.
const day0 = Math.floor(1_700_000_000_000 / DAY) * DAY;
const HOUR = 3_600_000;

let seq = 0;
function fact(
  metricKey: string,
  value: number,
  timestamp: number,
  extra: Partial<AnalyticsDataPoint> = {},
): AnalyticsDataPoint {
  seq += 1;
  return {
    id: `f${seq}`,
    noteId: 'note-fran',
    grain: 'summary',
    segmentId: 's1',
    segmentVersion: 1,
    resultId: `r${seq}`,
    type: metricKey,
    metricKey,
    value,
    label: metricKey,
    timestamp,
    createdAt: timestamp,
    ...extra,
  };
}

// Fixture journal (hand-computed expectations below refer to these rows):
//   v1 1000 @day0+1h  strength/back-squat  note-fran
//   v2 2000 @day0+1d  strength/back-squat  note-fran
//   v3 3000 @day0+8d  strength/back-squat  note-fran
//   t1   72 @day0+1h  (tis — different metric, never selected by volume queries)
//   v4  500 @day0+3d  rowing/rowing        note-row
const V1 = fact('totalVolume', 1000, day0 + HOUR, { discipline: 'strength', effortSlug: 'back-squat', intensityTier: 'high' });
const V2 = fact('totalVolume', 2000, day0 + 1 * DAY, { discipline: 'strength', effortSlug: 'back-squat', intensityTier: 'high' });
const V3 = fact('totalVolume', 3000, day0 + 8 * DAY, { discipline: 'strength', effortSlug: 'back-squat', intensityTier: 'high' });
const T1 = fact('tis', 72, day0 + HOUR, { discipline: 'strength', effortSlug: 'back-squat' });
const V4 = fact('totalVolume', 500, day0 + 3 * DAY, { discipline: 'rowing', effortSlug: 'rowing', noteId: 'note-row' });
const FACTS = [V1, V2, V3, T1, V4];

const NOTE_TAGS: Record<string, string[]> = {
  'note-fran': ['crossfit', 'girl-wods'],
  'note-row': ['rowing'],
};

interface StoreSpy {
  store: FactQueryStore;
  calls: string[];
}

function makeStore(facts: AnalyticsDataPoint[] = FACTS): StoreSpy {
  const calls: string[] = [];
  return {
    calls,
    store: {
      getFactsByMetric: async (metricKey) => {
        calls.push(`by-metric:${metricKey}`);
        return facts.filter(row => row.metricKey === metricKey);
      },
      getFactsByTimeRange: async (start, end) => {
        calls.push(`by-timestamp:${start}-${end}`);
        return facts.filter(row => row.timestamp >= start && row.timestamp <= end);
      },
      getNoteTagLabels: async (noteId) => {
        calls.push(`tags:${noteId}`);
        return NOTE_TAGS[noteId] ?? [];
      },
    },
  };
}

describe('QueryService', () => {
  it('SELECTs index-first: by-metric always, by-timestamp only with a range', async () => {
    const { store, calls } = makeStore();
    const service = new QueryService(store);

    await service.runQuery('sum:totalVolume{}');
    expect(calls).toEqual(['by-metric:totalVolume']);

    calls.length = 0;
    await service.runQuery('sum:totalVolume{}', { rangeStart: day0, rangeEnd: day0 + 4 * DAY });
    expect(calls[0]).toBe('by-metric:totalVolume');
    expect(calls[1]).toBe(`by-timestamp:${day0}-${day0 + 4 * DAY}`);
  });

  it('intersects the two index legs by row id', async () => {
    const { store } = makeStore();
    const service = new QueryService(store);
    // Window covers v2/v4 but not v1/v3.
    const result = await service.runQuery('sum:totalVolume{}', {
      rangeStart: day0 + 1 * DAY,
      rangeEnd: day0 + 4 * DAY,
    });
    expect(result.stages.selected).toBe(2);
    expect(result.scalar).toBe(2500);
  });

  it('filters tags exactly, negated, and wildcard', async () => {
    const service = new QueryService(makeStore().store);

    expect((await service.runQuery('sum:totalVolume{discipline:strength}')).scalar).toBe(6000);
    expect((await service.runQuery('sum:totalVolume{!discipline:strength}')).scalar).toBe(500);
    expect((await service.runQuery('sum:totalVolume{effort:back*}')).scalar).toBe(6000);
    // Unknown tag keys match nothing (positive) / everything (negated).
    expect((await service.runQuery('sum:totalVolume{coach:greg}')).stages.selected).toBe(0);
    expect((await service.runQuery('sum:totalVolume{!coach:greg}')).stages.selected).toBe(4);
  });

  it('filters multi-value tags with OR within a key and AND across keys', async () => {
    const service = new QueryService(makeStore().store);

    // OR within a single key: matches rows with either value.
    expect((await service.runQuery('sum:totalVolume{note:note-fran|note-row}')).scalar).toBe(6500);
    expect((await service.runQuery('sum:totalVolume{effort:back-squat|rowing}')).scalar).toBe(6500);

    // AND across different keys: both conditions must hold.
    const andAcross = await service.runQuery('sum:totalVolume{note:note-row,discipline:strength}');
    expect(andAcross.stages.selected).toBe(0);

    // Mixing OR and AND in one query.
    const mixed = await service.runQuery('sum:totalVolume{note:note-fran|note-row,discipline:strength}');
    expect(mixed.scalar).toBe(6000);
  });

  it('negates multi-value filters across the whole value list', async () => {
    const service = new QueryService(makeStore().store);

    // Exclude rows matching ANY value in the list.
    expect((await service.runQuery('sum:totalVolume{!note:note-fran|note-row}')).stages.selected).toBe(0);
    expect((await service.runQuery('sum:totalVolume{!effort:rowing}')).scalar).toBe(6000);
  });

  it('supports per-value wildcards in multi-value filters', async () => {
    const service = new QueryService(makeStore().store);

    expect((await service.runQuery('sum:totalVolume{effort:back*|rowing}')).scalar).toBe(6500);
  });

  it('treats repeated keys as OR within the key (same as a|b)', async () => {
    const service = new QueryService(makeStore().store);

    const multiValue = await service.runQuery('sum:totalVolume{note:note-fran|note-row}');
    const repeatedKey = await service.runQuery('sum:totalVolume{note:note-fran,note:note-row}');
    expect(repeatedKey.scalar).toBe(multiValue.scalar);
    expect(repeatedKey.stages.selected).toBe(multiValue.stages.selected);
  });

  it('resolves multi-value tags against the note_tags set', async () => {
    const service = new QueryService(makeStore().store);

    const result = await service.runQuery('sum:totalVolume{tags:crossfit|rowing}');
    expect(result.scalar).toBe(6500);
    expect(result.stages.selected).toBe(4);
  });

  it("resolves the 'tags' dimension through note_tags, loaded once per note", async () => {
    const { store, calls } = makeStore();
    const service = new QueryService(store);

    const result = await service.runQuery('sum:totalVolume{tags:crossfit}');
    expect(result.scalar).toBe(6000);
    expect(calls.filter(c => c.startsWith('tags:')).sort()).toEqual(['tags:note-fran', 'tags:note-row']);

    // Queries that never touch 'tags' never hit the note_tags store.
    calls.length = 0;
    await service.runQuery('sum:totalVolume{}');
    expect(calls.some(c => c.startsWith('tags:'))).toBe(false);
  });

  it('aggregates all seven aggregators, hand-computed', async () => {
    const service = new QueryService(makeStore().store);
    const cases: [string, number][] = [
      ['sum:totalVolume{}', 6500],
      ['avg:totalVolume{}', 1625],
      ['min:totalVolume{}', 500],
      ['max:totalVolume{}', 3000],
      ['count:totalVolume{}', 4],
      // last = newest row (v3 @day0+8d); delta = fixture order last-first (v4 - v1).
      ['last:totalVolume{}', 3000],
      ['delta:totalVolume{}', 500 - 1000],
    ];
    for (const [query, expected] of cases) {
      expect((await service.runQuery(query)).scalar).toBe(expected);
    }
  });

  it('BUCKETs by rollup period and aggregates per bucket', async () => {
    const service = new QueryService(makeStore().store);
    const result = await service.runQuery('sum:totalVolume{discipline:strength}.rollup(1w)');

    // v1+v2 share a week bucket (3000), v3 lands the next (3000).
    expect(result.series).toHaveLength(1);
    expect(result.series[0].points.map(p => p.value)).toEqual([3000, 3000]);
    const bucket = (ts: number) => Math.floor(ts / WEEK);
    expect(result.series[0].points[0].ts).toBe(bucket(V1.timestamp) * WEEK + WEEK / 2);
    expect(result.stages.buckets).toBe(2);
  });

  it('GROUPs by tag dimensions and virtual dims', async () => {
    const service = new QueryService(makeStore().store);

    const byEffort = await service.runQuery('sum:totalVolume{} by {effort}');
    expect(byEffort.series.map(s => s.key).sort()).toEqual(['back-squat', 'rowing']);
    expect(byEffort.series.find(s => s.key === 'back-squat')!.points[0].value).toBe(6000);
    expect(byEffort.stages.groups).toBe(2);

    const bySession = await service.runQuery('sum:totalVolume{} by {session}');
    expect(bySession.stages.groups).toBe(4); // one series per resultId

    const byDay = await service.runQuery('sum:totalVolume{discipline:strength} by {day}');
    expect(byDay.series[0].points).toHaveLength(3); // day buckets win over rollup
    expect(byDay.stages.buckets).toBe(3);

    // Dims that don't resolve group under '(none)'.
    const byRound = await service.runQuery('sum:totalVolume{} by {round}');
    expect(byRound.series[0].key).toBe('(none)');
  });

  it('exposes stage telemetry and scalar for single-point results', async () => {
    const service = new QueryService(makeStore().store);
    const result = await service.runQuery('sum:totalVolume{discipline:strength} by {week}');
    expect(result.stages).toEqual({ selected: 3, buckets: 2, aggregated: 2, groups: 1 });
    expect(result.scalar).toBeUndefined(); // two points → not a scalar

    const scalar = await service.runQuery('max:tis{}');
    expect(scalar.scalar).toBe(72);
  });

  it('returns an empty telemetry-zero result for parse errors', async () => {
    const service = new QueryService(makeStore().store);
    const result = await service.runQuery('median:tis');
    expect(result.series).toEqual([]);
    expect(result.stages).toEqual({ selected: 0, buckets: 0, aggregated: 0, groups: 0 });
    expect(result.matched).toEqual([]);
  });
});

describe('queryResultToGridRows', () => {
  it('flattens series into ReviewGrid-shaped rows', async () => {
    const service = new QueryService(makeStore().store);
    const result = await service.runQuery('sum:totalVolume{discipline:strength} by {week}');
    const rows = queryResultToGridRows(result);

    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.id)).toEqual([1, 2]);
    expect(rows[0].sourceBlockKey).toBe('totalVolume');
    expect(rows[0].outputType).toBe('analytics');
    expect(rows[0].absoluteStartTime).toBe(result.series[0].points[0].ts);

    const cell = rows[0].cells.get(MetricType.Metric);
    expect(cell?.hasUserOverride).toBe(false);
    expect(cell?.metrics.getByType(MetricType.Metric)[0]?.value).toBe(3000);
  });
});

describe('QueryService unit conversion', () => {
  const lbFacts = [
    fact('totalVolume', 1000, day0 + HOUR, { unit: 'lb', effortSlug: 'back-squat' }),
    fact('totalVolume', 2000, day0 + DAY, { unit: 'lb', effortSlug: 'back-squat' }),
    fact('totalVolume', 3000, day0 + 8 * DAY, { unit: 'lb', effortSlug: 'back-squat' }),
  ];

  it('converts to a directive display unit', async () => {
    const service = new QueryService(makeStore(lbFacts).store);
    const result = await service.runQuery('sum:totalVolume{} in kg');

    expect(result.unit).toBe('kg');
    expect(result.series[0]?.unit).toBe('kg');
    expect(result.scalar).toBe(2721.55); // 6000 lb rounded to kg
  });

  it('converts to a preferred unit when the query has no directive', async () => {
    const service = new QueryService(makeStore(lbFacts).store);
    const result = await service.runQuery('sum:totalVolume{}', { preferredUnit: 'kg' });

    expect(result.unit).toBe('kg');
    expect(result.scalar).toBe(2721.55);
  });

  it('leaves mass values in the recorded unit when no directive or preference is given', async () => {
    const service = new QueryService(makeStore(lbFacts).store);
    const result = await service.runQuery('sum:totalVolume{}');

    expect(result.unit).toBe('lb');
    expect(result.scalar).toBe(6000);
  });

  it('ignores a preferred unit for non-mass metrics', async () => {
    const repsFacts = [
      fact('totalReps', 50, day0 + HOUR, { unit: 'reps' }),
      fact('totalReps', 30, day0 + DAY, { unit: 'reps' }),
    ];
    const service = new QueryService(makeStore(repsFacts).store);
    const result = await service.runQuery('sum:totalReps{}', { preferredUnit: 'kg' });

    expect(result.unit).toBe('reps');
    expect(result.scalar).toBe(80);
  });

  it('declares a converted unit on each series and keeps raw points original', async () => {
    const service = new QueryService(makeStore(lbFacts).store);
    const result = await service.runQuery('sum:totalVolume{} by {effort} in kg');

    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.unit).toBe('kg');
    expect(result.series[0]?.points[0]?.value).toBe(2721.55);
    expect(result.matched[0]?.unit).toBe('lb');
    expect(result.matched[0]?.value).toBe(1000);
  });
});
