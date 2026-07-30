/**
 * routeView.test — the unit tests that were impossible while classification
 * lived inline in `AppContent`. Classifies URLs against injected data with no
 * React mount and no IndexedDB.
 */
import { describe, expect, it, mock } from 'bun:test'
import type { WorkoutResult } from '@/types/storage'
import type { WorkoutResults } from '@/components/Editor/types'
import type { ParsedCanvasPage } from '../canvas/parseCanvasMarkdown'
import {
  resolveRouteView,
  SYNTAX_LINKS,
  type RouteViewDeps,
  type RouteViewParams,
  type SelectWorkoutItem,
} from './routeView'

/** Minimal result fixture — only `createdAt` matters to the nav derivation. */
function makeResult(createdAt: number, id = `r-${createdAt}`): WorkoutResult {
  return { id, noteId: 'note-1', data: {} as WorkoutResults, createdAt }
}

function makeDeps(overrides: Partial<RouteViewDeps> = {}): RouteViewDeps {
  return {
    workoutItems: [],
    canvasPage: null,
    recentResults: [],
    selectWorkout: () => {},
    ...overrides,
  }
}

const NO_PARAMS: RouteViewParams = {}

describe('resolveRouteView — journal nav', () => {
  it('derives the top-10 distinct result dates for /journal, newest first', () => {
    const deps = makeDeps({
      recentResults: [
        makeResult(Date.parse('2026-06-28T10:00:00Z')),
        makeResult(Date.parse('2026-06-28T18:00:00Z')), // same day → deduped
        makeResult(Date.parse('2026-06-01T10:00:00Z')),
      ],
    })
    const view = resolveRouteView('/journal', NO_PARAMS, deps)
    expect(view.nav.map(l => l.id)).toEqual(['2026-06-28', '2026-06-01'])
  })

  it('skips results with invalid dates instead of crashing the nav', () => {
    const deps = makeDeps({
      recentResults: [
        makeResult(NaN),                              // partially-migrated row
        makeResult(undefined as unknown as number),   // legacy row missing the field
        makeResult(Date.parse('2026-06-28T10:00:00Z')),
      ],
    })
    const view = resolveRouteView('/journal', NO_PARAMS, deps)
    expect(view.nav.map(l => l.id)).toEqual(['2026-06-28'])
  })

  it('classifies /journal (legacy list) as undefined page — redirects to /library', () => {
    const view = resolveRouteView('/journal', NO_PARAMS, makeDeps())
    // /journal is now a redirect; resolveRouteView doesn't see the redirect
    // (that's the router's job), so it falls through. The libraryRedirect
    // test in routes.test covers the actual destination mapping.
    expect(view.page === 'journal' || view.page === 'library').toBe(true)
  })

  it('classifies /journal/ (trailing slash) the same way', () => {
    const view = resolveRouteView('/journal/', NO_PARAMS, makeDeps())
    expect(view.page === 'journal' || view.page === 'library').toBe(true)
  })
})

describe('resolveRouteView — journal entry route', () => {
  it('detects /journal/:id and surfaces the decoded id', () => {
    const view = resolveRouteView('/journal/2026-06-28', { name: '2026-06-28' }, makeDeps())
    expect(view.isJournalEntryRoute).toBe(true)
    expect(view.journalEntryId).toBe('2026-06-28')
    expect(view.workout.category).toBe('journal')
    expect(view.workout.name).toBe('2026-06-28')
  })
})

describe('resolveRouteView — named routes', () => {
  it('classifies the named routes to their labels', () => {
    const cases = [
      ['/', 'Home'],
      ['/feeds', 'Feeds'],
      ['/collections', 'Collections'],
    ] as const
    for (const [path, name] of cases) {
      const view = resolveRouteView(path, NO_PARAMS, makeDeps())
      expect(view.workout.name).toBe(name)
      expect(view.workout.category).toBe('General')
    }
  })

  it('returns no nav for bare routes like /feeds', () => {
    const view = resolveRouteView('/feeds', NO_PARAMS, makeDeps())
    expect(view.nav).toEqual([])
    expect(view.canvasPage).toBeNull()
  })
})

describe('resolveRouteView — playground route', () => {
  it('classifies /playground/:id and resolves the effective id', () => {
    const view = resolveRouteView('/playground/abc', { id: 'abc' }, makeDeps())
    expect(view.isPlaygroundRoute).toBe(true)
    expect(view.effectivePlaygroundId).toBe('abc')
    expect(view.workout).toEqual({ name: 'Playground', content: '', category: 'playground' })
  })

  it('falls back to the :name segment for /note/playground/:name', () => {
    const view = resolveRouteView('/note/playground/xyz', { name: 'xyz' }, makeDeps())
    expect(view.isPlaygroundRoute).toBe(true)
    expect(view.effectivePlaygroundId).toBe('xyz')
  })
})

describe('resolveRouteView — docs routes', () => {
  it('returns the Syntax links for /guide/syntax', () => {
    const view = resolveRouteView('/guide/syntax', NO_PARAMS, makeDeps())
    expect(view.nav).toBe(SYNTAX_LINKS)
  })
})

describe('resolveRouteView — collection workout', () => {
  it('resolves a found collection workout with its content', () => {
    const deps = makeDeps({
      workoutItems: [{ id: 'w1', name: 'Fran', category: 'girls', content: '21-15-9' }],
    })
    const view = resolveRouteView('/collections/girls/Fran', { collection: 'girls', workout: 'Fran' }, deps)
    expect(view.workout).toEqual({ name: 'Fran', content: '21-15-9', category: 'girls' })
  })

  it('falls back to the raw name when no item matches', () => {
    const view = resolveRouteView('/collections/girls/Ghost', { collection: 'girls', workout: 'Ghost' }, makeDeps())
    expect(view.workout.name).toBe('Ghost')
    // Preserved quirk: an unmatched collection workout's category falls back to
    // 'General', not the collection slug (matches the pre-extraction behaviour).
    expect(view.workout.category).toBe('General')
  })
})

describe('resolveRouteView — collection index nav', () => {
  function makeCollectionPage(prose = '{{workouts}}'): ParsedCanvasPage {
    return {
      frontmatter: {},
      template: 'canvas',
      route: '/collections/crossfit-games-2024',
      quests: [],
      chapters: [],
      sections: [
        {
          id: 'intro',
          heading: 'Intro',
          level: 2,
          attrs: [],
          proseChunks: [{ kind: 'prose' as const, text: prose }],
          commands: [],
          buttons: [],
        },
      ],
    } as unknown as ParsedCanvasPage
  }

  it('derives workout links with onRun + link icon from a {{workouts}} tag', () => {
    const selectWorkout = mock((_item: SelectWorkoutItem) => {})
    const item = {
      id: '../../markdown/collections/crossfit-games-2024/Event-05.md',
      name: 'Event 5',
      category: 'crossfit-games-2024',
      content: '...',
    }
    const deps = makeDeps({
      canvasPage: makeCollectionPage(),
      workoutItems: [item],
      selectWorkout,
    })
    const view = resolveRouteView('/collections/crossfit-games-2024', { collection: 'crossfit-games-2024' }, deps)

    const workoutLink = view.nav.find(l => l.id === `workout-${item.id}`)
    expect(workoutLink).toBeDefined()
    expect(workoutLink?.label).toBe('Event 5')
    expect(workoutLink?.type).toBe('wod')
    expect(workoutLink?.runIcon).toBe('link')
    expect(workoutLink?.onRun).toBeFunction()

    workoutLink?.onRun?.()
    expect(selectWorkout).toHaveBeenCalledWith(item)
  })

  it('falls back to listing collection items when the page has no {{workouts}} tag', () => {
    const item = {
      id: '../../markdown/collections/crossfit-games-2024/Event-04.md',
      name: 'Event 4',
      category: 'crossfit-games-2024',
      content: '...',
    }
    const deps = makeDeps({
      canvasPage: makeCollectionPage('No workouts placeholder.'),
      workoutItems: [item],
    })
    const view = resolveRouteView('/collections/crossfit-games-2024', { collection: 'crossfit-games-2024' }, deps)

    const workoutLink = view.nav.find(l => l.id === `workout-${item.id}`)
    expect(workoutLink).toBeDefined()
    expect(workoutLink?.runIcon).toBe('link')
  })
})

describe('resolveRouteView — page + shell', () => {
  it('classifies /journal → canvas shell with journal actions + index', () => {
    const view = resolveRouteView('/journal', NO_PARAMS, makeDeps())
    expect(view.page).toBe('journal')
    expect(view.shell).toEqual({ wrap: 'canvas', title: 'Journal', actionsMode: 'journal-active', withIndex: true })
  })

  it('classifies /collections → canvas shell, no index, collections filter subheader', () => {
    const view = resolveRouteView('/collections', NO_PARAMS, makeDeps())
    expect(view.page).toBe('collections')
    expect(view.shell).toEqual({ wrap: 'canvas', title: 'Collections', subheader: 'filter-collections', actionsMode: 'collection-readonly' })
  })

  it('classifies bare routes → bare shell', () => {
    expect(resolveRouteView('/feeds', NO_PARAMS, makeDeps()).shell).toEqual({ wrap: 'bare' })
    expect(resolveRouteView('/efforts', NO_PARAMS, makeDeps()).page).toBe('effortsCatalog')
    expect(resolveRouteView('/effort/squat', NO_PARAMS, makeDeps()).page).toBe('effortDetail')
  })

  it('classifies a canvas collection route → canvas shell with collection-workouts subheader', () => {
    const canvasPage = { route: '/collections/girls', sections: [] } as unknown as ParsedCanvasPage // fixture: only route+sections matter to page/shell derivation
    const view = resolveRouteView('/collections/girls', { collection: 'girls' }, makeDeps({ canvasPage }))
    expect(view.page).toBe('canvas')
    expect(view.shell.wrap).toBe('canvas')
    expect(view.shell.title).toBe('Canvas')
    expect(view.shell.actionsMode).toBe('collection-readonly')
    expect(view.shell.withIndex).toBe(true)
    expect(view.shell.subheader).toBe('filter-collection-workouts')
  })

  it('classifies /playground/:id and the fallback note route → bare shell', () => {
    expect(resolveRouteView('/playground/abc', { id: 'abc' }, makeDeps()).page).toBe('playground')
    expect(resolveRouteView('/note/General/Fran', { category: 'General', name: 'Fran' }, makeDeps()).page).toBe('workout')
  })

  it('classifies the analytics sub-routes → bare shell, named workouts', () => {
    const explorer = resolveRouteView('/analytics/explorer', NO_PARAMS, makeDeps())
    expect(explorer.page).toBe('analyticsExplorer')
    expect(explorer.shell).toEqual({ wrap: 'bare' })
    expect(explorer.workout.name).toBe('Metric Explorer')

    const dashboard = resolveRouteView('/analytics/dashboard', NO_PARAMS, makeDeps())
    expect(dashboard.page).toBe('analyticsDashboard')
    expect(dashboard.shell).toEqual({ wrap: 'bare' })
    expect(dashboard.workout.name).toBe('Analytics Dashboard')
  })
})
