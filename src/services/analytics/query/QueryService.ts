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

import type { AnalyticsDataPoint } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { parseQuery, type Aggregator, type ParsedQuery, type Series, type SeriesPoint, type TagFilter } from './wql';

const DAY = 86_400_000;

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

export interface QueryOptions {
  /** Inclusive lower bound on canonical workout time (fact `timestamp`). */
  rangeStart?: number;
  /** Inclusive upper bound on canonical workout time. */
  rangeEnd?: number;
}

export interface QueryResult {
  parsed: ParsedQuery;
  series: Series[];
  /** Pipeline stage telemetry, for the Explorer anatomy view. */
  stages: { selected: number; buckets: number; aggregated: number; groups: number };
  /** Selected fact rows (post filter) — uncapped, for the anatomy/table views. */
  matched: AnalyticsDataPoint[];
  scalar?: number;
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
  return filters.every((f) => {
    const raw = factTagValue(row, f.key, noteTags);
    const values = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
    const hit = values.some(v => f.wildcard ? v.startsWith(f.value) : v === f.value);
    return f.negate ? !hit : hit;
  });
}

/** Dimension value for grouping; virtual time dims bucket the canonical time. */
function dimValue(row: AnalyticsDataPoint, dim: string, noteTags: ReadonlyMap<string, readonly string[]>): string {
  if (dim === 'day') return new Date(Math.floor(row.timestamp / DAY) * DAY).toISOString().slice(0, 10);
  if (dim === 'week') {
    const d = new Date(row.timestamp);
    const monday = new Date(row.timestamp - ((d.getDay() + 6) % 7) * DAY);
    return `w/${monday.toISOString().slice(5, 10)}`;
  }
  if (dim === 'session') return row.resultId;
  const raw = factTagValue(row, dim, noteTags);
  if (Array.isArray(raw)) return raw.length ? raw.join(',') : '(none)';
  return raw ?? '(none)';
}

function aggregate(values: number[], agg: Aggregator, points: AnalyticsDataPoint[]): number {
  if (agg === 'count') return points.length;
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'last': {
      const latest = [...points].sort((a, b) => b.timestamp - a.timestamp)[0];
      return latest.value as number;
    }
    case 'delta': return values[values.length - 1] - values[0];
  }
}

export class QueryService {
  constructor(private readonly store: FactQueryStore = indexedDbFactStore) {}

  async runQuery(raw: string, options: QueryOptions = {}): Promise<QueryResult> {
    return this.run(parseQuery(raw), options);
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

    const matched = candidates.filter(row => matchesFilters(row, parsed.filters, noteTags));

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
        .map(([b, members]) => ({
          ts: bucketMs ? b * bucketMs + bucketMs / 2 : Math.min(...members.map((m) => m.timestamp)),
          value: Math.round(aggregate(members.map((m) => m.value as number), parsed.agg, members) * 100) / 100,
        }));
      return { key, label: key, points };
    });

    const aggregated = series.reduce((n, s) => n + s.points.length, 0);
    const scalar = series.length === 1 && series[0].points.length === 1 ? series[0].points[0].value : undefined;

    return {
      parsed,
      series,
      stages: { selected: matched.length, buckets: bucketCount, aggregated, groups: series.length },
      matched,
      scalar,
    };
  }
}

export const queryService = new QueryService();
