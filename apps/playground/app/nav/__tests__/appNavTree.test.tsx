import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
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

  it('defines L1 library item with default route /journal, and L2 children ordered Journal, Collections, Feeds, Playgrounds', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')

    expect(library).toBeDefined()
    expect(library?.label).toBe('Library')
    expect(library?.level).toBe(1)
    expect(library?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })
    expect(library?.children).toBeDefined()
    expect(library?.children?.length).toBe(4)

    const [journal, collections, feeds, playground] = library!.children!

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
    expect(playground.label).toBe('Playgrounds')
    expect(playground.action).toEqual({
      type: 'route',
      to: ROUTE_PATTERNS.playgrounds,
    })
  })

  it('orders Library directly after Home', () => {
    const tree = buildAppNavTree(() => {})
    const l1Ids = tree.filter(item => item.level === 1).map(item => item.id)
    expect(l1Ids.indexOf('home')).toBe(0)
    expect(l1Ids.indexOf('library')).toBe(1)
  })

  it('activates library L1 for /library, /journal, /collections, /feeds, /feed, and /playground routes', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!

    expect(library.isActive!(mockLocation('/library'))).toBe(true)
    expect(library.isActive!(mockLocation('/journal'))).toBe(true)
    expect(library.isActive!(mockLocation('/journal/2026-09-14'))).toBe(true)
    expect(library.isActive!(mockLocation('/collections'))).toBe(true)
    expect(library.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(library.isActive!(mockLocation('/feed'))).toBe(true)
    expect(library.isActive!(mockLocation('/playground/example'))).toBe(true)
    expect(library.isActive!(mockLocation('/dashboard'))).toBe(false)
    expect(library.isActive!(mockLocation('/efforts'))).toBe(false)
  })

  it('activates appropriate L2 child based on route', () => {
    const tree = buildAppNavTree(() => {})
    const library = tree.find(item => item.id === 'library')!
    const [journal, collections, feeds, playground] = library.children!

    expect(journal.isActive!(mockLocation('/journal'))).toBe(true)
    expect(journal.isActive!(mockLocation('/journal/2026-09-14'))).toBe(true)
    expect(journal.isActive!(mockLocation('/feeds'))).toBe(false)

    expect(collections.isActive!(mockLocation('/collections'))).toBe(true)
    expect(collections.isActive!(mockLocation('/c/dan-john'))).toBe(true)
    expect(collections.isActive!(mockLocation('/feeds'))).toBe(false)

    expect(feeds.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/feed'))).toBe(true)
    expect(feeds.isActive!(mockLocation('/collections'))).toBe(false)
    expect(feeds.isActive!(mockLocation('/journal'))).toBe(false)
    const playgroundLoc = { ...mockLocation('/library'), search: `?q=${encodeURIComponent('find:note{source:playground}')}` }
    expect(playground.isActive!(playgroundLoc)).toBe(true)
    expect(playground.isActive!(mockLocation('/playground/example'))).toBe(true)
    expect(playground.isActive!(mockLocation('/playgrounds'))).toBe(true)
    expect(playground.isActive!(mockLocation('/journal'))).toBe(false)
  })

  it('renders L2 menu items in NavSidebar when on /library', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collections').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feeds').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Playgrounds').length).toBeGreaterThan(0)
  })
})

describe('appNavTree - Efforts navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('defines L1 efforts item with L2 tags for sub filters', () => {
    const tree = buildAppNavTree(() => {})
    const efforts = tree.find(item => item.id === 'efforts')

    expect(efforts).toBeDefined()
    expect(efforts?.label).toBe('Efforts')
    expect(efforts?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.efforts })
    expect(efforts?.children).toBeDefined()
    expect(efforts?.children?.length).toBeGreaterThan(1)

    const [allTag, ...discTags] = efforts!.children!
    expect(allTag.id).toBe('effort-tag-all')
    expect(allTag.label).toBe('All Efforts')
    expect(allTag.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.efforts })

    const strengthTag = discTags.find(t => t.id === 'effort-tag-strength')
    expect(strengthTag).toBeDefined()
    expect(strengthTag?.label).toBe('Strength')
    expect(strengthTag?.action).toEqual({
      type: 'route',
      to: `${ROUTE_PATTERNS.efforts}?q=find:effort{discipline:strength}`,
    })
  })

  it('activates efforts L1 for /efforts and /effort/:slug routes', () => {
    const tree = buildAppNavTree(() => {})
    const efforts = tree.find(item => item.id === 'efforts')!

    expect(efforts.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/e/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/journal'))).toBe(false)
  })

  it('activates appropriate tag child based on query param', () => {
    const tree = buildAppNavTree(() => {})
    const efforts = tree.find(item => item.id === 'efforts')!
    const [allTag, ...discTags] = efforts.children!
    const strengthTag = discTags.find(t => t.id === 'effort-tag-strength')!

    expect(allTag.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(strengthTag.isActive!(mockLocation('/efforts'))).toBe(false)

    const filteredLoc = {
      ...mockLocation('/efforts'),
      search: '?q=find:effort{discipline:strength}',
    }
    expect(allTag.isActive!(filteredLoc)).toBe(false)
    expect(strengthTag.isActive!(filteredLoc)).toBe(true)
  })
})

describe('appNavTree - Sessions navigation', () => {
  afterEach(() => {
    cleanup()
  })

  it('defines L1 sessions item with panel', () => {
    const tree = buildAppNavTree(() => {})
    const sessions = tree.find(item => item.id === 'sessions')

    expect(sessions).toBeDefined()
    expect(sessions?.label).toBe('Sessions')
    expect(sessions?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.sessions })
    expect(sessions?.panel).toBeDefined()
  })

  it('activates sessions L1 for /sessions, /session/:date, and /results', () => {
    const tree = buildAppNavTree(() => {})
    const sessions = tree.find(item => item.id === 'sessions')!

    expect(sessions.isActive!(mockLocation('/sessions'))).toBe(true)
    expect(sessions.isActive!(mockLocation('/sessions/session-123'))).toBe(true)
    expect(sessions.isActive!(mockLocation('/session/2026-09-17'))).toBe(true)
    expect(sessions.isActive!(mockLocation('/results'))).toBe(true)
    expect(sessions.isActive!(mockLocation('/efforts'))).toBe(false)
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
    expect(settings?.children?.length).toBe(4)

    const [appearance, queries, tags, system] = settings!.children!

    expect(appearance.id).toBe('settings-appearance')
    expect(appearance.label).toBe('Appearance')
    expect(appearance.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsAppearance })

    expect(queries.id).toBe('settings-queries')
    expect(queries.label).toBe('Query Defaults')
    expect(queries.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsQueries })

    expect(tags.id).toBe('settings-tags')
    expect(tags.label).toBe('Tags')
    expect(tags.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.settingsTags })

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
    const [appearance, queries, tags, system] = settings.children!

    expect(appearance.isActive!(mockLocation('/settings'))).toBe(true)
    expect(appearance.isActive!(mockLocation('/settings/appearance'))).toBe(true)

    expect(queries.isActive!(mockLocation('/settings/queries'))).toBe(true)
    expect(queries.isActive!(mockLocation('/settings/appearance'))).toBe(false)
    expect(appearance.isActive!(mockLocation('/settings/system'))).toBe(false)
    expect(tags.isActive!(mockLocation('/settings/tags'))).toBe(true)
    expect(tags.isActive!(mockLocation('/settings/appearance'))).toBe(false)


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

  it('expands L1 submenu on tap without navigating (Library, Settings)', () => {
    const path = renderMobileDrawer('/')

    // Library is an L1 node with L2 children: the first tap only expands
    // the submenu, and the drawer stays open.
    act(() => {
      screen.getByText('Library').click()
    })
    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0)
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
