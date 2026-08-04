/**
 * Entry action tests (#813 slice 10) — the pure helper that turns an Entry
 * into the URL the Open / Run / Compare row action should navigate to.
 * The LibraryRow consumes this; the test seam is the URL.
 */
import { describe, it, expect } from 'bun:test'
import { entryOpenHref, entryRunHref, entryCompareHref, entryCanAddToToday } from './entryActions'
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

describe('entryRunHref', () => {
  it('returns /run/<blockContentId> for a Session with a content id', () => {
    expect(entryRunHref(makeEntry({ blockContentId: 'bc-fran' }))).toBe('/run/bc-fran')
  })

  it('returns /run/<blockContentId> for a Post with a content id', () => {
    expect(entryRunHref(makeEntry({
      kind: 'post', sourceCatalog: 'crossfit-programming', date: '2026-01-12', blockContentId: 'bc-monday',
    }))).toBe('/run/bc-monday')
  })

  it('returns null for a row without a content id', () => {
    expect(entryRunHref(makeEntry())).toBeNull()
  })

  it('returns null for a Note (no Run action for journal notes per spec)', () => {
    expect(entryRunHref(makeEntry({ kind: 'note' }))).toBeNull()
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
})
