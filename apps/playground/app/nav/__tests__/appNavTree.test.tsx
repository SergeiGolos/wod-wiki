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

  it('folds Feeds under Collections and lights Collections for feed routes', () => {
    const tree = buildAppNavTree(() => {})
    const collections = tree.find(item => item.id === 'collections')!

    // The Feeds row itself renders in the zone's conditions panel (see the
    // NavSidebar smoke below); the tree-level contract is the activation.
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

  it('activates Playgrounds for /playgrounds, /playground notes, and the /library playground scope', () => {
    const tree = buildAppNavTree(() => {})
    const playgrounds = tree.find(item => item.id === 'playgrounds')!

    expect(playgrounds.isActive!(mockLocation('/playgrounds'))).toBe(true)
    expect(playgrounds.isActive!(mockLocation('/playground/example'))).toBe(true)
    const aliased = { ...mockLocation('/library'), search: `?q=${encodeURIComponent(':note{source:playground}')}` }
    expect(playgrounds.isActive!(aliased)).toBe(true)
    expect(playgrounds.isActive!(mockLocation('/journal'))).toBe(false)
  })

  it('renders the Collections conditions panel rows in NavSidebar on /collections', () => {
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

  it('defines L1 efforts item routed to /efforts with the shared conditions panel', () => {
    const tree = buildAppNavTree(() => {})
    const efforts = tree.find(item => item.id === 'efforts')

    expect(efforts).toBeDefined()
    expect(efforts?.label).toBe('Efforts')
    expect(efforts?.action).toEqual({ type: 'route', to: ROUTE_PATTERNS.efforts })
    // Discipline conditions live in the shared current-result panel now.
    expect(efforts?.panel).toBeDefined()
  })

  it('activates efforts L1 for /efforts and /effort/:slug routes', () => {
    const tree = buildAppNavTree(() => {})
    const efforts = tree.find(item => item.id === 'efforts')!

    expect(efforts.isActive!(mockLocation('/efforts'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/effort/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/e/push-up'))).toBe(true)
    expect(efforts.isActive!(mockLocation('/journal'))).toBe(false)
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
    // Sidebar order: the coffee row trails the Settings section.
    render(
      <MemoryRouter initialEntries={['/settings']}>
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

