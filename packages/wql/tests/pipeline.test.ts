import { describe, expect, it } from 'vitest';
import type { EventRecord, Note } from '@bitcobblers/wod-wiki-core';
import { parseQuery, type ParsedAggregateQuery, type ParsedPipelineQuery } from '../src/wql';
import { QueryService, type EventStore } from '../src/QueryService';

const T0 = Date.UTC(2026, 8, 7, 12); // Mon Sep 7 2026, civil 2026-09-07
const DAY = 86_400_000;

function eventRow(id: string, resultId: string, outputType: string, metrics: Array<{ type: string; value?: number; unit?: string }>, ts = T0): EventRecord {
  return {
    id,
    resultId,
    noteId: 'n1',
    timestamp: ts,
    grain: 'event',
    outputType,
    segmentId: 'seg',
    segmentVersion: 1,
    metrics: metrics.map((m) => ({ ...m, metadata: { canonicalKey: m.type } })),
  } as unknown as EventRecord;
}

/** A store that FAILS on every read — proves pipeline/dataset stages never
 *  touch the database. */
function explodingStore(): EventStore {
  const boom = () => { throw new Error('event store must never be read on this path'); };
  return {
    getEventsByTimeRange: boom,
    getEventsByResult: boom,
    getEventsForNote: boom,
    getEventsByContent: boom,
    scanAll: boom,
    appendEvents: async () => {},
    finalizeSummaries: async () => {},
    deleteEvents: async () => {},
  };
}

function agg(aggOp: ParsedAggregateQuery['agg'], metric: string, groupBy: string[] = []): ParsedAggregateQuery {
  return { family: 'aggregate', raw: `${aggOp}:${metric}{}`, agg: aggOp, metric, filters: [], groupBy };
}

function pipeline(overrides: Partial<ParsedPipelineQuery> & { source: ParsedPipelineQuery['source'] }): ParsedPipelineQuery {
  return { family: 'pipeline', raw: 'test-pipeline', transforms: [], ...overrides };
}

const SESSION_EVENTS: EventRecord[] = [
  eventRow('s1:0', 'r1', 'segment', [{ type: 'tis', value: 100 }]),
  eventRow('s1:1', 'r1', 'system', [{ type: 'tis', value: 20 }]),
  eventRow('s2:0', 'r2', 'segment', [{ type: 'tis', value: 300 }]),
  eventRow('s2:1', 'r2', 'segment', []), // zero-metric debug statement
];
const SESSION_DATASET = { events: SESSION_EVENTS, notes: [{ id: 'n1', title: 'Today', createdAt: T0, type: 'note' } as Note] };

describe(':segment vs :event — one EventStore, two predicates', () => {
  const ROWS: EventRecord[] = [
    eventRow('a:0', 'rA', 'segment', [{ type: 'tis', value: 10 }]),
    eventRow('a:1', 'rA', 'system', []), // zero-metric emitted statement
    eventRow('a:2', 'rA', 'compiler', [{ type: 'tis', value: 7 }]),
    eventRow('a:3', 'rB', 'segment', [{ type: 'tis', value: 100 }], T0 - 2 * DAY),
    { ...eventRow('a:s', 'rA', 'analytics', [{ type: 'tis', value: 999 }]), grain: 'summary' } as EventRecord,
  ];
  const store: EventStore = {
    ...explodingStore(),
    scanAll: async () => ROWS,
  };
  const svc = () => new QueryService({ eventStore: store });

  const findTable = async (text: string) => {
    const parsed = parseQuery(text);
    if (parsed.family !== 'find') throw new Error(`expected find query: ${JSON.stringify(parsed)}`);
    return svc().runFind(parsed);
  };

  it(':event is the full debug-level stream — includes empty-metric statements, excludes summaries', async () => {
    const result = await findTable(':event{}');
    expect(result.table!.totalCount).toBe(4); // a:0..a:3; summary grain a:s excluded
    const ids = result.table!.rows.map((r) => r.__id);
    expect(ids).toContain('a:1'); // zero-metric system row preserved
    expect(ids).not.toContain('a:s');
  });

  it(':segment is the domain-point subset of the SAME store', async () => {
    const result = await findTable(':segment{}');
    expect(result.table!.totalCount).toBe(2);
    expect(result.table!.rows.map((r) => r.__id).sort()).toEqual(['a:0', 'a:3']);
  });

  it(':segment rows are a subset of :event rows — no divergent fetch', async () => {
    const events = await findTable(':event{}');
    const segments = await findTable(':segment{}');
    const eventIds = new Set(events.table!.rows.map((r) => r.__id));
    for (const id of segments.table!.rows.map((r) => r.__id)) expect(eventIds.has(id)).toBe(true);
  });
});

describe('runPipeline — datasets resolve in memory', () => {
  it('@session via pageSources aggregates without a database roundtrip', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@session | :sum{metric:tis}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.error).toBeUndefined();
    expect(result.series).toHaveLength(1);
    expect(result.series![0]!.points[0]!.value).toBe(420); // 100+20+300; zero-metric contributes nothing
  });

  it('@session via an injected datasetStore sync lookup — no fetch', async () => {
    const service = new QueryService({
      eventStore: explodingStore(),
      datasetStore: { getDataset: (name) => (name === '@session' ? SESSION_DATASET : undefined) },
    });
    const result = await service.runPipeline('@session | :sum{metric:tis}');
    expect(result.series![0]!.points[0]!.value).toBe(420);
  });

  it('pageSources wins over the injected datasetStore', async () => {
    const service = new QueryService({
      datasetStore: { getDataset: () => ({ events: [eventRow('x:0', 'rx', 'segment', [{ type: 'tis', value: 1 }])], notes: [] }) },
    });
    const result = await service.runPipeline('@session | :sum{metric:tis}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.series![0]!.points[0]!.value).toBe(420);
  });

  it('unknown dataset reports a diagnostic instead of touching the store', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@nope | :sum{metric:tis}');
    expect(result.error).toContain('@nope');
  });

  it('runAggregateEvents aggregates carried events with no store reads', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runAggregateEvents(agg('sum', 'tis'), SESSION_EVENTS);
    expect(result.scalar).toBe(420);
  });

  it('runAggregateEvents honors an explicit window against the provided context', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runAggregateEvents(
      { ...agg('sum', 'tis'), window: { kind: 'range', start: '2026-09-07', end: '2026-09-07' } },
      SESSION_EVENTS,
      { context: { instant: T0, timeZone: 'UTC' } },
    );
    // rB's row lives two civil days earlier — excluded by the range window.
    expect(result.scalar).toBe(120);
  });
});

describe('runPipeline — functions reduce the preceding stage left to right', () => {
  it('sum by {session} then max picks the largest carried bucket — no re-query', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@session | :sum{metric:tis} by {session} | :max{}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.error).toBeUndefined();
    expect(result.series).toHaveLength(1);
    expect(result.series![0]!.points[0]!.value).toBe(300); // max(sum r1=120, sum r2=300)
    expect(result.series![0]!.unit).toBeUndefined();
  });

  it('three chained functions: sum → max → count counts the carried points', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@session | :sum{metric:tis} by {session} | :max{} | :count{}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.series![0]!.points[0]!.value).toBe(1); // one carried point
    expect(result.series![0]!.unit).toBe('count');
  });

  it(':count{} with no metric counts observations in scope', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@session | :count{}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.series![0]!.points[0]!.value).toBe(3); // the three metric-bearing rows project 3 facts
  });

  it('a non-count function without metric: reports a clean diagnostic', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipelineParsed(pipeline({
      source: { kind: 'dataset', name: '@session' },
      transforms: [{ family: 'aggregate', raw: ':sum{}', agg: 'sum', metric: '', filters: [], groupBy: [] }],
    }), { pageSources: new Map([['@session', SESSION_DATASET]]) });
    expect(result.error).toContain('requires a metric');
  });

  it('function-first source uses the aggregate query as the source stage', async () => {
    // sum:tis over the store, then max over its carried result.
    const ROWS = [eventRow('z:0', 'rz', 'segment', [{ type: 'tis', value: 5 }]), eventRow('z:1', 'rz', 'segment', [{ type: 'tis', value: 9 }])];
    const store: EventStore = { ...explodingStore(), scanAll: async () => ROWS };
    const service = new QueryService({ eventStore: store });
    const result = await service.runPipeline('sum:tis{} by {session} | :max{}');
    expect(result.error).toBeUndefined();
    expect(result.series![0]!.points[0]!.value).toBe(14);
  });

  it('chart sink rides along without altering the data', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipeline('@session | :sum{metric:tis} | :bar{}', {
      pageSources: new Map([['@session', SESSION_DATASET]]),
    });
    expect(result.chart).toEqual({ head: 'bar', filters: [] });
    expect(result.series![0]!.points[0]!.value).toBe(420);
  });

  it('non-pipeline text through runPipelineParsed reports a diagnostic', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    const result = await service.runPipelineParsed(parseQuery('sum:tis{}'));
    expect(result.error).toContain('Not a pipeline');
  });

  it('run() refuses pipeline ASTs with a clean diagnostic — never an unsafe cast', async () => {
    const service = new QueryService({ eventStore: explodingStore() });
    await expect(service.run(pipeline({ source: { kind: 'dataset', name: '@session' } })))
      .rejects.toThrow(/runPipeline/);
  });

  it('runQuery routes pipeline text to the pipeline executor', async () => {
    const service = new QueryService({
      eventStore: explodingStore(),
      datasetStore: { getDataset: (name) => (name === '@session' ? SESSION_DATASET : undefined) },
    });
    const result = await service.runQuery('@session | :sum{metric:tis}');
    expect(result.series![0]!.points[0]!.value).toBe(420);
  });
});

describe('runPipeline — source-scoped content resolution', () => {
  const NOTES: Note[] = [
    { id: 'n1', title: 'Alpha', createdAt: T0, type: 'note' } as Note,
    { id: 'n2', title: 'Beta', createdAt: T0, type: 'note' } as Note,
  ];
  const NOTE_EVENTS: Record<string, EventRecord[]> = {
    n1: [eventRow('n1:0', 'r1', 'segment', [{ type: 'tis', value: 42 }])],
    n2: [eventRow('n2:0', 'r2', 'segment', [{ type: 'tis', value: 8 }])],
  };

  function noteService(notes: Note[], store: EventStore): QueryService {
    return new QueryService({
      eventStore: store,
      noteStore: {
        getAllNotes: async () => notes,
        getNoteIdsForTag: async () => new Set<string>(),
        getNoteTagLabels: async () => [],
      },
    });
  }

  it(':journal | :table surfaces notes through the sink and never resolves events', async () => {
    const store: EventStore = { ...explodingStore(), getEventsForNote: () => { throw new Error('events resolved without transforms'); } };
    const result = await noteService(NOTES, store).runPipeline(':journal{} | :table');
    expect(result.notes!.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(result.chart).toEqual({ head: 'table', filters: [] });
    expect(result.series).toBeUndefined();
  });

  it(':journal with a transform resolves ONLY the matched notes\' events', async () => {
    const fetched: string[] = [];
    const store: EventStore = {
      ...explodingStore(),
      getEventsForNote: async (noteId) => { fetched.push(noteId); return NOTE_EVENTS[noteId] ?? []; },
    };
    const result = await noteService(NOTES, store).runPipeline(':journal{text:Alpha} | :sum{metric:tis}');
    expect(fetched).toEqual(['n1']);
    expect(result.series![0]!.points[0]!.value).toBe(42);
  });

  it(':note default scope restricts to journal|collections|playground', async () => {
    const feedNote = { id: 'feed-1', title: 'Feed', createdAt: T0, type: 'note', sourceId: 'feed:x' } as Note;
    const store: EventStore = {
      ...explodingStore(),
      getEventsForNote: async (noteId) => NOTE_EVENTS[noteId] ?? [],
    };
    const service = noteService([...NOTES, feedNote], store);
    const result = await service.runPipeline(':note{} | :sum{metric:tis}');
    expect(result.series![0]!.points[0]!.value).toBe(50); // feed note excluded by default scope
  });
});

describe('containers — junction-based, parent Page wins', () => {
  const NOTES: Note[] = [
    { id: 'n-page', title: 'Bound', createdAt: T0, type: 'note' } as Note,
    { id: 'n-loose', title: 'Standalone', createdAt: T0, type: 'note' } as Note,
  ];

  function pageService(): QueryService {
    return new QueryService({
      noteStore: {
        getAllNotes: async () => NOTES,
        getNoteIdsForTag: async () => new Set<string>(),
        getNoteTagLabels: async () => [],
      },
      pageStore: {
        getNotePages: async (noteId) => noteId === 'n-page'
          ? [{ id: 'pn1', pageId: 'p1', noteId, position: 1, createdAt: T0 }]
          : [],
        getPage: async (pageId) => pageId === 'p1' ? { id: 'p1', slug: 'snatches', createdAt: T0 } : undefined,
      },
    });
  }

  it('find results map page-bound notes to their parent Page and loose notes to Note', async () => {
    const parsed = parseQuery(':journal{}');
    if (parsed.family !== 'find') throw new Error('expected find query');
    const result = await pageService().runFind(parsed);
    expect(result.containers).toEqual({
      'n-page': { kind: 'page', id: 'p1', slug: 'snatches' },
      'n-loose': { kind: 'note', id: 'n-loose' },
    });
  });

  it('no pageStore → no containers map', async () => {
    const parsed = parseQuery(':journal{}');
    if (parsed.family !== 'find') throw new Error('expected find query');
    const result = await new QueryService({
      noteStore: { getAllNotes: async () => NOTES, getNoteIdsForTag: async () => new Set<string>(), getNoteTagLabels: async () => [] },
    }).runFind(parsed);
    expect(result.containers).toBeUndefined();
  });
});
