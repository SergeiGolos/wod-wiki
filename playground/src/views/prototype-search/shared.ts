/**
 * Shared types + helpers for the search panel prototype.
 * The core shift: instead of tri-state toggles (include/hide/neutral
 * on all three sources simultaneously), the user picks ONE source
 * (Note | Session | Post). The panel then shows context-aware filters.
 */

export type SearchSource = 'note' | 'session' | 'post'

export interface FilterChip {
  key: string
  label: string
  value: string
}

export interface SearchState {
  source: SearchSource
  text: string
  filters: FilterChip[]
}

export const SOURCE_META: Record<SearchSource, { label: string; icon: string; color: string; description: string }> = {
  note: { label: 'Notes', icon: '📝', color: 'blue', description: 'Your journal entries' },
  session: { label: 'Sessions', icon: '💪', color: 'amber', description: 'Catalog workouts (CrossFit Girls, Dan John, …)' },
  post: { label: 'Posts', icon: '📅', color: 'violet', description: 'Dated feed programming' },
}

/** The scope that corresponds to a source — used to compose the WQL query. */
export const SOURCE_SCOPE: Record<SearchSource, string> = {
  note: 'journal',
  session: 'collections',
  post: 'feeds',
}

/** Compose a WQL query string from the search state. */
export function composeSearchWql(state: SearchState): string {
  const filterParts: string[] = []
  if (state.text.trim()) filterParts.push(`text:${state.text.trim()}`)
  for (const f of state.filters) {
    filterParts.push(`${f.key}:${f.value}`)
  }
  const filterStr = filterParts.length ? `{${filterParts.join(', ')}}` : ''
  return `find:note${filterStr} in ${SOURCE_SCOPE[state.source]}`.trim()
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  source: 'note',
  text: '',
  filters: [],
}
