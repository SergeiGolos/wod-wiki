/**
 * wqlEdits — structural WQL edits over the engine's C6 surface (wayfinder
 * ticket 013): parse to the AST, mutate fields, emit through the serializer.
 * Replaces the retired clause-compiler helpers the app used to import from
 * the ui package (`pivotClauses`, `setMetricClause`, `clauseValue`).
 *
 * Every edit is total: unparseable input is returned unchanged, so a
 * transient invalid draft is never destroyed by a structural edit.
 */
import {
  parseQuery,
  serialize,
  isAggregateQuery,
  isFindQuery,
  isRowsQuery,
  type AnyParsedQuery,
  type FindPredicate,
  type MetricPredicate,
  type QueryWindow,
  type TagFilter,
} from '@bitcobblers/wod-wiki-engine';

/** What an edit can carry across planes: shared filters (provenance excluded
 * — the source: filter IS the plane), the C1 window, and the plane-matched
 * join half. */
interface CarriedState {
  filters: TagFilter[];
  window?: QueryWindow;
  findJoin?: FindPredicate;   // content half — legal on aggregate queries
  metricJoin?: MetricPredicate; // metric half — legal on find queries
}

function carry(parsed: AnyParsedQuery): CarriedState {
  if (parsed.error) return { filters: [] };
  const filters = parsed.filters.filter((f) => f.key !== 'source');
  if (isAggregateQuery(parsed)) return { filters, window: parsed.window, findJoin: parsed.join };
  if (isFindQuery(parsed)) return { filters, window: parsed.window, metricJoin: parsed.join };
  return { filters, window: parsed.window }; // rows: no joins (C4)
}

function sourceFilterFor(source: string): TagFilter | null {
  if (source === 'notes' || source === 'blocks' || source === 'efforts') return null;
  return {
    key: 'source',
    negate: false,
    values: source.split('|').map((v) => ({ value: v, wildcard: false })),
  };
}

function contentTarget(source: string): string {
  return source === 'blocks' ? 'block' : source === 'efforts' ? 'effort' : 'note';
}

/** The composer's source-plane value for a query (radio/heading state). */
export function sourceOfQuery(query: string): string {
  const parsed = parseQuery(query);
  if (parsed.error) return 'notes';
  if (isAggregateQuery(parsed)) return 'metrics';
  if (isRowsQuery(parsed)) return 'rows';
  const sf = parsed.filters.find((f) => f.key === 'source' && !f.negate);
  if (parsed.target === 'block') return 'blocks';
  if (parsed.target === 'effort') return 'efforts';
  if (!sf || sf.values.every((v) => v.value === 'all')) return 'notes';
  return sf.values.map((v) => v.value).join('|');
}

/** Pivot the query onto a new source plane: shared filters and the window
 * survive (C1 — one window clause on every family); the metrics head drops
 * off the metrics plane, and a pivot TO metrics seeds agg=sum with the old
 * metric when one exists. */
export function pivotSourceQuery(query: string, source: string): string {
  const parsed = parseQuery(query);
  if (parsed.error) return query;
  if (sourceOfQuery(query) === source) return query;
  const { filters, window, findJoin, metricJoin } = carry(parsed);

  if (source === 'metrics') {
    return serialize({
      family: 'aggregate',
      raw: '',
      agg: isAggregateQuery(parsed) ? parsed.agg : 'sum',
      metric: isAggregateQuery(parsed) ? parsed.metric : '',
      filters,
      groupBy: isAggregateQuery(parsed) ? parsed.groupBy : [],
      rollup: isAggregateQuery(parsed) ? parsed.rollup : undefined,
      displayUnit: isAggregateQuery(parsed) ? parsed.displayUnit : undefined,
      window,
      join: findJoin,
    });
  }

  if (source === 'rows') {
    return serialize({
      family: 'rows',
      raw: '',
      outputType: isRowsQuery(parsed) ? parsed.outputType : undefined,
      filters,
      window,
    });
  }

  const sourceFilter = sourceFilterFor(source);
  return serialize({
    family: 'find',
    raw: '',
    target: contentTarget(source),
    filters: sourceFilter ? [sourceFilter, ...filters] : filters,
    window,
    join: metricJoin,
  });
}

/** Set the aggregate metric, pivoting onto the metrics plane when needed
 * (shared filters and the window survive). */
export function setMetricQuery(query: string, metric: string): string {
  const parsed = parseQuery(query);
  if (parsed.error) return query;
  if (isAggregateQuery(parsed)) {
    return serialize({ ...parsed, metric });
  }
  const { filters, window, findJoin } = carry(parsed);
  return serialize({
    family: 'aggregate',
    raw: '',
    agg: 'sum',
    metric,
    filters,
    groupBy: [],
    window,
    join: findJoin,
  });
}

/** Drop the time-selection window. */
export function withoutWindow(query: string): string {
  const parsed = parseQuery(query);
  if (parsed.error) return query;
  return serialize({ ...parsed, window: undefined } as AnyParsedQuery);
}

/** Drop every non-provenance filter (the source: filter stays — it carries
 * the plane, and clearing it would silently widen the search). */
export function withoutFilters(query: string): string {
  const parsed = parseQuery(query);
  if (parsed.error) return query;
  return serialize({ ...parsed, filters: parsed.filters.filter((f) => f.key === 'source') });
}

/** Drop the filter at `index` (query-bar chip ✕). The index refers to
 * `parseQuery(query).filters` of the same string — a stale or out-of-range
 * index is a no-op returning the query unchanged. */
export function withoutFilterIndex(query: string, index: number): string {
  const parsed = parseQuery(query);
  if (parsed.error) return query;
  if (index < 0 || index >= parsed.filters.length) return query;
  const filters = parsed.filters.filter((_, i) => i !== index);
  return serialize({ ...parsed, filters } as AnyParsedQuery);
}
