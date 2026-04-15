/**
 * navTypes.ts — Core navigation type contract (library layer)
 *
 * These types are used by library components (e.g. StickyNavPanel).
 * The playground extends this with route-change and view-state action types
 * in playground/src/nav/navTypes.ts.
 */

import type React from 'react'

// ─── INavAction — discriminated union of all action types ────────────────────

/** Navigate to a new route. */
export interface RouteChangeAction {
  type: 'route'
  to: string
  pushHistory?: boolean
}

/** Update URL query params without a route change. */
export interface RouteQueryAction {
  type: 'query'
  params: Record<string, string | null>
  pushHistory?: boolean
}

/** Scroll the page to a named anchor. */
export interface ScrollAction {
  type: 'scroll'
  sectionId: string
}

/** Swap the sticky view panel's editor source content. */
export interface ViewSourceAction {
  type: 'view-source'
  source: string
}

/** Transition the view panel state machine. */
export interface ViewStateAction {
  type: 'view-state'
  state: 'note' | 'track' | 'review'
  open?: 'view' | 'dialog' | 'route'
}

/** Execute a sequence of actions in order. */
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

/** No-op — for group headers. */
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

// ─── INavActivation — base interface for every activatable UI element ─────────

export interface INavActivation {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string; 'data-slot'?: string }>
  action: INavAction
}

// ─── NavActionDeps — injected by each rendering surface ──────────────────────

export interface NavActionDeps {
  navigate:         (to: string, opts?: { replace?: boolean }) => void
  setQueryParam:    (params: Record<string, string | null>, replace?: boolean) => void
  scrollToSection?: (id: string) => void
  swapSource?:      (source: string) => void
  setPanelState?:   (state: 'note' | 'track' | 'review', open?: 'view' | 'dialog' | 'route') => void
}

/**
 * executeNavAction — single dispatch function for all rendering surfaces.
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
