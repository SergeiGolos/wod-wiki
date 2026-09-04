import { describe, it, expect } from 'bun:test'
import {
  JOURNAL_STREAM_PROFILE,
  COLLECTIONS_STREAM_PROFILE,
  FEEDS_STREAM_PROFILE,
  LIBRARY_STREAM_PROFILE,
  EFFORTS_STREAM_PROFILE,
  RESULTS_STREAM_PROFILE,
  SEGMENTS_STREAM_PROFILE,
  getStreamProfile,
  resolveStreamProfile,
} from './streamProfile'

describe('streamProfile presets', () => {
  it('defines the Journal stream profile', () => {
    expect(JOURNAL_STREAM_PROFILE.route).toBe('/journal')
    expect(JOURNAL_STREAM_PROFILE.title).toBe('Journal')
    expect(JOURNAL_STREAM_PROFILE.defaultWql).toBe('find:note{source:journal} last 2w')
    expect(JOURNAL_STREAM_PROFILE.level).toBe('note')
    expect(JOURNAL_STREAM_PROFILE.typeOptions).toEqual(['journal'])
  })

  it('defines the Collections stream profile', () => {
    expect(COLLECTIONS_STREAM_PROFILE.route).toBe('/collections')
    expect(COLLECTIONS_STREAM_PROFILE.title).toBe('Collections')
    expect(COLLECTIONS_STREAM_PROFILE.defaultWql).toBe('find:note{source:collections} last 2w')
    expect(COLLECTIONS_STREAM_PROFILE.level).toBe('session')
    expect(COLLECTIONS_STREAM_PROFILE.typeOptions).toEqual(['collections'])
  })

  it('defines the Feeds stream profile', () => {
    expect(FEEDS_STREAM_PROFILE.route).toBe('/feeds')
    expect(FEEDS_STREAM_PROFILE.title).toBe('Feeds')
    expect(FEEDS_STREAM_PROFILE.defaultWql).toBe('find:note{source:feeds} last 2w')
    expect(FEEDS_STREAM_PROFILE.level).toBe('note')
    expect(FEEDS_STREAM_PROFILE.typeOptions).toEqual(['feeds'])
  })

  it('defines the Library stream profile', () => {
    expect(LIBRARY_STREAM_PROFILE.route).toBe('/library')
    expect(LIBRARY_STREAM_PROFILE.title).toBe('Library')
    expect(LIBRARY_STREAM_PROFILE.defaultWql).toBe('find:note last 2w')
    expect(LIBRARY_STREAM_PROFILE.level).toBe('note')
    expect(LIBRARY_STREAM_PROFILE.typeOptions).toEqual(['notes', 'journal', 'collections', 'feeds', 'blocks'])
  })

  it('defines the Efforts stream profile', () => {
    expect(EFFORTS_STREAM_PROFILE.route).toBe('/efforts')
    expect(EFFORTS_STREAM_PROFILE.title).toBe('Efforts')
    expect(EFFORTS_STREAM_PROFILE.defaultWql).toBe('find:effort')
    expect(EFFORTS_STREAM_PROFILE.level).toBe('effort')
    expect(EFFORTS_STREAM_PROFILE.typeOptions).toEqual(['efforts'])
  })

  it('defines the Results stream profile', () => {
    expect(RESULTS_STREAM_PROFILE.route).toBe('/results')
    expect(RESULTS_STREAM_PROFILE.title).toBe('Results')
    expect(RESULTS_STREAM_PROFILE.defaultWql).toBe('rows:all{} last 4w')
    expect(RESULTS_STREAM_PROFILE.level).toBe('result')
    expect(RESULTS_STREAM_PROFILE.typeOptions).toEqual(['rows'])
  })

  it('defines the Segments stream profile', () => {
    expect(SEGMENTS_STREAM_PROFILE.route).toBe('/results/segments')
    expect(SEGMENTS_STREAM_PROFILE.title).toBe('Segments')
    expect(SEGMENTS_STREAM_PROFILE.defaultWql).toBe('rows:segment{} last 8w')
    expect(SEGMENTS_STREAM_PROFILE.level).toBe('segment')
    expect(SEGMENTS_STREAM_PROFILE.typeOptions).toEqual(['rows'])
  })

  it('resolves stream profile by route using getStreamProfile and resolveStreamProfile', () => {
    expect(getStreamProfile('/journal')?.route).toBe('/journal')
    expect(getStreamProfile('/journal/')?.route).toBe('/journal')
    expect(getStreamProfile('/collections')?.route).toBe('/collections')
    expect(getStreamProfile('/feeds')?.route).toBe('/feeds')
    expect(getStreamProfile('/efforts')?.route).toBe('/efforts')
    expect(getStreamProfile('/results')?.route).toBe('/results')
    expect(getStreamProfile('/results/segments')?.route).toBe('/results/segments')
    expect(getStreamProfile('/library')?.route).toBe('/library')

    // getStreamProfile returns undefined for unknown routes
    expect(getStreamProfile('/unknown')).toBeUndefined()

    // resolveStreamProfile explicitly falls back to library profile
    expect(resolveStreamProfile('/unknown').route).toBe('/library')
  })

  it('dynamically resolves result detail stream profile for /results/:resultId', () => {
    const detail = getStreamProfile('/results/res-42')
    expect(detail).toBeDefined()
    expect(detail?.route).toBe('/results/res-42')
    expect(detail?.title).toBe('Session Result')
    expect(detail?.defaultWql).toBe('rows:segment{result:res-42}')
    expect(detail?.level).toBe('segment')
    expect(detail?.typeOptions).toEqual(['rows'])

    // Trailing slash normalizes
    const trailing = getStreamProfile('/results/res-42/')
    expect(trailing?.route).toBe('/results/res-42')
    expect(trailing?.defaultWql).toBe('rows:segment{result:res-42}')

    // resolveStreamProfile returns the dynamic profile
    expect(resolveStreamProfile('/results/res-99').defaultWql).toBe('rows:segment{result:res-99}')

    // /results/segments does NOT get treated as a dynamic resultId 'segments'
    expect(getStreamProfile('/results/segments')?.title).toBe('Segments')
    expect(getStreamProfile('/results/segments')?.defaultWql).toBe('rows:segment{} last 8w')
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
