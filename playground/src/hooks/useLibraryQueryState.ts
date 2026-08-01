/**
 * useLibraryQueryState — URL ↔ WqlComposer clause state for the Library route
 * (issue #833, decision #828).
 *
 * The composed WQL round-trips through the `q` query parameter: clause edits
 * compile to WQL and push a history entry (so browser back/forward restores
 * the exact composer state), and URL changes hydrate clauses back through
 * `wqlToClauses` — a salvage parser, so even WQL-invalid composer states
 * (e.g. a text clause with spaces) survive the round trip and keep their
 * diagnostics highlighting.
 *
 * Legacy tri-state deep links from the #813 redirect matrix
 * (`?note=on&session=hide&post=hide`, plus `text` / `timePreset`) are migrated
 * once on mount: mapped to an equivalent clause set, rewritten to `q` with a
 * history *replace* (no phantom back entry), and the legacy keys removed.
 * Non-legacy params are preserved untouched.
 *
 * Implementation note: this hook deliberately uses react-router's
 * `useSearchParams` rather than nuqs (the app-wide pattern elsewhere). The
 * nuqs react-router adapter reads and writes the *global* `location` /
 * `history` directly — invisible to the router in tests (jsdom +
 * MemoryRouter) and bypassing router listeners on shallow pushes — which
 * makes the required back/forward contract unimplementable through it.
 */
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CLAUSE_META,
  clausesToWql,
  wqlToClauses,
  type QueryClause,
} from '@/components/organisms/wql-composer'
import { parseQuery } from '@/services/analytics/query/wql'

export interface LibraryQueryState {
  clauses: QueryClause[]
  setClauses: (next: QueryClause[]) => void
  /** Set when the URL's `q` could not be restored into composer clauses —
   *  the query was rejected and the default took its place (#854). Cleared
   *  on the next clause edit or restorable `q`. */
  urlQueryError: string | null
}

/** Rejection message for an unrestorable `q`, with the parser's own detail. */
function urlQueryErrorFor(q: string): string | null {
  if (!q) return null
  if (wqlToClauses(q)) return null
  const parsed = parseQuery(q)
  const detail = 'error' in parsed && parsed.error ? String(parsed.error) : 'not a find query'
  return `Couldn't parse "${q}" — ${detail}`
}

/** Library landing state: everything, past two weeks (the old panel default). */
export function defaultLibraryClauses(): QueryClause[] {
  return [
    { id: 'c-source', type: 'source', ...CLAUSE_META.source, value: 'notes' },
    { id: 'c-time', type: 'time', ...CLAUSE_META.time, value: 'last 2w' },
  ]
}

const LEGACY_KEYS = ['note', 'session', 'post', 'text', 'timePreset', 'rangeStart', 'rangeEnd'] as const

/** Map the #813 tri-state redirect params to composer clauses. Returns null
 * when no legacy key carries a value (nothing to migrate). */
export function legacyParamsToClauses(search: URLSearchParams): QueryClause[] | null {
  if (!LEGACY_KEYS.some(k => search.get(k))) return null

  // Tri-state: 'on'/'include'/'neutral' all leave the source visible; only
  // 'hide' removes it. Absent defaults to visible (the old panel default).
  const visible: string[] = []
  if ((search.get('note') ?? 'include') !== 'hide') visible.push('journal')
  if ((search.get('session') ?? 'include') !== 'hide') visible.push('collections')
  if ((search.get('post') ?? 'include') !== 'hide') visible.push('feeds')
  // A single visible source maps to its source value; anything else is 'notes'.
  const source = visible.length === 1 ? visible[0] : 'notes'

  // Presets serialize as `last <preset>`; 'all' and the WQL-inexpressible
  // 'custom' both become an all-time window.
  const preset = search.get('timePreset') ?? '2w'
  const time = preset === 'all' || preset === 'custom' ? 'all' : `last ${preset}`

  const clauses = defaultLibraryClauses().map(c =>
    c.type === 'source' ? { ...c, value: source } : c.type === 'time' ? { ...c, value: time } : c,
  )
  const text = search.get('text')?.trim()
  if (text) clauses.push({ id: 'c-text-0', type: 'text', ...CLAUSE_META.text, value: text })
  return clauses
}

export function useLibraryQueryState(): LibraryQueryState {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [clauses, setClausesState] = useState<QueryClause[]>(() =>
    q
      ? wqlToClauses(q) ?? defaultLibraryClauses()
      : legacyParamsToClauses(searchParams) ?? defaultLibraryClauses(),
  )
  const [urlQueryError, setUrlQueryError] = useState<string | null>(() => urlQueryErrorFor(q))
  const clausesRef = useRef(clauses)
  clausesRef.current = clauses
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  // One-time legacy migration: rewrite tri-state params as `q` (replace, so
  // the migrated URL does not add a history entry).
  const migratedRef = useRef(false)
  useEffect(() => {
    if (migratedRef.current) return
    migratedRef.current = true
    if (q) return
    const legacy = legacyParamsToClauses(searchParamsRef.current)
    if (!legacy) return
    const next = new URLSearchParams(searchParamsRef.current)
    for (const key of LEGACY_KEYS) next.delete(key)
    next.set('q', clausesToWql(legacy))
    setSearchParams(next, { replace: true })
  }, [setSearchParams, q])

  // URL → clauses (back/forward, external navigation, migration). Content-
  // compared: echoes of our own setClauses pushes restore to the same WQL
  // and are skipped, so transient empty-valued clauses are never clobbered.
  const prevQRef = useRef(q)
  useEffect(() => {
    if (q === prevQRef.current) return
    prevQRef.current = q
    setUrlQueryError(urlQueryErrorFor(q))
    const restored = q ? wqlToClauses(q) ?? defaultLibraryClauses() : defaultLibraryClauses()
    setClausesState(current =>
      clausesToWql(current) === clausesToWql(restored) ? current : restored,
    )
  }, [q])

  // Clauses → URL. Pushes a history entry only when the composed WQL
  // actually changed (adding a still-empty clause must not spam history).
  const setClauses = useCallback(
    (next: QueryClause[]) => {
      const wql = clausesToWql(next)
      if (wql !== clausesToWql(clausesRef.current)) {
        const params = new URLSearchParams(searchParamsRef.current)
        params.set('q', wql)
        setSearchParams(params)
      }
      setUrlQueryError(null)
      setClausesState(next)
    },
    [setSearchParams],
  )

  return { clauses, setClauses, urlQueryError }
}
