/**
 * startPage — the "Startup page" preference (Settings ▸ Appearance): Home is
 * the default, the Journal override persists to localStorage and is rejected
 * when stale. StartPageGate redirects only the session's initial landing on
 * `/` (`location.key === 'default'`); later in-session visits to `/` and
 * deep links are untouched.
 */
import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { getStartPage, setStartPage, START_PAGE_OPTIONS, StartPageGate } from './startPage'

const STORAGE_KEY = 'wodwiki:startPage'

function Gate() {
  return (
    <StartPageGate>
      <div data-testid="home-page">home</div>
    </StartPageGate>
  )
}

/** Journal page with an in-session link back to `/` (new location key). */
function JournalPage() {
  const navigate = useNavigate()
  return (
    <div data-testid="journal-page">
      journal
      <button type="button" data-testid="go-home" onClick={() => navigate('/')}>home</button>
    </div>
  )
}

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<Gate />} />
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  setStartPage('home')
  cleanup()
})

describe('startPage preference', () => {
  it('defaults to Home with nothing stored', () => {
    expect(getStartPage()).toBe('home')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('persists the Journal override', () => {
    setStartPage('journal')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('journal')
    expect(getStartPage()).toBe('journal')
  })

  it('returns to Home and clears storage', () => {
    setStartPage('journal')
    setStartPage('home')
    expect(getStartPage()).toBe('home')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to the default on stale values not in the option set', () => {
    setStartPage('journal')
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'library' }))
    expect(getStartPage()).toBe('home')
  })

  it('syncs via storage events (same-tab and cross-tab)', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'journal' }))
    expect(getStartPage()).toBe('journal')
  })

  it('offers Home and Journal options', () => {
    expect(START_PAGE_OPTIONS.map(o => o.id)).toEqual(['home', 'journal'])
  })
})

describe('StartPageGate', () => {
  it('renders Home on the initial landing by default', () => {
    renderRoutes('/')
    expect(screen.getByTestId('home-page')).toBeDefined()
    expect(screen.queryByTestId('journal-page')).toBeNull()
  })

  it('redirects the initial landing on / to the journal', () => {
    setStartPage('journal')
    renderRoutes('/')
    expect(screen.getByTestId('journal-page')).toBeDefined()
    expect(screen.queryByTestId('home-page')).toBeNull()
  })

  it('leaves in-session visits to / on Home (nav clicks, not just boot)', () => {
    setStartPage('journal')
    renderRoutes('/journal')
    expect(screen.getByTestId('journal-page')).toBeDefined()
    act(() => {
      screen.getByTestId('go-home').click()
    })
    expect(screen.getByTestId('home-page')).toBeDefined()
    expect(screen.queryByTestId('journal-page')).toBeNull()
  })

  it('does not redirect deep links to the journal', () => {
    setStartPage('journal')
    renderRoutes('/journal')
    expect(screen.getByTestId('journal-page')).toBeDefined()
  })
})
