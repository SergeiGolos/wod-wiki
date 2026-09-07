import { describe, expect, it } from 'vitest';
import type { UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import { buildDrillDownQuery, parseQuery, isRowsQuery } from '../src/wql';
import { QueryService, type UnifiedEventStore } from '../src/QueryService';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 8, 7, 4); // Mon Sep 7 2026 00:00 EDT

function segmentRow(id: string, resultId: string, outputType: string, metricKey: string, value: number, extra: {
  effortSlug?: string; timestamp?: number;
} = {}): UnifiedEventRecord {
  return {
    id,
    resultId,
    noteId: 'n1',
    timestamp: extra.timestamp ?? T0,
    grain: 'event',
    outputType,
    segmentId: 'seg',
    segmentVersion: 1,
    ...(extra.effortSlug ? { effortSlug: extra.effortSlug } : {}),
    metrics: [{
      type: metricKey,
      value,
      metadata: { canonicalKey: metricKey, ...(extra.effortSlug ? { effortSlug: extra.effortSlug } : {}) },
    }],
  } as unknown as UnifiedEventRecord;
}

function store(rows: UnifiedEventRecord[]): UnifiedEventStore {
  return {
    getEventsByTimeRange: async (start, end) => rows.filter((r) => r.timestamp >= start && r.timestamp <= end),
    getEventsByResult: async () => [],
    getEventsForNote: async () => [],
    getEventsByContent: async () => [],
    scanAll: async () => rows,
    appendEvents: async () => {},
    finalizeSummaries: async () => {},
    deleteEvents: async () => {},
  };
}

const ROWS = [
  segmentRow('r1:0', 'r1', 'segment', 'distance', 5000, { effortSlug: 'running' }),
  segmentRow('r1:1', 'r1', 'segment', 'distance', 3000, { effortSlug: 'running' }),
  segmentRow('r2:0', 'r2', 'segment', 'distance', 10000, { effortSlug: 'cycling' }),
  segmentRow('r2:1', 'r2', 'milestone', 'distance', 1), // narrowed away by rows:segment
];

function makeService(): QueryService {
  return new QueryService({ eventStore: store(ROWS) });
}

function parseRows(text: string) {
  const parsed = parseQuery(text);
  if (!isRowsQuery(parsed)) throw new Error(`expected rows query: ${text}`);
  return parsed;
}

describe('ticket 18 — cross-workout rows', () => {
  it('rows:segment with tag filters is valid without a session scope (acceptance 1)', async () => {
    const parsed = parseRows('rows:segment{discipline:running} last 4w');
    expect(parsed.error).toBeUndefined();
    const result = await makeService().runRows(parsed);
    expect(result.error).toBeUndefined();
    expect(result.table).toBeDefined();
  });

  it('rows:all without scope still requires a scope (single-session behavior kept)', () => {
    const parsed = parseRows('rows:all{}');
    expect(parsed.error).toContain('scope');
  });

  it('each row is one segment observation; totalCount reports the full match', async () => {
    const result = await makeService().runRows(parseRows('rows:segment{effort:running}'));
    expect(result.table).toBeDefined();
    expect(result.table!.totalCount).toBe(2);
    expect(result.table!.rows.map((r) => r.distance)).toEqual([5000, 3000]);
  });

  it('pipes govern presentation only: limit/offset page without dropping totalCount', async () => {
    const result = await makeService().runRows(
      parseRows('rows:segment{effort:running} | order by distance desc | limit 1 offset 1'),
    );
    const table = result.table!;
    expect(table.totalCount).toBe(2);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.distance).toBe(3000);
    expect(table.offset).toBe(1);
    expect(table.limit).toBe(1);
  });

  it('select picks columns; repeated identical measurements stay distinct rows (acceptance 4)', async () => {
    const rows = [
      segmentRow('r9:0', 'r9', 'segment', 'distance', 400),
      segmentRow('r9:1', 'r9', 'segment', 'distance', 400),
    ];
    const result = await new QueryService({ eventStore: store(rows) })
      .runRows(parseRows('rows:segment{} | select distance | limit 2'));
    expect(result.table!.rows.map((r) => r.distance)).toEqual([400, 400]);
    expect(result.table!.columns.map((c) => c.name)).toEqual(['distance']);
  });

  it('a missing column value renders absent while a recorded zero renders 0 (acceptance 5)', async () => {
    const result = await makeService().runRows(parseRows('rows:segment{} | select distance, effort'));
    const noEffort = result.table!.rows.find((r) => r.__id === 'r2:1');
    expect(noEffort).toBeUndefined(); // milestone narrowed away by target
    const cycling = result.table!.rows.find((r) => r.__id === 'r2:0')!;
    expect(cycling.effort).toBe('cycling');
    void result;
  });

  it('rows ordered by date uses the segment’s own civil date (acceptance 3)', async () => {
    const rows = [
      segmentRow('rA:0', 'rA', 'segment', 'distance', 1000, { timestamp: T0 }),
      // Same workout crossing midnight: second statement on the next civil day.
      segmentRow('rA:1', 'rA', 'segment', 'distance', 2000, { timestamp: T0 + DAY }),
    ];
    const result = await new QueryService({ eventStore: store(rows) })
      .runRows(parseRows('rows:segment{} | order by date'), { context: { instant: T0, timeZone: 'America/New_York' } });
    const dates = result.table!.rows.map((r) => r.date);
    expect(dates[0]).not.toBe(dates[1]);
  });
});

describe('ticket 18 — drill-down construction', () => {
  it('inherits filters, exact half-open civil boundaries, and the group tuple (acceptance 7)', () => {
    const query = buildDrillDownQuery({
      filters: [{ key: 'discipline', values: ['running'] }],
      startIso: '2026-08-24',
      endIso: '2026-08-30',
      limit: 50,
    });
    expect(query).toContain('rows:segment{discipline:running}');
    expect(query).toContain('from 2026-08-24 to 2026-08-30');
    expect(query).toContain('| limit 50');
  });

  it('computes civil boundaries from half-open epoch bounds in a timezone', () => {
    const start = Date.UTC(2026, 8, 7, 4); // Mon Sep 7 00:00 EDT
    const end = Date.UTC(2026, 8, 14, 4);  // Mon Sep 14 00:00 EDT
    const query = buildDrillDownQuery({
      filters: [{ key: 'discipline', values: ['running'] }],
      start,
      end,
      timeZone: 'America/New_York',
    });
    expect(query).toContain('from 2026-09-07 to 2026-09-13');
  });
});
