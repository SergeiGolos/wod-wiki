import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { buildAppNavTree, appNavTree } from '../appNavTree'
import { ROUTE_PATTERNS } from '../../lib/routes'
import { NavProvider } from '../NavContext'
import { NavSidebar } from '../NavSidebar'

function mockLocation(pathname: string): Location {
  return {
    pathname,
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }
}

describe('appNavTree - Library navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('defines L1 library item with L2 children for Explore, Feeds, Collections, and Journal', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')

    expect(library).toBeDefined()
    expect(library?.label).toBe('Library')
    expect(library?.level).toBe(1)
    expect(library?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.library })
    expect(library?.children).toBeDefined()
    expect(library?.children?.length).toBe(4)

    const [explore, feeds, collections, journal] = library!.children!

    expect(explore.id).toBe('library-explore')
    expect(explore.label).toBe('Explore')
    expect(explore.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.library })

    expect(feeds.id).toBe('library-feeds')
    expect(feeds.label).toBe('Feeds')
    expect(feeds.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.feeds })

    expect(collections.id).toBe('library-collections')
    expect(collections.label).toBe('Collections')
    expect(collections.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.collections })

    expect(journal.id).toBe('library-journal')
    expect(journal.label).toBe('Journal')
    expect(journal.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })
  })

  it('activates library L1 for /library, /journal, /collections, /feeds, and /feed', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!

    expect(library.isActive!(mockLocation('/library'))).toBe(true)
    expect(library.isActive!(mockLocation('/journal'))).toBe(true)
    expect(library.isActive!(mockLocation('/collections'))).toBe(true)
    expect(library.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(library.isActive!(mockLocation('/feed'))).toBe(true)
    expect(library.isActive!(mockLocation('/dashboard'))).toBe(false)
  })

  it('activates appropriate L2 child based on route', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!
    const [explore, feeds, collections, journal] = library.children!

    expect(explore.isActive!(mockLocation('/library'))).toBe(true)
    expect(explore.isActive!(mockLocation('/journal'))).toBe(false)

    expect(feeds.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/feed'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/library'))).toBe(false)

    expect(collections.isActive!(mockLocation('/collections'))).toBe(true)
    expect(collections.isActive!(mockLocation('/collections/dan-john'))).toBe(true)
    expect(collections.isActive!(mockLocation('/library'))).toBe(false)

    expect(journal.isActive!(mockLocation('/journal'))).toBe(true)
    expect(journal.isActive!(mockLocation('/journal/2026-09-03'))).toBe(true)
    expect(journal.isActive!(mockLocation('/library'))).toBe(false)
  })

  it('renders L2 menu items in NavSidebar when on /library', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Explore')).toBeDefined()
    expect(screen.getByText('Feeds')).toBeDefined()
    expect(screen.getByText('Collections')).toBeDefined()
    expect(screen.getByText('Journal')).toBeDefined()
  })

  it('renders L2 menu items in NavSidebar when on /journal', () => {
    render(
      <MemoryRouter initialEntries={['/journal']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Explore')).toBeDefined()
    expect(screen.getByText('Feeds')).toBeDefined()
    expect(screen.getByText('Collections')).toBeDefined()
    expect(screen.getByText('Journal')).toBeDefined()
  })
})
