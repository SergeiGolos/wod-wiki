/**
 * appNavTree — the authoritative L1 + L2 navigation tree for the app.
 *
 * L3 (page-index / scroll anchors) is injected dynamically by each route
 * component via useSetNavL3() or AppContent's setL3Items() call.
 *
 * Structure:
 *   L1: Home, Journal, Collections, Playgrounds, Dashboard, Efforts, Sessions,
 *       Settings (Feeds folds into Collections — feed routes light Collections)
 *   L2 of Home:        the consolidated Guide chapters (markdown/canvas/guide/**;
 *                      the old syntax/behaviors/analytics pillars are folded in)
 *   L2 of the five stream routes (Journal/Collections/Playgrounds/Efforts/
 *                      Sessions): the shared ConditionsNavPanel — current-result
 *                      `{}` condition accordion plus grouping presets over the
 *                      CURRENT query; Feeds rides under Collections
 *   L2 of Dashboards:  dynamic panel (vault/runtime data)
 *   Search has moved out of the L1 sidebar and into the top app-bar.
 *
 * The canvas-guide children derive from the seeded canvas routes passed by
 * the caller (App.tsx hydrates them from IndexedDB); tests/storybook use the
 * static `appNavTree` export, which carries no canvas children.
 */

import { HomeIcon, CodeBracketIcon } from '@heroicons/react/20/solid'
import { ChartBarIcon, Dumbbell, Rss, Folder, Calendar, Settings, Paintbrush, Sliders, FlaskConical, ClipboardList, ListFilter, Tag } from 'lucide-react'
import type { NavItem } from './navTypes'
import type { Location } from 'react-router-dom'
import { scopeOfQuery } from '../lib/wqlEdits'
import { JOURNAL_STREAM_PROFILE, COLLECTIONS_STREAM_PROFILE, PLAYGROUNDS_STREAM_PROFILE, EFFORTS_STREAM_PROFILE, SESSIONS_STREAM_PROFILE, type StreamProfile } from '../views/stream/streamProfile'
import { ROUTE_PATTERNS, isEffortsPath } from '../lib/routes'

import { DashboardsNavPanel } from './panels/DashboardsNavPanel'
import { createConditionsNavPanel } from './panels/ConditionsNavPanel'
import type { CanvasRoute } from '../canvas/canvasRoutes'

import { BUY_ME_A_COFFEE_URL, BuyMeACoffeeIcon } from '../components/atoms/BuyMeACoffee'

// ─── L2 children for Home ─────────────────────────────────────────────────────

// Sidebar order for the consolidated learning guide (one pillar, eight
// chapters — markdown/canvas/guide/**; the old syntax/behaviors/analytics
// pillars were folded into these eight routes).
const guideOrder: Record<string, number> = {
  '/guide/start': 0,
  '/guide/protocols': 1,
  '/guide/structure': 2,
  '/guide/metrics': 3,
  '/guide/clock': 4,
  '/guide/wql': 5,
  '/guide/dashboards': 6,
  '/guide/sessions': 7,
}

function guideChildrenFrom(routes: CanvasRoute[]): NavItem[] {
  return routes
    .filter(r => !r.route.startsWith('/collections'))
    .filter(r => r.page.frontmatter?.type === 'guide')
    .sort((a, b) => (guideOrder[a.route] ?? 99) - (guideOrder[b.route] ?? 99))
    .map(r => ({
      id: `guide-${r.route}`,
      label: r.page.sections[0]?.heading ?? 'Untitled',
      level: 2 as const,
      icon: CodeBracketIcon,
      action: { type: 'route' as const, to: r.route },
      isActive: (loc: Location) => loc.pathname === r.route,
    }))
}

function buildHomeChildren(routes: CanvasRoute[]): NavItem[] {
  return [
    {
      id: 'guide-group',
      label: 'Guide',
      level: 2,
      icon: CodeBracketIcon,
      action: { type: 'route', to: '/guide/start' },
      isActive: (loc: Location) => loc.pathname.startsWith('/guide/'),
      children: guideChildrenFrom(routes),
    },
  ]
}

// ─── Listing zones (flattened Library) ────────────────────────────────────────

/**
 * Journal / Collections / Playgrounds are top-level L1 rows — the old Library
 * wrapper is gone and Feeds folds into Collections (feed routes light the
 * Collections zone). Each zone's L2 is the shared ConditionsNavPanel; there
 * are no static preset children to keep in sync.
 */
interface ListingZoneSpec {
  id: string
  label: string
  landingLabel: string
  icon: NavItem['icon']
  route: string
  profile: StreamProfile
  /** Preset grouping dimensions (favorites from Query Defaults win). */
  groupDims: readonly string[]
  /** Extra panel rows appended after the presets (e.g. Feeds). */
  extraChildren?: NavItem[]
  /** Whole zone route family (L1 activation). */
  familyActive: (loc: Location) => boolean
  /** The legacy `/library` alias lights this zone for its `?q=` scope. */
  aliasActive?: (loc: Location) => boolean
}

/** The `/library` alias route resolves to the zone its `?q=` scope names;
 *  unscooped library landings stay in Collections (the library default is the
 *  collection listing). */
function libraryScope(loc: Location): string | null {
  if (loc.pathname !== ROUTE_PATTERNS.library && !loc.pathname.startsWith(`${ROUTE_PATTERNS.library}/`)) return null
  return scopeOfQuery(new URLSearchParams(loc.search).get('q') ?? '')
}

const startsWithAny = (pathname: string, ...prefixes: string[]): boolean =>
  prefixes.some(p => pathname === p || pathname.startsWith(`${p}/`))

function listingZone(spec: ListingZoneSpec): NavItem {
  return {
    id: spec.id,
    label: spec.label,
    level: 1,
    icon: spec.icon,
    action: { type: 'route', to: spec.route },
    isActive: (loc: Location) => spec.familyActive(loc) || (spec.aliasActive?.(loc) ?? false),
    applyFooter: true,
    panel: createConditionsNavPanel({
      landingLabel: spec.landingLabel,
      icon: spec.icon,
      route: spec.route,
      profile: spec.profile,
      groupDims: spec.groupDims,
      extraChildren: spec.extraChildren,
      familyActive: spec.familyActive,
    }),
  }
}

const feedsChild: NavItem = {
  id: 'collections-feeds',
  label: 'Feeds',
  level: 2,
  icon: Rss,
  action: { type: 'route', to: ROUTE_PATTERNS.feeds },
  isActive: (loc: Location) => startsWithAny(loc.pathname, '/feeds', '/feed'),
}

const listingZones: ListingZoneSpec[] = [
  {
    id: 'journal',
    label: 'Journal',
    landingLabel: 'All entries',
    icon: Calendar,
    route: ROUTE_PATTERNS.journal,
    profile: JOURNAL_STREAM_PROFILE,
    groupDims: ['tag', 'kind'],
    familyActive: (loc: Location) => startsWithAny(loc.pathname, '/journal'),
    aliasActive: (loc: Location) => libraryScope(loc) === 'journal',
  },
  {
    id: 'collections',
    label: 'Collections',
    landingLabel: 'All collections',
    icon: Folder,
    route: ROUTE_PATTERNS.collections,
    profile: COLLECTIONS_STREAM_PROFILE,
    groupDims: ['date', 'kind'],
    familyActive: (loc: Location) => startsWithAny(loc.pathname, '/collections', '/c', '/feeds', '/feed'),
    aliasActive: (loc: Location) => {
      if (loc.pathname !== ROUTE_PATTERNS.library && !loc.pathname.startsWith(`${ROUTE_PATTERNS.library}/`)) return false
      const scope = libraryScope(loc)
      return scope !== 'journal' && scope !== 'playground'
    },
    extraChildren: [feedsChild],
  },
  {
    id: 'playgrounds',
    label: 'Playgrounds',
    landingLabel: 'All playgrounds',
    icon: FlaskConical,
    route: ROUTE_PATTERNS.playgrounds,
    profile: PLAYGROUNDS_STREAM_PROFILE,
    groupDims: ['source', 'tag'],
    familyActive: (loc: Location) => startsWithAny(loc.pathname, '/playgrounds', '/playground'),
    aliasActive: (loc: Location) => libraryScope(loc) === 'playground',
  },
]
// ─── App nav tree ─────────────────────────────────────────────────────────────

/**
 * @param _openSearch - retained for the global keyboard shortcut (Ctrl+/)
 *   but Search is no longer an L1 sidebar item — it lives in the top app-bar.
 * @param canvasRoutes - the seeded canvas route table (hydrated from
 *   IndexedDB); the guide children derive from it.
 */
export function buildAppNavTree(_openSearch: () => void, canvasRoutes: CanvasRoute[] = []): NavItem[] {
  const homeChildren = buildHomeChildren(canvasRoutes)
  return [
    {
      id: 'home',
      label: 'Home',
      level: 1,
      icon: HomeIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.home },
      isActive: (loc) =>
        loc.pathname === '/' ||
        loc.pathname === '' ||
        loc.pathname.startsWith('/guide/') ||
        loc.pathname.startsWith('/canvas') ||
        loc.pathname === ROUTE_PATTERNS.home ||
        loc.pathname === ROUTE_PATTERNS.aiFirst ||
        loc.pathname.startsWith('/ai-first/'),
      children: homeChildren,
    },

    ...listingZones.map(listingZone),

    {
      id: 'dashboards',
      label: 'Dashboard',
      level: 1,
      icon: ChartBarIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.dashboards },
      isActive: (loc: Location) => loc.pathname === ROUTE_PATTERNS.dashboards || loc.pathname === '/dashboard' || loc.pathname.startsWith('/dashboard/') || loc.pathname.startsWith('/d/'),
      // The L2 list (Explorer + vault-created + prebuilts, plus a New
      // dashboard action) is dynamic — vault dashboards are runtime data —
      // so it lives in the panel, not static children.
      panel: DashboardsNavPanel,
    },

    {
      id: 'efforts',
      label: 'Efforts',
      level: 1,
      icon: Dumbbell,
      action: { type: 'route', to: ROUTE_PATTERNS.efforts },
      isActive: (loc: Location) => isEffortsPath(loc.pathname),
      applyFooter: true,
      panel: createConditionsNavPanel({
        landingLabel: 'All Efforts',
        icon: Dumbbell,
        route: ROUTE_PATTERNS.efforts,
        profile: EFFORTS_STREAM_PROFILE,
        familyActive: (loc: Location) => isEffortsPath(loc.pathname),
      }),
    },

    {
      id: 'sessions',
      label: 'Sessions',
      level: 1,
      icon: ClipboardList,
      action: { type: 'route', to: ROUTE_PATTERNS.sessions },
      isActive: (loc: Location) =>
        loc.pathname.startsWith('/sessions') ||
        loc.pathname.startsWith('/session/') ||
        loc.pathname.startsWith('/results'),
      applyFooter: true,
      panel: createConditionsNavPanel({
        landingLabel: 'All Sessions',
        icon: ClipboardList,
        route: ROUTE_PATTERNS.sessions,
        profile: SESSIONS_STREAM_PROFILE,
        familyActive: (loc: Location) =>
          loc.pathname.startsWith('/sessions') ||
          loc.pathname.startsWith('/session/') ||
          loc.pathname.startsWith('/results'),
      }),
    },
    {
      id: 'settings',
      label: 'Settings',
      level: 1,
      icon: Settings,
      action: { type: 'route', to: ROUTE_PATTERNS.settingsAppearance },
      isActive: (loc: Location) => loc.pathname.startsWith('/settings'),
      children: [
        {
          id: 'settings-appearance',
          label: 'Appearance',
          level: 2,
          icon: Paintbrush,
          action: { type: 'route', to: ROUTE_PATTERNS.settingsAppearance },
          isActive: (loc: Location) =>
            loc.pathname === ROUTE_PATTERNS.settings ||
            loc.pathname === ROUTE_PATTERNS.settingsAppearance,
        },
        {
          id: 'settings-queries',
          label: 'Query Defaults',
          level: 2,
          icon: ListFilter,
          action: { type: 'route', to: ROUTE_PATTERNS.settingsQueries },
          isActive: (loc: Location) => loc.pathname === ROUTE_PATTERNS.settingsQueries,
        },
        {
          id: 'settings-tags',
          label: 'Tags',
          level: 2,
          icon: Tag,
          action: { type: 'route', to: ROUTE_PATTERNS.settingsTags },
          isActive: (loc: Location) => loc.pathname === ROUTE_PATTERNS.settingsTags,
        },
        {
          id: 'settings-system',
          label: 'System',
          level: 2,
          icon: Sliders,
          action: { type: 'route', to: ROUTE_PATTERNS.settingsSystem },
          isActive: (loc: Location) => loc.pathname === ROUTE_PATTERNS.settingsSystem,
        },
      ],
    },
    // Support link — external action (new tab); rendered as the trailing icon
    // button on the L1 rail (AppRail excludes it from the L1 loop).
    {
      id: 'buy-me-a-coffee',
      label: 'Buy Me a Coffee',
      level: 1,
      icon: BuyMeACoffeeIcon,
      action: { type: 'external', href: BUY_ME_A_COFFEE_URL },
    },
  ]
}

/** Static default tree (no search handler, no canvas children) — kept for tests / storybook. */
export const appNavTree: NavItem[] = buildAppNavTree(() => {})
