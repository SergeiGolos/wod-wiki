/**
 * useComposerQueryState — URL ↔ WqlComposer query state, shared core
 * (issue #833, decision #828; string-state rework for wayfinder ticket 013).
 *
 * The composer state IS the WQL string (the C6 AST's canonical form): the
 * `q` query parameter holds it verbatim, edits push a history entry (so
 * browser back/forward restores the exact query), and URL changes hydrate
 * the composer directly. No salvage parser is needed — the string round-
 * trips losslessly by construction, and the composer itself decides
 * pill-expressibility (unexpressible-but-valid queries ride its free-text
 * escape hatch).
 *
 * Consumed by QueriableStreamView stream profiles (Library/Collections/Feeds/Journal
 * legacy tri-state migration #813) and the Efforts catalog (`useEffortsComposerState`)
 * — so the seam is real.
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
import { parseQuery } from '@bitcobblers/wod-wiki-engine'

export interface ComposerQueryState {
  /** The composed WQL — the composer state (canonical text at rest). */
  query: string
  /** Edit the query; pushes `?q=` when the text actually changed. */
  setQuery: (wql: string) => void
  /** Set when the URL's `q` fails to parse — the query was rejected and the
   *  default took its place (#854). Cleared on the next edit or parseable
   *  `q`. */
  urlQueryError: string | null
}

export interface ComposerLegacyConfig {
  /** URL keys consumed by the migration (stripped afterwards). */
  keys: readonly string[]
  /** Map legacy URL params to a WQL query; null when nothing to migrate. */
  toQuery: (search: URLSearchParams) => string | null
  /**
   * Interpret an unparseable `q` as legacy state (e.g. the efforts page's
   * old plain-text `?q=fran`). Return the migrated query, or null to
   * surface the rejection banner instead.
   */
  salvageQ?: (q: string, search: URLSearchParams) => string | null
}

export interface ComposerQueryStateConfig {
  /** Landing state when no usable URL state exists. */
  defaultQuery: () => string
  legacy?: ComposerLegacyConfig
}

/** Rejection message for an unparseable `q`, with the parser's own detail. */
function urlQueryErrorFor(q: string): string | null {
  if (!q) return null
  const parsed = parseQuery(q)
  if (!parsed.error) return null
  return `Couldn't parse "${q}" — ${parsed.error}`
}

export function useComposerQueryState(config: ComposerQueryStateConfig): ComposerQueryState {
  // Config via ref: adapters pass inline literals; effects must not re-fire
  // on identity churn. The default/salvage functions themselves are pure.
  const configRef = useRef(config)
  configRef.current = config
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [query, setQueryState] = useState<string>(() => {
    const { defaultQuery: makeDefault, legacy } = configRef.current
    if (q) {
      const parsed = parseQuery(q)
      if (!parsed.error) return q
      return legacy?.salvageQ?.(q, searchParams) ?? makeDefault()
    }
    return legacy?.toQuery(searchParams) ?? makeDefault()
  })
  const [urlQueryError, setUrlQueryError] = useState<string | null>(() => {
    if (!q) return null
    if (!parseQuery(q).error) return null
    return configRef.current.legacy?.salvageQ?.(q, searchParams) ? null : urlQueryErrorFor(q)
  })
  const queryRef = useRef(query)
  queryRef.current = query
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  // One-time legacy migration: rewrite legacy params (or a salvaged legacy
  // `q`) as a WQL `q` (replace, so the migrated URL does not add a history
  // entry).
  const migratedRef = useRef(false)
  useEffect(() => {
    if (migratedRef.current) return
    migratedRef.current = true
    const { legacy } = configRef.current
    const search = searchParamsRef.current
    const current = search.get('q') ?? ''
    let migrated: string | null = null
    if (current) {
      if (parseQuery(current).error) migrated = legacy?.salvageQ?.(current, search) ?? null
    } else {
      migrated = legacy?.toQuery(search) ?? null
    }
    if (!migrated) return
    const next = new URLSearchParams(search)
    for (const key of legacy?.keys ?? []) next.delete(key)
    next.set('q', migrated)
    setSearchParams(next, { replace: true })
  }, [setSearchParams])

  // URL → query (back/forward, external navigation, migration). Content-
  // compared: echoes of our own setQuery pushes restore the same text and
  // are skipped, so a transient edit is never clobbered.
  const prevQRef = useRef(q)
  useEffect(() => {
    if (q === prevQRef.current) return
    prevQRef.current = q
    setUrlQueryError(urlQueryErrorFor(q))
    const restored = q && !parseQuery(q).error ? q : configRef.current.defaultQuery()
    setQueryState(current => (current === restored ? current : restored))
  }, [q])

  // Query → URL. Pushes a history entry only when the text actually changed
  // (a transient edit that re-emits the same text must not spam history).
  const setQuery = useCallback(
    (next: string) => {
      if (next !== queryRef.current) {
        const params = new URLSearchParams(searchParamsRef.current)
        params.set('q', next)
        setSearchParams(params)
      }
      setQueryState(next)
    },
    [setSearchParams],
  )

  return { query, setQuery, urlQueryError }
}
