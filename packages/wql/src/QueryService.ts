/**
 * Query Service — the executor of WQL against the unified event store.
 * Four-stage physical plan:
 *
 *   SELECT (window-first hybrid, ticket 003: windowed queries fetch through
 *           by-timestamp — the one proven culling index; all-time queries
 *           scan; by-metric is never used. Event rows are flattened to the
 *           legacy flat-fact currency by projectEventToFacts.)
 *   BUCKET (time dim or rollup period)
 *   AGGREGATE (per bucket)
 *   GROUP (tag-dimension fan-out)
 *
 * Inputs are uncapped — personal-journal scale; widgets and tables are dumb
 * consumers of QueryResult. The store serves UnifiedEventRecord rows
 * (grain 'event' | 'summary'); Tags are query-time dimensions read off the
 * projected fact row (effort, discipline, note, intensity, …) — 'tags'
 * resolves through the note_tags store.
 *
 * Fully inverted dependencies: zero IndexedDB/storage module-level imports.
 */

import type { AnalyticsDataPoint, Note, BlockIndexRow, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import {
  parseQuery,
  isFindQuery,
  isRowsQuery,
  type Aggregator,
  type ComparisonOp,
  type ParsedAggregateQuery,
  type ParsedFindQuery,
  type QueryWindow,
  type ParsedRowsQuery,
  type FindPredicate,
  type MetricPredicate,
  type Series,
  type SeriesPoint,
  type TagFilter,
} from './wql';
import { WQL_FIND_TARGETS } from './vocabulary';
import { convertViaCatalog, resolveOutputUnit } from './units';
import { projectEventToFacts } from './derivation';
import { dedupeById, selectContributions, type CoverageReport } from './selection';
import {
  captureContext,
  civilDateAdd,
  civilDateDiff,
  civilDateOf,
  civilMonday,
  inRange,
  resolveWindowRange,
  zonedNoon,
  type ExecutionContext,
  type ResolvedRange,
} from './calendar';
import type {
  UnifiedEventStore,
  NoteQueryStore,
  BlockQueryStore,
  EffortQueryStore,
  IEffort,
  QueryServiceStores,
} from './stores';

export type {
  UnifiedEventStore,
  NoteQueryStore,
  BlockQueryStore,
  EffortQueryStore,
  IEffort,
  QueryServiceStores,
};

const DAY = 86_400_000;

/** Rows content planes (C4): targets that scope by content ownership rather
 *  than the outputType column — no statement narrowing for these. */
const ROWS_CONTENT_PLANES: ReadonlySet<string> = new Set(WQL_FIND_TARGETS);
/** Extract the catalog directory id from a Note or BlockIndexRow.
 *  Uses explicit `catalog` when present; falls back to parsing `sourceId`
 *  (stripping `collection:`/`feed:` prefixes and `feeds/` path components) or `noteId`. */
function catalogOfItem(item: { id?: string; noteId?: string; sourceId?: string; catalog?: string }): string | undefined {
  if (item.catalog) return item.catalog;
  const raw = item.sourceId ? item.sourceId.replace(/^(collection|feed):/, '') : (item.noteId || item.id || '');
  if (!raw) return undefined;
  const clean = raw.startsWith('feeds/') ? raw.slice('feeds/'.length) : raw;
  return clean.split('/')[0];
}

/** Match a single row against one source filter value. The `journal` kind matches
 *  rows with no sourceId prefix; the `collection` / `feed` kinds match rows whose
 *  sourceId starts with the kind. A `kind:id` literal matches the exact id.
 *  `playground` matches the playground intake's sourceId convention and, on the
 *  note plane, legacy rows typed 'playground' (playground pages saved before the
 *  sourceId convention existed — their sourceId is absent). */
function sourceMatches(item: { id?: string; noteId?: string; sourceId?: string; type?: string }, kind: string): boolean {
  const sourceId = item.sourceId;
  if (kind === 'all') return true;
  if (kind === 'journal') {
    if (
      item.type === 'playground' ||
      item.noteId === 'pg-legacy' ||
      item.id === 'pg-legacy' ||
      item.noteId?.startsWith('pg-') ||
      item.id?.startsWith('pg-')
    ) {
      return false;
    }
    return !sourceId || sourceId === 'journal';
  }
  if (kind === 'collection' || kind === 'collections') {
    return !!sourceId && sourceId.startsWith('collection:');
  }
  if (kind === 'feed' || kind === 'feeds') {
    return !!sourceId && sourceId.startsWith('feed:');
  }
  if (kind === 'playground') {
    return sourceId === 'playground' || item.type === 'playground';
  }
  return sourceId === kind;
}

/** Apply the `source:` filter key to a list of objects that carry `sourceId`. */
function applySourceFilter<T extends { sourceId?: string; type?: string }>(items: T[], filters: TagFilter[]): T[] {
  for (const filter of filters) {
    if (filter.key !== 'source') continue;
    const wants = filter.values.map(v => v.value);
    items = items.filter(item => {
      const match = wants.some(w => sourceMatches(item, w));
      return filter.negate ? !match : match;
    });
  }
  return items;
}

/** Resolve the single execution context for a run: the caller's captured
 *  context when provided (ticket 19's runner captures once per document),
 *  else a fresh capture from `anchorNow`/now in the system timezone. */
function runContext(options: { context?: ExecutionContext; anchorNow?: number }): ExecutionContext {
  if (options.context) return options.context;
  return captureContext(options.anchorNow);
}

/** Time-window predicate for a row (C1 + ticket 12): the query's own window
 *  WINS over the explicit host `range` option — the host range supplies the
 *  default only when the query has none. Resolution happens against the one
 *  captured execution context; membership is half-open [start, end). */
function effectiveTimeWindow(
  createdAt: number,
  window: QueryWindow | undefined,
  range: ResolvedRange | undefined,
  ctx: ExecutionContext,
): boolean {
  const resolved = window ? resolveWindowRange(window, ctx) : range;
  return inRange(createdAt, resolved);
}

const defaultEventStore: UnifiedEventStore = {
  getEventsByTimeRange: async () => [],
  getEventsByResult: async () => [],
  getEventsForNote: async () => [],
  getEventsByContent: async () => [],
  scanAll: async () => [],
  appendEvents: async () => {},
  finalizeSummaries: async () => {},
  deleteEvents: async () => {},
};

const defaultNoteStore: NoteQueryStore = {
  getAllNotes: async () => [],
  getNoteIdsForTag: async () => new Set<string>(),
  getNoteTagLabels: async () => [],
};

const defaultBlockStore: BlockQueryStore = {
  getAllBlocks: async () => [],
};

const defaultEffortStore: EffortQueryStore = {
  getAllEfforts: async () => [],
};

export interface FindQueryResult {
  parsed: ParsedFindQuery;
  notes: Note[];
  blocks: BlockIndexRow[];
  /** Registry rows for find:effort queries. */
  efforts?: IEffort[];
  stages: { selected: number; matched: number };
}

export interface QueryOptions {
  rangeStart?: number;
  rangeEnd?: number;
  /** App-level unit preference ('kg' | 'lb'). Used when query has no `in <unit>` directive. */
  preferredUnit?: string;
  /** Captured execution context (ticket 12) — one `{instant, timeZone}`
   *  capture per document run; defaults to a fresh system capture. */
  context?: ExecutionContext;
}

/** Options for `runFind` / `runFindBlock` — overrides for the parsed WQL. */
export interface FindOptions {
  /** Host-supplied timestamp range (half-open [start, end)) — the DEFAULT
   *  when the parsed WQL has no window; an explicit query window wins. */
  range?: ResolvedRange;
  /** Explicit reference time for the window (tests/replay). Superseded by
   *  `context` when both are given. */
  anchorNow?: number;
  /** Captured execution context (ticket 12). */
  context?: ExecutionContext;
}

export interface QueryResult {
  parsed: ParsedAggregateQuery;
  series: Series[];
  stages: { selected: number; buckets: number; aggregated: number; groups: number };
  matched: AnalyticsDataPoint[];
  /** Single scalar value when the result has exactly one point. */
  scalar?: number;
  /** Result display unit, if determined by directive, preference, or fact metadata. */
  unit?: string;
  /** First diagnostic across series (ticket 13) — per-widget badges in 19. */
  error?: string;
  /** Compact coverage references (ticket 16 explainability). */
  coverage?: CoverageReport;
}

/** One run in a rows result: the canonical result identity plus the event
 *  rows that survived the optional output-type narrowing (`rows:segment{…}`). */
export interface RowsRun {
  resultId: string;
  noteId: string;
  /** Canonical workout time (result.createdAt under the unified model). */
  timestamp: number;
  events: UnifiedEventRecord[];
}

export interface RowsQueryResult {
  parsed: ParsedRowsQuery;
  runs: RowsRun[];
  error?: string;
}

/**
 * Tag value for a fact row. Tag keys map onto fact fields; 'tags' is the
 * note_tags label set of the parent note (loaded per query, only when used).
 */
function factTagValue(row: AnalyticsDataPoint, key: string, noteTags: ReadonlyMap<string, readonly string[]>): string | readonly string[] | undefined {
  switch (key) {
    case 'effort': return row.effortSlug;
    case 'discipline': return row.discipline;
    case 'intensity': return row.intensityTier;
    case 'note': return row.noteId;
    case 'page': return row.pageId;
    case 'origin': return row.origin;
    case 'grain': return row.grain;
    case 'metric': return row.metricKey;
    case 'block': return row.blockContentId;
    case 'result': return row.resultId;
    case 'tags': return noteTags.get(row.noteId) ?? [];
    default: return undefined;
  }
}

function matchesFilters(row: AnalyticsDataPoint, filters: TagFilter[], noteTags: ReadonlyMap<string, readonly string[]>): boolean {
  // OR within a key (and sign); AND across keys/signs. Negation spans the
  // whole value list for that key/sign.
  const groups = new Map<string, TagFilter[]>();
  for (const f of filters) {
    const groupKey = `${f.negate ? '!' : ''}${f.key}`;
    const bucket = groups.get(groupKey);
    if (bucket) bucket.push(f);
    else groups.set(groupKey, [f]);
  }
  return [...groups.values()].every((group) => {
    const key = group[0].key;
    const negate = group[0].negate;
    const raw = factTagValue(row, key, noteTags);
    const rowValues = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
    const hit = rowValues.some((value) =>
      group.some((f) =>
        f.values.some((a) =>
          a.wildcard ? value.startsWith(a.value) : value === a.value,
        ),
      ),
    );
    return negate ? !hit : hit;
  });
}

/** Dimension value for grouping; virtual time dims bucket the canonical
 *  time by LOCAL CIVIL CALENDAR (spec v2 decision 2): `day` keys are local
 *  YYYY-MM-DD; `week` keys are the civil Monday's YYYY-MM-DD, computed by
 *  component math — never instant arithmetic, which mislabels DST-shifted
 *  weeks. Keys are locale-independent and lexically sortable.
 *
 *  NOTE: buildResult routes `day`/`week` groupBys to civil bucket keys and
 *  filters them out of tagDims, so the time-dim branches below are
 *  defensive only — kept canonical in case a caller surfaces time dims as
 *  string keys. */
function dimValue(
  row: AnalyticsDataPoint,
  dim: string,
  noteTags: ReadonlyMap<string, readonly string[]>,
  ctx: ExecutionContext,
): string {
  // Calendar grouping uses the observation's own temporal anchor (ticket 12):
  // a date-only fact groups under its recorded civil date — never a fabricated
  // midnight instant; an instant fact under its civil date in the context tz.
  if (dim === 'day') return row.metricDate ?? civilDateOf(row.timestamp, ctx.timeZone);
  if (dim === 'week') return civilMonday(row.metricDate ?? civilDateOf(row.timestamp, ctx.timeZone));
  if (dim === 'session') return row.resultId;
  const raw = factTagValue(row, dim, noteTags);
  // Ticket 16 (finding 3.5): missing group values resolve to the structural
  // UNASSIGNED sentinel — never a literal '(none)' masquerading as data.
  if (raw === undefined) return UNASSIGNED;
  if (typeof raw === 'string') return raw;
  return raw.length ? raw.join(',') : UNASSIGNED;
}

/** Structural missing-group sentinel — distinct from any literal text
 *  (group identity is the JSON tuple, so it cannot collide). */
export const UNASSIGNED = '\u0000unassigned';

/** Result state of a bucket reduction (arithmetic contract §2): observed
 *  values are genuine reductions of recorded observations; absent results
 *  have no observation (render zero only at display); errors are
 *  diagnostics, not numbers. */
type ReducedValue =
  | { state: 'observed'; value: number }
  | { state: 'absent'; value: 0 }
  | { state: 'error'; message: string };

/** Reduce one bucket's already-converted observation values per the
 *  operation matrix. Missing domain positions are handled by the caller
 *  (zero-filled synthetic points); this reduces actual observations. */
function aggregate(values: number[], agg: Aggregator, points: AnalyticsDataPoint[]): ReducedValue {
  if (agg === 'count') return { state: 'observed', value: points.length };
  if (values.length === 0) return { state: 'absent', value: 0 };
  switch (agg) {
    case 'sum':
      return { state: 'observed', value: values.reduce((a, b) => a + b, 0) };
    case 'avg':
      return { state: 'observed', value: values.reduce((a, b) => a + b, 0) / values.length };
    case 'min':
      return { state: 'observed', value: Math.min(...values) };
    case 'max':
      return { state: 'observed', value: Math.max(...values) };
    case 'last': {
      // Metric-date order — fetch order never decides the endpoint. The
      // value comes from the already-converted array (values[i] ↔ points[i]).
      let latest = 0;
      for (let i = 0; i < points.length; i++) {
        if (points[i]!.timestamp > points[latest]!.timestamp) latest = i;
      }
      return { state: 'observed', value: values[latest]! };
    }
    case 'delta': {
      if (points.length < 2) return { state: 'absent', value: 0 };
      const ordered = [...points].sort((a, b) => a.timestamp - b.timestamp);
      const first = ordered[0]!;
      const last = ordered[ordered.length - 1]!;
      // Equal-timestamp endpoints with different values and no recorded
      // order evidence are an ambiguous-order error.
      const atFirst = ordered.filter((p) => p.timestamp === first.timestamp);
      const atLast = ordered.filter((p) => p.timestamp === last.timestamp);
      const firstVals = new Set(atFirst.map((p) => p.value));
      const lastVals = new Set(atLast.map((p) => p.value));
      if (firstVals.size > 1 || lastVals.size > 1) {
        return { state: 'error', message: 'Ambiguous delta order: tied endpoint observations differ in value without recorded order' };
      }
      return { state: 'observed', value: (last.value as number) - (first.value as number) };
    }
  }
}

/** Apply a cross-store metric predicate's comparison op. */
function compareOp(value: number, op: ComparisonOp, threshold: number): boolean {
  switch (op) {
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
  }
}

export class QueryService {
  private readonly store: UnifiedEventStore;
  private readonly noteStore: NoteQueryStore;
  private readonly blockStore: BlockQueryStore;
  private readonly effortStore: EffortQueryStore;
  private readonly staticNoteStore?: NoteQueryStore;
  private readonly staticBlockStore?: BlockQueryStore;

  constructor(
    storesOrEventStore?: QueryServiceStores | UnifiedEventStore,
    noteStore?: NoteQueryStore,
    blockStore?: BlockQueryStore,
    effortStore?: EffortQueryStore,
    staticNoteStore?: NoteQueryStore,
    staticBlockStore?: BlockQueryStore,
  ) {
    if (
      storesOrEventStore &&
      typeof storesOrEventStore === 'object' &&
      ('eventStore' in storesOrEventStore ||
        'noteStore' in storesOrEventStore ||
        'blockStore' in storesOrEventStore ||
        'effortStore' in storesOrEventStore ||
        'staticNoteStore' in storesOrEventStore ||
        'staticBlockStore' in storesOrEventStore)
    ) {
      const stores = storesOrEventStore as QueryServiceStores;
      this.store = stores.eventStore ?? defaultEventStore;
      this.noteStore = stores.noteStore ?? defaultNoteStore;
      this.blockStore = stores.blockStore ?? defaultBlockStore;
      this.effortStore = stores.effortStore ?? defaultEffortStore;
      this.staticNoteStore = stores.staticNoteStore;
      this.staticBlockStore = stores.staticBlockStore;
    } else {
      this.store = (storesOrEventStore as UnifiedEventStore | undefined) ?? defaultEventStore;
      this.noteStore = noteStore ?? defaultNoteStore;
      this.blockStore = blockStore ?? defaultBlockStore;
      this.effortStore = effortStore ?? defaultEffortStore;
      this.staticNoteStore = staticNoteStore;
      this.staticBlockStore = staticBlockStore;
    }
  }

  /** Windowed flat-fact fetch — the projected view over the event store. */
  async getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]> {
    const rows = await this.store.getEventsByTimeRange(start, end);
    return rows.flatMap(projectEventToFacts);
  }

  async runQuery(raw: string, options: QueryOptions = {}): Promise<QueryResult> {
    const parsed = parseQuery(raw);
    if (isFindQuery(parsed)) {
      return {
        parsed: { family: 'aggregate', raw, agg: 'count', metric: parsed.target, filters: [], groupBy: [] },
        series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
      };
    }
    if (isRowsQuery(parsed)) {
      return {
        parsed: { family: 'aggregate', raw, agg: 'count', metric: 'rows', filters: [], groupBy: [] },
        series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
      };
    }
    return this.run(parsed, options);
  }
  /**
   * Execute a rows query (rows:<target>{…}, #949/C4) — the session results
   * table plane. Filter rules are validated at parse; this executes only.
   * Reads event rows directly over the unified store: outputType narrowing
   * hits the promoted column; content-plane targets scope by content.
   */
  async runRows(parsed: ParsedRowsQuery, options: { anchorNow?: number; context?: ExecutionContext } = {}): Promise<RowsQueryResult> {
    const empty: RowsQueryResult = { parsed, runs: [] };
    if (parsed.error) return { ...empty, error: parsed.error };

    // Filter rules and the scope requirement are validated at parse (C4);
    // runRows executes only. Hand-built ASTs bypass parse — treat them the
    // same way: no scope filters means no rows.
    const scopeValues = (key: string) =>
      parsed.filters.filter((f) => f.key === key).flatMap((f) => f.values.map((v) => v.value));
    const resultIds = scopeValues('result');
    const blockIds = scopeValues('block');
    const noteIds = scopeValues('note');
    if (resultIds.length + blockIds.length + noteIds.length === 0) {
      return { ...empty, runs: [] };
    }

    // Scope → event rows, grouped per result (insertion order = first seen).
    const byResult = new Map<string, UnifiedEventRecord[]>();
    const collect = (rows: UnifiedEventRecord[]) => {
      for (const row of rows) {
        const bucket = byResult.get(row.resultId);
        if (bucket) bucket.push(row);
        else byResult.set(row.resultId, [row]);
      }
    };
    for (const id of resultIds) collect(await this.store.getEventsByResult(id));
    for (const blockContentId of blockIds) collect(await this.store.getEventsByContent(blockContentId));
    for (const noteId of noteIds) collect(await this.store.getEventsForNote(noteId));
    let groups = [...byResult.entries()].filter(([, rows]) => rows.length > 0);

    if (parsed.window) {
      const ctx = runContext(options);
      groups = groups.filter(([, rows]) =>
        effectiveTimeWindow(rows[0].timestamp, parsed.window, undefined, ctx),
      );
    }
    groups.sort((a, b) => b[1][0].timestamp - a[1][0].timestamp);

    const runs = groups
      .map(([resultId, rows]) => ({
        resultId,
        noteId: rows[0].noteId,
        timestamp: rows[0].timestamp,
        events: parsed.outputType && !ROWS_CONTENT_PLANES.has(parsed.outputType)
          ? rows.filter((row) => row.outputType === parsed.outputType)
          : rows,
      }))
      .filter((run) => run.events.length > 0);
    return { parsed, runs };
  }

  /**
   * Execute a content-discovery query (find:note). Naive in-memory filtering
   * per the tracer-bullet scope (#797): load all notes, then apply tag/text/
   * time filters.
   */
  async runFind(parsed: ParsedFindQuery, options: FindOptions = {}): Promise<FindQueryResult> {
    if (parsed.error) {
      return { parsed, notes: [], blocks: [], stages: { selected: 0, matched: 0 } };
    }

    if (parsed.target === 'block') {
      return this.runFindBlock(parsed, options);
    }
    if (parsed.target === 'effort') {
      return this.runFindEffort(parsed);
    }
    let notes: Note[] = [];
    notes = notes.concat(await this.noteStore.getAllNotes());
    if (this.staticNoteStore) {
      notes = notes.concat(await this.staticNoteStore.getAllNotes());
    }
    notes = applySourceFilter(notes, parsed.filters);
    const selectedCount = notes.length;
    const ctx = runContext(options);
    // Tag filters — intersect note IDs across OR'd values within a key.
    for (const filter of parsed.filters) {
      if (filter.key === 'tags' && !filter.negate) {
        const matchingIds = new Set<string>();
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = this.staticNoteStore ? await this.staticNoteStore.getNoteIdsForTag(v.value) : new Set<string>();
          ids.forEach(id => matchingIds.add(id));
          sIds.forEach(id => matchingIds.add(id));
        }
        notes = notes.filter(n => matchingIds.has(n.id));
      } else if (filter.key === 'tags' && filter.negate) {
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = this.staticNoteStore ? await this.staticNoteStore.getNoteIdsForTag(v.value) : new Set<string>();
          notes = notes.filter(n => !ids.has(n.id) && !sIds.has(n.id));
        }
      }
    }

    // Text filter — substring on title
    for (const filter of parsed.filters) {
      if (filter.key === 'text' && !filter.negate) {
        const search = filter.values.map(v => v.value).join(' ').toLowerCase();
        notes = notes.filter(n => n.title.toLowerCase().includes(search));
      }
    }

    // Type filter — note kind (wod, note, etc.)
    for (const filter of parsed.filters) {
      if (filter.key === 'type' && !filter.negate) {
        const wanted = new Set(filter.values.map(v => v.value));
        notes = notes.filter(n => n.type && wanted.has(n.type));
      }
    }

    // Catalog filter — static note catalog directory id (e.g. crossfit-girls)
    for (const filter of parsed.filters) {
      if (filter.key === 'catalog') {
        const wanted = new Set(filter.values.map(v => v.value));
        notes = notes.filter(n => {
          const cat = catalogOfItem(n);
          if (!cat) return filter.negate;
          const hit = wanted.has(cat);
          return filter.negate ? !hit : hit;
        });
      }
    }
    // Time window (ticket 12 precedence): an explicit query window wins; the
    // host `range` option supplies the default when the query has none.
    if (parsed.window || options.range) {
      notes = notes.filter(n => effectiveTimeWindow(n.createdAt, parsed.window, options.range, ctx));
    }

    // Cross-store join (direction 1): keep notes owning a wod block whose
    // raw-log metric aggregate satisfies the predicate.
    if (parsed.join) {
      const joined = await this.applyMetricJoin(parsed, notes, []);
      notes = joined.notes;
    }
    return { parsed, notes, blocks: [], stages: { selected: selectedCount, matched: notes.length } };
  }

  /**
   * Execute a find:block query against the derived block_index store.
   */
  async runFindBlock(parsed: ParsedFindQuery, options: FindOptions = {}): Promise<FindQueryResult> {
    let blocks: BlockIndexRow[] = [];
    blocks = blocks.concat(await this.blockStore.getAllBlocks());
    if (this.staticBlockStore) {
      blocks = blocks.concat(await this.staticBlockStore.getAllBlocks());
    }
    blocks = applySourceFilter(blocks, parsed.filters);
    const selectedCount = blocks.length;
    const ctx = runContext(options);
    // Text filter — substring on rawContent
    for (const filter of parsed.filters) {
      if (filter.key === 'text' && !filter.negate) {
        const search = filter.values.map(v => v.value).join(' ').toLowerCase();
        blocks = blocks.filter(b => b.rawContent.toLowerCase().includes(search));
      }
    }

    // Type filter — dataType (wod, prose, etc.)
    for (const filter of parsed.filters) {
      if (filter.key === 'type' && !filter.negate) {
        const wanted = new Set(filter.values.map(v => v.value));
        blocks = blocks.filter(b => wanted.has(b.dataType));
      }
    }

    // Catalog filter — catalog directory id
    for (const filter of parsed.filters) {
      if (filter.key === 'catalog') {
        const wanted = new Set(filter.values.map(v => v.value));
        blocks = blocks.filter(b => {
          const cat = catalogOfItem(b);
          if (!cat) return filter.negate;
          const hit = wanted.has(cat);
          return filter.negate ? !hit : hit;
        });
      }
    }

    // Tags filter — matches if the parent note has the tag
    for (const filter of parsed.filters) {
      if (filter.key === 'tags' && !filter.negate) {
        const matchingNoteIds = new Set<string>();
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = this.staticNoteStore ? await this.staticNoteStore.getNoteIdsForTag(v.value) : new Set<string>();
          ids.forEach(id => matchingNoteIds.add(id));
          sIds.forEach(id => matchingNoteIds.add(id));
        }
        blocks = blocks.filter(b => matchingNoteIds.has(b.noteId));
      }
    }

    // Time window (ticket 12 precedence): explicit query window wins over host.
    if (parsed.window || options.range) {
      blocks = blocks.filter(b => effectiveTimeWindow(b.createdAt, parsed.window, options.range, ctx));
    }

    // Cross-store join (direction 1): keep blocks whose raw-log metric
    // aggregate satisfies the predicate.
    if (parsed.join) {
      const joined = await this.applyMetricJoin(parsed, [], blocks);
      blocks = joined.blocks;
    }

    return { parsed, notes: [], blocks, stages: { selected: selectedCount, matched: blocks.length } };
  }

  /**
   * Execute a find:effort query against the effort registry.
   */
  async runFindEffort(parsed: ParsedFindQuery): Promise<FindQueryResult> {
    const all = await this.effortStore.getAllEfforts();
    const selectedCount = all.length;

    const matches = (effort: IEffort, key: string, value: string, wildcard: boolean): boolean => {
      const needle = value.toLowerCase();
      switch (key) {
        case 'effort':
          if (wildcard) {
            return effort.slug.includes(needle)
              || effort.label.toLowerCase().includes(needle)
              || effort.aliases.some(a => a.toLowerCase().includes(needle));
          }
          return effort.slug === value
            || effort.label.toLowerCase() === needle
            || effort.aliases.some(a => a.toLowerCase() === needle);
        case 'discipline': return effort.baseAttributes.discipline === value;
        case 'intensity': return effort.baseAttributes.intensityTier === value;
        case 'origin': return effort.registrySource === value;
        case 'text':
          return effort.label.toLowerCase().includes(needle)
            || effort.slug.includes(needle)
            || effort.aliases.some(a => a.toLowerCase().includes(needle));
        default: return true;
      }
    };

    let efforts = all;
    for (const filter of parsed.filters) {
      if (!['effort', 'discipline', 'intensity', 'origin', 'text'].includes(filter.key)) continue;
      efforts = efforts.filter(effort => {
        const hit = filter.values.some(v => matches(effort, filter.key, v.value, v.wildcard));
        return filter.negate ? !hit : hit;
      });
    }

    return { parsed, notes: [], blocks: [], efforts, stages: { selected: selectedCount, matched: efforts.length } };
  }

  async run(parsed: ParsedAggregateQuery, options: QueryOptions = {}): Promise<QueryResult> {
    const empty: QueryResult = {
      parsed,
      series: [],
      stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
      matched: [],
    };
    if (parsed.error) return empty;

    // Cross-store join: reads stored summary rows over the content index —
    // the store is authoritative (finalize-owns, ticket 005).
    if (parsed.join) return this.runJoined(parsed, options);

    // Stage 1: SELECT — window-first hybrid (ticket 003): a time window
    // fetches through by-timestamp, the one proven culling index; all-time
    // queries scan. by-metric is never used — ticket 001 measured it
    // non-selective and slower than scanning.
    // C1 + ticket 12 precedence: the query's own window WINS over the host
    // range options — the host range is the default when the query has none.
    // Resolution uses the one captured execution context (half-open bounds).
    const ctx = runContext(options);
    const range: ResolvedRange | undefined = parsed.window
      ? resolveWindowRange(parsed.window, ctx)
      : options.rangeStart !== undefined || options.rangeEnd !== undefined
        ? {
            start: options.rangeStart ?? 0,
            end: options.rangeEnd ?? Number.MAX_SAFE_INTEGER,
            endExclusive: false,
          }
        : undefined;
    // The store fetch bound is an upper cutoff, not the membership test —
    // pass the resolved end through unchanged (MAX_SAFE_INTEGER for the
    // unbounded side).
    const fetchRange = range ? { start: range.start, end: range.end } : undefined;
    const eventRows = fetchRange
      ? await this.store.getEventsByTimeRange(fetchRange.start, fetchRange.end)
      : await this.store.scanAll();
    const matchesMetric = (metricKey: string | undefined, queryMetric: string) =>
      metricKey === queryMetric ||
      (queryMetric === 'rep' && metricKey === 'reps') ||
      (queryMetric === 'reps' && metricKey === 'rep');

    const candidates = eventRows
      .flatMap(projectEventToFacts)
      .filter(row => matchesMetric(row.metricKey, parsed.metric));
    const touchesTags =
      parsed.filters.some(f => f.key === 'tags') || parsed.groupBy.includes('tags');
    const noteTags = await this.loadNoteTags(candidates, touchesTags);
    // Ticket 16: no global effort suppression — coverage selection below
    // keeps every population represented exactly once.
    const matched = candidates.filter(row => matchesFilters(row, parsed.filters, noteTags));

    const { selected, report } = selectContributions(matched, parsed.agg);
    return this.buildResult(selected, parsed, options, noteTags, range, report);
  }

  /**
   * Stages 2–4 — BUCKET → GROUP → AGGREGATE over an already-selected +
   * filtered `matched` set.
   */
  private buildResult(
    matched: AnalyticsDataPoint[],
    parsed: ParsedAggregateQuery,
    options: QueryOptions,
    noteTags: ReadonlyMap<string, readonly string[]>,
    range: ResolvedRange | undefined,
    coverage?: CoverageReport,
  ): QueryResult {
    const ctx = runContext(options);
    // Stage 2: BUCKET — structural bucket identity (ticket 12): calendar
    // day buckets anchor on the observation's civil date in the context
    // timezone, week buckets on the Monday date; fixed-duration `.rollup`
    // keeps its epoch-aligned width (a deliberately distinct kind, not a
    // calendar week). Display timestamps (local noon / epoch midpoint) are
    // presentation-only — never join keys.
    const timeDim = parsed.groupBy.find((d) => d === 'day' || d === 'week');
    const tagDims = parsed.groupBy.filter((d) => d !== 'day' && d !== 'week');
    const rollupMs = timeDim
      ? null
      : parsed.rollup
        ? parsed.rollup.size * (parsed.rollup.unit === 'w' ? 7 : 1) * DAY
        : null;
    const DAY_MS = 86_400_000;

    /** The observation's own temporal anchor: its recorded metric date when
     *  it carries one (date-only facts keep their civil date), else the
     *  fact timestamp's civil date in the context timezone. */
    const anchorDate = (row: AnalyticsDataPoint): string =>
      row.metricDate ?? civilDateOf(row.timestamp, ctx.timeZone);
    const bucketKey = (row: AnalyticsDataPoint): string => {
      if (timeDim === 'day') return `d:${anchorDate(row)}`;
      if (timeDim === 'week') return `w:${civilMonday(anchorDate(row))}`;
      if (rollupMs !== null) return `r:${Math.floor(row.timestamp / rollupMs)}`;
      return '';
    };
    /** Presentation-only representative instant for a structural key. */
    const bucketDisplayTs = (key: string): number => {
      if (key.startsWith('d:')) return zonedNoon(key.slice(2), ctx.timeZone);
      if (key.startsWith('w:')) return zonedNoon(key.slice(2), ctx.timeZone);
      if (key.startsWith('r:')) {
        const b = Number(key.slice(2));
        return (rollupMs ?? DAY_MS) * b + (rollupMs ?? DAY_MS) / 2;
      }
      return Number.MAX_SAFE_INTEGER;
    };

    // Chronological bucket domain (ticket 12): bounded calendar queries
    // generate every period in the requested bounds — including empty ones;
    // unbounded sides use the observed extent; relative windows never
    // generate future buckets because their exclusive end is the captured
    // instant. No domain generation for rollup (duration buckets are
    // observed-only) or ungrouped queries.
    const MAX_DOMAIN = 10_000;
    const bareDate = (key: string): string => (key.startsWith('d:') || key.startsWith('w:') ? key.slice(2) : key);
    const calendarDomain = (observed: string[]): string[] => {
      if (!timeDim || observed.length === 0) return observed;
      const bounds = range && range.end !== Number.MAX_SAFE_INTEGER
        ? {
            startIso: civilDateOf(range.start, ctx.timeZone),
            endIso: range.endExclusive ? civilDateOf(range.end - 1, ctx.timeZone) : civilDateOf(range.end, ctx.timeZone),
          }
        : { startIso: bareDate(observed[0]!), endIso: bareDate(observed[observed.length - 1]!) };
      const first = timeDim === 'week' ? civilMonday(bounds.startIso) : bounds.startIso;
      const last = timeDim === 'week' ? civilMonday(bounds.endIso) : bounds.endIso;
      const step = timeDim === 'week' ? 7 : 1;
      const span = civilDateDiff(first, last);
      if (span < 0 || span / step > MAX_DOMAIN) return observed;
      const domain: string[] = [];
      for (let cursor = first; ; cursor = civilDateAdd(cursor, step)) {
        domain.push(timeDim === 'week' ? `w:${cursor}` : `d:${cursor}`);
        if (cursor === last) break;
      }
      return domain;
    };

    // Output unit (ticket 13): explicit `in <unit>` directive wins when
    // dimensionally compatible; otherwise the system default for the
    // observations' dimension; unitless observations stay unitless. No
    // first-record fallback, no widget-preference tier.
    const unitResolution = resolveOutputUnit(matched, {
      directive: parsed.displayUnit,
      preferred: options.preferredUnit,
    });
    const targetUnit = unitResolution.unit;
    const shouldConvert = unitResolution.convert === true;
    const seriesError = unitResolution.error;

    // Stage 3+4: GROUP + AGGREGATE per bucket. Group identity (ticket 16)
    // is the canonical ordered tuple of resolved dimension values, JSON
    // encoded — delimiter-containing labels cannot collide; a missing
    // dimension resolves to the structural UNASSIGNED sentinel (distinct
    // from any literal text). The display label is derived, never identity.
    const UNASSIGNED = '\u0000unassigned';
    const unassignedLabel = 'unassigned';
    const groups = new Map<string, { label: string; rows: AnalyticsDataPoint[] }>();
    for (const row of matched) {
      const tuple = tagDims.map((d) => dimValue(row, d, noteTags, ctx));
      const key = tagDims.length ? JSON.stringify(tuple) : parsed.metric;
      const label = tagDims.length
        ? tuple.map((v) => (v === UNASSIGNED ? unassignedLabel : v)).join(' · ')
        : parsed.metric;
      const bucket = groups.get(key);
      if (bucket) bucket.rows.push(row);
      else groups.set(key, { label, rows: [row] });
    }

    const series: Series[] = [...groups.entries()].map(([key, group]) => {
      const rows = group.rows;
      if (seriesError) {
        return { key, label: group.label, points: [], unit: undefined, error: seriesError };
      }
      const byBucket = new Map<string, AnalyticsDataPoint[]>();
      for (const row of rows) {
        const b = bucketKey(row);
        const members = byBucket.get(b);
        if (members) members.push(row);
        else byBucket.set(b, [row]);
      }
      const observedKeys = [...byBucket.keys()].sort();
      const domain = timeDim ? calendarDomain(observedKeys) : observedKeys;
      let error: string | undefined;
      const points: SeriesPoint[] = domain.map((b) => {
        const members = byBucket.get(b);
        if (!members) {
          // Missing query position (ticket 12 domain + ticket 13 matrix):
          // zero-filled with absence provenance — never an observation.
          return { ts: bucketDisplayTs(b), value: 0, missing: true };
        }
        // Compatible-unit normalization BEFORE arithmetic (finding 3.3).
        let values: number[];
        try {
          values = members.map((m) =>
            shouldConvert && targetUnit
              ? convertViaCatalog(m.value as number, (m.unit ?? m.metricUnit) as string, targetUnit)
              : m.value as number,
          );
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          return { ts: bucketDisplayTs(b), value: 0, missing: true };
        }
        const reduced = aggregate(values, parsed.agg, members);
        if (reduced.state === 'error') {
          error = reduced.message;
          return { ts: bucketDisplayTs(b), value: 0, missing: true };
        }
        return {
          ts: timeDim || rollupMs !== null
            ? bucketDisplayTs(b)
            : Math.min(...members.map((m) => m.timestamp)),
          // Unrounded — renderers format (ticket 13 precision policy).
          value: reduced.value,
          ...(reduced.state === 'absent' ? { missing: true } : {}),
        };
      });
      // `count` reduces to the count dimension regardless of input.
      // Output unit is the resolved one — count reduces to count; no
      // first-record fallback (ticket 13 cutover).
      const seriesUnit = parsed.agg === 'count' ? 'count' : targetUnit;
      return { key, label: group.label, points, unit: seriesUnit, ...(error ? { error } : {}) };
    });

    const aggregated = series.reduce((n, s) => n + s.points.length, 0);
    const scalar = series.length === 1 && series[0].points.length === 1 ? series[0].points[0].value : undefined;
    const resultUnit = series.length > 0 ? series[0].unit : undefined;
    const bucketCount = timeDim
      ? (series[0]?.points.length ?? 0)
      : rollupMs !== null
        ? new Set(matched.map((p) => bucketKey(p))).size
        : (matched.length ? 1 : 0);

    const insufficient = coverage?.insufficientScopes ?? [];
    const resultError = series.find((s) => s.error)?.error
      ?? (insufficient.length > 0
        ? `Insufficient evidence: ${insufficient.map((s) => `${s.resultId}/${s.metricKey} (${s.reason})`).join('; ')}`
        : undefined);
    return {
      parsed,
      series,
      stages: { selected: matched.length, buckets: bucketCount, aggregated, groups: series.length },
      matched,
      scalar,
      unit: resultUnit,
      ...(resultError ? { error: resultError } : {}),
      ...(coverage ? { coverage } : {}),
    };
  }

  /** Direction 2 — re-derive the metric from raw logs, restricted to the
   *  blockContentIds owned by the find predicate's content matches. */
  private async runJoined(parsed: ParsedAggregateQuery, options: QueryOptions): Promise<QueryResult> {
    const empty: QueryResult = {
      parsed, series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
    };
    const join = parsed.join as FindPredicate;
    const findResult = await this.runFind({
      family: 'find',
      raw: '', target: join.target, filters: join.filters,
      window: join.last ? { kind: 'relative', size: join.last.size, unit: join.last.unit } : undefined,
    });
    const contentIds = await this.contentIdsFromFindResult(findResult);
    if (contentIds.size === 0) return empty;

    // Ticket 16: content-joined queries keep eligible event-grain
    // observations (the summary-only join filter is gone); overlapping
    // scope fetches dedupe by stable observation identity.
    let facts = dedupeById(await this.deriveMetricFacts(contentIds, parsed.metric));
    // Ticket 12 precedence + context: query window wins; host range is the
    // default; membership half-open against the captured context.
    const ctx = runContext(options);
    const joinRange: ResolvedRange | undefined = parsed.window
      ? resolveWindowRange(parsed.window, ctx)
      : options.rangeStart !== undefined || options.rangeEnd !== undefined
        ? {
            start: options.rangeStart ?? 0,
            end: options.rangeEnd ?? Number.MAX_SAFE_INTEGER,
            endExclusive: false,
          }
        : undefined;
    if (joinRange) {
      facts = facts.filter(f => inRange(f.timestamp, joinRange));
    }

    const touchesTags =
      parsed.filters.some(f => f.key === 'tags') || parsed.groupBy.includes('tags');
    const noteTags = await this.loadNoteTags(facts, touchesTags);
    const matched = facts.filter(f => matchesFilters(f, parsed.filters, noteTags));
    const { selected, report } = selectContributions(matched, parsed.agg);
    return this.buildResult(selected, parsed, options, noteTags, joinRange, report);
  }

  /** Direction 1 — keep only content owning a wod block whose raw-log metric
   *  aggregate satisfies the predicate. `notes` for find:note, `blocks` for
   *  find:block. */
  private async applyMetricJoin(
    parsed: ParsedFindQuery,
    notes: Note[],
    blocks: BlockIndexRow[],
  ): Promise<{ notes: Note[]; blocks: BlockIndexRow[] }> {
    const join = parsed.join as MetricPredicate;
    // Resolve the wod blockContentIds owned by each candidate note.
    const noteToContent = await this.noteContentMap(new Set(notes.map(n => n.id)));
    // Candidate content ids: wod blocks owned by matched notes or blocks.
    const candidateIds = new Set<string>();
    for (const set of noteToContent.values()) for (const id of set) candidateIds.add(id);
    for (const b of blocks) if (b.dataType === 'wod' && b.blockContentId) candidateIds.add(b.blockContentId);

    const passing = await this.contentIdsSatisfying(candidateIds, join);

    // find:block — only wod blocks whose content id passes (prose has no metric).
    blocks = blocks.filter(b => b.dataType === 'wod' && !!b.blockContentId && passing.has(b.blockContentId!));
    // find:note — keep notes owning ≥1 passing wod block.
    notes = notes.filter(n => {
      const cids = noteToContent.get(n.id);
      return !!cids && [...cids].some(id => passing.has(id));
    });
    return { notes, blocks };
  }

  /** Re-derive the metric from raw logs for each content id, aggregate per id,
   *  and return the ids whose aggregate satisfies the join predicate. */
  private async contentIdsSatisfying(
    contentIds: Set<string>,
    join: MetricPredicate,
  ): Promise<Set<string>> {
    const facts = dedupeById(await this.deriveMetricFacts(contentIds, join.metric));
    const noteTags = await this.loadNoteTags(facts, join.filters.some(f => f.key === 'tags'));
    const filtered = selectContributions(
      facts.filter(f => matchesFilters(f, join.filters, noteTags)),
      join.agg,
    ).selected;
    const byContent = new Map<string, AnalyticsDataPoint[]>();
    for (const f of filtered) {
      const cid = f.blockContentId ?? '';
      const arr = byContent.get(cid);
      if (arr) arr.push(f);
      else byContent.set(cid, [f]);
    }
    const passing = new Set<string>();
    for (const [cid, rows] of byContent) {
      const values = rows.map(r => r.value as number);
      const reduced = aggregate(values, join.agg, rows);
      if (reduced.state !== 'observed') continue; // absent/insufficient never satisfies
      if (compareOp(reduced.value, join.operator, join.threshold)) passing.add(cid);
    }
    return passing;
  }


  /** Summary facts for one Canonical Metric Key across the given content ids —
   *  the cross-store join source. Reads finalize-written summary rows straight
   *  off the content index (ticket 003: the store is authoritative; the old
   *  freshness re-derivation is moot). One fact row per result × rowKey. */
  private async deriveMetricFacts(
    contentIds: Iterable<string>,
    metricKey: string,
  ): Promise<AnalyticsDataPoint[]> {
    const ids = [...new Set(contentIds)];
    const rows = await Promise.all(ids.map((blockContentId) => this.store.getEventsByContent(blockContentId)));
    // Ticket 16 (finding 3.7): content-joined queries read every eligible
    // representation — the coverage selection shares the direct path's
    // contract, so detail rows are no longer filtered out here.
    return rows
      .flat()
      .flatMap(projectEventToFacts)
      .filter((f) => f.metricKey === metricKey);
  }

  /** All content blocks across the journal + static corpus. */
  private async allContentBlocks(): Promise<BlockIndexRow[]> {
    const blocks = await this.blockStore.getAllBlocks();
    const staticBlocks = this.staticBlockStore ? await this.staticBlockStore.getAllBlocks() : [];
    return blocks.concat(staticBlocks);
  }

  /** Map each note id to the wod blockContentIds it owns. */
  private async noteContentMap(noteIds: Set<string>): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>();
    if (!noteIds.size) return map;
    const allBlocks = await this.allContentBlocks();
    for (const b of allBlocks) {
      if (b.dataType !== 'wod' || !b.blockContentId || !noteIds.has(b.noteId)) continue;
      let set = map.get(b.noteId);
      if (!set) { set = new Set(); map.set(b.noteId, set); }
      set.add(b.blockContentId);
    }
    return map;
  }

  /** Collect wod blockContentIds owned by a find query's content matches. */
  private async contentIdsFromFindResult(findResult: FindQueryResult): Promise<Set<string>> {
    const ids = new Set<string>();
    for (const b of findResult.blocks) if (b.dataType === 'wod' && b.blockContentId) ids.add(b.blockContentId);
    if (findResult.notes.length) {
      const noteIds = new Set(findResult.notes.map(n => n.id));
      const noteMap = await this.noteContentMap(noteIds);
      for (const set of noteMap.values()) for (const id of set) ids.add(id);
    }
    return ids;
  }

  /** Load note tag labels only when the query touches 'tags'. */
  private async loadNoteTags(rows: AnalyticsDataPoint[], touchesTags: boolean): Promise<Map<string, readonly string[]>> {
    const noteTags = new Map<string, readonly string[]>();
    if (!touchesTags) return noteTags;
    const noteIds = [...new Set(rows.map(r => r.noteId))];
    await Promise.all(noteIds.map(async (id) => noteTags.set(id, await this.noteStore.getNoteTagLabels(id))));
    return noteTags;
  }
}
