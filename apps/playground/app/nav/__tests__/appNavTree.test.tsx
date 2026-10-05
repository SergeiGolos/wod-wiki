import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { buildAppNavTree, appNavTree } from '../appNavTree'
import { ROUTE_PATTERNS } from '../../lib/routes'
import { withGroupBy, withoutWindow } from '../../lib/wqlEdits'
import { JOURNAL_STREAM_PROFILE, COLLECTIONS_STREAM_PROFILE } from '../../views/stream/streamProfile'
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

describe('appNavTree - Flattened listing zones', () => {
  afterEach(() => {
    cleanup()
  })

  it('flattens Library into Journal, Collections, Playgrounds L1 rows with no Library row', () => {
    const tree = buildAppNavTree(() => {})
    const l1 = tree.filter(item => item.level === 1).map(item => item.id)

    expect(l1).toEqual([
      'home',
      'journal',
      'collections',
      'playgrounds',
      'dashboards',
      'efforts',
      'sessions',
      'settings',
      'buy-me-a-coffee',
    ])
    expect(tree.find(item => item.id === 'library')).toBeUndefined()
  })

  it('exposes working WQL query presets as route ?q= links under Journal', () => {
    const tree = buildAppNavTree(() => {})
    const journal = tree.find(item => item.id === 'journal')!
    expect(journal.level).toBe(1)
    expect(journal.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })

    const byId = Object.fromEntries(journal.children!.map(child => [child.id, child]))
    const taggedWql = withGroupBy(JOURNAL_STREAM_PROFILE.defaultWql, 'tag')
    const allTimeWql = withoutWindow(JOURNAL_STREAM_PROFILE.defaultWql)

    // Landing runs the route default (no q).
    expect(byId['journal-all']!.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.journal })
    // Presets carry the query in the URL — the sidebar setQueryParam is a no-op.
    expect(byId['journal-by-tag']!.action).toEqual({
      type: 'route',
      to: `${ROUTE_PATTERNS.journal}?q=${encodeURIComponent(taggedWql)}`,
    })
    expect(byId['journal-all-time']!.action).toEqual({
      type: 'route',
      to: `${ROUTE_PATTERNS.journal}?q=${encodeURIComponent(allTimeWql)}`,
    })
    // Every preset query round-trips through the URL — the navigation/query
    // boundary: what the route's searchParams receive is the preset WQL.
    for (const child of journal.children!) {
      if (child.action.type !== 'route' || !child.action.to.includes('?q=')) continue
      const [, search] = child.action.to.split('?')
      expect(new URLSearchParams(search).get('q')).toBe(decodeURIComponent(child.action.to.split('?q=')[1]!))
    }
  })

  it('folds Feeds under Collections and lights Collections for feed routes', () => {
    const tree = buildAppNavTree(() => {})
    const collections = tree.find(item => item.id === 'collections')!
    const feeds = collections.children!.find(child => child.id === 'collections-feeds')

    expect(feeds).toBeDefined()
    expect(feeds!.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.feeds })

    expect(collections.isActive!(mockLocation('/collections'))).toBe(true)
    expect(collections.isActive!(mockLocation('/c/dan-john'))).toBe(true)
    expect(collections.isActive!(mockLocation('/feeds'))).toBe(true)
    expect(collections.isActive!(mockLocation('/feed/routines'))).toBe(true)
    expect(collections.isActive!(mockLocation('/journal'))).toBe(false)
    expect(collections.isActive!(mockLocation('/playgrounds'))).toBe(false)

    const journal = tree.find(item => item.id === 'journal')!
    const playgrounds = tree.find(item => item.id === 'playgrounds')!
    expect(journal.isActive!(mockLocation('/feeds'))).toBe(false)
    expect(playgrounds.isActive!(mockLocation('/feeds'))).toBe(false)
  })

  it('activates exactly one preset at the navigation/query boundary', () => {
    const tree = buildAppNavTree(() => {})
    const collections = tree.find(item => item.id === 'collections')!
    const byId = Object.fromEntries(collections.children!.map(child => [child.id, child]))
    const dateWql = withGroupBy(COLLECTIONS_STREAM_PROFILE.defaultWql, 'date')

    // Landing without q.
    const plain = mockLocation('/collections')
    expect(byId['collections-all']!.isActive!(plain)).toBe(true)
    expect(byId['collections-by-date']!.isActive!(plain)).toBe(false)

    // The by-date preset's own URL lights it and nothing else.
    const filtered = { ...mockLocation('/collections'), search: `?q=${encodeURIComponent(dateWql)}` }
    expect(byId['collections-by-date']!.isActive!(filtered)).toBe(true)
    expect(byId['collections-all']!.isActive!(filtered)).toBe(false)

    // Zone detail routes light no preset (family, not query state).
    const detail = mockLocation('/c/dan-john')
    expect(byId['collections-all']!.isActive!(detail)).toBe(false)
  })

  it('activates Playgrounds for /playgrounds, /playground notes, and the /library playground scope', () => {
    const tree = buildAppNavTree(() => {})
    const playgrounds = tree.find(item => item.id === 'playgrounds')!

    expect(playgrounds.isActive!(mockLocation('/playgrounds'))).toBe(true)
    expect(playgrounds.isActive!(mockLocation('/playground/example'))).toBe(true)
    const aliased = { ...mockLocation('/library'), search: `?q=${encodeURIComponent(':note{source:playground}')}` }
    expect(playgrounds.isActive!(aliased)).toBe(true)
    expect(playgrounds.isActive!(mockLocation('/journal'))).toBe(false)
  })

  it('renders the Collections L2 presets in NavSidebar on /collections', () => {
    render(
      <MemoryRouter initialEntries={['/collections']}>
        <NavProvider tree={appNavTree}>
          <NavSidebar />
        </NavProvider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('All collections').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feeds').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Library')).toHaveLength(0)
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
      to: `${ROUTE_PATTERNS.efforts}?q=:effort{discipline:strength}`,
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
      search: '?q=:effort{discipline:strength}',
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

  it('expands L1 submenu on tap without navigating (Journal, Settings)', () => {
    const path = renderMobileDrawer('/')

    // Journal is an L1 node with L2 children: the first tap only expands
    // the submenu, and the drawer stays open.
    act(() => {
      screen.getByText('Journal').click()
    })
    expect(screen.getAllByText('All entries').length).toBeGreaterThan(0)
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
