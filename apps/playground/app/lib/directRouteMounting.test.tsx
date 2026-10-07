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
import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-engine'
import { resolveRouteView, type RouteViewDeps } from './routeView'
import {
  JOURNAL_STREAM_PROFILE,
  CATALOGS_STREAM_PROFILE,
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
    // Semantic, not spelling: the journal default scopes to the journal
    // source over a 4-week window regardless of head alias.
    const journalDefault = parseQuery(resolveStreamProfile('/journal').defaultWql)
    expect(isFindQuery(journalDefault)).toBe(true)
    if (isFindQuery(journalDefault)) {
      expect(journalDefault.filters.some((f) => f.key === 'source' && f.values.some((v) => v.value === 'journal'))).toBe(true)
      expect(journalDefault.window).toEqual({ kind: 'relative', size: 4, unit: 'w' })
    }

    expect(resolveStreamProfile('/collections')).toBe(COLLECTIONS_STREAM_PROFILE)
    expect(resolveStreamProfile('/collections').defaultWql).toBe(':collection{} by {tag}')

    expect(resolveStreamProfile('/catalogs')).toBe(CATALOGS_STREAM_PROFILE)
    expect(resolveStreamProfile('/catalogs').defaultWql).toBe(':catalog')

    expect(resolveStreamProfile('/feeds')).toBe(FEEDS_STREAM_PROFILE)
    expect(resolveStreamProfile('/feeds').defaultWql).toBe(':catalog{} last 2w')

    expect(resolveStreamProfile('/library')).toBe(LIBRARY_STREAM_PROFILE)
    expect(resolveStreamProfile('/library').defaultWql).toBe(':collection{} last 4w')

    expect(resolveStreamProfile('/efforts')).toBe(EFFORTS_STREAM_PROFILE)
    expect(resolveStreamProfile('/efforts').defaultWql).toBe(':effort')
  })
})

describe('Legacy parameter migration across unified stream routes', () => {
  it('migrates legacy bookmarks on /journal into canonical WQL queries', () => {
    const legacy = JOURNAL_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('mode=plan'))).toBe(':journal last 2w')
    expect(legacy.toQuery(new URLSearchParams('mode=plan&s=2026-07-15&tags=pr'))).toBe(':journal{tags:pr} last 2w')
    expect(legacy.toQuery(new URLSearchParams('text=snatch'))).toBe(':journal{text:snatch} last 2w')
  })

  it('migrates legacy bookmarks on /collections into canonical WQL queries', () => {
    const legacy = COLLECTIONS_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('text=fran'))).toBe(':catalog{text:fran} last 2w')
    expect(legacy.toQuery(new URLSearchParams('timePreset=all'))).toBe(':catalog')
  })

  it('migrates legacy bookmarks on /feeds into canonical WQL queries', () => {
    const legacy = FEEDS_STREAM_PROFILE.legacy!
    // The feeds scope is excised: the migrated query is an unscoped recent
    // note listing. Semantic check — window only, no source narrowing.
    const migrated = parseQuery(legacy.toQuery(new URLSearchParams('s=2026-07-12')) ?? '')
    expect(isFindQuery(migrated)).toBe(true)
    if (isFindQuery(migrated)) {
      expect(migrated.filters.filter((f) => f.key === 'source')).toHaveLength(0)
      expect(migrated.window).toEqual({ kind: 'relative', size: 2, unit: 'w' })
    }
  })

  it('migrates legacy tri-state parameters on /library', () => {
    const legacy = LIBRARY_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('note=on&session=hide&post=hide'))).toBe(':journal last 2w')
    expect(legacy.toQuery(new URLSearchParams('note=hide&session=on&post=hide'))).toBe(':catalog last 2w')
    // post=on mapped to the now-excised feeds scope: unscoped, same window.
    const postOnly = parseQuery(legacy.toQuery(new URLSearchParams('note=hide&session=hide&post=on')) ?? '')
    expect(isFindQuery(postOnly)).toBe(true)
    if (isFindQuery(postOnly)) {
      expect(postOnly.filters.filter((f) => f.key === 'source')).toHaveLength(0)
      expect(postOnly.window).toEqual({ kind: 'relative', size: 2, unit: 'w' })
    }
  })

  it('migrates legacy parameters and plain-text query on /efforts', () => {
    const legacy = EFFORTS_STREAM_PROFILE.legacy!
    expect(legacy.toQuery(new URLSearchParams('origin=bundled&discipline=strength'))).toBe(':effort{origin:bundled,discipline:strength}')
    expect(legacy.salvageQ?.('fran', new URLSearchParams())).toBe(':effort{text:fran}')
    expect(legacy.salvageQ?.('snatch balance', new URLSearchParams('discipline=weightlifting'))).toBe(':effort{text:"snatch balance",discipline:weightlifting}')
  })
})
