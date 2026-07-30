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
 */

import type { AnalyticsDataPoint, Note, BlockIndexRow, WorkoutResult } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { parseQuery, isFindQuery, type Aggregator, type ComparisonOp, type ParsedQuery, type ParsedFindQuery, type FindPredicate, type MetricPredicate, type Series, type SeriesPoint, type TagFilter } from './wql';
import { convert, resolveDisplayUnit } from '../units';
import { normalizeSummaryFacts } from '../workoutDerivation';

const DAY = 86_400_000;

function localDateString(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Kind prefixes recognised by the `source:` filter. */
const SOURCE_KINDS = new Set(['journal', 'collection', 'feed']);

/** Match a single sourceId against one filter value. The `journal` kind matches
 *  rows with no sourceId prefix; the `collection` / `feed` kinds match rows whose
 *  sourceId starts with the kind. A `kind:id` literal matches the exact id. */
function sourceMatches(sourceId: string | undefined, kind: string): boolean {
  if (kind === 'journal') return !sourceId;
  if (SOURCE_KINDS.has(kind)) {
    if (kind === 'collection') return !!sourceId?.startsWith('collection:');
    if (kind === 'feed') return !!sourceId?.startsWith('feed:');
  }
  // Literal: `kind:rest` — match the full sourceId.
  return sourceId === kind;
}

/** Apply the `source:` filter key to a list of objects that carry `sourceId`. */
function applySourceFilter<T extends { sourceId?: string }>(items: T[], filters: TagFilter[]): T[] {
  const sourceFilters = filters.filter(f => f.key === 'source');
  if (sourceFilters.length === 0) return items;
  return items.filter(item => {
    for (const f of sourceFilters) {
      const hit = f.values.some(v => sourceMatches(item.sourceId, v.value));
      if (hit === f.negate) return false;
    }
    return true;
  });
}
/** Time-window predicate for a row, given the parsed WQL's `last` clause and
 *  the optional explicit `range` parameter. The range overrides `last`; when
 *  neither is set, the row passes. */
function effectiveTimeWindow(
  createdAt: number,
  last: { size: number; unit: 'd' | 'w' } | undefined,
  range: { start: number; end: number } | undefined,
): boolean {
  if (range) return createdAt >= range.start && createdAt <= range.end;
  if (last) {
    const cutoff = Date.now() - last.size * (last.unit === 'w' ? 7 : 1) * DAY;
    return createdAt >= cutoff;
  }
  return true;
}

/** Store surface the Query Service needs — injectable for tests. */
export interface FactQueryStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]>;
  getNoteTagLabels(noteId: string): Promise<string[]>;
}

const indexedDbFactStore: FactQueryStore = {
  getFactsByMetric: (metricKey) => indexedDBService.getFactsByMetric(metricKey),
  getFactsByTimeRange: (start, end) => indexedDBService.getFactsByTimeRange(start, end),
  getNoteTagLabels: async (noteId) => (await indexedDBService.getTagsForNote(noteId)).map(tag => tag.label),
};

/** Store surface for content queries — injectable for tests. */
export interface NoteQueryStore {
  getAllNotes(): Promise<Note[]>;
  getNoteIdsForTag(label: string): Promise<Set<string>>;
}

const indexedDbNoteStore: NoteQueryStore = {
  getAllNotes: () => indexedDBService.getAllNotes(),
  getNoteIdsForTag: async (label) =>
    new Set((await indexedDBService.getNotesForTag(label)).map(n => n.id)),
};

/** Store surface for block-index queries — injectable for tests. */
export interface BlockQueryStore {
  getAllBlocks(): Promise<BlockIndexRow[]>;
}

const indexedDbBlockStore: BlockQueryStore = {
  getAllBlocks: () => indexedDBService.getAllBlockIndex(),
};

/** Store surface for raw WorkoutResult logs — the cross-store join source.
 *  Cross-store aggregates bypass derived facts and re-derive from these logs
 *  ("logs win", issue #800). */
export interface ResultLogStore {
  getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]>;
}

const indexedDbResultStore: ResultLogStore = {
  getResultsByContentId: (blockContentId) => indexedDBService.getResultsByContentId(blockContentId),
};

// Static block-index corpus (markdown collections + feeds) — generated by
// `bun scripts/generate-static-block-index.ts` (~8 MB JSON, ~21k rows).
// Deferred behind a memoized Promise so non-analytics routes (journal,
// playground, effort pages) don't pay the parse cost on first paint: the
// JSON only lands in the browser when an actual analytics query asks for
// it. The loaders are the single entry points — tests/dev-tools that need
// the corpus eagerly can `await loadStaticBlockIndex()` themselves.
let staticBlockIndexPromise: Promise<BlockIndexRow[]> | null = null;
function loadStaticBlockIndex(): Promise<BlockIndexRow[]> {
    if (!staticBlockIndexPromise) {
        staticBlockIndexPromise = import(
            /* @vite-ignore */ '@/generated/static-block-index.json'
        ).then((m) => m.default as BlockIndexRow[]);
    }
    return staticBlockIndexPromise;
}

// Build the static-notes projection (one Note per distinct noteId in the
// block index) lazily. Memoized on the block-index promise.
/** Pure projection of a block_index into static Notes — one Note per distinct
 *  noteId, with a `catalog` field set to `noteId.split('/')[0]`. The catalog is
 *  the directory the file lives under (e.g. `crossfit-girls` for collections,
 *  `crossfit-programming` for feeds) and is what the Library's panel uses to
 *  target the `+ Filter → Catalog` menu. */
export function staticNotesFromBlocks(blocks: BlockIndexRow[]): Note[] {
    const map = new Map<string, Note>();
    for (const block of blocks) {
        if (!map.has(block.noteId)) {
            map.set(block.noteId, {
                id: block.noteId,
                title: block.noteTitle,
                createdAt: block.createdAt,
                type: 'workout',
                sourceId: block.sourceId,
                // Catalog: drop the `feeds/` wrapper for feed rows, then take the
                // first path segment. For collections (`<dir>/<file>`) the first
                // segment is the directory; for feeds (`feeds/<dir>/<date>/<file>`)
                // it would be `feeds`, which is not the catalog id the panel wants.
                catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
            });
        }
    }
    return Array.from(map.values());
}

let staticNotesPromise: Promise<Note[]> | null = null;
function loadStaticNotes(): Promise<Note[]> {
    if (!staticNotesPromise) {
        staticNotesPromise = loadStaticBlockIndex().then(staticNotesFromBlocks);
    }
    return staticNotesPromise;
}

const staticNoteStore: NoteQueryStore = {
    getAllNotes: () => loadStaticNotes(),
    getNoteIdsForTag: async () => new Set(), // Tags not yet indexed for static corpus
};

const staticBlockStore: BlockQueryStore = {
    getAllBlocks: () => loadStaticBlockIndex(),
};

export interface FindQueryResult {
  parsed: ParsedFindQuery;
  notes: Note[];
  /** Block-index rows for find:block queries. */
  blocks: BlockIndexRow[];
  stages: { selected: number; matched: number };
}

export interface QueryOptions {
  /** Inclusive lower bound on canonical workout time (fact `timestamp`). */
  rangeStart?: number;
  /** Inclusive upper bound on canonical workout time. */
  rangeEnd?: number;
  /** Preferred display unit (e.g. 'kg') for mass-family metrics when the query does not specify one. */
  preferredUnit?: string;
}

/** Options for `runFind` / `runFindBlock` — overrides for the parsed WQL. */
export interface FindOptions {
  /** WQL Time Range Parameter. When set, overrides the WQL's `last <n>w|d` clause
   *  (which is preserved in the parsed shape for round-trippability but is not the
   *  truth source for execution when `range` is set). */
  range?: { start: number; end: number };
}

export interface QueryResult {
  parsed: ParsedQuery;
  series: Series[];
  /** Pipeline stage telemetry, for the Explorer anatomy view. */
  stages: { selected: number; buckets: number; aggregated: number; groups: number };
  /** Selected fact rows (post filter) — uncapped, for the anatomy/table views. */
  matched: AnalyticsDataPoint[];
  scalar?: number;
  /** Declared display unit for the result (recorded or converted). */
  unit?: string;
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
  constructor(
    private readonly store: FactQueryStore = indexedDbFactStore,
    private readonly noteStore: NoteQueryStore = indexedDbNoteStore,
    private readonly blockStore: BlockQueryStore = indexedDbBlockStore,
    private readonly resultStore: ResultLogStore = indexedDbResultStore,
  ) {}
  async getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]> {
    return this.store.getFactsByTimeRange(start, end);
  }


  async runQuery(raw: string, options: QueryOptions = {}): Promise<QueryResult> {
    const parsed = parseQuery(raw);
    if (isFindQuery(parsed)) {
      return {
        parsed: { raw, agg: 'count', metric: parsed.target, filters: [], groupBy: [] },
        series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [],
      };
    }
    return this.run(parsed, options);
  }

  /**
   * Execute a content-discovery query (find:note). Naive in-memory filtering
   * per the tracer-bullet scope (#797): load all notes, then apply tag/text/
   * time filters. Block indexing and cross-store joins come in #798/#800.
   */
  async runFind(parsed: ParsedFindQuery, options: FindOptions = {}): Promise<FindQueryResult> {
    if (parsed.error) {
      return { parsed, notes: [], blocks: [], stages: { selected: 0, matched: 0 } };
    }

    if (parsed.target === 'block') {

      return this.runFindBlock(parsed, options);
    }
    let notes: Note[] = [];
    const scope = parsed.scope || 'journal';
    if (scope === 'journal' || scope === 'all') {
      notes = notes.concat(await this.noteStore.getAllNotes());
    }
    if (scope === 'collections' || scope === 'feeds' || scope === 'all') {
      let sNotes = await staticNoteStore.getAllNotes();
      if (scope === 'collections') sNotes = sNotes.filter(n => n.sourceId?.startsWith('collection:'));
      if (scope === 'feeds') sNotes = sNotes.filter(n => n.sourceId?.startsWith('feed:'));
      notes = notes.concat(sNotes);
    }
    const selectedCount = notes.length;
    notes = applySourceFilter(notes, parsed.filters);

    // Tag filters — intersect note IDs across OR'd values within a key.
    for (const filter of parsed.filters) {
      if (filter.key === 'tags' && !filter.negate) {
        const matchingIds = new Set<string>();
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = await staticNoteStore.getNoteIdsForTag(v.value);
          ids.forEach(id => matchingIds.add(id));
          sIds.forEach(id => matchingIds.add(id));
        }
        notes = notes.filter(n => matchingIds.has(n.id));
      } else if (filter.key === 'tags' && filter.negate) {
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = await staticNoteStore.getNoteIdsForTag(v.value);
          notes = notes.filter(n => !ids.has(n.id) && !sIds.has(n.id));
        }
      }
    }

    // Text filter — substring on title (rawContent not available on Note;
    // full-text search comes with block indexing #798).
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

    // Time window — the `range` parameter overrides the WQL's `last` clause.
    if (parsed.last || options.range) {
      notes = notes.filter(n => effectiveTimeWindow(n.createdAt, parsed.last, options.range));
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
   * Naive in-memory filtering on text (substring over rawContent), type
   * (dataType), and time window — same tracer-bullet approach as find:note.
   */
  async runFindBlock(parsed: ParsedFindQuery, options: FindOptions = {}): Promise<FindQueryResult> {
    let blocks: BlockIndexRow[] = [];
    const scope = parsed.scope || 'journal';
    if (scope === 'journal' || scope === 'all') {
      blocks = blocks.concat(await this.blockStore.getAllBlocks());
    }
    if (scope === 'collections' || scope === 'feeds' || scope === 'all') {
      let sBlocks = await staticBlockStore.getAllBlocks();
      if (scope === 'collections') sBlocks = sBlocks.filter(b => b.sourceId?.startsWith('collection:'));
      if (scope === 'feeds') sBlocks = sBlocks.filter(b => b.sourceId?.startsWith('feed:'));
      blocks = blocks.concat(sBlocks);
    }
    const selectedCount = blocks.length;
    blocks = applySourceFilter(blocks, parsed.filters);

    // Text filter — substring over rawContent (the block's markdown text).
    for (const filter of parsed.filters) {
      if (filter.key === 'text' && !filter.negate) {
        const search = filter.values.map(v => v.value).join(' ').toLowerCase();
        blocks = blocks.filter(b => b.rawContent.toLowerCase().includes(search));
      }
    }

    // Type filter — block data type (wod, markdown, h1..h6, frontmatter).
    for (const filter of parsed.filters) {
      if (filter.key === 'type' && !filter.negate) {
        const wanted = new Set(filter.values.map(v => v.value));
        blocks = blocks.filter(b => wanted.has(b.dataType));
      }
    }

    // Tag filter — map to note tags via noteId.
    for (const filter of parsed.filters) {
      if (filter.key === 'tags' && !filter.negate) {
        const matchingNoteIds = new Set<string>();
        for (const v of filter.values) {
          const ids = await this.noteStore.getNoteIdsForTag(v.value);
          const sIds = await staticNoteStore.getNoteIdsForTag(v.value);
          ids.forEach(id => matchingNoteIds.add(id));
          sIds.forEach(id => matchingNoteIds.add(id));
        }
        blocks = blocks.filter(b => matchingNoteIds.has(b.noteId));
      }
    }

    // Time window — the `range` parameter overrides the WQL's `last` clause.
    if (parsed.last || options.range) {
      blocks = blocks.filter(b => effectiveTimeWindow(b.createdAt, parsed.last, options.range));
    }

    // Cross-store join (direction 1): keep wod blocks whose raw-log metric
    // aggregate satisfies the predicate.
    if (parsed.join) {
      const joined = await this.applyMetricJoin(parsed, [], blocks);
      blocks = joined.blocks;
    }
    return { parsed, notes: [], blocks, stages: { selected: selectedCount, matched: blocks.length } };
  }

  async run(parsed: ParsedQuery, options: QueryOptions = {}): Promise<QueryResult> {
    const empty: QueryResult = {
      parsed,
      series: [],
      stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
      matched: [],
    };
    if (parsed.error) return empty;

    // Cross-store join (direction 2): bypass the analytics store and re-derive
    // from raw WorkoutResult logs, restricted to the joined find predicate's
    // content. Logs win (#800).
    if (parsed.join) return this.runJoined(parsed, options);

    // ── Stage 1: SELECT — index-first. by-metric is always available (the
    // WQL head names the Canonical Metric Key); by-timestamp narrows when a
    // range is given. Intersect by row id, then apply the tag matcher.
    const byMetric = await this.store.getFactsByMetric(parsed.metric);
    let candidates = byMetric;
    if (options.rangeStart !== undefined || options.rangeEnd !== undefined) {
      const start = options.rangeStart ?? 0;
      const end = options.rangeEnd ?? Number.MAX_SAFE_INTEGER;
      const inRange = new Set((await this.store.getFactsByTimeRange(start, end)).map(row => row.id));
      candidates = candidates.filter(row => inRange.has(row.id));
    }

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
   * filtered `matched` set. Shared by the analytics SELECT path and the
   * cross-store join (which feeds raw-log-derived facts in as `matched`).
   */
  private buildResult(
    matched: AnalyticsDataPoint[],
    parsed: ParsedQuery,
    options: QueryOptions,
    noteTags: ReadonlyMap<string, readonly string[]>,
  ): QueryResult {
    // ── Stage 2: BUCKET — a time dim wins over rollup; neither → one bucket.
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

    // ── Unit display preference / directive ───────────────────────────────
    const { unit: targetUnit, convert: shouldConvert } = resolveDisplayUnit(matched, {
      directive: parsed.displayUnit,
      preferred: options.preferredUnit,
    });

    // ── Stage 3+4: GROUP (tag-dimension fan-out) + AGGREGATE per bucket ──
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

  // ── Cross-store joins (#800) ─────────────────────────────────────────
  //
  // Two directions, both joined at the blockContentId level against RAW
  // WorkoutResult logs (the analytics store is bypassed — "logs win"):
  //   • Direction 1 — find where metric:  find:note where sum:totalVolume{} > 5000
  //   • Direction 2 — metric where find:  sum:totalVolume{} where find:note{tags:x}

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
   *  double-counting (same guard the SELECT path has always applied). */
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

  /** Re-derive summary facts for one Canonical Metric Key from RAW WorkoutResult
   *  logs across the given content ids — the cross-store join source. One fact
   *  row per result (normalizeSummaryFacts dedupes within a result). */
  private async deriveMetricFacts(
    contentIds: Iterable<string>,
    metricKey: string,
  ): Promise<AnalyticsDataPoint[]> {
    const out: AnalyticsDataPoint[] = [];
    const ids = [...new Set(contentIds)];
    await Promise.all(ids.map(async (blockContentId) => {
      const results = await this.resultStore.getResultsByContentId(blockContentId);
      for (const result of results) {
        const facts = normalizeSummaryFacts(result.data.logs ?? [], {
          noteId: result.noteId,
          resultId: result.id,
          segmentId: result.segmentId,
          segmentVersion: result.segmentVersion,
          blockContentId,
          origin: result.origin,
          pageId: result.pageId,
          workoutTimestamp: result.createdAt,
        });
        for (const f of facts) if (f.metricKey === metricKey) out.push(f);
      }
    }));
    return out;
  }

  /** All content blocks across the journal + static corpus. */
  private async allContentBlocks(): Promise<BlockIndexRow[]> {
    return (await this.blockStore.getAllBlocks()).concat(await staticBlockStore.getAllBlocks());
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
    await Promise.all(noteIds.map(async (id) => noteTags.set(id, await this.store.getNoteTagLabels(id))));
    return noteTags;
  }

}

export const queryService = new QueryService();