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
    expect(screen.getByText('Appearance')).toBeDefined()
    expect(screen.getByText('System')).toBeDefined()
  })
})
