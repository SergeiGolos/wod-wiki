/**
 * useExplorerQueryState — URL ↔ WqlComposer clause state for the Analytics
 * Explorer route (`/analytics/explorer`, issue #839), with a run-on-submit
 * split on top of the #833 library pattern.
 *
 * Two tracked values:
 *   - `?q=` mirrors the LIVE composer draft: every WQL-changing clause edit
 *     pushes a history entry, so browser back/forward restores the exact
 *     composer state. URL changes hydrate clauses back through
 *     `wqlToClauses` (a salvage parser — WQL-invalid composer states survive
 *     the round trip and keep their diagnostics highlighting).
 *   - `submitted` is the last-run query snapshot. It alone gates the page's
 *     run effect (runQuery/runFind dispatch) and the post-run telemetry
 *     (PipelineAnatomy); editing the draft never re-runs. A popstate restore
 *     re-submits the restored query — the legacy behavior where back/forward
 *     re-ran what it restored.
 *
 * `?weeks=` (the analytics range) is managed here too — router-native, like
 * `q` — so a single history mechanism owns the explorer URL. The nuqs
 * react-router adapter writes through the *global* `history.pushState` and
 * recomposes the query string from its own tracked params; mixing it with
 * router writes on the same route lets either side silently drop the other's
 * params (the global-location coupling called out in #833). The dashboard
 * keeps its nuqs hooks untouched; the unit preference is localStorage-based
 * and unaffected.
 *
 * Deep links carrying WQL the clause model cannot restore (e.g. negated
 * `!tags:x` filters — `wqlToClauses` returns null) still RUN: `submitted`
 * hydrates from the raw `q` string, only the composer falls back to defaults.
 */
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clausesToWql,
  defaultMetricsClauses,
  wqlToClauses,
  type QueryClause,
} from '@/components/organisms/wql-composer'

/** Range options offered by the explorer UI (single source for the domain). */
export const EXPLORER_RANGE_OPTIONS = [4, 8, 16] as const
export type ExplorerRangeWeeks = (typeof EXPLORER_RANGE_OPTIONS)[number]
export const DEFAULT_EXPLORER_WEEKS: ExplorerRangeWeeks = 16

export interface ExplorerQueryState {
  /** Live composer draft (controlled clauses for WqlComposer). */
  clauses: QueryClause[]
  /** Edit the draft; pushes `?q=` when the composed WQL actually changed. */
  setClauses: (next: QueryClause[]) => void
  /** The composed draft WQL (drives the live parse / draft anatomy). */
  draft: string
  /** The last submitted query (gates the run effect and post-run telemetry). */
  submitted: string
  /** Mark a query as run. Defaults to the current draft. */
  submit: (wql?: string) => void
  /** Analytics range in weeks (from `?weeks=`, default 16). */
  weeks: ExplorerRangeWeeks
  /** Set the analytics range (history replace — a view preference, not navigation). */
  setWeeks: (weeks: ExplorerRangeWeeks) => void
}
/** Explorer landing state: metrics plane with `sum:totalVolume` seeded — a
 * valid, parseable draft (issue #897: the old empty-metric default compiled
 * to `sum:`, which surfaced a parser error on first visit). Submitted state
 * still starts empty, so nothing runs until the user submits. */
export function defaultExplorerClauses(): QueryClause[] {
  return defaultMetricsClauses().map(c =>
    c.type === 'metric' ? { ...c, value: 'totalVolume' } : c,
  )
}

function parseWeeks(raw: string | null): ExplorerRangeWeeks {
  const n = Number.parseInt(raw ?? '', 10)
  return (EXPLORER_RANGE_OPTIONS as readonly number[]).includes(n) ? (n as ExplorerRangeWeeks) : DEFAULT_EXPLORER_WEEKS
}

function restoreClauses(q: string): QueryClause[] {
  return (q ? wqlToClauses(q) : null) ?? defaultExplorerClauses()
}

export function useExplorerQueryState(): ExplorerQueryState {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const weeks = parseWeeks(searchParams.get('weeks'))

  const [clauses, setClausesState] = useState<QueryClause[]>(() => restoreClauses(q))
  const [submitted, setSubmitted] = useState(q)

  const clausesRef = useRef(clauses)
  clausesRef.current = clauses
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const draft = useMemo(() => clausesToWql(clauses), [clauses])
  const draftRef = useRef(draft)
  draftRef.current = draft

  // URL → clauses + submitted (back/forward, external navigation). Content-
  // compared: echoes of our own setClauses pushes restore to the same WQL and
  // are skipped — they are edits, not submissions, and must neither clobber
  // transient empty-valued clauses nor re-run the query.
  const prevQRef = useRef(q)
  useEffect(() => {
    if (q === prevQRef.current) return
    prevQRef.current = q
    const restored = restoreClauses(q)
    if (clausesToWql(clausesRef.current) === clausesToWql(restored)) return
    setClausesState(restored)
    // An external URL change re-runs what it restored (legacy behavior).
    setSubmitted(q)
  }, [q])

  // Clauses → URL. Pushes a history entry only when the composed WQL actually
  // changed (adding a still-empty clause must not spam history).
  const setClauses = useCallback(
    (next: QueryClause[]) => {
      const wql = clausesToWql(next)
      if (wql !== clausesToWql(clausesRef.current)) {
        const params = new URLSearchParams(searchParamsRef.current)
        params.set('q', wql)
        setSearchParams(params)
      }
      setClausesState(next)
    },
    [setSearchParams],
  )

  const submit = useCallback((wql?: string) => {
    setSubmitted(wql ?? draftRef.current)
  }, [])

  const setWeeks = useCallback(
    (next: ExplorerRangeWeeks) => {
      const params = new URLSearchParams(searchParamsRef.current)
      params.set('weeks', String(next))
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  return { clauses, setClauses, draft, submitted, submit, weeks, setWeeks }
}
