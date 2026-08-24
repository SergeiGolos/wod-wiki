/**
 * Query Service — the executor of WQL against the Analytics Store
 * (CONTEXT.md glossary). Four-stage physical plan:
 *
 *   SELECT (index-first: by-metric + by-timestamp IDBKeyRange fetches,
 *           intersected in memory)
 *   BUCKET (time dim or rollup period)
 *   AGGREGATE (per bucket)
 *   GROUP (tag-dimension fan-out)
 *
 * Inputs are uncapped — personal-journal scale; widgets and tables are dumb
 * consumers of QueryResult. Fact rows are summary-grain AnalyticsDataPoint
 * rows; Tags are query-time dimensions read off the row (effort, discipline,
 * note, intensity, …) — 'tags' resolves through the note_tags store.
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
  type ParsedQuery,
  type ParsedFindQuery,
  type ParsedRowsQuery,
  type FindPredicate,
  type MetricPredicate,
  type Series,
  type SeriesPoint,
  type TagFilter,
} from './wql';
import { convert, resolveDisplayUnit } from './units';
import { projectEventToFacts } from './derivation';
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

function localDateString(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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

/** Match a single sourceId against one filter value. The `journal` kind matches
 *  rows with no sourceId prefix; the `collection` / `feed` kinds match rows whose
 *  sourceId starts with the kind. A `kind:id` literal matches the exact id. */
function sourceMatches(sourceId: string | undefined, kind: string): boolean {
  if (kind === 'journal') return !sourceId || sourceId === 'journal';
  if (kind === 'collection' || kind === 'feed') {
    return !!sourceId && sourceId.startsWith(`${kind}:`);
  }
  return sourceId === kind;
}

/** Apply the `source:` filter key to a list of objects that carry `sourceId`. */
function applySourceFilter<T extends { sourceId?: string }>(items: T[], filters: TagFilter[]): T[] {
  for (const filter of filters) {
    if (filter.key !== 'source') continue;
    const wants = filter.values.map(v => v.value);
    items = items.filter(item => {
      const match = wants.some(w => sourceMatches(item.sourceId, w));
      return filter.negate ? !match : match;
    });
  }
  return items;
}

/** Time-window predicate for a row, given the parsed WQL's `last` clause and
 *  the optional explicit `range` parameter. The range overrides `last`; when
 *  neither is set, the row passes. */
function effectiveTimeWindow(
  createdAt: number,
  last: { size: number; unit: 'd' | 'w' } | undefined,
  range: { start: number; end: number } | undefined,
  anchorNow?: number,
): boolean {
  if (range) return createdAt >= range.start && createdAt <= range.end;
  if (last) {
    const cutoff = (anchorNow ?? Date.now()) - last.size * (last.unit === 'w' ? 7 : 1) * DAY;
    return createdAt >= cutoff;
  }
  return true;
}

/** Newest `createdAt` in a scope-selected set — the `'latest-activity'`
 *  window anchor (#857). Undated rows (0) never win; an all-undated set
 *  anchors at 0, which lets every row pass (no dated activity to window
 *  against). Computed over the scope selection, before filters: the anchor
 *  is the index's latest activity, not the filtered subset's. */
function latestActivity(rows: ReadonlyArray<{ createdAt: number }>): number {
  let max = 0;
  for (const r of rows) if (r.createdAt > max) max = r.createdAt;
  return max;
}

/** Resolve the window anchor timestamp for a find run, per FindOptions. */
function windowAnchor<T extends { createdAt: number }>(
  selected: T[],
  parsed: ParsedFindQuery,
  options: FindOptions,
): number | undefined {
  if (options.anchorNow !== undefined) return options.anchorNow;
  if (options.anchor === 'latest-activity' && parsed.last) return latestActivity(selected);
  return undefined;
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
}

/** Options for `runFind` / `runFindBlock` — overrides for the parsed WQL. */
export interface FindOptions {
  /** Explicit timestamp range; overrides parsed WQL's `last` clause when set. */
  range?: { start: number; end: number };
  /** Time-window anchoring mode. 'wall-clock' anchors to Date.now();
   *  'latest-activity' anchors to the newest row in the scope selection
   *  (#857). Defaults to 'wall-clock'. */
  anchor?: 'wall-clock' | 'latest-activity';
  /** Explicit reference time for the window (useful for tests/replay).
   *  Overrides `anchor`. */
  anchorNow?: number;
}

export interface QueryResult {
  parsed: ParsedQuery;
  series: Series[];
  stages: { selected: number; buckets: number; aggregated: number; groups: number };
  matched: AnalyticsDataPoint[];
  /** Single scalar value when the result has exactly one point. */
  scalar?: number;
  /** Result display unit, if determined by directive, preference, or fact metadata. */
  unit?: string;
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
    case 'grade': return row.grade;
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
    const hit = group.some((f) =>
      f.values.some((a) =>
        rowValues.some((v) => (a.wildcard ? v.startsWith(a.value) : v === a.value)),
      ),
    );
    return negate ? !hit : hit;
  });
}

/** Dimension value for grouping; virtual time dims bucket the canonical time. */
function dimValue(row: AnalyticsDataPoint, dim: string, noteTags: ReadonlyMap<string, readonly string[]>): string {
  if (dim === 'day') return localDateString(row.timestamp);
  if (dim === 'week') {
    const d = new Date(row.timestamp);
    const monday = new Date(row.timestamp - ((d.getDay() + 6) % 7) * DAY);
    return `w/${monday.toISOString().slice(5, 10)}`;
  }
  if (dim === 'session') return row.resultId;
  const raw = factTagValue(row, dim, noteTags);
  if (raw === undefined) return '(none)';
  if (typeof raw === 'string') return raw;
  return raw.length ? raw.join(',') : '(none)';
}

/** Convert a single fact value to the target display unit, if known. */
function toDisplayValue(value: number, unit: string | undefined, targetUnit: string | undefined): number {
  if (!targetUnit || unit === targetUnit) return value;
  return convert(value, unit, targetUnit);
}

/** Aggregate values already converted to the target display unit. */
function aggregate(values: number[], agg: Aggregator, points: AnalyticsDataPoint[], targetUnit: string | undefined): number {
  if (agg === 'count') return points.length;
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'last': {
      const latest = [...points].sort((a, b) => b.timestamp - a.timestamp)[0];
      return toDisplayValue(latest.value as number, latest.unit ?? latest.metricUnit, targetUnit);
    }
    case 'delta': return values[values.length - 1] - values[0];
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
        parsed: { raw, agg: 'count', metric: parsed.target, filters: [], groupBy: [] },
        series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
      };
    }
    if (isRowsQuery(parsed)) {
      return {
        parsed: { raw, agg: 'count', metric: 'rows', filters: [], groupBy: [] },
        series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
      };
    }
    return this.run(parsed, options);
  }

  /**
   * Execute a rows query (rows:{…}, #949) — the session results table plane.
   * Reads event rows directly over the unified store (ticket 003): no
   * WorkoutResult blob parsing; outputType narrowing hits the promoted column.
   */
  async runRows(parsed: ParsedRowsQuery, options: { anchorNow?: number } = {}): Promise<RowsQueryResult> {
    const empty: RowsQueryResult = { parsed, runs: [] };
    if (parsed.error) return { ...empty, error: parsed.error };

    const ROWS_SCOPE_KEYS = new Set(['result', 'block', 'note']);
    const unsupported = parsed.filters.filter(
      (f) => !ROWS_SCOPE_KEYS.has(f.key) || f.negate || f.values.some((v) => v.wildcard),
    );
    if (unsupported.length > 0) {
      return {
        ...empty,
        error: `Unsupported rows filter(s): ${unsupported.map((f) => (f.negate ? '!' : '') + f.key).join(', ')}. Rows queries support exact result:, block:, note: values.`,
      };
    }
    const scopeValues = (key: string) =>
      parsed.filters.filter((f) => f.key === key).flatMap((f) => f.values.map((v) => v.value));
    const resultIds = scopeValues('result');
    const blockIds = scopeValues('block');
    const noteIds = scopeValues('note');
    if (resultIds.length + blockIds.length + noteIds.length === 0) {
      return { ...empty, error: 'Rows query needs a scope: result:, block:, or note:.' };
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
    if (parsed.last) {
      groups = groups.filter(([, rows]) =>
        effectiveTimeWindow(rows[0].timestamp, parsed.last, undefined, options.anchorNow),
      );
    }
    groups.sort((a, b) => b[1][0].timestamp - a[1][0].timestamp);

    const runs = groups
      .map(([resultId, rows]) => ({
        resultId,
        noteId: rows[0].noteId,
        timestamp: rows[0].timestamp,
        events: parsed.outputType
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
    const scope = parsed.scope || 'journal';
    if (scope === 'journal' || scope === 'all') {
      notes = notes.concat(await this.noteStore.getAllNotes());
    }
    if (scope === 'collections' || scope === 'feeds' || scope === 'all') {
      let sNotes = this.staticNoteStore ? await this.staticNoteStore.getAllNotes() : [];
      if (scope === 'collections') sNotes = sNotes.filter(n => n.sourceId?.startsWith('collection:'));
      if (scope === 'feeds') sNotes = sNotes.filter(n => n.sourceId?.startsWith('feed:'));
      notes = notes.concat(sNotes);
    }
    const selectedCount = notes.length;
    const anchorNow = windowAnchor(notes, parsed, options);
    notes = applySourceFilter(notes, parsed.filters);

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
    // Time window — the `range` parameter overrides the WQL's `last` clause.
    if (parsed.last || options.range) {
      notes = notes.filter(n => effectiveTimeWindow(n.createdAt, parsed.last, options.range, anchorNow));
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
    const scope = parsed.scope || 'journal';
    if (scope === 'journal' || scope === 'all') {
      blocks = blocks.concat(await this.blockStore.getAllBlocks());
    }
    if (scope === 'collections' || scope === 'feeds' || scope === 'all') {
      let sBlocks = this.staticBlockStore ? await this.staticBlockStore.getAllBlocks() : [];
      if (scope === 'collections') sBlocks = sBlocks.filter(b => b.sourceId?.startsWith('collection:'));
      if (scope === 'feeds') sBlocks = sBlocks.filter(b => b.sourceId?.startsWith('feed:'));
      blocks = blocks.concat(sBlocks);
    }
    const selectedCount = blocks.length;
    const anchorNow = windowAnchor(blocks, parsed, options);
    blocks = applySourceFilter(blocks, parsed.filters);

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

    // Time window
    if (parsed.last || options.range) {
      blocks = blocks.filter(b => effectiveTimeWindow(b.createdAt, parsed.last, options.range, anchorNow));
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

  async run(parsed: ParsedQuery, options: QueryOptions = {}): Promise<QueryResult> {
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
    // (the dashboard default) fetches through by-timestamp, the one proven
    // culling index; all-time queries scan. by-metric is never used —
    // ticket 001 measured it non-selective and slower than scanning.
    const windowed = options.rangeStart !== undefined || options.rangeEnd !== undefined;
    const start = options.rangeStart ?? 0;
    const end = options.rangeEnd ?? Number.MAX_SAFE_INTEGER;
    const eventRows = windowed
      ? await this.store.getEventsByTimeRange(start, end)
      : await this.store.scanAll();
    let candidates = eventRows
      .flatMap(projectEventToFacts)
      .filter(row => row.metricKey === parsed.metric);

    const touchesTags =
      parsed.filters.some(f => f.key === 'tags') || parsed.groupBy.includes('tags');
    const noteTags = await this.loadNoteTags(candidates, touchesTags);
    const matched = this.applyEffortScope(
      candidates.filter(row => matchesFilters(row, parsed.filters, noteTags)), parsed,
    );

    return this.buildResult(matched, parsed, options, noteTags);
  }

  /**
   * Stages 2–4 — BUCKET → GROUP → AGGREGATE over an already-selected +
   * filtered `matched` set.
   */
  private buildResult(
    matched: AnalyticsDataPoint[],
    parsed: ParsedQuery,
    options: QueryOptions,
    noteTags: ReadonlyMap<string, readonly string[]>,
  ): QueryResult {
    // Stage 2: BUCKET
    const timeDim = parsed.groupBy.find((d) => d === 'day' || d === 'week');
    const tagDims = parsed.groupBy.filter((d) => d !== 'day' && d !== 'week');
    const bucketMs = timeDim
      ? (timeDim === 'week' ? 7 : 1) * DAY
      : parsed.rollup
        ? parsed.rollup.size * (parsed.rollup.unit === 'w' ? 7 : 1) * DAY
        : null;
    const bucketKey = (ts: number) => (bucketMs ? Math.floor(ts / bucketMs) : 0);
    const bucketCount = bucketMs
      ? new Set(matched.map((p) => bucketKey(p.timestamp))).size
      : (matched.length ? 1 : 0);

    // Unit display preference / directive
    const { unit: targetUnit, convert: shouldConvert } = resolveDisplayUnit(matched, {
      directive: parsed.displayUnit,
      preferred: options.preferredUnit,
    });

    // Stage 3+4: GROUP + AGGREGATE per bucket
    const groups = new Map<string, AnalyticsDataPoint[]>();
    for (const row of matched) {
      const key = tagDims.length
        ? tagDims.map((d) => dimValue(row, d, noteTags)).join(' · ')
        : parsed.metric;
      const bucket = groups.get(key);
      if (bucket) bucket.push(row);
      else groups.set(key, [row]);
    }

    const series: Series[] = [...groups.entries()].map(([key, rows]) => {
      const byBucket = new Map<number, AnalyticsDataPoint[]>();
      for (const row of rows) {
        const b = bucketKey(row.timestamp);
        const members = byBucket.get(b);
        if (members) members.push(row);
        else byBucket.set(b, [row]);
      }
      const points: SeriesPoint[] = [...byBucket.entries()]
        .sort(([a], [b]) => a - b)
        .map(([b, members]) => {
          const values = members.map((m) =>
            toDisplayValue(m.value as number, m.unit ?? m.metricUnit, shouldConvert ? targetUnit : undefined),
          );
          return {
            ts: bucketMs ? b * bucketMs + bucketMs / 2 : Math.min(...members.map((m) => m.timestamp)),
            value: Math.round(aggregate(values, parsed.agg, members, shouldConvert ? targetUnit : undefined) * 100) / 100,
          };
        });
      const seriesUnit = shouldConvert
        ? targetUnit
        : (rows[0]?.unit ?? rows[0]?.metricUnit);
      return { key, label: key, points, unit: seriesUnit };
    });

    const aggregated = series.reduce((n, s) => n + s.points.length, 0);
    const scalar = series.length === 1 && series[0].points.length === 1 ? series[0].points[0].value : undefined;
    const resultUnit = series.length > 0 ? series[0].unit : undefined;

    return {
      parsed,
      series,
      stages: { selected: matched.length, buckets: bucketCount, aggregated, groups: series.length },
      matched,
      scalar,
      unit: resultUnit,
    };
  }

  /** Direction 2 — re-derive the metric from raw logs, restricted to the
   *  blockContentIds owned by the find predicate's content matches. */
  private async runJoined(parsed: ParsedQuery, options: QueryOptions): Promise<QueryResult> {
    const empty: QueryResult = {
      parsed, series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
    };
    const join = parsed.join as FindPredicate;
    const findResult = await this.runFind({
      raw: '', target: join.target, filters: join.filters, scope: join.scope, last: join.last,
    });
    const contentIds = await this.contentIdsFromFindResult(findResult);
    if (contentIds.size === 0) return empty;

    let facts = await this.deriveMetricFacts(contentIds, parsed.metric);
    if (facts.length === 0) return empty;
    if (options.rangeStart !== undefined || options.rangeEnd !== undefined) {
      const start = options.rangeStart ?? 0;
      const end = options.rangeEnd ?? Number.MAX_SAFE_INTEGER;
      facts = facts.filter(f => f.timestamp >= start && f.timestamp <= end);
    }

    const touchesTags =
      parsed.filters.some(f => f.key === 'tags') || parsed.groupBy.includes('tags');
    const noteTags = await this.loadNoteTags(facts, touchesTags);
    const matched = this.applyEffortScope(
      facts.filter(f => matchesFilters(f, parsed.filters, noteTags)), parsed,
    );

    return this.buildResult(matched, parsed, options, noteTags);
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
    const facts = await this.deriveMetricFacts(contentIds, join.metric);
    const noteTags = await this.loadNoteTags(facts, join.filters.some(f => f.key === 'tags'));
    const filtered = this.applyEffortScope(
      facts.filter(f => matchesFilters(f, join.filters, noteTags)),
      { filters: join.filters, groupBy: [] },
    );
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
      if (compareOp(aggregate(values, join.agg, rows, undefined), join.operator, join.threshold)) passing.add(cid);
    }
    return passing;
  }

  /** Filter per-effort vs un-attributed overall summary rows to avoid
   *  double-counting. */
  private applyEffortScope(matched: AnalyticsDataPoint[], scope: { filters: TagFilter[]; groupBy: string[] }): AnalyticsDataPoint[] {
    if (scope.groupBy.includes('effort') || scope.filters.some(f => f.key === 'effort')) {
      return matched.some(r => r.effortSlug !== undefined)
        ? matched.filter(r => r.effortSlug !== undefined)
        : matched;
    }
    return matched.some(r => r.effortSlug === undefined)
      ? matched.filter(r => r.effortSlug === undefined)
      : matched;
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
    return rows
      .flat()
      .filter((row) => row.grain === 'summary')
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
