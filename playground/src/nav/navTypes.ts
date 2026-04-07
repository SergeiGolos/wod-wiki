/**
 * navTypes.ts — Shared navigation type contract
 *
 * All three navigation zones (mobile bar, sidebar, page header, right index)
 * consume the same NavItem tree and share one NavState object.
 */

import type React from 'react'
import type { Location } from 'react-router-dom'

// ─── Action ──────────────────────────────────────────────────────────────────

export type NavAction =
  | { type: 'route';  to: string }
  | { type: 'scroll'; sectionId: string }
  | { type: 'call';   handler: () => void }
  | { type: 'none' }

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

export interface NavItem {
  /** Unique stable identifier */
  id: string

  /** Display label */
  label: string

  /** Hierarchy level (1 = top, 2 = context panel, 3 = page index) */
  level: 1 | 2 | 3

  /** What happens when the item is activated */
  action: NavAction

  // ── Presentation ─────────────────────────────────────────────────────────

  /** Icon component (receives className for sizing) */
  icon?: React.ComponentType<{ className?: string; 'data-slot'?: string }>

  /** Count badge for accordions */
  badge?: string | number

  // ── Active state ─────────────────────────────────────────────────────────

  /**
   * Override active/selected detection.
   * By default: route items match pathname, scroll items match activeL3Id.
   */
  isActive?: (location: Location, navState: NavState) => boolean

  // ── Tree structure ────────────────────────────────────────────────────────

  /** Child items — used to build nested lists or accordion groups */
  children?: NavItem[]

  // ── Custom rendering ──────────────────────────────────────────────────────

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
  action: { type: 'scroll'; sectionId: string } | { type: 'none' }
  /** Secondary inline action — rendered as a small Play button */
  secondaryAction?: { type: 'call'; handler: () => void; label?: string }
}
