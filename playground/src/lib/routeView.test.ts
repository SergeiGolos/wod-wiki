/**
 * routeView.test — the unit tests that were impossible while classification
 * lived inline in `AppContent`. Classifies URLs against injected data with no
 * React mount and no IndexedDB.
 */
import { describe, expect, it } from 'bun:test'
import type { WorkoutResult } from '@/types/storage'
import type { WorkoutResults } from '@/components/Editor/types'
import type { ParsedCanvasPage } from '../canvas/parseCanvasMarkdown'
import {
  resolveRouteView,
  SYNTAX_LINKS,
  type RouteViewDeps,
  type RouteViewParams,
} from './routeView'

/** Minimal result fixture — only `completedAt` matters to the nav derivation. */
function makeResult(completedAt: number, id = `r-${completedAt}`): WorkoutResult {
  return { id, noteId: 'note-1', data: {} as WorkoutResults, completedAt }
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

  it('classifies /journal as the journal list, not an entry', () => {
    const view = resolveRouteView('/journal', NO_PARAMS, makeDeps())
    expect(view.isJournalEntryRoute).toBe(false)
    expect(view.workout.name).toBe('Journal')
    expect(view.workout.category).toBe('General')
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
})
