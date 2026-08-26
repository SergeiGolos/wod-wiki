/**
 * useExplorerQueryState — URL ↔ WqlComposer query state for the Analytics
 * Explorer route (`/analytics/explorer`, issue #839), with a run-on-submit
 * split on top of the #833 library pattern. String-state rework for
 * wayfinder ticket 013: the draft IS the `?q=` text — no salvage parser,
 * no lossiness; the composer handles pill-expressibility itself.
 *
 * Two tracked values:
 *   - `?q=` mirrors the LIVE composer draft: every WQL-changing edit pushes
 *     a history entry, so browser back/forward restores the exact query.
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
 * Deep links carrying WQL the pill model cannot express (e.g. negated
 * `!tags:x` filters) still RUN: `submitted` hydrates from the raw `q`
 * string, and the composer renders them through its free-text escape hatch.
 */
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { parseQuery } from '@bitcobblers/wod-wiki-engine'

/** Range options offered by the explorer UI (single source for the domain). */
export const EXPLORER_RANGE_OPTIONS = [4, 8, 16] as const
export type ExplorerRangeWeeks = (typeof EXPLORER_RANGE_OPTIONS)[number]
export const DEFAULT_EXPLORER_WEEKS: ExplorerRangeWeeks = 16

export interface ExplorerQueryState {
  /** Live composer draft WQL (the composer's controlled `query` prop). */
  draft: string
  /** Edit the draft; pushes `?q=` when the text actually changed. */
  setDraft: (wql: string) => void
  /** The last submitted query (gates the run effect and post-run telemetry). */
  submitted: string
  /** Mark a query as run. Defaults to the current draft. */
  submit: (wql?: string) => void
  /** Analytics range in weeks (from `?weeks=`, default 16). */
  weeks: ExplorerRangeWeeks
  /** Set the analytics range (history replace — a view preference, not navigation). */
  setWeeks: (weeks: ExplorerRangeWeeks) => void
}

/** Explorer landing state: a valid, parseable aggregate draft (issue #897:
 * the old empty-metric default compiled to `sum:`, which surfaced a parser
 * error on first visit). Submitted state still starts empty, so nothing
 * runs until the user submits. */
export const DEFAULT_EXPLORER_QUERY = 'sum:totalVolume{}'

function parseWeeks(raw: string | null): ExplorerRangeWeeks {
  const n = Number.parseInt(raw ?? '', 10)
  return (EXPLORER_RANGE_OPTIONS as readonly number[]).includes(n) ? (n as ExplorerRangeWeeks) : DEFAULT_EXPLORER_WEEKS
}

export function useExplorerQueryState(): ExplorerQueryState {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const weeks = parseWeeks(searchParams.get('weeks'))

  const [draft, setDraftState] = useState<string>(() => (q && !parseQuery(q).error ? q : DEFAULT_EXPLORER_QUERY))
  const [submitted, setSubmitted] = useState(q)

  const draftRef = useRef(draft)
  draftRef.current = draft
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  // URL → draft + submitted (back/forward, external navigation). Content-
  // compared: echoes of our own setDraft pushes restore the same text and
  // are skipped — they are edits, not submissions, and must neither clobber
  // a transient edit nor re-run the query.
  const prevQRef = useRef(q)
  useEffect(() => {
    if (q === prevQRef.current) return
    prevQRef.current = q
    if (draftRef.current === q) return
    setDraftState(q && !parseQuery(q).error ? q : DEFAULT_EXPLORER_QUERY)
    // An external URL change re-runs what it restored (legacy behavior).
    setSubmitted(q)
  }, [q])

  // Draft → URL. Pushes a history entry only when the text actually changed.
  const setDraft = useCallback(
    (next: string) => {
      if (next !== draftRef.current) {
        const params = new URLSearchParams(searchParamsRef.current)
        params.set('q', next)
        setSearchParams(params)
      }
      setDraftState(next)
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

  return { draft, setDraft, submitted, submit, weeks, setWeeks }
}
