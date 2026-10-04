/**
 * appNavTree — the authoritative L1 + L2 navigation tree for the app.
 *
 * L3 (page-index / scroll anchors) is injected dynamically by each route
 * component via useSetNavL3() or AppContent's setL3Items() call.
 *
 * Structure:
 *   L1: Home, Library, Dashboards
 *   L2 of Home:        Zero to Hero + Syntax/* + Behaviors/* (canvas pages)
 *   L2 of Library:     Journal, Collections, Feeds, Playground, Efforts, Results
 *   L2 of Dashboards:  Explorer (/dashboard) + the prebuilt dashboard seeds
 *                      (/dashboard/:slug); vault-created dashboards need a
 *                      dynamic panel to join this list (follow-up).
 *   Search has moved out of the L1 sidebar and into the top app-bar.
 *
 * The canvas-guide children derive from the seeded canvas routes passed by
 * the caller (App.tsx hydrates them from IndexedDB); tests/storybook use the
 * static `appNavTree` export, which carries no canvas children.
 */

import { HomeIcon, CodeBracketIcon } from '@heroicons/react/20/solid'
import { ChartBarIcon, BookOpen, Dumbbell, Rss, Folder, Calendar, Settings, Paintbrush, Sliders, FlaskConical, ClipboardList, ListFilter, Tag } from 'lucide-react'
import type { NavItem } from './navTypes'
import type { Location } from 'react-router-dom'
import { scopeOfQuery } from '../lib/wqlEdits'

import { DashboardsNavPanel } from './panels/DashboardsNavPanel'
import { SessionsNavPanel } from './panels/SessionsNavPanel'
import type { CanvasRoute } from '../canvas/canvasRoutes'
import { ROUTE_PATTERNS, isEffortsPath } from '../lib/routes'
import { EFFORT_DISCIPLINES } from '@bitcobblers/wod-wiki-lang'
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

// ─── L2 children for Library ──────────────────────────────────────────────────

/** Canonical playground listing — the dedicated /playgrounds stream route
 *  (the library ?q= deep link remains a valid alias via the library profile). */
export const PLAYGROUND_LIBRARY_WQL = ':note{source:playground} by {source} last 4w'
export const PLAYGROUND_LIBRARY_HREF = ROUTE_PATTERNS.playgrounds

function isLibraryPlaygroundActive(loc: Location): boolean {
  if (loc.pathname === '/playground' || loc.pathname.startsWith('/playground/')) return true
  if (loc.pathname === ROUTE_PATTERNS.playgrounds) return true
  if (loc.pathname !== ROUTE_PATTERNS.library && !loc.pathname.startsWith(`${ROUTE_PATTERNS.library}/`)) {
    return false
  }
  return scopeOfQuery(new URLSearchParams(loc.search).get('q') ?? '') === 'playground'
}

const libraryChildren: NavItem[] = [
  {
    id: 'library-journal',
    label: 'Journal',
    level: 2,
    icon: Calendar,
    action: { type: 'route', to: ROUTE_PATTERNS.journal },
    isActive: (loc: Location) =>
      loc.pathname === '/journal' ||
      loc.pathname.startsWith('/journal/'),
  },
  {
    id: 'library-collections',
    label: 'Collections',
    level: 2,
    icon: Folder,
    action: { type: 'route', to: ROUTE_PATTERNS.collections },
    isActive: (loc: Location) =>
      loc.pathname === '/collections' ||
      loc.pathname.startsWith('/collections/') ||
      loc.pathname.startsWith('/c/'),
  },
  {
    id: 'library-feeds',
    label: 'Feeds',
    level: 2,
    icon: Rss,
    action: { type: 'route', to: ROUTE_PATTERNS.feeds },
    isActive: (loc: Location) =>
      loc.pathname === '/feeds' ||
      loc.pathname.startsWith('/feeds/') ||
      loc.pathname === '/feed' ||
      loc.pathname.startsWith('/feed/'),
  },
  {
    id: 'library-playground',
    label: 'Playgrounds',
    level: 2,
    icon: FlaskConical,
    action: { type: 'route', to: PLAYGROUND_LIBRARY_HREF },
    isActive: isLibraryPlaygroundActive,
  },
]

const effortTagChildren: NavItem[] = [
  {
    id: 'effort-tag-all',
    label: 'All Efforts',
    level: 2,
    icon: Tag,
    action: { type: 'route', to: ROUTE_PATTERNS.efforts },
    isActive: (loc: Location) =>
      isEffortsPath(loc.pathname) && !loc.search.includes('discipline'),
  },
  ...EFFORT_DISCIPLINES.map(disc => ({
    id: `effort-tag-${disc}`,
    label: disc.charAt(0).toUpperCase() + disc.slice(1),
    level: 2,
    icon: Tag,
    action: {
      type: 'route' as const,
      to: `${ROUTE_PATTERNS.efforts}?q=:effort{discipline:${disc}}`,
    },
    isActive: (loc: Location) =>
      isEffortsPath(loc.pathname) &&
      (loc.search.includes(`discipline:${disc}`) || loc.search.includes(`discipline=${disc}`)),
  })),
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

    {
      id: 'library',
      label: 'Library',
      level: 1,
      icon: BookOpen,
      action: { type: 'route', to: ROUTE_PATTERNS.journal },
      isActive: (loc: Location) =>
        loc.pathname === ROUTE_PATTERNS.library ||
        loc.pathname.startsWith(`${ROUTE_PATTERNS.library}/`) ||
        loc.pathname === '/journal' ||
        loc.pathname.startsWith('/journal/') ||
        loc.pathname === '/playground' ||
        loc.pathname.startsWith('/playground/') ||
        loc.pathname === '/playgrounds' ||
        loc.pathname.startsWith('/collections') ||
        loc.pathname.startsWith('/c/') ||
        loc.pathname.startsWith('/feeds') ||
        loc.pathname.startsWith('/feed'),
      children: libraryChildren,
    },

    {
      id: 'dashboards',
      label: 'Dashboard',
      level: 1,
      icon: ChartBarIcon,
      action: { type: 'route', to: '/dashboard' },
      isActive: (loc: Location) => loc.pathname === '/dashboard' || loc.pathname.startsWith('/dashboard/'),
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
      children: effortTagChildren,
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
      panel: SessionsNavPanel,
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
    // Support link — external action (new tab); rendered in the mobile drawer
    // below Settings (icon + label) and as a rail icon button on desktop
    // (AppRail excludes it from the L1 loop).
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
