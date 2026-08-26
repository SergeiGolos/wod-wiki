import { parseQuery, type ParsedFindQuery, type ParsedAggregateQuery } from '@bitcobblers/wod-wiki-wql';
import { composerRegistry } from './ComposerRegistry';
import { clausesToWql, type QueryClause } from './queryClauses';
import type { AnyParsedQuery } from './useWqlStageCounts';
export interface WqlDiagnostics {
  valid: boolean;
  /** The composed WQL string for the current clause set. */
  wql: string;
  ast: AnyParsedQuery;
  error?: string;
  offendingClauseId?: string;
}

export interface WqlFindSummary {
  target: string;
  scope: string;
  timeWindow?: string;
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

function customSlotError(clause: QueryClause): string | null {
  const custom = composerRegistry.getSlot(clause.type);
  if (!custom) return null;
  const value = clause.value.trim();
  if (!value) return null;
  const parsed = custom.parseValue ? custom.parseValue(value) : value;
  if (parsed === undefined) return `Invalid ${custom.label} value`;
  return custom.validate ? custom.validate(parsed) : null;
}

export function diagnoseClauses(clauses: QueryClause[]): WqlDiagnostics {
  for (const clause of clauses) {
    const error = customSlotError(clause);
    if (error) {
      return {
        valid: false,
        wql: clausesToWql(clauses),
        ast: { family: 'aggregate', raw: '', agg: 'sum', metric: '', filters: [], groupBy: [], error },
        error,
        offendingClauseId: clause.id,
      };
    }
  }

  const wql = clausesToWql(clauses);
  const ast = parseQuery(wql);

  if (ast.error) {
    return {
      valid: false,
      wql,
      ast,
      error: ast.error,
    };
  }

  return {
    valid: true,
    wql,
    ast,
  };
}
