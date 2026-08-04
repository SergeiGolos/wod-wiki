/**
 * useWqlStageCounts — live execution feedback for the diagnostics strip
 * (issues #832/#838, decisions #826/#836).
 *
 * Debounced (~150ms default) execution of the composed query through a
 * consumer-supplied executor (typically a runFind/runQuery dispatch over
 * `queryService`, injected so the composer stays decoupled from the services
 * layer and tests stay hermetic). Only valid ASTs execute; invalid ASTs
 * clear the counts and never fire the executor. Counts are discriminated by
 * query kind: find (selected/matched) vs aggregate (selected/buckets/
 * aggregated/groups).
 */

import { useEffect, useRef, useState } from 'react'
import { isFindQuery, type AnyParsedQuery } from '@/services/analytics/query/wql'
import type { FindQueryResult, QueryResult } from '@/services/analytics/query/QueryService'

/**
 * Executor seam: runs a parsed query of either kind and reports pipeline
 * stage counts. Consumers dispatch on kind — e.g.
 * `(ast) => isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)`.
 */
export type WqlExecutor = (ast: AnyParsedQuery) => Promise<FindQueryResult | QueryResult>

export type WqlStageCounts =
  | { kind: 'find'; selected: number; matched: number }
  | { kind: 'aggregate'; selected: number; buckets: number; aggregated: number; groups: number }

export const DEFAULT_DIAGNOSTICS_DEBOUNCE_MS = 150

export function useWqlStageCounts(
  ast: AnyParsedQuery,
  valid: boolean,
  execute: WqlExecutor | undefined,
  debounceMs: number = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
): WqlStageCounts | undefined {
  const [stages, setStages] = useState<WqlStageCounts | undefined>(undefined)

  // Latest-executor ref: consumers commonly pass an inline lambda; depending
  // on its identity would restart the debounce (and re-execute) every render.
  const executorRef = useRef(execute)
  executorRef.current = execute

  const runnable = valid && !ast.error && execute !== undefined

  useEffect(() => {
    if (!runnable) {
      setStages(undefined)
      return
    }
    // The previous query's counts are meaningless for the new AST — clear
    // them rather than display stale numbers during the debounce window.
    setStages(undefined)
    let cancelled = false
    const timer = setTimeout(() => {
      // `runnable` guarantees a valid AST; the executor contract takes the
      // parsed AST of either kind, never the raw string.
      executorRef.current?.(ast)
        .then(result => {
          if (cancelled) return
          setStages(
            isFindQuery(ast)
              ? { kind: 'find', ...(result as FindQueryResult).stages }
              : { kind: 'aggregate', ...(result as QueryResult).stages },
          )
        })
        .catch(() => { if (!cancelled) setStages(undefined) })
    }, debounceMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ast, runnable, debounceMs])

  return runnable ? stages : undefined
}
