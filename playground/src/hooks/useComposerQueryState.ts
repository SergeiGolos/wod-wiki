/**
 * useComposerQueryState — URL ↔ WqlComposer clause state, shared core
 * extracted from useLibraryQueryState (issue #833, decision #828).
 *
 * The composed WQL round-trips through the `q` query parameter: clause edits
 * compile to WQL and push a history entry (so browser back/forward restores
 * the exact composer state), and URL changes hydrate clauses back through
 * `wqlToClauses` — a salvage parser, so even WQL-invalid composer states
 * (e.g. a text clause with spaces) survive the round trip and keep their
 * diagnostics highlighting.
 *
 * Two adapters today — the Library (`useLibraryQueryState`, legacy tri-state
 * migration #813) and the Efforts catalog (legacy q/origin/discipline
 * migration) — so the seam is real.
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
  clausesToWql,
  wqlToClauses,
  type QueryClause,
} from '@bitcobblers/wod-wiki-ui'
import { parseQuery } from '@bitcobblers/wod-wiki-engine'

export interface ComposerQueryState {
  clauses: QueryClause[]
  setClauses: (next: QueryClause[]) => void
  /** Set when the URL's `q` could not be restored into composer clauses —
   *  the query was rejected and the default took its place (#854). Cleared
   *  on the next clause edit or restorable `q`. */
  urlQueryError: string | null
}

export interface ComposerQueryStateConfig {
  /** Landing state when no usable URL state exists. */
  defaultClauses: () => QueryClause[]
  legacy?: {
    /** URL keys consumed by the migration (stripped afterwards). */
    keys: readonly string[]
    /** Map legacy URL params to clauses; null when nothing to migrate. */
    toClauses: (search: URLSearchParams) => QueryClause[] | null
    /**
     * Interpret an unrestorable `q` as legacy state (e.g. the efforts page's
     * old plain-text `?q=fran`). Return clauses to migrate to, or null to
     * surface the rejection banner instead.
     */
    salvageQ?: (q: string, search: URLSearchParams) => QueryClause[] | null
  }
}

/** Rejection message for an unrestorable `q`, with the parser's own detail. */
function urlQueryErrorFor(q: string): string | null {
  if (!q) return null
  if (wqlToClauses(q)) return null
  const parsed = parseQuery(q)
  const detail = 'error' in parsed && parsed.error ? String(parsed.error) : 'not a find query'
  return `Couldn't parse "${q}" — ${detail}`
}

export function useComposerQueryState(config: ComposerQueryStateConfig): ComposerQueryState {
  // Config via ref: adapters pass inline literals; effects must not re-fire
  // on identity churn. The default/salvage functions themselves are pure.
  const configRef = useRef(config)
  configRef.current = config
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [clauses, setClausesState] = useState<QueryClause[]>(() => {
    const { defaultClauses: makeDefault, legacy } = configRef.current
    if (q) {
      const restored = wqlToClauses(q)
      if (restored) return restored
      return legacy?.salvageQ?.(q, searchParams) ?? makeDefault()
    }
    return legacy?.toClauses(searchParams) ?? makeDefault()
  })
  const [urlQueryError, setUrlQueryError] = useState<string | null>(() =>
    q && !wqlToClauses(q) && !configRef.current.legacy?.salvageQ?.(q, searchParams) ? urlQueryErrorFor(q) : null,
  )
  const clausesRef = useRef(clauses)
  clausesRef.current = clauses
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  // One-time legacy migration: rewrite legacy params (or a salvaged legacy
  // `q`) as a composed WQL `q` (replace, so the migrated URL does not add a
  // history entry).
  const migratedRef = useRef(false)
  useEffect(() => {
    if (migratedRef.current) return
    migratedRef.current = true
    const { legacy } = configRef.current
    const search = searchParamsRef.current
    const current = search.get('q') ?? ''
    let migrated: QueryClause[] | null = null
    if (current) {
      if (!wqlToClauses(current)) migrated = legacy?.salvageQ?.(current, search) ?? null
    } else {
      migrated = legacy?.toClauses(search) ?? null
    }
    if (!migrated) return
    const next = new URLSearchParams(search)
    for (const key of legacy?.keys ?? []) next.delete(key)
    next.set('q', clausesToWql(migrated))
    setSearchParams(next, { replace: true })
  }, [setSearchParams])

  // URL → clauses (back/forward, external navigation, migration). Content-
  // compared: echoes of our own setClauses pushes restore to the same WQL
  // and are skipped, so transient empty-valued clauses are never clobbered.
  const prevQRef = useRef(q)
  useEffect(() => {
    if (q === prevQRef.current) return
    prevQRef.current = q
    setUrlQueryError(urlQueryErrorFor(q))
    const restored = q
      ? wqlToClauses(q) ?? configRef.current.defaultClauses()
      : configRef.current.defaultClauses()
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
