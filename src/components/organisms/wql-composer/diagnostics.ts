/**
 * Live WQL diagnostics for the WqlComposer (issue #832, decision #826).
 *
 * Pure, synchronous diagnostics over the clause model:
 *   - {@link diagnoseClauses} composes the WQL, parses it, and — when the
 *     parse fails — probes each clause's fragment in isolation to identify
 *     the offending slot instead of swallowing the error.
 *   - {@link summarizeFind} distills a valid find AST into the display
 *     summary (target, scope, time window, join) for the diagnostics strip.
 *
 * Parsing short strings through the Lezer grammar is cheap; this runs
 * synchronously on every clause change (well inside the ~150ms feedback
 * budget). Only query *execution* is debounced (see useWqlStageCounts).
 */

import {
  parseQuery,
  type AnyParsedQuery,
  type ParsedFindQuery,
  type ParsedQuery,
} from '@/services/analytics/query/wql'
import { composerRegistry } from './ComposerRegistry'
import { clausesToWql, clauseToWql, clauseValue, sourcePlane, type QueryClause } from './queryClauses'

export interface WqlDiagnostics {
  /** The composed WQL string. */
  wql: string
  /** The parsed AST (carries `error` when the parse failed). */
  ast: AnyParsedQuery
  /** True when the composed WQL parses and every custom slot value validates. */
  valid: boolean
  /** Parser or custom-slot error message when invalid. */
  error?: string
  /** Id of the clause whose fragment caused the failure, when identified. */
  offendingClauseId?: string
}

/** Display summary of a valid find query for the diagnostics strip. */
export interface WqlFindSummary {
  target: string
  scope: string
  /** `last 2w` style window, when the query carries one. */
  window?: string
  /** `sum:totalVolume > 5000` style join, when the query carries one. */
  join?: string
}

export function summarizeFind(ast: ParsedFindQuery): WqlFindSummary {
  const summary: WqlFindSummary = {
    target: ast.target,
    scope: ast.scope ?? 'all',
  }
  if (ast.last) summary.window = `last ${ast.last.size}${ast.last.unit}`
  if (ast.join) {
    summary.join = `${ast.join.agg}:${ast.join.metric} ${ast.join.operator} ${ast.join.threshold}`
  }
  return summary
}

/** Display summary of a valid aggregate query for the diagnostics strip
 *  (issue #838, decision #836). */
export interface WqlAggregateSummary {
  agg: string
  metric: string
  /** `week, effort` style dimension list, when the query groups. */
  dims?: string
  /** `1w` style rollup period, when present. */
  rollup?: string
  /** Display unit directive, when present. */
  unit?: string
  /** `find:note` style join head, when the query carries one. */
  join?: string
}

export function summarizeAggregate(ast: ParsedQuery): WqlAggregateSummary {
  const summary: WqlAggregateSummary = { agg: ast.agg, metric: ast.metric }
  if (ast.groupBy.length > 0) summary.dims = ast.groupBy.join(', ')
  if (ast.rollup) summary.rollup = `${ast.rollup.size}${ast.rollup.unit}`
  if (ast.displayUnit) summary.unit = ast.displayUnit
  if (ast.join) summary.join = `find:${ast.join.target}`
  return summary
}

/**
 * Validate a custom slot's stored string against its registered definition —
 * the same contract the composer enforced inline before (issue #829/830).
 * Returns the error message, or null when the value is absent or valid.
 */
function customSlotError(clause: QueryClause): string | null {
  const def = composerRegistry.getSlot(clause.type)
  if (!def || !clause.value.trim()) return null
  const value = def.parseValue(clause.value.trim())
  if (value === undefined) return `Cannot parse ${def.label} value "${clause.value}"`
  return def.validate?.(value) ?? null
}

/**
 * Build a minimal probe query containing only this clause's fragment, so a
 * parse failure can be attributed to the offending slot. Probes are shaped
 * for the current plane (`find:note{…}` on content, `sum:totalVolume{…}`
 * on metrics). Returns null when the clause cannot be probed (empty value,
 * unknown custom fragment, or a value that is never a parse error).
 */
function clauseProbeWql(clause: QueryClause, plane: 'content' | 'metrics'): string | null {
  const value = clause.value.trim()
  if (!value) return null

  switch (clause.type) {
    case 'source':
      // 'metrics'/'notes'/'rows' map to always-valid skeletons — never the offender.
      if (value === 'metrics' || value === 'notes' || value === 'rows') return null
      if (value === 'blocks') return 'find:block in all'
      if (value === 'efforts') return 'find:effort in all'
      return `find:note in ${value}`
    case 'time':
      // 'all' compiles to no time fragment (see clausesToWql) — probing it
      // would mis-attribute an unrelated parse failure to a healthy slot.
      if (value === 'all') return null
      return `find:note ${value.startsWith('last') ? value : `last ${value}`}`
    case 'where':
      return plane === 'metrics' ? `sum:totalVolume{} where ${value}` : `find:note where ${value}`
    case 'agg':
      return `${value}:totalVolume`
    case 'metric':
      return `sum:${value}`
    case 'groupby':
      return `sum:totalVolume{} by {${value}}`
    case 'rollup':
      return `sum:totalVolume{} by {week}.rollup(${value})`
    case 'unit':
      return `sum:totalVolume{} in ${value}`
    default: {
      const { filterStr } = clauseToWql(clause)
      if (!filterStr) return null
      return plane === 'metrics' ? `sum:totalVolume{${filterStr}}` : `find:note{${filterStr}}`
    }
  }
}

/**
 * First custom slot with a semantic validation error, if any — the check
 * shared by both paths of {@link diagnoseClauses}.
 */
function firstCustomSlotError(clauses: QueryClause[]): { error: string; clauseId: string } | null {
  for (const clause of clauses) {
    const customError = customSlotError(clause)
    if (customError) return { error: customError, clauseId: clause.id }
  }
  return null
}

/**
 * Compose + parse the clause list and attribute failures to a slot.
 *
 * Attribution strategy: if the full query fails to parse, probe each clause's
 * fragment alone — the first clause whose probe also fails is the offender.
 * Probes run before custom-slot validation so the badge keeps the parser's
 * error message and the highlight lands on the clause whose fragment actually
 * broke the parse (a custom slot's invalid value never reaches the parser —
 * it compiles to no fragment — so it can never be the cause of `ast.error`).
 * Custom slot values are validated against their registered definition on
 * both paths, after probes.
 */
export function diagnoseClauses(clauses: QueryClause[]): WqlDiagnostics {
  const wql = clausesToWql(clauses)
  const ast = parseQuery(wql)
  const plane = sourcePlane(clauseValue(clauses, 'source', 'notes'))

  if (ast.error) {
    for (const clause of clauses) {
      const probe = clauseProbeWql(clause, plane)
      if (probe && parseQuery(probe).error) {
        return { wql, ast, valid: false, error: ast.error, offendingClauseId: clause.id }
      }
    }
    // No single fragment reproduces the failure; a custom slot's semantic
    // error is still a real, reportable problem with the query.
    const customError = firstCustomSlotError(clauses)
    if (customError) {
      return { wql, ast, valid: false, error: customError.error, offendingClauseId: customError.clauseId }
    }
    return { wql, ast, valid: false, error: ast.error }
  }

  // The parse succeeded; custom slot values still need their semantic checks.
  const customError = firstCustomSlotError(clauses)
  if (customError) {
    return { wql, ast, valid: false, error: customError.error, offendingClauseId: customError.clauseId }
  }

  return { wql, ast, valid: true }
}