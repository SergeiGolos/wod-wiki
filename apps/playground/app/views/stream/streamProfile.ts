/**
 * streamProfile — profile contract and presets for QueriableStreamView (Ticket 003).
 *
 * Encapsulates the routing, default WQL query, entity level, and presentation
 * metadata for each unified stream route (/journal, /collections, /feeds,
 * /library, /efforts, /results).
 */
import type { ReactNode } from 'react'
import type { EntityLevel } from '../../lib/fieldProjection'
import { EFFORTS_LEGACY_CONFIG } from '../../hooks/useEffortsComposerState'
import type { ComposerLegacyConfig } from '../../hooks/useComposerQueryState'

export function cleanRoutePath(route: string): string {
  return route.endsWith('/') && route.length > 1 ? route.slice(0, -1) : route
}

export interface StreamProfile {
  /** Route path matching this stream (e.g. '/journal', '/library', '/efforts'). */
  route: string
  /** Header title displayed in StickyPageHeader. */
  title: string
  /** Subtitle or dynamic subtitle builder. */
  subtitle?: string | ((wql: string, scope?: string) => ReactNode)
  /** Default canonical WQL query loaded when no query param is present. */
  defaultWql: string
  /** Active entity level for field projection and view settings. */
  level: EntityLevel
  /** Source-plane options the header query bar's type selector offers
   * (wqlEdits vocabulary: notes/journal/collections/feeds/blocks/efforts/
   * rows). A single-entry list locks the route to that data type — the
   * selector still renders, stating what the page returns. */
  typeOptions: readonly string[]
  /** When true, renders the undated Sessions shelf alongside the dated stream. */
  shelfVisible?: boolean
  /** Optional message displayed when query yields zero results. */
  emptyMessage?: string
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
        if ((search.get('post') ?? 'include') !== 'hide') visible.push('feeds')
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
      return [`find:note${braces}`, window].filter(Boolean).join(' ')
    },
  }
}

export const JOURNAL_STREAM_PROFILE: StreamProfile = {
  route: '/journal',
  title: 'Journal',
  subtitle: 'Your training log — notes and results from every session.',
  defaultWql: 'find:note{source:journal} last 2w',
  level: 'note',
  typeOptions: ['journal'],
  legacy: createContentLegacyConfig('journal'),
}

export const COLLECTIONS_STREAM_PROFILE: StreamProfile = {
  route: '/collections',
  title: 'Collections',
  subtitle: 'Curated workout collections, ready to run or add to today.',
  defaultWql: 'find:note{source:collections} last 2w',
  level: 'session',
  typeOptions: ['collections'],
  shelfVisible: true,
  legacy: createContentLegacyConfig('collections'),
}

export const FEEDS_STREAM_PROFILE: StreamProfile = {
  route: '/feeds',
  title: 'Feeds',
  subtitle: 'Programming feeds you follow, newest first.',
  defaultWql: 'find:note{source:feeds} last 2w',
  level: 'note',
  typeOptions: ['feeds'],
  legacy: createContentLegacyConfig('feeds'),
}

export const LIBRARY_STREAM_PROFILE: StreamProfile = {
  route: '/library',
  title: 'Library',
  subtitle: 'Notes, collections, and feeds — one query over everything.',
  defaultWql: 'find:note last 2w',
  level: 'note',
  typeOptions: ['notes', 'journal', 'collections', 'feeds', 'blocks'],
  shelfVisible: true,
  legacy: createContentLegacyConfig(),
}

export const EFFORTS_STREAM_PROFILE: StreamProfile = {
  route: '/efforts',
  title: 'Efforts',
  subtitle: 'Catalog of registered movements, benchmarks, and standards.',
  defaultWql: 'find:effort',
  level: 'effort',
  typeOptions: ['efforts'],
  emptyMessage: 'No matching movements or efforts found.',
  legacy: EFFORTS_LEGACY_CONFIG,
}

export const RESULTS_STREAM_PROFILE: StreamProfile = {
  route: '/results',
  title: 'Results',
  subtitle: 'Chronological stream of completed workouts and execution telemetry.',
  defaultWql: 'rows:all{} last 4w',
  level: 'result',
  typeOptions: ['rows'],
  emptyMessage: 'No completed session results recorded in this period.',
}

export const SEGMENTS_STREAM_PROFILE: StreamProfile = {
  route: '/results/segments',
  title: 'Segments',
  subtitle: 'Interval split progression and round-by-round pacing history.',
  defaultWql: 'rows:segment{} last 8w',
  level: 'segment',
  typeOptions: ['rows'],
  emptyMessage: 'No interval or segment splits recorded in this period.',
}

export function createResultDetailProfile(resultId: string): StreamProfile {
  return {
    route: `/results/${resultId}`,
    title: 'Session Result',
    subtitle: 'Detailed tabular breakdown of rounds, intervals, and lap splits.',
    defaultWql: `rows:segment{result:${resultId}}`,
    level: 'segment',
    typeOptions: ['rows'],
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
  '/results': RESULTS_STREAM_PROFILE,
  '/results/segments': SEGMENTS_STREAM_PROFILE,
}

export function getStreamProfile(route: string): StreamProfile | undefined {
  const clean = cleanRoutePath(route)
  const exact = PROFILES_BY_ROUTE[clean]
  if (exact) return exact

  if (clean.startsWith('/results/')) {
    const resultId = clean.slice('/results/'.length)
    if (resultId) {
      return createResultDetailProfile(resultId)
    }
  }

  return undefined
}

export function resolveStreamProfile(route: string): StreamProfile {
  return getStreamProfile(route) ?? LIBRARY_STREAM_PROFILE
}
