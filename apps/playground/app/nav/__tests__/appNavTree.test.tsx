import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

  it('defines L1 library item with L2 children ordered Journal, Collections, Feeds, Playground, Efforts, Results', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')

    expect(library).toBeDefined()
    expect(library?.label).toBe('Library')
    expect(library?.level).toBe(1)
    expect(library?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.library })
    expect(library?.children).toBeDefined()
    expect(library?.children?.length).toBe(6)

    const [journal, collections, feeds, playground, efforts, results] = library!.children!

    expect(journal.id).toBe('library-journal')
    expect(journal.label).toBe('Journal')
    expect(journal.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })

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

  it('activates library L1 for /library, /journal, /collections, /feeds, /feed, /effort, and /results', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!

    expect(library.isActive!(mockLocation('/library'))).toBe(true)
    expect(library.isActive!(mockLocation('/journal'))).toBe(true)
    expect(library.isActive!(mockLocation('/collections'))).toBe(true)
    expect(library.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(library.isActive!(mockLocation('/feed'))).toBe(true)
    expect(library.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(library.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(library.isActive!(mockLocation('/results'))).toBe(true)
    expect(library.isActive!(mockLocation('/results/res-42'))).toBe(true)
    expect(library.isActive!(mockLocation('/playground/example'))).toBe(true)
    expect(tree.find(item => item.id === 'home')!.isActive!(mockLocation('/playground/example'))).toBe(false)
    expect(library.isActive!(mockLocation('/dashboard'))).toBe(false)
  })

  it('activates appropriate L2 child based on route', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!
    const [journal, collections, feeds, playground, efforts, results] = library.children!

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

    expect(journal.isActive!(mockLocation('/journal'))).toBe(true)
    expect(journal.isActive!(mockLocation('/journal/2026-09-03'))).toBe(true)

    expect(efforts.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/library'))).toBe(false)

    expect(results.isActive!(mockLocation('/results'))).toBe(true)
    expect(results.isActive!(mockLocation('/results/res-42'))).toBe(true)
    expect(results.isActive!(mockLocation('/efforts'))).toBe(false)
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

    expect(screen.getAllByText('Playground').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Efforts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Results').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feeds').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collections').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0)
  })

  it('renders L2 menu items in NavSidebar when on /journal', () => {
    render(
      <MemoryRouter initialEntries={['/journal']}>
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
})

describe('appNavTree - Settings navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('defines L1 settings item with L2 children for Appearance and System', () => {
    const tree = buildAppNavTree(() => {})
    const settings = tree.find(item => item.id === 'settings')

    expect(settings).toBeDefined()
    expect(settings?.label).toBe('Settings')
    expect(settings?.level).toBe(1)
    expect(settings?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsAppearance })
    expect(settings?.children).toBeDefined()
    expect(settings?.children?.length).toBe(2)

    const [appearance, system] = settings!.children!

    expect(appearance.id).toBe('settings-appearance')
    expect(appearance.label).toBe('Appearance')
    expect(appearance.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsAppearance })

    expect(system.id).toBe('settings-system')
    expect(system.label).toBe('System')
    expect(system.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsSystem })
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
    const [appearance, system] = settings.children!

    expect(appearance.isActive!(mockLocation('/settings'))).toBe(true)
    expect(appearance.isActive!(mockLocation('/settings/appearance'))).toBe(true)
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

  it('sits directly above Settings with an external support-link action', () => {
    const tree = buildAppNavTree(() => {})
    const coffee = tree.find(item => item.id === 'buy-me-a-coffee')

    expect(coffee).toBeDefined()
    expect(coffee?.label).toBe('Buy Me a Coffee')
    expect(coffee?.action).toEqual({
      type: 'external',
      href: 'https://www.buymeacoffee.com/sergeigolos',
    })
    // Drawer order: the coffee row renders just above Settings.
    expect(tree.findIndex(item => item.id === 'buy-me-a-coffee')).toBe(
      tree.findIndex(item => item.id === 'settings') - 1,
    )
  })

  it('renders the labeled coffee row in the NavSidebar drawer above Settings', () => {
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
