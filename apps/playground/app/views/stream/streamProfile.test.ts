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
  })

  it('defines the Collections stream profile', () => {
    expect(COLLECTIONS_STREAM_PROFILE.route).toBe('/collections')
    expect(COLLECTIONS_STREAM_PROFILE.title).toBe('Collections')
    expect(COLLECTIONS_STREAM_PROFILE.defaultWql).toBe('find:note{source:collections} last 2w')
    expect(COLLECTIONS_STREAM_PROFILE.level).toBe('session')
  })

  it('defines the Feeds stream profile', () => {
    expect(FEEDS_STREAM_PROFILE.route).toBe('/feeds')
    expect(FEEDS_STREAM_PROFILE.title).toBe('Feeds')
    expect(FEEDS_STREAM_PROFILE.defaultWql).toBe('find:note{source:feeds} last 2w')
    expect(FEEDS_STREAM_PROFILE.level).toBe('note')
  })

  it('defines the Library stream profile', () => {
    expect(LIBRARY_STREAM_PROFILE.route).toBe('/library')
    expect(LIBRARY_STREAM_PROFILE.title).toBe('Library')
    expect(LIBRARY_STREAM_PROFILE.defaultWql).toBe('find:note last 2w')
    expect(LIBRARY_STREAM_PROFILE.level).toBe('note')
  })

  it('defines the Efforts stream profile', () => {
    expect(EFFORTS_STREAM_PROFILE.route).toBe('/efforts')
    expect(EFFORTS_STREAM_PROFILE.title).toBe('Efforts')
    expect(EFFORTS_STREAM_PROFILE.defaultWql).toBe('find:effort')
    expect(EFFORTS_STREAM_PROFILE.level).toBe('effort')
    expect(EFFORTS_STREAM_PROFILE.hideScopeRadio).toBe(true)
  })

  it('defines the Results stream profile', () => {
    expect(RESULTS_STREAM_PROFILE.route).toBe('/results')
    expect(RESULTS_STREAM_PROFILE.title).toBe('Results')
    expect(RESULTS_STREAM_PROFILE.defaultWql).toBe('rows:all last 4w')
    expect(RESULTS_STREAM_PROFILE.level).toBe('result')
    expect(RESULTS_STREAM_PROFILE.hideScopeRadio).toBe(true)
  })

  it('defines the Segments stream profile', () => {
    expect(SEGMENTS_STREAM_PROFILE.route).toBe('/results/segments')
    expect(SEGMENTS_STREAM_PROFILE.title).toBe('Segments')
    expect(SEGMENTS_STREAM_PROFILE.defaultWql).toBe('rows:segment last 8w')
    expect(SEGMENTS_STREAM_PROFILE.level).toBe('segment')
    expect(SEGMENTS_STREAM_PROFILE.hideScopeRadio).toBe(true)
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
})
