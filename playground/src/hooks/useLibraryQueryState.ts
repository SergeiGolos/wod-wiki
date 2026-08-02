/**
 * useLibraryQueryState — URL ↔ WqlComposer clause state for the Library route
 * (issue #833, decision #828).
 *
 * Thin adapter over the shared `useComposerQueryState` core (the q round-trip
 * contract lives there). This module keeps the Library-specific parts:
 * the landing default (everything, past two weeks) and the legacy tri-state
 * deep-link migration from the #813 redirect matrix
 * (`?note=on&session=hide&post=hide`, plus `text` / `timePreset`), rewritten
 * to `q` once on mount with a history *replace* (no phantom back entry).
 */
import {
  CLAUSE_META,
  type QueryClause,
} from '@/components/organisms/wql-composer'
import { useComposerQueryState, type ComposerQueryState } from './useComposerQueryState'

export type LibraryQueryState = ComposerQueryState

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
  return useComposerQueryState({
    defaultClauses: defaultLibraryClauses,
    legacy: { keys: LEGACY_KEYS, toClauses: legacyParamsToClauses },
  })
}
