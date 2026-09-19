import { describe, it, expect } from 'bun:test'
import {
  JOURNAL_STREAM_PROFILE,
  COLLECTIONS_STREAM_PROFILE,
  FEEDS_STREAM_PROFILE,
  LIBRARY_STREAM_PROFILE,
  EFFORTS_STREAM_PROFILE,
  SESSIONS_STREAM_PROFILE,
  PLAYGROUNDS_STREAM_PROFILE,
  getStreamProfile,
  resolveStreamProfile,
  isStreamRoute,
} from './streamProfile'

describe('streamProfile presets', () => {
  it('defines the Journal stream profile', () => {
    expect(JOURNAL_STREAM_PROFILE.route).toBe('/journal')
    expect(JOURNAL_STREAM_PROFILE.defaultWql).toBe('find:note{source:journal} last 4w')
    expect(JOURNAL_STREAM_PROFILE.level).toBe('note')
    expect(JOURNAL_STREAM_PROFILE.typeOptions).toEqual(['journal'])
  })

  it('defines the Collections stream profile', () => {
    expect(COLLECTIONS_STREAM_PROFILE.route).toBe('/collections')
    expect(COLLECTIONS_STREAM_PROFILE.defaultWql).toBe('find:note{source:collections} by {tag}')
    expect(COLLECTIONS_STREAM_PROFILE.level).toBe('session')
    expect(COLLECTIONS_STREAM_PROFILE.typeOptions).toEqual(['collections'])
  })

  it('defines the Feeds stream profile', () => {
    expect(FEEDS_STREAM_PROFILE.route).toBe('/feeds')
    expect(FEEDS_STREAM_PROFILE.defaultWql).toBe('find:note{source:feeds} last 2w')
    expect(FEEDS_STREAM_PROFILE.level).toBe('note')
    expect(FEEDS_STREAM_PROFILE.typeOptions).toEqual(['feeds'])
  })

  it('defines the Library stream profile', () => {
    expect(LIBRARY_STREAM_PROFILE.route).toBe('/library')
    expect(LIBRARY_STREAM_PROFILE.defaultWql).toBe('find:note{source:collections} last 4w')
    expect(LIBRARY_STREAM_PROFILE.level).toBe('note')
    expect(LIBRARY_STREAM_PROFILE.typeOptions).toEqual(['notes', 'journal', 'collections', 'feeds', 'playground', 'blocks'])
  })

  it('defines the Efforts stream profile', () => {
    expect(EFFORTS_STREAM_PROFILE.route).toBe('/efforts')
    expect(EFFORTS_STREAM_PROFILE.defaultWql).toBe('find:effort')
    expect(EFFORTS_STREAM_PROFILE.level).toBe('effort')
    expect(EFFORTS_STREAM_PROFILE.typeOptions).toEqual(['efforts'])
  })

  it('defines the Sessions stream profile (/sessions, rebranded from /results)', () => {
    expect(SESSIONS_STREAM_PROFILE.route).toBe('/sessions')
    expect(SESSIONS_STREAM_PROFILE.defaultWql).toBe('rows:all{} last 4w')
    expect(SESSIONS_STREAM_PROFILE.level).toBe('result')
    expect(SESSIONS_STREAM_PROFILE.typeOptions).toEqual(['rows'])
  })

  it('defines the Playgrounds stream profile', () => {
    expect(PLAYGROUNDS_STREAM_PROFILE.route).toBe('/playgrounds')
    expect(PLAYGROUNDS_STREAM_PROFILE.defaultWql).toBe('find:note{source:playground} last 4w')
    expect(PLAYGROUNDS_STREAM_PROFILE.level).toBe('note')
    expect(PLAYGROUNDS_STREAM_PROFILE.typeOptions).toEqual(['playground'])
  })

  it('carries a display title per stream surface — deriveWorkout reads these', () => {
    expect(LIBRARY_STREAM_PROFILE.title).toBe('Library')
    expect(JOURNAL_STREAM_PROFILE.title).toBe('Journal')
    expect(COLLECTIONS_STREAM_PROFILE.title).toBe('Collections')
    expect(FEEDS_STREAM_PROFILE.title).toBe('Feeds')
    expect(EFFORTS_STREAM_PROFILE.title).toBe('Efforts')
    expect(SESSIONS_STREAM_PROFILE.title).toBe('Sessions')
    expect(PLAYGROUNDS_STREAM_PROFILE.title).toBe('Playgrounds')
  })

  it('owns a per-surface secondary rail — the composition seam for rebranded routes', () => {
    // Library and journal keep the shared recent-entries rail (existing behavior)
    const libraryRail = LIBRARY_STREAM_PROFILE.secondary?.[0]
    expect(libraryRail).toMatchObject({ kind: 'wql', id: 'recent-entries', label: 'Recent entries' })
    expect(JOURNAL_STREAM_PROFILE.secondary?.[0]?.id).toBe('recent-entries')

    // Sessions lists its own records, linked into the sessions family
    const sessionsRail = SESSIONS_STREAM_PROFILE.secondary?.[0]
    expect(sessionsRail).toMatchObject({ kind: 'wql', id: 'recent-sessions', label: 'Recent sessions' })
    expect(sessionsRail?.kind === 'wql' && sessionsRail.toEntry?.({ id: 'res-1' } as never)).toBe('/sessions/res-1')

    // Playgrounds link back into the playground editor
    const playgroundRail = PLAYGROUNDS_STREAM_PROFILE.secondary?.[0]
    expect(playgroundRail).toMatchObject({ kind: 'wql', id: 'recent-playgrounds', label: 'Recent playground pages' })
  })

  it('owns stream-surface membership — isStreamRoute is the single registry', () => {
    // every profile route is a stream surface
    expect(isStreamRoute('/journal')).toBe(true)
    expect(isStreamRoute('/collections')).toBe(true)
    expect(isStreamRoute('/feeds')).toBe(true)
    expect(isStreamRoute('/library')).toBe(true)
    expect(isStreamRoute('/efforts')).toBe(true)
    expect(isStreamRoute('/sessions')).toBe(true)
    expect(isStreamRoute('/playgrounds')).toBe(true)
    // trailing slashes normalize
    expect(isStreamRoute('/journal/')).toBe(true)
    // dynamic stream routes
    expect(isStreamRoute('/sessions/res-42')).toBe(true)
    expect(isStreamRoute('/session/2026-09-17')).toBe(true)
    // legacy results paths classify too (pure function; router redirects them)
    expect(isStreamRoute('/results')).toBe(true)
    expect(isStreamRoute('/results/segments')).toBe(true)
    expect(isStreamRoute('/results/res-42')).toBe(true)
    // non-stream routes stay out
    expect(isStreamRoute('/settings/appearance')).toBe(false)
    expect(isStreamRoute('/playground/abc')).toBe(false)
    expect(isStreamRoute('/notes/some-id')).toBe(false)
    expect(isStreamRoute('/dashboard')).toBe(false)
  })

  it('resolves stream profile by route using getStreamProfile and resolveStreamProfile', () => {
    expect(getStreamProfile('/journal')?.route).toBe('/journal')
    expect(getStreamProfile('/journal/')?.route).toBe('/journal')
    expect(getStreamProfile('/collections')?.route).toBe('/collections')
    expect(getStreamProfile('/feeds')?.route).toBe('/feeds')
    expect(getStreamProfile('/efforts')?.route).toBe('/efforts')
    expect(getStreamProfile('/sessions')?.route).toBe('/sessions')
    expect(getStreamProfile('/playgrounds')?.route).toBe('/playgrounds')
    expect(getStreamProfile('/library')?.route).toBe('/library')

    // getStreamProfile returns undefined for unknown routes
    expect(getStreamProfile('/unknown')).toBeUndefined()

    // resolveStreamProfile explicitly falls back to library profile
    expect(resolveStreamProfile('/unknown').route).toBe('/library')
  })

  it('dynamically resolves result detail stream profile for /sessions/:sessionId', () => {
    const detail = getStreamProfile('/sessions/res-42')
    expect(detail).toBeDefined()
    expect(detail?.route).toBe('/sessions/res-42')
    expect(detail?.defaultWql).toBe('rows:segment{result:res-42}')
    expect(detail?.level).toBe('segment')
    expect(detail?.typeOptions).toEqual(['rows'])

    // Trailing slash normalizes
    const trailing = getStreamProfile('/sessions/res-42/')
    expect(trailing?.route).toBe('/sessions/res-42')
    expect(trailing?.defaultWql).toBe('rows:segment{result:res-42}')

    // resolveStreamProfile returns the dynamic profile
    expect(resolveStreamProfile('/sessions/res-99').defaultWql).toBe('rows:segment{result:res-99}')
  })

  it('dynamically resolves a date-scoped sessions profile for /session/:date', () => {
    const byDate = getStreamProfile('/session/2026-09-17')
    expect(byDate).toBeDefined()
    expect(byDate?.route).toBe('/session/2026-09-17')
    expect(byDate?.defaultWql).toBe('rows:all{date:2026-09-17}')
    expect(byDate?.level).toBe('result')
  })
})

describe('streamProfile legacy configurations', () => {
  it('migrates legacy content parameters with default source', () => {
    const journalLegacy = JOURNAL_STREAM_PROFILE.legacy!
    expect(journalLegacy).toBeDefined()
    expect(journalLegacy.toQuery(new URLSearchParams('text=snatch'))).toBe('find:note{source:journal,text:snatch} last 2w')
    expect(journalLegacy.toQuery(new URLSearchParams('text=snatch+clean&timePreset=4w'))).toBe('find:note{source:journal,text:"snatch clean"} last 4w')
    expect(journalLegacy.toQuery(new URLSearchParams('timePreset=all'))).toBe('find:note{source:journal}')
  })

  it('migrates legacy tri-state parameters', () => {
    const libraryLegacy = LIBRARY_STREAM_PROFILE.legacy!
    expect(libraryLegacy).toBeDefined()
    expect(libraryLegacy.toQuery(new URLSearchParams('note=on&session=hide&post=hide'))).toBe('find:note{source:journal} last 2w')
    expect(libraryLegacy.toQuery(new URLSearchParams('note=hide&session=on&post=hide'))).toBe('find:note{source:collections} last 2w')
    expect(libraryLegacy.toQuery(new URLSearchParams('note=hide&session=hide&post=on'))).toBe('find:note{source:feeds} last 2w')
  })

  it('migrates legacy efforts parameters and salvages plain text query', () => {
    const effortsLegacy = EFFORTS_STREAM_PROFILE.legacy!
    expect(effortsLegacy).toBeDefined()
    expect(effortsLegacy.toQuery(new URLSearchParams('origin=bundled&discipline=strength'))).toBe('find:effort{origin:bundled,discipline:strength}')
    expect(effortsLegacy.salvageQ?.('pull-up', new URLSearchParams())).toBe('find:effort{text:pull-up}')
    expect(effortsLegacy.salvageQ?.('handstand push-up', new URLSearchParams('origin=user'))).toBe('find:effort{text:"handstand push-up",origin:user}')
    expect(effortsLegacy.salvageQ?.('find:effort', new URLSearchParams())).toBeNull()
  })
})
