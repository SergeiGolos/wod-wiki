/**
 * Entry action tests (#813 slice 10) — the pure helper that turns an Entry
 * into the URL the Open / Run / Compare row action should navigate to.
 * The LibraryRow consumes this; the test seam is the URL.
 */
import { describe, it, expect } from 'bun:test'
import { entryOpenHref, entryCompareHref, entryCanAddToToday, entryIsPlayground } from './entryActions'
import type { Entry } from './entryMapper'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'crossfit-girls/fran',
    kind: 'session',
    sourceCatalog: 'crossfit-girls',
    sourceItem: 'fran',
    title: 'Fran',
    date: null,
    ...overrides,
  }
}

describe('entryOpenHref', () => {
  it('routes a playground Note to the playground editor deep-link', () => {
    expect(entryOpenHref(makeEntry({
      id: 'uuid-1',
      kind: 'note',
      sourceCatalog: 'playground',
      sourceItem: 'fran-experiment',
      sourceId: 'playground',
      date: null,
    }))).toBe('/playground/fran-experiment')
  })

  it('routes a Note to the journal deep-link', () => {
    expect(entryOpenHref(makeEntry({
      id: 'journal-2026-07-15',
      kind: 'note',
      sourceCatalog: 'journal',
      sourceItem: 'journal-2026-07-15',
      date: '2026-07-15',
    }))).toBe('/journal/2026-07-15/')
  })

  it('routes a Session to the workout deep-link', () => {
    expect(entryOpenHref(makeEntry({
      id: 'crossfit-girls/fran',
      kind: 'session',
      sourceCatalog: 'crossfit-girls',
      sourceItem: 'fran',
    }))).toBe('/collections/crossfit-girls/fran')
  })

  it('routes a Post to the feed-item deep-link (catalog/date/item)', () => {
    expect(entryOpenHref(makeEntry({
      id: 'feeds/crossfit-programming/2026-01-12/monday',
      kind: 'post',
      sourceCatalog: 'crossfit-programming',
      sourceItem: 'monday',
      date: '2026-01-12',
    }))).toBe('/feeds/crossfit-programming/2026-01-12/monday')
  })
})

describe('entryCompareHref', () => {
  it('routes any row with a blockContentId to /analytics/explorer?q=<id>', () => {
    expect(entryCompareHref(makeEntry({ blockContentId: 'bc-fran' }))).toBe(
      '/analytics/explorer?q=bc-fran',
    )
  })

  it('returns null for a row without a content id', () => {
    expect(entryCompareHref(makeEntry())).toBeNull()
  })
})

describe('entryCanAddToToday', () => {
  it('returns true for a Note', () => {
    expect(entryCanAddToToday(makeEntry({ kind: 'note' }))).toBe(true)
  })

  it('returns true for a Post', () => {
    expect(entryCanAddToToday(makeEntry({ kind: 'post' }))).toBe(true)
  })

  it('returns false for a Session (undated, cannot be added to a journal date)', () => {
    expect(entryCanAddToToday(makeEntry({ kind: 'session' }))).toBe(false)
  })
  it('returns true for a Result with an associated noteId', () => {
    expect(entryCanAddToToday(makeEntry({
      kind: 'result',
      id: 'res-101',
      execution: { resultId: 'res-101', noteId: 'crossfit-girls/fran', timestamp: 1700000000000, outputType: 'all' },
    }))).toBe(true)
  })

  it('returns true for a Segment with an associated noteId', () => {
    expect(entryCanAddToToday(makeEntry({
      kind: 'segment',
      id: 'res-101:1',
      execution: { resultId: 'res-101', noteId: 'crossfit-girls/fran', timestamp: 1700000000000, outputType: 'segment' },
    }))).toBe(true)
  })

  it('returns false for a Result or Segment without an associated noteId', () => {
    expect(entryCanAddToToday(makeEntry({ kind: 'result', id: 'res-101' }))).toBe(false)
    expect(entryCanAddToToday(makeEntry({ kind: 'segment', id: 'res-101:1' }))).toBe(false)
  })
})

describe('entryIsPlayground', () => {
  it('returns true for a playground-sourced Note (sourceCatalog playground)', () => {
    expect(entryIsPlayground(makeEntry({
      id: 'uuid-1',
      kind: 'note',
      sourceCatalog: 'playground',
      sourceItem: 'fran-experiment',
      sourceId: 'playground',
    }))).toBe(true)
  })

  it('returns true when only sourceId carries the playground marker', () => {
    expect(entryIsPlayground(makeEntry({ sourceId: 'playground' }))).toBe(true)
  })

  it('returns false for journal and catalog entries', () => {
    expect(entryIsPlayground(makeEntry({ kind: 'note', sourceCatalog: 'journal' }))).toBe(false)
    expect(entryIsPlayground(makeEntry({ sourceId: 'collection:crossfit-girls' }))).toBe(false)
  })
})
