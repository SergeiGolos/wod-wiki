/**
 * streamProfile — profile contract and presets for QueriableStreamView (Ticket 003).
 *
 * Encapsulates the routing, default WQL query, entity level, and presentation
 * metadata for each unified stream route (/journal, /collections, /feeds,
 * /library, /efforts, /results).
 */
import type { EntityLevel } from '../../lib/fieldProjection'
import { EFFORTS_LEGACY_CONFIG } from '../../hooks/useEffortsComposerState'
import type { ComposerLegacyConfig } from '../../hooks/useComposerQueryState'
import type { WqlFindTarget, WqlSourceValue } from '@bitcobblers/wod-wiki-engine'
import { noteByIdPath, playgroundPath, sessionDetailPath } from '../../lib/routes'
import type { MenuSpec } from '../../nav/menuModel'

export function cleanRoutePath(route: string): string {
  return route.endsWith('/') && route.length > 1 ? route.slice(0, -1) : route
}

export interface StreamProfile {
  /** Route path matching this stream (e.g. '/journal', '/library', '/efforts'). */
  route: string
  /** Default canonical WQL query loaded when no query param is present. */
  defaultWql: string
  /** Active entity level for field projection and view settings. */
  level: EntityLevel
  /** Canonical find target (singular WQL_FIND_TARGETS value) this surface
   *  queries — kind is always `find` on stream surfaces. */
  target: WqlFindTarget
  /** Canonical Where-stored scope favorites (WQL_SOURCE_VALUES subset) the
   *  header query bar presets/prioritizes. Favorites reorder choices — they
   *  never define grammar validity: every canonical scope stays reachable
   *  and free text queries are unaffected. Empty = no predefined options —
   *  the route nudges for a pick but never blocks. Replaces the old
   *  plural-noun typeOptions vocabulary (notes/blocks/efforts were targets,
   *  not scopes). */
  scopeOptions: readonly WqlSourceValue[]
  /** When true, renders the undated Sessions shelf alongside the dated stream. */
  shelfVisible?: boolean
  /** Optional message displayed when query yields zero results. */
  emptyMessage?: string
  /** The surface's own secondary rail (zone 4) — composition seam for the
   *  view variations rebranded under different routes. AppContent renders it
   *  instead of any page-level constant. */
  secondary?: MenuSpec
  /** Display name for breadcrumbs/crumbs — `routeView.deriveWorkout` reads
   *  it instead of keeping its own route-name map. */
  title?: string
  /** Legacy parameter and salvage configuration for URL migration. */
  legacy?: StreamProfileLegacyConfig
}

export type StreamProfileLegacyConfig = ComposerLegacyConfig

export function createContentLegacyConfig(defaultSource?: string): StreamProfileLegacyConfig {
  const keys = ['note', 'session', 'post', 'text', 'timePreset', 'rangeStart', 'rangeEnd', 's', 'tags', 'mode'] as const
  return {
    keys,
    toQuery(search: URLSearchParams): string | null {
      const hasAnyLegacy = keys.some(k => search.has(k))
      if (!hasAnyLegacy) return null

      let sourceFilter: string | null = null
      const hasTriState = search.has('note') || search.has('session') || search.has('post')
      if (hasTriState) {
        const visible: string[] = []
        if ((search.get('note') ?? 'include') !== 'hide') visible.push('journal')
        if ((search.get('session') ?? 'include') !== 'hide') visible.push('collections')
        // `post` mapped to the feeds storage scope — excised from WQL, so it
        // no longer narrows the migrated query.
        if (visible.length === 1) {
          sourceFilter = `source:${visible[0]}`
        }
      } else if (defaultSource) {
        sourceFilter = `source:${defaultSource}`
      }

      const preset = search.get('timePreset') ?? '2w'
      const window = preset === 'all' || preset === 'custom' ? null : `last ${preset}`

      const text = search.get('text')?.trim()
      const tags = search.get('tags')?.trim()
      const textClause = text ? (/\s/.test(text) ? `text:"${text}"` : `text:${text}`) : null
      const tagsClause = tags ? `tags:${tags}` : null

      const filters = [sourceFilter, textClause, tagsClause].filter(Boolean)
      const braces = filters.length ? `{${filters.join(',')}}` : ''
      return [`:note${braces}`, window].filter(Boolean).join(' ')
    },
  }
}

/** Shared recent-entries rail — the dated-note listing the content streams
 *  have always shown. Sessions and playgrounds declare their own instead. */
const RECENT_ENTRIES_MENU: MenuSpec = [
  {
    kind: 'wql',
    id: 'recent-entries',
    label: 'Recent entries',
    query: ':note{}',
    limit: 6,
    filterEntry: e => !!e.date,
    toEntry: e => noteByIdPath(e.id),
  },
]

export const JOURNAL_STREAM_PROFILE: StreamProfile = {
  route: '/journal',
  title: 'Journal',
  defaultWql: ':journal{} last 4w',
  level: 'note',
  target: 'note',
  scopeOptions: ['journal'],
  secondary: RECENT_ENTRIES_MENU,
  legacy: createContentLegacyConfig('journal'),
}

export const COLLECTIONS_STREAM_PROFILE: StreamProfile = {
  route: '/collections',
  title: 'Collections',
  defaultWql: ':collection{} by {tag}',
  level: 'session',
  target: 'note',
  scopeOptions: ['collections'],
  shelfVisible: false,
  secondary: RECENT_ENTRIES_MENU,
  legacy: createContentLegacyConfig('collections'),
}

export const FEEDS_STREAM_PROFILE: StreamProfile = {
  route: '/feeds',
  title: 'Feeds',
  // Feeds is excised from WQL storage scopes: the route keeps reading feed
  // notes, but its query uses the generic note head (no feed scope filter).
  defaultWql: ':note{} last 2w',
  level: 'note',
  target: 'note',
  scopeOptions: ['collections'],
  secondary: RECENT_ENTRIES_MENU,
  // No default source: `source:feeds` is no longer valid WQL.
  legacy: createContentLegacyConfig(),
}

export const LIBRARY_STREAM_PROFILE: StreamProfile = {
  route: '/library',
  title: 'Library',
  // The library landing surfaces the collection listing (not the journal
  // stream); `?q=` deep links still override the default explicitly.
  defaultWql: ':collection{} last 4w',
  level: 'note',
  target: 'note',
  // Storage scopes minus the excised feeds; the old `notes`/`blocks` entries
  // were the bare note head and a different target, not scopes, so they don't
  // carry over.
  scopeOptions: ['journal', 'collections', 'guides', 'playground'],
  shelfVisible: true,
  secondary: RECENT_ENTRIES_MENU,
  legacy: createContentLegacyConfig(),
}

export const EFFORTS_STREAM_PROFILE: StreamProfile = {
  route: '/efforts',
  title: 'Efforts',
  defaultWql: ':effort',
  level: 'effort',
  target: 'effort',
  scopeOptions: [],
  emptyMessage: 'No efforts match your search.',
  secondary: RECENT_ENTRIES_MENU,
  legacy: EFFORTS_LEGACY_CONFIG,
}

export const SESSIONS_STREAM_PROFILE: StreamProfile = {
  route: '/sessions',
  title: 'Sessions',
  defaultWql: ':session{} last 4w',
  level: 'result',
  target: 'session',
  scopeOptions: [],
  emptyMessage: 'No completed session results recorded in this period.',
  secondary: [
    {
      kind: 'wql',
      id: 'recent-sessions',
      label: 'Recent sessions',
      query: ':session{} last 2w',
      limit: 6,
      toEntry: e => sessionDetailPath(e.id),
    },
  ],
}

export const PLAYGROUNDS_STREAM_PROFILE: StreamProfile = {
  route: '/playgrounds',
  title: 'Playgrounds',
  defaultWql: ':playground{} last 4w',
  level: 'note',
  target: 'note',
  scopeOptions: ['playground'],
  shelfVisible: true,
  secondary: [
    {
      kind: 'wql',
      id: 'recent-playgrounds',
      label: 'Recent playground pages',
      query: ':playground{} last 2w',
      limit: 6,
      toEntry: e => playgroundPath(e.sourceItem),
    },
  ],
  legacy: createContentLegacyConfig('playground'),
}

/** /session/:date — the sessions recorded on one date. */
export function createSessionDateProfile(date: string): StreamProfile {
  return {
    route: `/session/${date}`,
    defaultWql: `:session{} from ${date} to ${date}`,
    level: 'result',
    target: 'session',
    scopeOptions: [],
    emptyMessage: `No session results recorded on ${date}.`,
  }
}

export function createResultDetailProfile(resultId: string): StreamProfile {
  return {
    route: `/sessions/${resultId}`,
    defaultWql: `:session{result:${resultId}, plane:segment}`,
    level: 'segment',
    target: 'session',
    scopeOptions: [],
    emptyMessage: `No segment records found for result ${resultId}.`,
  }
}

const PROFILES_BY_ROUTE: Record<string, StreamProfile> = {
  '/journal': JOURNAL_STREAM_PROFILE,
  '/collections': COLLECTIONS_STREAM_PROFILE,
  '/feeds': FEEDS_STREAM_PROFILE,
  '/feed': FEEDS_STREAM_PROFILE,
  '/library': LIBRARY_STREAM_PROFILE,
  '/efforts': EFFORTS_STREAM_PROFILE,
  '/sessions': SESSIONS_STREAM_PROFILE,
  '/playgrounds': PLAYGROUNDS_STREAM_PROFILE,
}

export function getStreamProfile(route: string): StreamProfile | undefined {
  const clean = cleanRoutePath(route)
  const exact = PROFILES_BY_ROUTE[clean]
  if (exact) return exact

  if (clean.startsWith('/sessions/')) {
    const sessionId = clean.slice('/sessions/'.length)
    if (sessionId) {
      return createResultDetailProfile(sessionId)
    }
  }

  if (clean.startsWith('/session/')) {
    const date = clean.slice('/session/'.length)
    if (date) {
      return createSessionDateProfile(date)
    }
  }

  return undefined
}

export function resolveStreamProfile(route: string): StreamProfile {
  return getStreamProfile(route) ?? LIBRARY_STREAM_PROFILE
}

/**
 * Display title for an exact stream route — `routeView.deriveWorkout` reads
 * this instead of a parallel route-name map.
 */
export function streamRouteTitle(pathname: string): string | undefined {
  return PROFILES_BY_ROUTE[cleanRoutePath(pathname)]?.title
}

/**
 * Stream-surface membership — the single registry `routeView` consults when
 * classifying a pathname as a list surface. Covers every profile route plus
 * the dynamic detail/date routes; legacy `/results*` paths classify too (the
 * router redirects them, but this function stays pure on the pathname).
 */
export function isStreamRoute(pathname: string): boolean {
  const clean = cleanRoutePath(pathname)
  if (PROFILES_BY_ROUTE[clean]) return true

  if (clean.startsWith('/sessions/')) return clean.slice('/sessions/'.length) !== ''
  if (clean.startsWith('/session/')) return clean.slice('/session/'.length) !== ''
  if (clean === '/results' || clean === '/results/segments') return true
  if (clean.startsWith('/results/')) return true

  return false
}
