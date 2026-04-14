/**
 * navTypes.ts — Playground navigation type contract
 *
 * Re-exports all core types from @/nav/navTypes (the library layer) and
 * adds playground-specific types: NavItem, NavItemL3, NavState, NavDispatch,
 * and filter state interfaces.
 *
 * INavActivation is the base interface for every activatable UI element:
 *   NavItem, NavItemL3, canvas ButtonBlock/CommandBlock, toolbar buttons,
 *   playground links, keyboard bindings.
 *
 * All surfaces dispatch through executeNavAction(action, deps) so no
 * individual component carries routing or panel-state logic.
 */

import type React from 'react'
import type { Location } from 'react-router-dom'

// Re-export all shared base types from the library layer
export type {
  INavAction,
  INavActivation,
  NavActionDeps,
  RouteChangeAction,
  RouteQueryAction,
  ScrollAction,
  ViewSourceAction,
  ViewStateAction,
  PipelineAction,
  CallAction,
  NoneAction,
} from '@/nav/navTypes'
export { executeNavAction } from '@/nav/navTypes'

/** Legacy alias kept for existing NavItem/NavItemL3 usage. */
export type { INavAction as NavAction } from '@/nav/navTypes'

// Bring into local scope for use in NavItem/NavItemL3 definitions
import type {
  INavActivation,
  ScrollAction,
  RouteQueryAction,
  NoneAction,
} from '@/nav/navTypes'

// ─── Zone ────────────────────────────────────────────────────────────────────

export type NavZone =
  | 'mobile-bar'
  | 'sidebar'
  | 'page-header'
  | 'right-index'

// ─── Filter state slices ──────────────────────────────────────────────────────

export interface JournalFilterState {
  /** Selected date as ISO yyyy-mm-dd, or null for "all" */
  selectedDate: string | null
  /** Active tag slugs */
  selectedTags: string[]
}

export interface SearchFilterState {
  scope: 'all' | 'collections' | 'notes' | 'results'
}

export interface CollectionsFilterState {
  /** Active category slugs e.g. ['kettlebell'] */
  categories: string[]
}

// ─── Global nav state ─────────────────────────────────────────────────────────

export interface NavState {
  activeL1Id: string | null
  activeL2Id: string | null
  /** Active L3 section id — driven by IntersectionObserver */
  activeL3Id: string | null
  leftDrawerOpen: boolean
  rightDrawerOpen: boolean
  expandedIds: Set<string>
  journalFilter: JournalFilterState
  searchFilter: SearchFilterState
  collectionsFilter: CollectionsFilterState
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export type NavStateAction =
  | { type: 'SET_ACTIVE_L1';               id: string | null }
  | { type: 'SET_ACTIVE_L2';               id: string | null }
  | { type: 'SET_ACTIVE_L3';               id: string | null }
  | { type: 'TOGGLE_EXPANDED';             id: string }
  | { type: 'SET_LEFT_DRAWER';             open: boolean }
  | { type: 'SET_RIGHT_DRAWER';            open: boolean }
  | { type: 'SET_JOURNAL_DATE';            date: string | null }
  | { type: 'SET_JOURNAL_TAGS';            tags: string[] }
  | { type: 'SET_SEARCH_SCOPE';            scope: SearchFilterState['scope'] }
  | { type: 'SET_COLLECTIONS_CATEGORIES';  categories: string[] }

export type NavDispatch = React.Dispatch<NavStateAction>

// ─── Custom component props ───────────────────────────────────────────────────

export interface NavPanelProps {
  /** The L1 NavItem owning this panel */
  item: NavItem
  navState: NavState
  dispatch: NavDispatch
}

export interface NavItemRenderProps {
  item: NavItem
  isActive: boolean
  navState: NavState
  dispatch: NavDispatch
}

// ─── NavItem — universal link/node interface ──────────────────────────────────

export interface NavItem extends INavActivation {
  /** Hierarchy level (1 = top, 2 = context panel, 3 = page index) */
  level: 1 | 2 | 3

  /** Count badge for accordions */
  badge?: string | number

  /**
   * Override active/selected detection.
   * By default: route items match pathname, scroll items match activeL3Id.
   */
  isActive?: (location: Location, navState: NavState) => boolean

  /** Child items — used to build nested lists or accordion groups */
  children?: NavItem[]

  /**
   * Replace child list with a custom React component (calendar picker,
   * tag chips, search scope, etc.). Mutually exclusive with `children`.
   */
  panel?: React.ComponentType<NavPanelProps>

  /**
   * Override how this item row itself is rendered in any surface.
   * Receives the full item + state so split buttons and toggles can be built.
   */
  render?: React.ComponentType<NavItemRenderProps>

  /** Restrict this item to specific zones. Omit to use level defaults. */
  zones?: NavZone[]
}

// ─── L3 page-index item ───────────────────────────────────────────────────────

export interface NavItemL3 extends NavItem {
  level: 3
  action: ScrollAction | RouteQueryAction | NoneAction
  /** Secondary inline action — rendered as a small Play button */
  secondaryAction?: INavActivation
}
