/**
 * navTypes.ts — Playground navigation type contract
 *
 * Re-exports the shared nav contract from `src/nav/navTypes` so playground pages
 * can import a single file.  Also houses playground-specific nav shapes
 * (zones, filter state, etc.).
 *
 * Kept in sync with `src/nav/navTypes.ts` — changes there must be reflected here.
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
  date: string | null
  tags: string[]
}

export interface SearchFilterState {
  scope: 'all' | 'collections' | 'notes' | 'results'
}

// ─── Global nav state ─────────────────────────────────────────────────────────

export interface NavState {
  activeL1: string | null
  activeL2: string | null
  activeL3: string | null
  expanded: Set<string>
  leftDrawerOpen: boolean
  rightDrawerOpen: boolean
  journalFilter: JournalFilterState
  searchScope: SearchFilterState['scope']
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

export type NavDispatch = React.Dispatch<NavStateAction>

// ─── Custom component props ───────────────────────────────────────────────────

export interface NavPanelProps {
  currentPath: string
  location: Location
}

export interface NavItemRenderProps {
  item: NavItem
  depth: number
  isActive: boolean
  isExpanded: boolean
  onClick: () => void
}

// ─── NavItem — universal link/node interface ──────────────────────────────────

export interface NavItem extends INavActivation {
  id: string
  label: string
  children?: NavItem[]
  icon?: string | React.ReactNode
  badge?: string | number
  href?: string
  to?: string
  disabled?: boolean
  hidden?: boolean
  meta?: Record<string, unknown>
}

// ─── L3 page-index item ───────────────────────────────────────────────────────

export interface NavItemL3 extends NavItem {
  /** Whether this L3 item is rendered as a section link (h2) or plain link */
  isSection?: boolean
}

// ─── Canvas navigation helpers ────────────────────────────────────────────────

import type { INavAction, PipelineStep, OpenMode } from '@/nav/navTypes'

/** Convert a single stringly-typed PipelineStep to a typed INavAction. */
export function pipelineStepToNavAction(step: PipelineStep, open: OpenMode = 'dialog'): INavAction {
  if (step.action === 'set-source') return { type: 'view-source', source: step.value }
  if (step.action === 'navigate') {
    if (/^https?:\/\//.test(step.value)) {
      return { type: 'external', href: step.value }
    }
    return { type: 'route', to: step.value }
  }
  if (step.action === 'set-state') {
    if (step.value === 'note')   return { type: 'view-state', state: 'note' }
    if (step.value === 'review') return { type: 'view-state', state: 'review' }
    if (step.value === 'track')  return { type: 'view-state', state: 'track', open }
  }
  return { type: 'none' }
}

/** Build an INavActivation from a canvas ButtonBlock or ViewButton. */
export function buttonToActivation(
  btn: { label: string; pipeline: PipelineStep[]; open?: OpenMode },
  idx: number
): INavActivation {
  const steps = btn.pipeline.map(s => pipelineStepToNavAction(s, btn.open))
  return {
    id: `btn-${idx}`,
    label: btn.label,
    action: steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
  }
}

/** True when an activation's action will launch the workout tracker. */
export function isRunActivation(activation: INavActivation): boolean {
  const { action } = activation
  if (action.type === 'view-state') return action.state === 'track'
  if (action.type === 'pipeline')   return action.steps.some(s => s.type === 'view-state' && (s as { state?: string }).state === 'track')
  return false
}
