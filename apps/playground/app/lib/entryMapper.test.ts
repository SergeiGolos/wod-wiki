/**
 * toEntry mapper tests (#813 slice 7) — converts the engine's Note[] into
 * the Library's Entry[]. The mapper is the single place that touches
 * `sourceId` discrimination; the rest of the Library never inspects it.
 */
import { describe, it, expect } from 'bun:test'
import { toEntry, type EntryKind } from './entryMapper'
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

// ── blockToEntry (#855) ──────────────────────────────────────────────────────

import { blockToEntry, blockPreview } from './entryMapper'
import type { BlockIndexRow } from '@/types/storage'

function makeBlock(overrides: Partial<BlockIndexRow> = {}): BlockIndexRow {
  return {
    id: 'static:note:seg:1',
    noteId: 'feeds/crossfit-programming/2026-01-12/wednesday-hero',
    segmentId: 'sec-7',
    segmentVersion: 1,
    position: 2,
    dataType: 'wod',
    rawContent: 'Murph\n\n1 mile run',
    noteTitle: 'Wednesday Hero',
    createdAt: Date.parse('2026-01-12T00:00:00Z'),
    isStatic: true,
    sourceId: 'feed:feeds/crossfit-programming/2026-01-12/wednesday-hero',
    blockContentId: 'bc-murph',
    ...overrides,
  } as BlockIndexRow
}

describe('blockToEntry (#855)', () => {
  it('keeps the parent note identity and carries the block payload', () => {
    const entry = blockToEntry(makeBlock())
    expect(entry.id).toBe('feeds/crossfit-programming/2026-01-12/wednesday-hero')
    expect(entry.kind).toBe<EntryKind>('post')
    expect(entry.date).toBe('2026-01-12')
    expect(entry.title).toBe('Wednesday Hero')
    expect(entry.block).toEqual({
      segmentId: 'sec-7',
      dataType: 'wod',
      preview: ['Murph', '1 mile run'],
    })
    expect(entry.blockContentId).toBe('bc-murph')
  })

  it('classifies collection blocks as Session', () => {
    const entry = blockToEntry(makeBlock({
      noteId: 'crossfit-girls/fran',
      sourceId: 'collection:crossfit-girls/fran',
    }))
    expect(entry.kind).toBe<EntryKind>('session')
    expect(entry.date).toBeNull()
  })

  it('classifies journal blocks (no sourceId) as Note', () => {
    const entry = blockToEntry(makeBlock({ noteId: 'n-1', sourceId: undefined }))
    expect(entry.kind).toBe<EntryKind>('note')
  })
})

describe('blockPreview', () => {
  it('caps at 3 non-empty lines', () => {
    expect(blockPreview('a\n\nb\nc\nd\ne')).toEqual(['a', 'b', 'c'])
  })

  it('truncates long lines with an ellipsis', () => {
    const long = 'x'.repeat(200)
    const [line] = blockPreview(long)
    expect(line!.length).toBe(120)
    expect(line!.endsWith('…')).toBe(true)
  })

  it('returns [] for blank content', () => {
    expect(blockPreview('\n  \n')).toEqual([])
  })
})
