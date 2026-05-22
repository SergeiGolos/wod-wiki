/**
 * appNavTree — the authoritative L1 + L2 navigation tree for the app.
 *
 * L3 (page-index / scroll anchors) is injected dynamically by each route
 * component via useSetNavL3() or AppContent's setL3Items() call.
 *
 * Structure:
 *   L1: Home, Journal, Plan, Feeds, Collections, Efforts
 *   L2 of Home:        Zero to Hero + Syntax/* (canvas pages)
 *   L2 of Journal:     <JournalNavPanel>   — calendar filter + tag chips
 *   L2 of Plan:        <JournalNavPanel>   — same calendar, forward-looking
 *   L2 of Feeds:       <FeedsNavPanel>     — feed selector
 *   L2 of Collections: <CollectionsNavPanel> — category toggles
 *   L2 of Efforts:     <EffortsNavPanel>   — origin/discipline filters + recent workouts
 *
 *   Search has moved out of the L1 sidebar and into the top app-bar.
 */

import {
  HomeIcon,
  RectangleStackIcon,
  FolderIcon,
  CodeBracketIcon,
  CalendarDaysIcon,
} from '@heroicons/react/20/solid'
import { RssIcon, Dumbbell } from 'lucide-react'

import type { NavItem } from './navTypes'
import type { Location } from 'react-router-dom'

import { JournalNavPanel }     from './panels/JournalNavPanel'
import { CollectionsNavPanel } from './panels/CollectionsNavPanel'
import { FeedsNavPanel }       from './panels/FeedsNavPanel'
import { EffortsNavPanel }     from './panels/EffortsNavPanel'
import { canvasRoutes }        from '../canvas/canvasRoutes'
import { NON_COLLECTION_CATEGORIES } from '../pages/shared/pageUtils'
import { ROUTE_PATTERNS } from '../lib/routes'

// ─── helpers ──────────────────────────────────────────────────────────────────

function isRouteActive(to: string) {
  return (loc: Location) =>
    to === '/'
      ? loc.pathname === '/' || loc.pathname === ''
      : loc.pathname.startsWith(to)
}

function isCollectionWorkoutRoute(loc: Location): boolean {
  const match = loc.pathname.match(/^\/workout\/([^/]+)\/[^/]+$/)
  if (!match) return false
  const category = decodeURIComponent(match[1])
  return !NON_COLLECTION_CATEGORIES.has(category)
}

// ─── L2 children for Home ─────────────────────────────────────────────────────

const syntaxChildren: NavItem[] = canvasRoutes
  .filter(r => !r.route.startsWith('/collections'))
  .filter(r => r.page.frontmatter?.type === 'syntax')
  .map(r => ({
    id: `syntax-${r.route}`,
    label: r.page.sections[0]?.heading ?? 'Untitled',
    level: 2 as const,
    icon: CodeBracketIcon,
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
      action: { type: 'route', to: ROUTE_PATTERNS.playgroundRoot },
      isActive: (loc) =>
        loc.pathname === '/' ||
        loc.pathname === '' ||
        loc.pathname === ROUTE_PATTERNS.guideGettingStarted ||
        loc.pathname.startsWith('/guide/syntax') ||
        loc.pathname.startsWith('/canvas') ||
        loc.pathname === ROUTE_PATTERNS.playgroundRoot ||
        loc.pathname.startsWith('/playground/'),
      children: homeChildren,
    },

    {
      id: 'journal',
      label: 'Journal',
      level: 1,
      icon: RectangleStackIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.journal },
      isActive: isRouteActive(ROUTE_PATTERNS.journal),
      panel: JournalNavPanel,
    },

    {
      id: 'plan',
      label: 'Plan',
      level: 1,
      icon: CalendarDaysIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.plan },
      isActive: (loc: Location) => loc.pathname === ROUTE_PATTERNS.plan,
      panel: JournalNavPanel,
    },

    {
      id: 'feeds',
      label: 'Feeds',
      level: 1,
      icon: RssIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.feeds },
      isActive: (loc: Location) => loc.pathname.startsWith(ROUTE_PATTERNS.feeds),
      panel: FeedsNavPanel,
    },

    {
      id: 'collections',
      label: 'Collections',
      level: 1,
      icon: FolderIcon,
      action: { type: 'route', to: ROUTE_PATTERNS.collections },
      isActive: (loc) => isRouteActive(ROUTE_PATTERNS.collections)(loc) || isCollectionWorkoutRoute(loc),
      panel: CollectionsNavPanel,
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
