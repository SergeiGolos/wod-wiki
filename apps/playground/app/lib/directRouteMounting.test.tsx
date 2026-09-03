/**
 * directRouteMounting.test.tsx — Route cutover verification (Ticket 004).
 *
 * Verifies that:
 * 1. /journal, /collections, /feeds, /library, and /efforts mount directly
 *    under the unified queriable stream (routeView classifies them as 'library').
 * 2. Each route resolves to its route-aware StreamProfile with canonical WQL defaults.
 * 3. Legacy query parameters and bookmarks seamlessly migrate into canonical WQL queries.
 */
import { describe, it, expect } from 'bun:test'
import { resolveRouteView, type RouteViewDeps } from './routeView'
import {
  JOURNAL_STREAM_PROFILE,
  COLLECTIONS_STREAM_PROFILE,
  FEEDS_STREAM_PROFILE,
  LIBRARY_STREAM_PROFILE,
  EFFORTS_STREAM_PROFILE,
  resolveStreamProfile,
} from '../views/stream/streamProfile'

const NO_PARAMS = {}
function makeDeps(): RouteViewDeps {
  return {
    workoutItems: [],
    canvasPage: null,
    recentResults: [],
    selectWorkout: () => {},
  }
}

describe('Direct route mounting classification (routeView)', () => {
  it('classifies /journal and /journal/ directly to library with Journal title', () => {
    const v1 = resolveRouteView('/journal', NO_PARAMS, makeDeps())
    expect(v1.page).toBe('library')
    expect(v1.workout.name).toBe('Journal')
    expect(v1.shell).toEqual({ wrap: 'bare' })

    const v2 = resolveRouteView('/journal/', NO_PARAMS, makeDeps())
    expect(v2.page).toBe('library')
    expect(v2.workout.name).toBe('Journal')
    expect(v2.shell).toEqual({ wrap: 'bare' })
  })

  it('classifies /collections directly to library with Collections title', () => {
    const v = resolveRouteView('/collections', NO_PARAMS, makeDeps())
    expect(v.page).toBe('library')
    expect(v.workout.name).toBe('Collections')
    expect(v.shell).toEqual({ wrap: 'bare' })
  })

  it('classifies /feeds directly to library with Feeds title', () => {
    const v = resolveRouteView('/feeds', NO_PARAMS, makeDeps())
    expect(v.page).toBe('library')
    expect(v.workout.name).toBe('Feeds')
    expect(v.shell).toEqual({ wrap: 'bare' })
  })

  it('classifies /library directly to library with Library title', () => {
    const v = resolveRouteView('/library', NO_PARAMS, makeDeps())
    expect(v.page).toBe('library')
    expect(v.workout.name).toBe('Library')
    expect(v.shell).toEqual({ wrap: 'bare' })
  })

  it('classifies /efforts directly to library with Efforts title', () => {
    const v = resolveRouteView('/efforts', NO_PARAMS, makeDeps())
    expect(v.page).toBe('library')
    expect(v.workout.name).toBe('Efforts')
    expect(v.shell).toEqual({ wrap: 'bare' })
  })
})

describe('Route-aware stream profile resolution', () => {
  it('resolves canonical StreamProfile configurations per route', () => {
    expect(resolveStreamProfile('/journal')).toBe(JOURNAL_STREAM_PROFILE)
    expect(resolveStreamProfile('/journal').defaultWql).toBe('find:note{source:journal} last 2w')

    expect(resolveStreamProfile('/collections')).toBe(COLLECTIONS_STREAM_PROFILE)
    expect(resolveStreamProfile('/collections').defaultWql).toBe('find:note{source:collections} last 2w')

    expect(resolveStreamProfile('/feeds')).toBe(FEEDS_STREAM_PROFILE)
    expect(resolveStreamProfile('/feeds').defaultWql).toBe('find:note{source:feeds} last 2w')

    expect(resolveStreamProfile('/library')).toBe(LIBRARY_STREAM_PROFILE)
    expect(resolveStreamProfile('/library').defaultWql).toBe('find:note last 2w')

    expect(resolveStreamProfile('/efforts')).toBe(EFFORTS_STREAM_PROFILE)
    expect(resolveStreamProfile('/efforts').defaultWql).toBe('find:effort')
  })
})

describe('Legacy parameter migration across unified stream routes', () => {
  it('migrates legacy bookmarks on /journal into canonical WQL queries', () => {
    const legacy = JOURNAL_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('mode=plan'))).toBe('find:note{source:journal} last 2w')
    expect(legacy.toQuery(new URLSearchParams('mode=plan&s=2026-07-15&tags=pr'))).toBe('find:note{source:journal,tags:pr} last 2w')
    expect(legacy.toQuery(new URLSearchParams('text=snatch'))).toBe('find:note{source:journal,text:snatch} last 2w')
  })

  it('migrates legacy bookmarks on /collections into canonical WQL queries', () => {
    const legacy = COLLECTIONS_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('text=fran'))).toBe('find:note{source:collections,text:fran} last 2w')
    expect(legacy.toQuery(new URLSearchParams('timePreset=all'))).toBe('find:note{source:collections}')
  })

  it('migrates legacy bookmarks on /feeds into canonical WQL queries', () => {
    const legacy = FEEDS_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('s=2026-07-12'))).toBe('find:note{source:feeds} last 2w')
  })

  it('migrates legacy tri-state parameters on /library', () => {
    const legacy = LIBRARY_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('note=on&session=hide&post=hide'))).toBe('find:note{source:journal} last 2w')
    expect(legacy.toQuery(new URLSearchParams('note=hide&session=on&post=hide'))).toBe('find:note{source:collections} last 2w')
    expect(legacy.toQuery(new URLSearchParams('note=hide&session=hide&post=on'))).toBe('find:note{source:feeds} last 2w')
  })

  it('migrates legacy parameters and plain-text query on /efforts', () => {
    const legacy = EFFORTS_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('origin=bundled&discipline=strength'))).toBe('find:effort{origin:bundled,discipline:strength}')
    expect(legacy.salvageQ?.('fran', new URLSearchParams())).toBe('find:effort{text:fran}')
    expect(legacy.salvageQ?.('snatch balance', new URLSearchParams('discipline=weightlifting'))).toBe('find:effort{text:"snatch balance",discipline:weightlifting}')
  })
})
