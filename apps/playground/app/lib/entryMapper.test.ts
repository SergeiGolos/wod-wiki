/**
 * toEntry mapper tests (#813 slice 7) — converts the engine's Note[] into
 * the Library's Entry[]. The mapper is the single place that touches
 * `sourceId` discrimination; the rest of the Library never inspects it.
 */
import { describe, it, expect } from 'bun:test'
import type { BlockIndexRow, Note } from '@/types/storage'
import type { IEffort, RowsRun, RowsQueryResult, ParsedRowsQuery } from '@bitcobblers/wod-wiki-wql'
import type { UnifiedEventRecord } from '@bitcobblers/wod-wiki-core'
import {
  toEntry,
  blockToEntry,
  blockPreview,
  effortToEntry,
  rowsRunToEntry,
  unifiedEventToEntry,
  rowsQueryResultToEntries,
  type EntryKind,
} from './entryMapper'

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


describe('effortToEntry', () => {
  const effort: IEffort = {
    id: 'eff-1',
    slug: 'back-squat',
    label: 'Back Squat',
    aliases: ['BS', 'Back Squats'],
    baseAttributes: {
      discipline: 'strength',
      met: 6.0,
      intensityTier: 'high',
    },
    registrySource: 'bundled',
  }

  it('maps an IEffort into an Entry with kind "effort" and effort metadata', () => {
    const entry = effortToEntry(effort)
    expect(entry.kind).toBe('effort')
    expect(entry.id).toBe('back-squat')
    expect(entry.title).toBe('Back Squat')
    expect(entry.sourceCatalog).toBe('bundled')
    expect(entry.sourceItem).toBe('back-squat')
    expect(entry.date).toBeNull()
    expect(entry.subtitle).toBe('strength • MET 6.0 • high')
    expect(entry.detail).toBe('Aliases: BS, Back Squats')
    expect(entry.effort).toEqual({
      slug: 'back-squat',
      label: 'Back Squat',
      discipline: 'strength',
      met: 6.0,
      intensityTier: 'high',
      aliases: ['BS', 'Back Squats'],
      registrySource: 'bundled',
    })
  })
})

describe('rowsRunToEntry — session level (Mode A)', () => {
  const timestamp = new Date('2026-08-15T10:00:00Z').getTime()
  const run: RowsRun = {
    resultId: 'res-123',
    noteId: 'crossfit-girls/fran',
    timestamp,
    events: [
      {
        id: 'res-123:0',
        resultId: 'res-123',
        noteId: 'crossfit-girls/fran',
        timestamp,
        grain: 'event',
        outputType: 'segment',
        effortSlug: 'thruster',
        timeSpan: { started: timestamp, ended: timestamp + 120_000 },
        metrics: [
          { type: 'rep', value: 21 },
          { type: 'weight', value: 95, unit: 'lbs' },
        ],
      } as UnifiedEventRecord,
      {
        id: 'res-123:1',
        resultId: 'res-123',
        noteId: 'crossfit-girls/fran',
        timestamp: timestamp + 120_000,
        grain: 'event',
        outputType: 'segment',
        effortSlug: 'pull-up',
        timeSpan: { started: timestamp + 120_000, ended: timestamp + 200_000 },
        metrics: [
          { type: 'rep', value: 21 },
          { type: 'tis', value: 12.5 },
        ],
      } as UnifiedEventRecord,
    ],
  }

  it('maps a RowsRun to an Entry with kind "result" and execution metrics', () => {
    const entry = rowsRunToEntry(run)
    expect(entry.kind).toBe('result')
    expect(entry.id).toBe('res-123')
    expect(entry.sourceCatalog).toBe('results')
    expect(entry.sourceItem).toBe('res-123')
    expect(entry.date).toBe('2026-08-15')
    expect(entry.title).toBe('Fran')
    expect(entry.subtitle).toContain('03:20')
    expect(entry.subtitle).toContain('2 splits')
    expect(entry.detail).toContain('Thruster, Pull Up')
    expect(entry.execution).toMatchObject({
      resultId: 'res-123',
      noteId: 'crossfit-girls/fran',
      outputType: 'all',
      segmentCount: 2,
      reps: 42,
    })
  })
})

describe('unifiedEventToEntry — segment level (Mode B)', () => {
  const timestamp = new Date('2026-08-15T10:00:00Z').getTime()
  const event: UnifiedEventRecord = {
    id: 'res-123:0',
    resultId: 'res-123',
    noteId: 'crossfit-girls/fran',
    timestamp,
    grain: 'event',
    outputType: 'segment',
    effortSlug: 'thruster',
    timeSpan: { started: timestamp, ended: timestamp + 105_000 },
    metrics: [
      { type: 'rep', value: 21 },
      { type: 'weight', value: 95, unit: 'lbs' },
    ],
  }

  it('maps a segment UnifiedEventRecord to kind "segment"', () => {
    const entry = unifiedEventToEntry(event, { index: 0 })
    expect(entry.kind).toBe('segment')
    expect(entry.id).toBe('res-123:0')
    expect(entry.title).toBe('Thruster')
    expect(entry.date).toBe('2026-08-15')
    expect(entry.subtitle).toContain('01:45')
    expect(entry.subtitle).toContain('21 reps')
    expect(entry.subtitle).toContain('95 lbs')
    expect(entry.execution).toMatchObject({
      resultId: 'res-123',
      noteId: 'crossfit-girls/fran',
      outputType: 'segment',
      effortSlug: 'thruster',
      reps: 21,
      loadLbs: 95,
    })
  })
})

describe('rowsQueryResultToEntries', () => {
  const timestamp = new Date('2026-08-15T10:00:00Z').getTime()
  const run: RowsRun = {
    resultId: 'res-1',
    noteId: 'crossfit-girls/fran',
    timestamp,
    events: [
      {
        id: 'res-1:0',
        resultId: 'res-1',
        noteId: 'crossfit-girls/fran',
        timestamp,
        grain: 'event',
        outputType: 'segment',
        effortSlug: 'thruster',
        metrics: [{ type: 'rep', value: 21 }],
      } as UnifiedEventRecord,
    ],
  }

  it('dispatches rows:all to session-level entries', () => {
    const qr: RowsQueryResult = {
      parsed: { family: 'rows', raw: 'rows:all{result:res-1}', filters: [] } as ParsedRowsQuery,
      runs: [run],
    }
    const entries = rowsQueryResultToEntries(qr)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('result')
  })

  it('dispatches rows:segment to segment-level entries', () => {
    const qr: RowsQueryResult = {
      parsed: { family: 'rows', raw: 'rows:segment{result:res-1}', outputType: 'segment', filters: [] } as ParsedRowsQuery,
      runs: [run],
    }
    const entries = rowsQueryResultToEntries(qr)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('segment')
    expect(entries[0]!.id).toBe('res-1:0')
  })
})
