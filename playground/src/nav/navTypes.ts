/**
 * navTypes.ts — Shared navigation type contract
 *
 * All three navigation zones (mobile bar, sidebar, page header, right index)
 * consume the same NavItem tree and share one NavState object.
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

// ─── INavAction — discriminated union of all action types ────────────────────

/** Navigate to a new route. */
export interface RouteChangeAction {
  type: 'route'
  to: string
  /** Add a browser history entry. Default: true. */
  pushHistory?: boolean
}

/** Update URL query params without a route change (replaceState by default). */
export interface RouteQueryAction {
  type: 'query'
  params: Record<string, string | null>
  /** Add a browser history entry. Default: false (replaceState). */
  pushHistory?: boolean
}

/** Scroll the page to a named anchor and mark it active in the sidebar. */
export interface ScrollAction {
  type: 'scroll'
  sectionId: string
}

/**
 * Swap the sticky view panel's editor source content.
 * Canvas pages only — silently ignored on other surfaces.
 */
export interface ViewSourceAction {
  type: 'view-source'
  source: string
}

/**
 * Transition the view panel state machine.
 *   'note'   → show NoteEditor (reset)
 *   'track'  → launch the first WOD block
 *   'review' → show post-workout review
 * Canvas pages only — silently ignored on other surfaces.
 */
export interface ViewStateAction {
  type: 'view-state'
  state: 'note' | 'track' | 'review'
  /** Where to launch the runtime when state='track'. Default: 'dialog'. */
  open?: 'view' | 'dialog' | 'route'
}

/** Execute a sequence of actions in order. Replaces PipelineStep[]. */
export interface PipelineAction {
  type: 'pipeline'
  steps: INavAction[]
}

/** Invoke an arbitrary handler. */
export interface CallAction {
  type: 'call'
  handler: () => void
  label?: string
}

/** No-op — for accordion group headers. */
export interface NoneAction {
  type: 'none'
}

export type INavAction =
  | RouteChangeAction
  | RouteQueryAction
  | ScrollAction
  | ViewSourceAction
  | ViewStateAction
  | PipelineAction
  | CallAction
  | NoneAction

/** Legacy alias kept for existing NavItem/NavItemL3 usage. */
export type NavAction = INavAction

// ─── INavActivation — base interface for every activatable UI element ─────────

export interface INavActivation {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string; 'data-slot'?: string }>
  action: INavAction
}

// ─── NavActionDeps — injected by each rendering surface ──────────────────────

export interface NavActionDeps {
  navigate:          (to: string, opts?: { replace?: boolean }) => void
  setQueryParam:     (params: Record<string, string | null>, replace?: boolean) => void
  /** Scroll to a named anchor on the current page. */
  scrollToSection?:  (id: string) => void
  /** Fade-swap the sticky editor panel source. Canvas pages only. */
  swapSource?:       (source: string) => void
  /** Transition the view panel state machine. Canvas pages only. */
  setPanelState?:    (state: 'note' | 'track' | 'review', open?: 'view' | 'dialog' | 'route') => void
}

/**
 * executeNavAction — single dispatch function for all rendering surfaces.
 * View-container actions are silently skipped when their deps are absent.
 */
export function executeNavAction(action: INavAction, deps: NavActionDeps): void {
  switch (action.type) {
    case 'route':
      deps.navigate(action.to, { replace: !(action.pushHistory ?? true) })
      break
    case 'query':
      deps.setQueryParam(action.params, !(action.pushHistory ?? false))
      break
    case 'scroll':
      deps.scrollToSection?.(action.sectionId)
      break
    case 'view-source':
      deps.swapSource?.(action.source)
      break
    case 'view-state':
      deps.setPanelState?.(action.state, action.open)
      break
    case 'pipeline':
      action.steps.forEach(step => executeNavAction(step, deps))
      break
    case 'call':
      action.handler()
      break
    case 'none':
      break
  }
}

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
