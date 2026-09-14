import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { buildAppNavTree, appNavTree, PLAYGROUND_LIBRARY_WQL } from '../appNavTree'
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

  it('defines L1 explore group without a page, with L2 children ordered Collections, Feeds, Playground, Efforts, Results', () => {
    const tree = buildAppNavTree(() => {})
    const explore = tree.find(item => item.id === 'explore')

    expect(explore).toBeDefined()
    expect(explore?.label).toBe('Explore')
    expect(explore?.level).toBe(1)
    // Group node — no page of its own; tapping expands instead.
    expect(explore?.action).toBeUndefined()
    expect(explore?.children).toBeDefined()
    expect(explore?.children?.length).toBe(5)

    const [collections, feeds, playground, efforts, results] = explore!.children!

    expect(collections.id).toBe('library-collections')
    expect(collections.label).toBe('Collections')
    expect(collections.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.collections })

    expect(feeds.id).toBe('library-feeds')
    expect(feeds.label).toBe('Feeds')
    expect(feeds.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.feeds })

    expect(playground.id).toBe('library-playground')
    expect(playground.label).toBe('Playground')
    expect(playground.action).toEqual({
      type: 'route',
      to: `/library?q=${encodeURIComponent(PLAYGROUND_LIBRARY_WQL)}`,
    })

    expect(efforts.id).toBe('library-efforts')
    expect(efforts.label).toBe('Efforts')
    expect(efforts.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.efforts })

    expect(results.id).toBe('library-results')
    expect(results.label).toBe('Results')
    expect(results.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.results })
  })

  it('defines a top-level Journal item ordered above Explore', () => {
    const tree = buildAppNavTree(() => {})
    const journal = tree.find(item => item.id === 'journal')

    expect(journal).toBeDefined()
    expect(journal?.label).toBe('Journal')
    expect(journal?.level).toBe(1)
    expect(journal?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })
    expect(journal?.children).toBeUndefined()

    const l1Ids = tree.filter(item => item.level === 1).map(item => item.id)
    expect(l1Ids.indexOf('journal')).toBeLessThan(l1Ids.indexOf('explore'))
  })

  it('activates journal L1 for /journal routes', () => {
    const tree = buildAppNavTree(() => {})
    const journal = tree.find(item => item.id === 'journal')!

    expect(journal.isActive!(mockLocation('/journal'))).toBe(true)
    expect(journal.isActive!(mockLocation('/journal/2026-09-14'))).toBe(true)
  })

  it('activates explore L1 for /library, /collections, /feeds, /feed, /effort, and /results', () => {
    const tree = buildAppNavTree(() => {})
    const explore = tree.find(item => item.id === 'explore')!

    expect(explore.isActive!(mockLocation('/library'))).toBe(true)
    expect(explore.isActive!(mockLocation('/journal'))).toBe(false)
    expect(explore.isActive!(mockLocation('/collections'))).toBe(true)
    expect(explore.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(explore.isActive!(mockLocation('/feed'))).toBe(true)
    expect(explore.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(explore.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(explore.isActive!(mockLocation('/results'))).toBe(true)
    expect(explore.isActive!(mockLocation('/results/res-42'))).toBe(true)
    expect(explore.isActive!(mockLocation('/playground/example'))).toBe(true)
    expect(tree.find(item => item.id === 'home')!.isActive!(mockLocation('/playground/example'))).toBe(false)
    expect(explore.isActive!(mockLocation('/dashboard'))).toBe(false)
  })

  it('activates appropriate L2 child based on route', () => {
    const tree = buildAppNavTree(() => {})
    const explore = tree.find(item => item.id === 'explore')!
    const [collections, feeds, playground, efforts, results] = explore.children!

    const playgroundLoc = { ...mockLocation('/library'), search: `?q=${encodeURIComponent('find:note{source:playground}')}` }
    expect(playground.isActive!(playgroundLoc)).toBe(true)
    expect(playground.isActive!(mockLocation('/library'))).toBe(false)
    expect(playground.isActive!(mockLocation('/playground/example'))).toBe(true)
    expect(playground.isActive!({ ...playgroundLoc, search: `?q=${encodeURIComponent('find:note{!source:playground}')}` })).toBe(false)

    expect(feeds.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/feed'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/library'))).toBe(false)

    expect(collections.isActive!(mockLocation('/collections'))).toBe(true)
    expect(collections.isActive!(mockLocation('/collections/dan-john'))).toBe(true)
    expect(collections.isActive!(mockLocation('/library'))).toBe(false)

    expect(efforts.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/library'))).toBe(false)

    expect(results.isActive!(mockLocation('/results'))).toBe(true)
    expect(results.isActive!(mockLocation('/results/res-42'))).toBe(true)
    expect(results.isActive!(mockLocation('/efforts'))).toBe(false)
  })

  it('renders L2 menu items in NavSidebar when on /library', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Playground').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Efforts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Results').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feeds').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collections').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0)
  })

  it('renders the journal L1 without explore children when on /journal', () => {
    render(
      <MemoryRouter initialEntries={['/journal']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0)
    // Explore is a group without a page: on /journal its children stay hidden.
    expect(screen.queryByText('Collections')).toBeNull()
  })
})

describe('appNavTree - Settings navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('defines L1 settings item with L2 children for Appearance, System, and Query Defaults', () => {
    const tree = buildAppNavTree(() => {})
    const settings = tree.find(item => item.id === 'settings')

    expect(settings).toBeDefined()
    expect(settings?.label).toBe('Settings')
    expect(settings?.level).toBe(1)
    expect(settings?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsAppearance })
    expect(settings?.children).toBeDefined()
    expect(settings?.children?.length).toBe(3)

    const [appearance, system, queries] = settings!.children!

    expect(appearance.id).toBe('settings-appearance')
    expect(appearance.label).toBe('Appearance')
    expect(appearance.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsAppearance })

    expect(system.id).toBe('settings-system')
    expect(system.label).toBe('System')
    expect(system.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsSystem })

    expect(queries.id).toBe('settings-queries')
    expect(queries.label).toBe('Query Defaults')
    expect(queries.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsQueries })
  })

  it('activates settings L1 for /settings, /settings/appearance, and /settings/system', () => {
    const tree = buildAppNavTree(() => {})
    const settings = tree.find(item => item.id === 'settings')!

    expect(settings.isActive!(mockLocation('/settings'))).toBe(true)
    expect(settings.isActive!(mockLocation('/settings/appearance'))).toBe(true)
    expect(settings.isActive!(mockLocation('/settings/system'))).toBe(true)
    expect(settings.isActive!(mockLocation('/library'))).toBe(false)
  })
  it('activates appropriate L2 child based on route', () => {
    const tree = buildAppNavTree(() => {})
    const settings = tree.find(item => item.id === 'settings')!
    const [appearance, system, queries] = settings.children!

    expect(appearance.isActive!(mockLocation('/settings'))).toBe(true)
    expect(appearance.isActive!(mockLocation('/settings/appearance'))).toBe(true)

    expect(queries.isActive!(mockLocation('/settings/queries'))).toBe(true)
    expect(queries.isActive!(mockLocation('/settings/appearance'))).toBe(false)
    expect(appearance.isActive!(mockLocation('/settings/system'))).toBe(false)

    expect(system.isActive!(mockLocation('/settings/system'))).toBe(true)
    expect(system.isActive!(mockLocation('/settings/appearance'))).toBe(false)
  })

  it('renders L2 menu items in NavSidebar when on /settings/appearance', () => {
    render(
      <MemoryRouter initialEntries={['/settings/appearance']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Appearance')[0]).toBeDefined()
    expect(screen.getAllByText('System')[0]).toBeDefined()
  })
})

describe('appNavTree - Buy Me a Coffee', () => {
  afterEach(() => {
    cleanup()
  })

  it('sits directly below Settings with an external support-link action', () => {
    const tree = buildAppNavTree(() => {})
    const coffee = tree.find(item => item.id === 'buy-me-a-coffee')

    expect(coffee).toBeDefined()
    expect(coffee?.label).toBe('Buy Me a Coffee')
    expect(coffee?.action).toEqual({
      type: 'external',
      href: 'https://www.buymeacoffee.com/sergeigolos',
    })
    // Drawer order: the coffee row renders just below Settings.
    expect(tree.findIndex(item => item.id === 'buy-me-a-coffee')).toBe(
      tree.findIndex(item => item.id === 'settings') + 1,
    )
  })

  it('renders the labeled coffee row in the NavSidebar drawer below Settings', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    const coffee = screen.getByText('Buy Me a Coffee')
    expect(coffee).toBeDefined()
    // Icon + label: the row's clickable item carries the coffee SVG.
    expect(coffee.closest('[data-slot]')?.querySelector('svg')).not.toBeNull()
  })
})

describe('appNavTree - Mobile drawer L1 taps', () => {
  afterEach(() => {
    cleanup()
  })

  function renderMobileDrawer(initialPath: string) {
    let path = initialPath
    function PathProbe() {
      const location = useLocation()
      useEffect(() => {
        path = location.pathname
      })
      return null
    }
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <NavProvider tree={appNavTree}>
          <PathProbe />
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )
    return () => path
  }

  it('expands L1 submenu on tap without navigating (Explore, Settings)', () => {
    const path = renderMobileDrawer('/')

    // Explore is a group node with L2 children: the first tap only expands
    // the submenu — no page of its own — and the drawer stays open.
    act(() => {
      screen.getByText('Explore').click()
    })
    expect(screen.getAllByText('Collections').length).toBeGreaterThan(0)
    expect(path()).toBe('/')

    // Same for Settings: expand first, pick a subitem on the next tap.
    act(() => {
      screen.getByText('Settings').click()
    })
    expect(screen.getAllByText('Appearance').length).toBeGreaterThan(0)
    expect(path()).toBe('/')
  })

  it('navigates Home directly on tap', () => {
    const path = renderMobileDrawer('/settings/appearance')

    act(() => {
      screen.getByText('Home').click()
    })
    expect(path()).toBe('/')
  })
})
