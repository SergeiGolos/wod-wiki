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

import type { AnalyticsDataPoint, Note, BlockIndexRow } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { parseQuery, isFindQuery, type Aggregator, type ParsedQuery, type ParsedFindQuery, type Series, type SeriesPoint, type TagFilter } from './wql';
import { convert, resolveDisplayUnit } from '../units';

const DAY = 86_400_000;

function localDateString(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
import staticBlockIndexData from '@/generated/static-block-index.json';
const staticBlockIndex = staticBlockIndexData as BlockIndexRow[];

const staticNotesMap = new Map<string, Note>();
for (const block of staticBlockIndex) {
  if (!staticNotesMap.has(block.noteId)) {
    staticNotesMap.set(block.noteId, {
      id: block.noteId,
      title: block.noteTitle,
      createdAt: block.createdAt,
      type: 'workout',
      sourceId: block.sourceId,
    });
  }
}
const staticNotes = Array.from(staticNotesMap.values());

const staticNoteStore: NoteQueryStore = {
  getAllNotes: async () => staticNotes,
  getNoteIdsForTag: async () => new Set(), // Tags not yet indexed for static corpus
};

const staticBlockStore: BlockQueryStore = {
  getAllBlocks: async () => staticBlockIndex,
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

export class QueryService {
  constructor(
    private readonly store: FactQueryStore = indexedDbFactStore,
    private readonly noteStore: NoteQueryStore = indexedDbNoteStore,
    private readonly blockStore: BlockQueryStore = indexedDbBlockStore,
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
  async runFind(parsed: ParsedFindQuery): Promise<FindQueryResult> {
    if (parsed.error) {
      return { parsed, notes: [], blocks: [], stages: { selected: 0, matched: 0 } };
    }

    if (parsed.target === 'block') {
      return this.runFindBlock(parsed);
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

    // Time window
    if (parsed.last) {
      const cutoff = Date.now() - parsed.last.size * (parsed.last.unit === 'w' ? 7 : 1) * DAY;
      notes = notes.filter(n => n.createdAt >= cutoff);
    }

    return { parsed, notes, blocks: [], stages: { selected: selectedCount, matched: notes.length } };
  }

  /**
   * Execute a find:block query against the derived block_index store.
   * Naive in-memory filtering on text (substring over rawContent), type
   * (dataType), and time window — same tracer-bullet approach as find:note.
   */
  async runFindBlock(parsed: ParsedFindQuery): Promise<FindQueryResult> {
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

    // Time window
    if (parsed.last) {
      const cutoff = Date.now() - parsed.last.size * (parsed.last.unit === 'w' ? 7 : 1) * DAY;
      blocks = blocks.filter(b => b.createdAt >= cutoff);
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

    // Load note tag labels only when the query actually touches 'tags'.
    const touchesNoteTags =
      parsed.filters.some(f => f.key === 'tags') || parsed.groupBy.includes('tags');
    const noteTags = new Map<string, readonly string[]>();
    if (touchesNoteTags) {
      const noteIds = [...new Set(candidates.map(row => row.noteId))];
      await Promise.all(noteIds.map(async (noteId) => {
        noteTags.set(noteId, await this.store.getNoteTagLabels(noteId));
      }));
    }

    let matched = candidates.filter(row => matchesFilters(row, parsed.filters, noteTags));

    // Filter per-effort vs un-attributed overall summary rows to avoid double-counting
    if (parsed.groupBy.includes('effort') || parsed.filters.some(f => f.key === 'effort')) {
      const hasPerEffortRows = matched.some(r => r.effortSlug !== undefined);
      if (hasPerEffortRows) {
        matched = matched.filter(r => r.effortSlug !== undefined);
      }
    } else {
      const hasOverallRow = matched.some(r => r.effortSlug === undefined);
      if (hasOverallRow) {
        matched = matched.filter(r => r.effortSlug === undefined);
      }
    }
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
}

export const queryService = new QueryService();
