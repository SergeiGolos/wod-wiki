/**
 * toEntry mapper tests (#813 slice 7) — converts the engine's Note[] into
 * the Library's Entry[]. The mapper is the single place that touches
 * `sourceId` discrimination; the rest of the Library never inspects it.
 */
import { describe, it, expect } from 'bun:test'
import { toEntry, type Entry, type EntryKind } from './entryMapper'
import type { Note } from '@/types/storage'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n',
    title: 't',
    createdAt: 0,
    type: 'note',
    ...overrides,
  } as Note
}

describe('toEntry — kind discrimination', () => {
  it('classifies a journal note (no sourceId) as Note', () => {
    const entry = toEntry(makeNote())
    expect(entry.kind).toBe<EntryKind>('note')
  })

  it('classifies a collection note as Session', () => {
    const entry = toEntry(makeNote({ id: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran' }))
    expect(entry.kind).toBe('session')
  })

  it('classifies a feed note as Post', () => {
    const entry = toEntry(makeNote({ id: 'feeds/crossfit-programming/2026-01-12/monday', sourceId: 'feed:feeds/crossfit-programming/2026-01-12/monday' }))
    expect(entry.kind).toBe('post')
  })
})

describe('toEntry — source fields', () => {
  it('sets sourceCatalog to "journal" for Note', () => {
    const entry = toEntry(makeNote({ id: 'journal-2026-07-15' }))
    expect(entry.sourceCatalog).toBe('journal')
    expect(entry.sourceItem).toBe('journal-2026-07-15')
  })

  it('sets sourceCatalog to the first path segment for Session', () => {
    const entry = toEntry(makeNote({ id: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran' }))
    expect(entry.sourceCatalog).toBe('crossfit-girls')
    expect(entry.sourceItem).toBe('fran')
  })

  it('sets sourceCatalog to the second path segment (after feeds/) for Post', () => {
    const entry = toEntry(makeNote({ id: 'feeds/crossfit-programming/2026-01-12/monday', sourceId: 'feed:feeds/crossfit-programming/2026-01-12/monday' }))
    expect(entry.sourceCatalog).toBe('crossfit-programming')
    expect(entry.sourceItem).toBe('monday')
  })
})

describe('toEntry — date resolution', () => {
  it('returns null for Session (undated by design)', () => {
    const entry = toEntry(makeNote({ id: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran' }))
    expect(entry.date).toBeNull()
  })

  it('extracts YYYY-MM-DD from the second path segment for Post', () => {
    const entry = toEntry(makeNote({ id: 'feeds/crossfit-programming/2026-01-12/monday', sourceId: 'feed:feeds/crossfit-programming/2026-01-12/monday' }))
    expect(entry.date).toBe('2026-01-12')
  })

  it('returns null for Note (the Library page resolves Note.date from Page.date, not the Note itself)', () => {
    // Per the spec: the Library page reads `Page.date` (V10) for Notes. The
    // mapper's contract is "no date means the page has to look it up" — it
    // does NOT pretend to know the journal-date of a note.
    const entry = toEntry(makeNote())
    expect(entry.date).toBeNull()
  })
})

describe('toEntry — passthrough fields', () => {
  it('passes through title verbatim', () => {
    const entry = toEntry(makeNote({ title: 'Heavy day' }))
    expect(entry.title).toBe('Heavy day')
  })

  it('passes through catalog as subtitle when present', () => {
    const entry = toEntry(makeNote({ id: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran', catalog: 'crossfit-girls' }))
    expect(entry.subtitle).toBe('crossfit-girls')
  })
})
