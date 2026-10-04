import { type ParsedFindQuery, type ParsedAggregateQuery } from '@bitcobblers/wod-wiki-wql';
import type { AnyParsedQuery } from './useWqlStageCounts';
export interface WqlDiagnostics {
  valid: boolean;
  /** Exact resolved draft text, including invalid input. */
  wql: string;
  ast: AnyParsedQuery;
  error?: string;
  offendingClauseId?: string;
}

export interface WqlFindSummary {
  target: string;
  scope: string;
  timeWindow?: string;
  groupBy?: string;
  hasJoin: boolean;
  filterCount: number;
}

export function summarizeFind(ast: ParsedFindQuery): WqlFindSummary {
  const sourceFilter = ast.filters.find((f) => f.key === 'source');
  const scope = sourceFilter ? sourceFilter.values.map((v) => v.value).join(',') : 'all';
  return {
    target: ast.target,
    scope,
    timeWindow: ast.window
      ? ast.window.kind === 'relative'
        ? `last ${ast.window.size}${ast.window.unit}`
        : `from ${ast.window.start}${ast.window.end ? ` to ${ast.window.end}` : ''}`
      : undefined,
    groupBy: ast.groupBy?.length ? ast.groupBy.join(', ') : undefined,
    hasJoin: Boolean(ast.join),
    filterCount: ast.filters.length,
  };
}

export interface WqlAggregateSummary {
  agg: string;
  metric: string;
  groupBy?: string;
  rollup?: string;
  unit?: string;
  timeWindow?: string;
  hasJoin: boolean;
  filterCount: number;
}

export function summarizeAggregate(ast: ParsedAggregateQuery): WqlAggregateSummary {
  return {
    agg: ast.agg,
    metric: ast.metric,
    groupBy: ast.groupBy.length > 0 ? ast.groupBy.join(', ') : undefined,
    rollup: ast.rollup ? `${ast.rollup.size}${ast.rollup.unit}` : undefined,
    unit: ast.displayUnit,
    hasJoin: Boolean(ast.join),
    filterCount: ast.filters.length,
  };
}

