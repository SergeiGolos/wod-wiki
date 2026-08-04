/**
 * Cross-store join tests (#800) — bi-directional joins at the blockContentId
 * level against RAW WorkoutResult logs (the analytics store is bypassed).
 *
 *   Direction 1 — find where metric:  find:note where sum:totalVolume{} > 5000
 *   Direction 2 — metric where find:  sum:totalVolume{} where find:note{tags:x}
 *
 * Every store is an in-memory mock; logs carry `outputType: 'analytics'`
 * summary outputs so normalizeSummaryFacts re-derives the metric from them.
 */
import { describe, expect, it } from 'bun:test';
import { QueryService } from './QueryService';
import { parseQuery } from './wql';
import type { AnalyticsDataPoint, BlockIndexRow, Note, WorkoutResult } from '@/types/storage';
import type { ParsedFindQuery, ParsedQuery } from './wql';

const DAY = 86_400_000;
const TS = 1_700_000_000_000;

/** Build a raw-log analytics summary output carrying one projection value. */
function summaryLog(projection: string, value: number, unit: string, ts = TS) {
  return {
    outputType: 'analytics',
    metrics: [
      { type: 'label', value: projection },
      { type: 'volume', value, unit },
    ],
    timeSpan: { started: ts, ended: ts },
  };
}

function makeResult(
  id: string,
  noteId: string,
  blockContentId: string,
  volume: number,
  ts = TS,
): WorkoutResult {
  return {
    id,
    noteId,
    segmentId: `${blockContentId}-seg`,
    segmentVersion: 1,
    blockContentId,
    data: { startTime: ts, endTime: ts, duration: 0, completed: true, logs: [summaryLog('Total Volume', volume, 'lb', ts)] } as WorkoutResult['data'],
    createdAt: ts,
  };
}

function makeNote(id: string, title: string): Note {
  return { id, title, createdAt: TS, type: 'note' } as Note;
}

function makeBlock(noteId: string, blockContentId: string, noteTitle: string): BlockIndexRow {
  return {
    id: `${noteId}:${blockContentId}:1`,
    noteId,
    segmentId: `${blockContentId}-seg`,
    segmentVersion: 1,
    dataType: 'wod',
    blockContentId,
    rawContent: noteTitle,
    noteTitle,
    createdAt: TS,
  };
}

// ── Fixture ──────────────────────────────────────────────────────────
// noteA (Fran, tag:competition) owns bc-fran; two runs → volume 3000+3000=6000.
// noteB (Cindy, untagged)        owns bc-cindy; one run → volume 2000.
const noteA = makeNote('noteA', 'Fran');
const noteB = makeNote('noteB', 'Cindy');
const NOTES: Note[] = [noteA, noteB];

const BLOCKS: BlockIndexRow[] = [
  makeBlock('noteA', 'bc-fran', 'Fran'),
  makeBlock('noteB', 'bc-cindy', 'Cindy'),
];

const RESULTS: Record<string, WorkoutResult[]> = {
  'bc-fran': [makeResult('r1', 'noteA', 'bc-fran', 3000), makeResult('r2', 'noteA', 'bc-fran', 3000)],
  'bc-cindy': [makeResult('r3', 'noteB', 'bc-cindy', 2000)],
};

const TAG_TO_NOTES: Record<string, Set<string>> = {
  competition: new Set(['noteA']),
};

function makeService() {
  return new QueryService(
    // FactQueryStore — unused by joins (logs win), but required by the ctor.
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    // NoteQueryStore
    {
      getAllNotes: async () => NOTES,
      getNoteIdsForTag: async (label: string) => TAG_TO_NOTES[label] ?? new Set<string>(),
    },
    // BlockQueryStore
    { getAllBlocks: async () => BLOCKS },
    // ResultLogStore — the raw WorkoutResult logs (the join source).
    { getResultsByContentId: async (cid: string) => RESULTS[cid] ?? [] },
  );
}

describe('cross-store joins — direction 1 (find where metric)', () => {
  it('keeps notes whose wod-block volume exceeds the threshold', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:note where sum:totalVolume{} > 5000', target: 'note', filters: [],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '>', threshold: 5000 },
    };
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['noteA']);
    expect(result.stages.matched).toBe(1);
  });

  it('drops notes that do not meet the threshold', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:note where sum:totalVolume{} > 7000', target: 'note', filters: [],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '>', threshold: 7000 },
    };
    const result = await service.runFind(parsed);
    expect(result.notes).toEqual([]);
  });

  it('honours a less-than operator on a different block', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:note where sum:totalVolume{} < 5000', target: 'note', filters: [],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '<', threshold: 5000 },
    };
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['noteB']);
  });

  it('intersects the content filters with the metric join', async () => {
    const service = makeService();
    // tag:competition → noteA only; noteA volume 6000 > 5000 → kept.
    const parsed: ParsedFindQuery = {
      raw: 'find:note{tags:competition} where sum:totalVolume{} > 5000', target: 'note',
      filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '>', threshold: 5000 },
    };
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['noteA']);
  });

  it('drops a content match when its volume fails the predicate', async () => {
    const service = makeService();
    // noteA passes the tag but 6000 is NOT > 9000 → dropped.
    const parsed: ParsedFindQuery = {
      raw: 'find:note{tags:competition} where sum:totalVolume{} > 9000', target: 'note',
      filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '>', threshold: 9000 },
    };
    const result = await service.runFind(parsed);
    expect(result.notes).toEqual([]);
  });

  it('filters find:block results by the block\'s own content id', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:block where sum:totalVolume{} > 5000', target: 'block', filters: [],
      join: { agg: 'sum', metric: 'totalVolume', filters: [], operator: '>', threshold: 5000 },
    };
    const result = await service.runFind(parsed);
    expect(result.blocks.map(b => b.blockContentId)).toEqual(['bc-fran']);
  });
});

describe('cross-store joins — direction 2 (metric where find)', () => {
  it('re-derives the metric from raw logs restricted to joined content', async () => {
    const service = makeService();
    const parsed: ParsedQuery = {
      raw: 'sum:totalVolume{} where find:note{tags:competition}',
      agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [],
      join: { target: 'note', filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }] },
    };
    const result = await service.run(parsed);
    // Only noteA (competition) → bc-fran → 3000 + 3000.
    expect(result.scalar).toBe(6000);
    expect(result.stages.selected).toBe(2);
  });

  it('joins across all content when the find half is unfiltered', async () => {
    const service = makeService();
    const parsed: ParsedQuery = {
      raw: 'sum:totalVolume{} where find:note{}',
      agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [],
      join: { target: 'note', filters: [] },
    };
    const result = await service.run(parsed);
    // bc-fran (6000) + bc-cindy (2000) = 8000.
    expect(result.scalar).toBe(8000);
  });

  it('returns an empty result when no content matches the find half', async () => {
    const service = makeService();
    const parsed: ParsedQuery = {
      raw: 'sum:totalVolume{} where find:note{tags:nonexistent}',
      agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [],
      join: { target: 'note', filters: [{ key: 'tags', negate: false, values: [{ value: 'nonexistent', wildcard: false }] }] },
    };
    const result = await service.run(parsed);
    expect(result.scalar).toBeUndefined();
    expect(result.series).toEqual([]);
    expect(result.stages.selected).toBe(0);
  });

  it('honours an avg aggregator over joined logs', async () => {
    const service = makeService();
    const parsed: ParsedQuery = {
      raw: 'avg:totalVolume{} where find:note{tags:competition}',
      agg: 'avg', metric: 'totalVolume', filters: [], groupBy: [],
      join: { target: 'note', filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }] },
    };
    const result = await service.run(parsed);
    // Two bc-fran results of 3000 each → avg 3000.
    expect(result.scalar).toBe(3000);
  });

  it('respects the time-range option on the joined logs', async () => {
    const service = makeService();
    const parsed: ParsedQuery = {
      raw: 'sum:totalVolume{} where find:note{}',
      agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [],
      join: { target: 'note', filters: [] },
    };
    // Exclude the TS results (range ends before them).
    const result = await service.run(parsed, { rangeEnd: TS - 1 });
    expect(result.scalar).toBeUndefined();
  });
});

describe('cross-store joins — end-to-end parse + execute', () => {
  it('direction 1: find:note where sum:totalVolume{} > 5000', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note where sum:totalVolume{} > 5000');
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['noteA']);
  });

  it('direction 2: sum:totalVolume{} where find:note{tags:competition}', async () => {
    const service = makeService();
    const result = await service.runQuery('sum:totalVolume{} where find:note{tags:competition}');
    expect(result.scalar).toBe(6000);
  });
});
