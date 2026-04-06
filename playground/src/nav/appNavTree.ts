/**
 * appNavTree — the authoritative L1 + L2 navigation tree for the app.
 *
 * L3 (page-index / scroll anchors) is injected dynamically by each route
 * component via useSetNavL3() or AppContent's setL3Items() call.
 *
 * Structure:
 *   L1: Home, Journal, Collections, Search
 *   L2 of Home:    Zero to Hero + Syntax/* (canvas pages)
 *   L2 of Journal: <JournalNavPanel>   — calendar filter + tag chips
 *   L2 of Collect: <CollectionsNavPanel> — category toggles
 *   L2 of Search:  <SearchNavPanel>    — scope radio
 */

import {
  HomeIcon,
  RectangleStackIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  CodeBracketIcon,
} from '@heroicons/react/20/solid'

import type { NavItem } from './navTypes'
import type { Location } from 'react-router-dom'

import { JournalNavPanel }     from './panels/JournalNavPanel'
import { CollectionsNavPanel } from './panels/CollectionsNavPanel'
import { SearchNavPanel }      from './panels/SearchNavPanel'
import { canvasRoutes }        from '../canvas/canvasRoutes'

// ─── helpers ──────────────────────────────────────────────────────────────────

function isRouteActive(to: string) {
  return (loc: Location) =>
    to === '/'
      ? loc.pathname === '/' || loc.pathname === ''
      : loc.pathname.startsWith(to)
}

// ─── L2 children for Home ─────────────────────────────────────────────────────

const syntaxChildren: NavItem[] = canvasRoutes.map(r => ({
  id: `syntax-${r.route}`,
  label: r.page.sections[0]?.heading ?? 'Untitled',
  level: 2 as const,
  icon: CodeBracketIcon,
  action: { type: 'route' as const, to: r.route },
  isActive: (loc: Location) => loc.pathname === r.route,
}))

const homeChildren: NavItem[] = [
  {
    id: 'zero-to-hero',
    label: 'Zero to Hero',
    level: 2,
    icon: AcademicCapIcon,
    action: { type: 'route', to: '/getting-started' },
    isActive: isRouteActive('/getting-started'),
  },
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

export const appNavTree: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    level: 1,
    icon: HomeIcon,
    action: { type: 'route', to: '/' },
    isActive: (loc) =>
      loc.pathname === '/' ||
      loc.pathname === '' ||
      loc.pathname === '/getting-started' ||
      loc.pathname.startsWith('/syntax') ||
      loc.pathname.startsWith('/canvas'),
    children: homeChildren,
  },

  {
    id: 'journal',
    label: 'Journal',
    level: 1,
    icon: RectangleStackIcon,
    action: { type: 'route', to: '/journal' },
    isActive: isRouteActive('/journal'),
    panel: JournalNavPanel,
  },

  {
    id: 'collections',
    label: 'Collections',
    level: 1,
    icon: FolderIcon,
    action: { type: 'route', to: '/collections' },
    isActive: isRouteActive('/collections'),
    panel: CollectionsNavPanel,
  },

  {
    id: 'search',
    label: 'Search',
    level: 1,
    icon: MagnifyingGlassIcon,
    action: { type: 'route', to: '/search' },
    isActive: isRouteActive('/search'),
    panel: SearchNavPanel,
  },
]
