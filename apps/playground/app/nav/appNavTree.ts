/**
 * appNavTree — the authoritative L1 + L2 navigation tree for the app.
 *
 * L3 (page-index / scroll anchors) is injected dynamically by each route
 * component via useSetNavL3() or AppContent's setL3Items() call.
 *
 * Structure:
 *   L1: Home, Library, Dashboards, Efforts
 *   L2 of Home:        Zero to Hero + Syntax/* + Behaviors/* (canvas pages)
 *   L2 of Dashboards:  Explorer (/dashboard) + the prebuilt dashboard seeds
 *                      (/dashboard/:slug); vault-created dashboards need a
 *                      dynamic panel to join this list (follow-up).
 *   L2 of Efforts:     <EffortsNavPanel>   — origin/discipline filters + recent workouts
 *   Search has moved out of the L1 sidebar and into the top app-bar.
 */

import { HomeIcon, CodeBracketIcon } from '@heroicons/react/20/solid'
import { ChartBarIcon, BookOpen, Dumbbell } from 'lucide-react'

import type { NavItem } from './navTypes'
import type { Location } from 'react-router-dom'

import { EffortsNavPanel } from './panels/EffortsNavPanel'
import { DashboardsNavPanel } from './panels/DashboardsNavPanel'
import { canvasRoutes } from '../canvas/canvasRoutes'
import { ROUTE_PATTERNS } from '../lib/routes'

// ─── L2 children for Home ─────────────────────────────────────────────────────

// Sidebar order for the Syntax guide pillar (maps canonical route to position).
// Timers/rounds come before custom-metrics; complex carries the sound-behavior
// slot until a dedicated sound page exists; cheatsheet is the reference cap.
const syntaxOrder: Record<string, number> = {
  '/guide/syntax': 0,
  '/guide/syntax/basics': 1,
  '/guide/syntax/protocols': 2,
  '/guide/syntax/structure': 3,
  '/guide/syntax/custom-metrics': 4,
  '/guide/syntax/dialects': 5,
  '/guide/syntax/complex': 6,
  '/guide/syntax/cheatsheet': 7,
}

const syntaxChildren: NavItem[] = canvasRoutes
  .filter(r => !r.route.startsWith('/collections'))
  .filter(r => r.page.frontmatter?.type === 'syntax')
  .sort((a, b) => (syntaxOrder[a.route] ?? 99) - (syntaxOrder[b.route] ?? 99))
  .map(r => ({
    id: `syntax-${r.route}`,
    label: r.page.sections[0]?.heading ?? 'Untitled',
    level: 2 as const,
    icon: CodeBracketIcon,
    action: { type: 'route' as const, to: r.route },
    isActive: (loc: Location) => loc.pathname === r.route,
  }))

// Sidebar order for the Behaviors guide pillar.
const behaviorOrder: Record<string, number> = {
  '/guide/behaviors': 0,
  '/guide/behaviors/timers': 1,
  '/guide/behaviors/rounds': 2,
  '/guide/behaviors/capture': 3,
}

const behaviorsChildren: NavItem[] = canvasRoutes
  .filter(r => !r.route.startsWith('/collections'))
  .filter(r => r.page.frontmatter?.type === 'behavior')
  .sort((a, b) => (behaviorOrder[a.route] ?? 99) - (behaviorOrder[b.route] ?? 99))
  .map(r => ({
    id: `behavior-${r.route}`,
    label: r.page.sections[0]?.heading ?? 'Untitled',
    level: 2 as const,
    icon: BookOpen,
    action: { type: 'route' as const, to: r.route },
    isActive: (loc: Location) => loc.pathname === r.route,
  }))
const analyticsGuideOrder: Record<string, number> = {
  '/guide/analytics': 0,
  '/guide/analytics/anatomy': 1,
  '/guide/analytics/filters': 2,
  '/guide/analytics/joins': 3,
  '/guide/analytics/cookbook': 4,
  '/guide/analytics/cheatsheet': 5,
}

const analyticsGuideChildren: NavItem[] = canvasRoutes
  .filter(r => !r.route.startsWith('/collections'))
  .filter(r => r.page.frontmatter?.type === 'analytics')
  .sort((a, b) => (analyticsGuideOrder[a.route] ?? 99) - (analyticsGuideOrder[b.route] ?? 99))
  .map(r => ({
    id: `analytics-guide-${r.route}`,
    label: r.page.sections[0]?.heading ?? 'Untitled',
    level: 2 as const,
    icon: ChartBarIcon,
    action: { type: 'route' as const, to: r.route },
    isActive: (loc: Location) => loc.pathname === r.route,
  }))

const homeChildren: NavItem[] = [
  {
    id: 'syntax-group',
    label: 'Syntax',
    level: 2,
    icon: CodeBracketIcon,
    action: { type: 'none' },
    children: syntaxChildren,
  },
  {
    id: 'behaviors-group',
    label: 'Behaviors',
    level: 2,
    icon: BookOpen,
    action: { type: 'route', to: '/guide/behaviors' },
    isActive: (loc: Location) => loc.pathname.startsWith('/guide/behaviors'),
    children: behaviorsChildren,
  },
  {
    id: 'analytics-guide-group',
    label: 'Analytics',
    level: 2,
    icon: ChartBarIcon,
    action: { type: 'route', to: '/guide/analytics' },
    isActive: (loc: Location) => loc.pathname.startsWith('/guide/analytics'),
    children: analyticsGuideChildren,
  },
]
// ─── App nav tree ─────────────────────────────────────────────────────────────

/**
 * @param _openSearch - retained for the global keyboard shortcut (Ctrl+/)
 *   but Search is no longer an L1 sidebar item — it lives in the top app-bar.
 */
export function buildAppNavTree(_openSearch: () => void): NavItem[] {
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
        loc.pathname === ROUTE_PATTERNS.guideGettingStarted ||
        loc.pathname.startsWith('/guide/syntax') ||
        loc.pathname.startsWith('/guide/behaviors') ||
        loc.pathname.startsWith('/guide/analytics') ||
        loc.pathname.startsWith('/canvas') ||
        loc.pathname === ROUTE_PATTERNS.home ||
        loc.pathname.startsWith('/playground/') ||
        loc.pathname === ROUTE_PATTERNS.aiFirst ||
        loc.pathname.startsWith('/ai-first/'),
      children: homeChildren,
    },

    {
      id: 'library',
      label: 'Library',
      level: 1,
      icon: BookOpen,
      action: { type: 'route', to: ROUTE_PATTERNS.library },
      isActive: (loc: Location) =>
        loc.pathname === ROUTE_PATTERNS.library ||
        loc.pathname.startsWith(`${ROUTE_PATTERNS.library}/`) ||
        // Journal entries are a library stream profile (see streamProfile).
        loc.pathname.startsWith('/journal'),
    },

    {
      id: 'dashboards',
      label: 'Dashboards',
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
      isActive: (loc: Location) => loc.pathname.startsWith('/effort'),
      panel: EffortsNavPanel,
    },
  ]
}

/** Static default tree (no search handler) — kept for tests / storybook. */
export const appNavTree: NavItem[] = buildAppNavTree(() => {})
