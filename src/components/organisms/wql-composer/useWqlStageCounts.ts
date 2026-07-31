/**
 * useWqlStageCounts — live execution feedback for the diagnostics strip
 * (issue #832, decision #826).
 *
 * Debounced (~150ms default) execution of the composed find query through a
 * consumer-supplied executor (typically `queryService.runFind`, injected so
 * the composer stays decoupled from the services layer and tests stay
 * hermetic). Only valid find queries execute; invalid or non-find ASTs clear
 * the counts and never fire the executor.
 */

import { useEffect, useRef, useState } from 'react'
import { isFindQuery, type AnyParsedQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'

/** Executor seam: runs a parsed find query and reports pipeline stage counts. */
export type FindExecutor = (ast: ParsedFindQuery) => Promise<FindQueryResult>

export interface WqlStageCounts {
  selected: number
  matched: number
}

export const DEFAULT_DIAGNOSTICS_DEBOUNCE_MS = 150

export function useWqlStageCounts(
  ast: AnyParsedQuery,
  valid: boolean,
  executeFind: FindExecutor | undefined,
  debounceMs: number = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
): WqlStageCounts | undefined {
  const [stages, setStages] = useState<WqlStageCounts | undefined>(undefined)

  // Latest-executor ref: consumers commonly pass an inline lambda; depending
  // on its identity would restart the debounce (and re-execute) every render.
  const executorRef = useRef(executeFind)
  executorRef.current = executeFind

  const runnable = valid && !ast.error && isFindQuery(ast) && executeFind !== undefined

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
      // `runnable` narrows ast to a valid find query; the executor contract
      // takes the parsed AST, never the raw string.
      executorRef.current?.(ast as ParsedFindQuery)
        .then(result => { if (!cancelled) setStages(result.stages) })
        .catch(() => { if (!cancelled) setStages(undefined) })
    }, debounceMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ast, runnable, debounceMs])

  return runnable ? stages : undefined
}
