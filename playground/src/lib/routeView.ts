/**
 * routeView — pure route classification + view derivation.
 *
 * Turns a pathname (plus URL params and injected data) into a {@link RouteView}:
 * the route-family flags, the current workout, and the page nav links. No React,
 * no I/O — so URL → view classification is unit-testable directly.
 *
 * Phase 1 (this file): the derivations move verbatim out of `AppContent`'s two
 * `useMemo` bodies; `AppContent`'s render ternary still consumes the flags.
 * Phase 2 collapses the flags into a `{ page, shell, props }` descriptor.
 * See docs/adr/app-route-view.md.
 */
import type { PageNavLink } from '@/components/organisms/layout/PageNavDropdown'
import type { WorkoutResult } from '@/types/storage'
import type { WorkoutItem } from './workoutIndex'
import type { ParsedCanvasPage } from '../canvas/parseCanvasMarkdown'
import { getSectionProse } from '../canvas/parseCanvasMarkdown'
import {
  isPlaygroundNotePath,
  isJournalEntryPath,
  matchFeedItem,
  matchFeedDetail,
} from './routes'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'

// ─── Docs-page nav constants (moved from App.tsx) ──────────────────────────

export const SYNTAX_LINKS = [
  { id: 'introduction', label: 'Introduction', type: 'heading' as const },
  { id: 'anatomy', label: 'Statement Anatomy', type: 'heading' as const },
  { id: 'timers', label: 'Timers & Direction', type: 'heading' as const },
  { id: 'metrics', label: 'Measuring Effort', type: 'heading' as const },
  { id: 'groups', label: 'Groups & Repeaters', type: 'heading' as const },
  { id: 'protocols', label: 'Protocols', type: 'heading' as const },
  { id: 'supplemental', label: 'Supplemental', type: 'heading' as const },
  { id: 'document', label: 'Document', type: 'heading' as const },
]

// ─── Types ─────────────────────────────────────────────────────────────────

/** URL params captured by the matched `<Route>` (always optional from the router). */
export interface RouteViewParams {
  category?: string
  name?: string
  collection?: string
  workout?: string
  id?: string
}

/** A workout the user can navigate to — the minimal shape `selectWorkout` needs. */
export interface SelectWorkoutItem {
  name: string
  category?: string
  content?: string
}

/** The current workout the route resolves to (name + content + category for the shell). */
export interface CurrentWorkout {
  name: string
  content: string
  category: string
}
/**
 * Which page the route renders — the discriminator for the `ROUTE_PAGES` lookup.
 */
export type PageKind =
  | 'journal'
  | 'feeds'
  | 'feedDetail'
  | 'feedItem'
  | 'collections'
  | 'effortsCatalog'
  | 'effortDetail'
  | 'canvas'
  | 'playground'
  | 'journalEntry'
  | 'workout'

/** How the page is wrapped — the `<CanvasPage>` shell vs bare. */
export interface ShellConfig {
  wrap: 'canvas' | 'bare'
  /** Canvas title (canvas branches). */
  title?: string
  /** Subheader filter strip kind. */
  subheader?: 'filter-collections' | 'filter-collection-workouts'
  /** `<PageActions>` mode (canvas branches render an actions menu). */
  actionsMode?: 'journal-active' | 'collection-readonly'
  /** Whether the canvas shell receives the nav index + scroll handler. */
  withIndex?: boolean
}

/** Injected data + callbacks the pure derivation needs (no React, no fetching). */
export interface RouteViewDeps {
  workoutItems: WorkoutItem[]
  canvasPage: ParsedCanvasPage | null
  recentResults: WorkoutResult[]
  selectWorkout: (item: SelectWorkoutItem) => void
}

/** Classification flags — Phase 1 transitional; consumed by AppContent's render ternary. */
export interface RouteFlags {
  isPlaygroundRoute: boolean
  effectivePlaygroundId: string | undefined
  isJournalEntryRoute: boolean
  journalEntryId: string | undefined
  feedItemMatch: [string, string, string] | null
  feedDetailMatch: string | null
}

export interface RouteView extends RouteFlags {
  /** The canvas page for this route (null unless it matches a canvas/collection route). */
  canvasPage: ParsedCanvasPage | null
  /** The workout the route resolves to. */
  workout: CurrentWorkout
  /** Nav links for the sticky header dropdown / L3 nav. */
  nav: PageNavLink[]
  /** Which page this route renders (Phase 2 — drives the `ROUTE_PAGES` lookup). */
  page: PageKind
  /** How the page is wrapped (Phase 2 — drives the `PageShell`). */
  shell: ShellConfig
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Shape of a journal entry's optional `payload` (not on the {@link WorkoutItem} type). */
interface JournalItemPayload {
  targetDate?: string | number
  updatedAt?: string | number
}

/**
 * Read a journal entry's date from a `payload` field the {@link WorkoutItem} type
 * doesn't declare. The original code reached this via `as any`; the `in` guard keeps
 * it type-safe while preserving behaviour (returns `undefined` for real WorkoutItems,
 * which never carry `payload`).
 */
function readItemDate(item: WorkoutItem): string | number | undefined {
  if (!('payload' in item)) return undefined
  const payload = item.payload
  if (!payload || typeof payload !== 'object') return undefined
  const p = payload as JournalItemPayload
  return p.targetDate ?? p.updatedAt
}

function detectFlags(pathname: string, params: RouteViewParams): RouteFlags {
  const { name: urlName, id: playgroundId } = params
  const isPlaygroundRoute = isPlaygroundNotePath(pathname)
  const effectivePlaygroundId =
    playgroundId || (pathname.startsWith('/note/playground/') ? urlName : undefined)
  const isJournalEntryRoute = isJournalEntryPath(pathname)
  const rawJournalId = urlName ?? playgroundId
  const journalEntryId = isJournalEntryRoute && rawJournalId ? decodeURIComponent(rawJournalId) : undefined
  const feedItemMatch = matchFeedItem(pathname)
  const feedDetailMatch = feedItemMatch ? null : matchFeedDetail(pathname)
  return { isPlaygroundRoute, effectivePlaygroundId, isJournalEntryRoute, journalEntryId, feedItemMatch, feedDetailMatch }
}

function deriveWorkout(
  flags: RouteFlags,
  pathname: string,
  params: RouteViewParams,
  workoutItems: WorkoutItem[],
  canvasPage: ParsedCanvasPage | null,
): CurrentWorkout {
  const { category: urlCategory, name: urlName, collection: urlCollection, workout: urlWorkout } = params

  if (flags.isPlaygroundRoute) {
    return { name: 'Playground', content: '', category: 'playground' }
  }
  if (flags.isJournalEntryRoute && flags.journalEntryId) {
    return { name: flags.journalEntryId, content: '', category: 'journal' }
  }
  if (canvasPage) {
    return { name: canvasPage.sections[0]?.heading ?? 'Canvas', content: '', category: 'canvas' }
  }

  // Named routes without params
  const named: Record<string, string> = {
    '/': 'Home',
    '/journal': 'Journal',
    '/feeds': 'Feeds',
    '/guide/syntax': 'Syntax',
    '/collections': 'Collections',
  }
  const namedMatch = named[pathname]
  if (namedMatch) {
    return { name: namedMatch, content: PLAYGROUND_CONTENT, category: 'General' }
  }

  const effectiveName = urlWorkout || urlName
  if (!effectiveName) {
    return { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
  }
  const name = decodeURIComponent(effectiveName)
  const category = (urlCollection || urlCategory)
    ? decodeURIComponent(urlCollection || urlCategory!)
    : 'General'
  const found = workoutItems.find(item => item.name === name && item.category === category)
  return found
    ? { name: found.name, content: found.content, category: found.category }
    : { name, content: PLAYGROUND_CONTENT, category: 'General' }
}

function deriveNav(pathname: string, deps: RouteViewDeps): PageNavLink[] {
  const { canvasPage, workoutItems, recentResults, selectWorkout } = deps

  // 1. Canvas pages (including Home)
  if (canvasPage) {
    const isCollection = pathname.startsWith('/collections/')
    const collectionSlug = isCollection ? pathname.split('/').pop() ?? null : null

    const links: PageNavLink[] = []
    canvasPage.sections
      .filter(s => s.level > 1)
      .forEach(s => {
        links.push({ id: s.id, label: s.heading, type: 'heading' as const })

        // Extract standard WOD blocks from prose
        const lines = getSectionProse(s).split('\n')
        let wodCount = 0
        lines.forEach((line, i) => {
          if (/^```(wod|log|plan)\s*$/.test(line.trim())) {
            wodCount++
            // Canvas WOD blocks have no onRun here — MarkdownCanvasPage manages its own runtime.
            links.push({
              id: `${s.id}-wod-${i + 1}`,
              label: `Workout ${wodCount}`,
              type: 'wod' as const,
            })
          }
        })

        if (isCollection && collectionSlug && getSectionProse(s).includes('{{workouts}}')) {
          links.push({ id: 'collection-workouts', label: 'Explore', type: 'heading' as const })
          const collectionItems = workoutItems.filter(
            item => item.category === collectionSlug && item.name.toLowerCase() !== 'readme',
          )
          collectionItems.forEach(item => {
            links.push({
              id: `workout-${item.id}`,
              label: item.name,
              type: 'wod' as const,
              onRun: () => selectWorkout(item),
              runIcon: 'link' as const,
            })
          })
        }
      })

    // Fallback: collection with no `{{workouts}}` tag — list items appended at the bottom.
    const hasWorkoutsTag = canvasPage.sections.some(s => getSectionProse(s).includes('{{workouts}}'))
    if (isCollection && collectionSlug && !hasWorkoutsTag) {
      links.push({ id: 'collection-workouts', label: 'Explore', type: 'heading' as const })
      const collectionItems = workoutItems.filter(
        item => item.category === collectionSlug && item.name.toLowerCase() !== 'readme',
      )
      collectionItems.forEach(item => {
        links.push({
          id: `workout-${item.id}`,
          label: item.name,
          type: 'wod' as const,
          onRun: () => selectWorkout(item),
          runIcon: 'link' as const,
        })
      })
    }
    return links
  }

  // 2. Docs pages
  if (pathname === '/guide/syntax') return SYNTAX_LINKS

  // 3. Journal list page — top-10 distinct session dates
  if (pathname === '/journal') {
    const dates = new Set<string>()
    recentResults.forEach(r => { dates.add(new Date(r.completedAt).toISOString().split('T')[0]) })
    workoutItems.forEach(item => {
      const d = readItemDate(item)
      if (d) dates.add(new Date(d).toISOString().split('T')[0])
    })
    return Array.from(dates).sort().reverse().slice(0, 10).map(d => ({
      id: d,
      label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      type: 'heading' as const,
    }))
  }

  return []
}
function derivePage(flags: RouteFlags, pathname: string, canvasPage: ParsedCanvasPage | null): PageKind {
  if (pathname === '/journal' || pathname === '/journal/') return 'journal'
  if (pathname === '/feeds') return 'feeds'
  if (flags.feedDetailMatch) return 'feedDetail'
  if (flags.feedItemMatch) return 'feedItem'
  if (pathname === '/collections') return 'collections'
  if (pathname === '/efforts') return 'effortsCatalog'
  if (pathname.startsWith('/effort/')) return 'effortDetail'
  if (canvasPage) return 'canvas'
  if (flags.isPlaygroundRoute && flags.effectivePlaygroundId) return 'playground'
  if (flags.isJournalEntryRoute && flags.journalEntryId) return 'journalEntry'
  return 'workout'
}

function deriveShell(page: PageKind, pathname: string, workout: CurrentWorkout): ShellConfig {
  switch (page) {
    case 'journal':
      return { wrap: 'canvas', title: 'Journal', actionsMode: 'journal-active', withIndex: true }
    case 'collections':
      return { wrap: 'canvas', title: 'Collections', subheader: 'filter-collections', actionsMode: 'collection-readonly' }
    case 'canvas':
      return {
        wrap: 'canvas',
        title: workout.name,
        subheader: pathname.startsWith('/collections/') ? 'filter-collection-workouts' : undefined,
        actionsMode: 'collection-readonly',
        withIndex: true,
      }
    default:
      return { wrap: 'bare' }
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Resolve a pathname + URL params + injected data into a {@link RouteView}.
 * Pure: same inputs → same output, no side effects, no React.
 */
export function resolveRouteView(
  pathname: string,
  params: RouteViewParams,
  deps: RouteViewDeps,
): RouteView {
  const flags = detectFlags(pathname, params)
  const workout = deriveWorkout(flags, pathname, params, deps.workoutItems, deps.canvasPage)
  const nav = deriveNav(pathname, deps)
  const page = derivePage(flags, pathname, deps.canvasPage)
  const shell = deriveShell(page, pathname, workout)
  return { ...flags, canvasPage: deps.canvasPage, workout, nav, page, shell }
}
