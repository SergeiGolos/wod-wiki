/**
 * startPage — the "Startup page" preference (Settings ▸ Appearance): which
 * page the app lands on when a session first loads. Home (`/`) is the
 * default; Journal (`/journal`) redirects that first landing for
 * daily-driver journaling.
 *
 * Follows the fabAlignment.ts pattern: module-level value + localStorage +
 * storage event, so non-React readers stay cheap and `useStartPage` gives
 * components reactivity.
 *
 * `StartPageGate` is the routing half: it wraps the `/` route and redirects
 * only the session's initial landing (`location.key === 'default'` — the
 * history entry the app booted on). Later in-session visits to `/` (nav
 * clicks, redirects) render Home normally, so Home never becomes
 * unreachable. The redirect uses history `replace`, so Back exits the app
 * instead of bouncing between / and /journal.
 */
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ROUTE_PATTERNS } from './routes'

const STORAGE_KEY = 'wodwiki:startPage'

export type StartPage = 'home' | 'journal'

export interface StartPageOption {
  id: StartPage
  label: string
  description: string
}

export const START_PAGE_OPTIONS: StartPageOption[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Land on the home page whenever Wod Wiki loads',
  },
  {
    id: 'journal',
    label: 'Journal',
    description: 'Go straight to your journal when Wod Wiki loads',
  },
]

function readStored(): StartPage | undefined {
  try {
    return validate(localStorage.getItem(STORAGE_KEY))
  } catch {
    return undefined
  }
}

function validate(value: string | null): StartPage | undefined {
  return value === 'home' || value === 'journal' ? value : undefined
}

let current: StartPage | undefined =
  typeof window === 'undefined' ? undefined : readStored()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) current = validate(e.newValue)
  })
}

/** Resolved startup page, defaulting to 'home'. */
export function getStartPage(): StartPage {
  return current ?? 'home'
}

export function setStartPage(page: StartPage): void {
  current = page
  try {
    if (page === 'home') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, page)
  } catch {
    // Private mode / storage disabled — the in-memory pref still applies.
  }
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: page }))
}

/** React binding: the current startup page and the setter. */
export function useStartPage(): [StartPage, (page: StartPage) => void] {
  const [page, setPage] = useState<StartPage>(() => current ?? 'home')
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPage(validate(e.newValue) ?? 'home')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [page, setStartPage]
}

/** Redirect the session's first landing on `/` to the journal when the
 *  Journal startup page is selected; every other case renders children. */
export function StartPageGate({ children }: { children: ReactNode }): ReactNode {
  const [startPage] = useStartPage()
  const location = useLocation()

  if (
    startPage === 'journal' &&
    location.pathname === ROUTE_PATTERNS.home &&
    location.key === 'default'
  ) {
    return <Navigate to={ROUTE_PATTERNS.journal} replace />
  }
  return <>{children}</>
}
