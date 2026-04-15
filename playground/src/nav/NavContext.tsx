/**
 * NavContext — global navigation state shared across all zones.
 *
 * Provides:
 *   navState  — selection, filter, drawer open/close
 *   dispatch  — typed action dispatcher
 *   l3Items   — current page's scroll-anchor index (injected by route components)
 *   setL3Items — called by AppContent (or future per-page hooks) to update L3
 *   scrollToSection — single scroll handler; falls back to DOM; can be
 *                     overridden by page components via registerScrollFn()
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import type {
  NavItem,
  NavItemL3,
  NavState,
  NavStateAction,
  NavDispatch,
} from './navTypes'

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialNavState: NavState = {
  activeL1Id: null,
  activeL2Id: null,
  activeL3Id: null,
  leftDrawerOpen: false,
  rightDrawerOpen: false,
  expandedIds: new Set(),
  journalFilter: { selectedDate: null, selectedTags: [] },
  searchFilter: { scope: 'all' },
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function navReducer(state: NavState, action: NavStateAction): NavState {
  switch (action.type) {
    case 'SET_ACTIVE_L1': return { ...state, activeL1Id: action.id }
    case 'SET_ACTIVE_L2': return { ...state, activeL2Id: action.id }
    case 'SET_ACTIVE_L3': return { ...state, activeL3Id: action.id }
    case 'SET_LEFT_DRAWER':  return { ...state, leftDrawerOpen: action.open }
    case 'SET_RIGHT_DRAWER': return { ...state, rightDrawerOpen: action.open }
    case 'TOGGLE_EXPANDED': {
      const next = new Set(state.expandedIds)
      next.has(action.id) ? next.delete(action.id) : next.add(action.id)
      return { ...state, expandedIds: next }
    }
    case 'SET_JOURNAL_DATE':
      return { ...state, journalFilter: { ...state.journalFilter, selectedDate: action.date } }
    case 'SET_JOURNAL_TAGS':
      return { ...state, journalFilter: { ...state.journalFilter, selectedTags: action.tags } }
    case 'SET_SEARCH_SCOPE':
      return { ...state, searchFilter: { scope: action.scope } }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NavContextValue {
  tree: NavItem[]
  navState: NavState
  dispatch: NavDispatch
  l3Items: NavItemL3[]
  setL3Items: (items: NavItemL3[]) => void
  scrollToSection: (id: string) => void
  /**
   * Register a custom scroll-to handler. Called by AppContent so the sidebar
   * can scroll into editor (CodeMirror) content that lives outside the DOM.
   * Falls back to standard DOM getBoundingClientRect scroll.
   */
  registerScrollFn: (fn: (id: string) => void) => void
}

const defaultScroll = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

export const NavContext = createContext<NavContextValue>({
  tree: [],
  navState: initialNavState,
  dispatch: () => {},
  l3Items: [],
  setL3Items: () => {},
  scrollToSection: defaultScroll,
  registerScrollFn: () => {},
})

export function useNav() {
  return useContext(NavContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface NavProviderProps {
  tree: NavItem[]
  children: React.ReactNode
}

export function NavProvider({ tree, children }: NavProviderProps) {
  const [navState, dispatch] = useReducer(navReducer, initialNavState)
  const [l3Items, setL3ItemsInternal] = useState<NavItemL3[]>([])
  const location = useLocation()

  // Mutable ref so AppContent can override scroll behaviour without re-rendering
  const scrollFnRef = useRef<(id: string) => void>(defaultScroll)

  // Auto-sync activeL1Id from current pathname
  useEffect(() => {
    const match = tree.find(item => {
      if (item.isActive) return item.isActive(location as unknown as Location, navState)
      if (item.action.type === 'route') {
        return item.action.to === '/'
          ? location.pathname === '/' || location.pathname === ''
          : location.pathname.startsWith(item.action.to)
      }
      return false
    })
    dispatch({ type: 'SET_ACTIVE_L1', id: match?.id ?? null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Close left drawer on route change
  useEffect(() => {
    dispatch({ type: 'SET_LEFT_DRAWER', open: false })
  }, [location.pathname])

  const scrollToSection = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_L3', id })
    scrollFnRef.current(id)
  }, [])

  const setL3Items = useCallback((items: NavItemL3[]) => {
    setL3ItemsInternal(items)
  }, [])

  const registerScrollFn = useCallback((fn: (id: string) => void) => {
    scrollFnRef.current = fn
  }, [])

  const value: NavContextValue = {
    tree,
    navState,
    dispatch,
    l3Items,
    setL3Items,
    scrollToSection,
    registerScrollFn,
  }

  return (
    <NavContext.Provider value={value}>
      {children}
    </NavContext.Provider>
  )
}
