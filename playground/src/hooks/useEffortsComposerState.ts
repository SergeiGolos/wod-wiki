/**
 * useEffortsComposerState — URL ↔ WqlComposer clause state for the Efforts
 * catalog (`/efforts`).
 *
 * Thin adapter over the shared `useComposerQueryState` core, same contract
 * as the Library: the composed WQL round-trips through `q` (back/forward
 * restores the composer). The page's legacy params are migrated once on
 * mount (history *replace*):
 *   `?origin=bundled&discipline=strength` → origin/discipline clauses
 *   `?q=fran` (the old plain-text search)   → a text clause
 * A `q` that already parses as WQL is used as-is; one that doesn't and isn't
 * plain text surfaces the shared rejection banner.
 */
import { CLAUSE_META, type QueryClause } from '@/components/organisms/wql-composer'
import { useComposerQueryState, type ComposerQueryState } from './useComposerQueryState'

export type EffortsComposerState = ComposerQueryState

/** Efforts landing state: the whole registry, no time window (registry rows
 * carry no queryable creation date). */
export function defaultEffortsClauses(): QueryClause[] {
  return [{ id: 'c-source', type: 'source', ...CLAUSE_META.source, value: 'efforts' }]
}

const LEGACY_KEYS = ['origin', 'discipline'] as const

/** Apply legacy origin/discipline params on top of a clause list. */
function withLegacyFilters(clauses: QueryClause[], search: URLSearchParams): QueryClause[] {
  const origin = search.get('origin')
  if (origin && origin !== 'all') {
    clauses.push({ id: 'c-origin-0', type: 'origin', ...CLAUSE_META.origin, value: origin })
  }
  const discipline = search.get('discipline')?.trim()
  if (discipline) {
    clauses.push({ id: 'c-discipline-0', type: 'discipline', ...CLAUSE_META.discipline, value: discipline })
  }
  return clauses
}

/** The old plain-text `?q=` becomes a text clause (plus any legacy filters). */
function salvageLegacyQ(q: string, search: URLSearchParams): QueryClause[] | null {
  const text = q.trim()
  if (!text) return null
  // Anything that looks like an attempt at WQL is a genuine rejection, not a
  // legacy text search — let the banner report it.
  if (text.startsWith('find:') || text.includes('{') || text.includes('}')) return null
  return withLegacyFilters(
    [...defaultEffortsClauses(), { id: 'c-text-0', type: 'text', ...CLAUSE_META.text, value: text }],
    search,
  )
}

function legacyParamsToClauses(search: URLSearchParams): QueryClause[] | null {
  if (!LEGACY_KEYS.some(k => search.get(k))) return null
  return withLegacyFilters(defaultEffortsClauses(), search)
}

export function useEffortsComposerState(): EffortsComposerState {
  return useComposerQueryState({
    defaultClauses: defaultEffortsClauses,
    legacy: { keys: LEGACY_KEYS, toClauses: legacyParamsToClauses, salvageQ: salvageLegacyQ },
  })
}
