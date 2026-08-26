/**
 * useLibraryQueryState — URL ↔ WqlComposer query state for the Library route
 * (issue #833, decision #828; string-state rework for wayfinder ticket 013).
 *
 * Thin adapter over the shared `useComposerQueryState` core (the q round-trip
 * contract lives there). This module keeps the Library-specific parts:
 * the landing default (everything, past two weeks) and the legacy tri-state
 * deep-link migration from the #813 redirect matrix
 * (`?note=on&session=hide&post=hide`, plus `text` / `timePreset`), rewritten
 * to `q` once on mount with a history *replace* (no phantom back entry).
 */
import { useComposerQueryState, type ComposerQueryState } from './useComposerQueryState'

export type LibraryQueryState = ComposerQueryState

/** Library landing state: everything, past two weeks (the old panel default). */
export const DEFAULT_LIBRARY_QUERY = 'find:note last 2w'

const LEGACY_KEYS = ['note', 'session', 'post', 'text', 'timePreset', 'rangeStart', 'rangeEnd'] as const

/** Quote a filter value the way the grammar needs it (multi-word text). */
function textFilter(value: string): string {
  return /\s/.test(value) ? `text:"${value}"` : `text:${value}`
}

/** Map the #813 tri-state redirect params to a WQL query. Returns null when
 * no legacy key carries a value (nothing to migrate). */
export function legacyParamsToQuery(search: URLSearchParams): string | null {
  if (!LEGACY_KEYS.some(k => search.get(k))) return null

  // Tri-state: 'on'/'include'/'neutral' all leave the source visible; only
  // 'hide' removes it. Absent defaults to visible (the old panel default).
  const visible: string[] = []
  if ((search.get('note') ?? 'include') !== 'hide') visible.push('journal')
  if ((search.get('session') ?? 'include') !== 'hide') visible.push('collections')
  if ((search.get('post') ?? 'include') !== 'hide') visible.push('feeds')
  // A single visible source maps to its source: filter; anything else is all.
  const sourceFilter = visible.length === 1 ? `source:${visible[0]}` : null

  // Presets serialize as `last <preset>`; 'all' and the WQL-inexpressible
  // 'custom' both become an all-time window (no window clause).
  const preset = search.get('timePreset') ?? '2w'
  const window = preset === 'all' || preset === 'custom' ? null : `last ${preset}`

  const text = search.get('text')?.trim()
  const filters = [sourceFilter, text ? textFilter(text) : null].filter(Boolean)
  const braces = filters.length ? `{${filters.join(',')}}` : ''
  return [`find:note${braces}`, window].filter(Boolean).join(' ')
}

export function useLibraryQueryState(): LibraryQueryState {
  return useComposerQueryState({
    defaultQuery: () => DEFAULT_LIBRARY_QUERY,
    legacy: { keys: LEGACY_KEYS, toQuery: legacyParamsToQuery },
  })
}
