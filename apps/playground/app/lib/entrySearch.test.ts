/**
 * searchEntries — find:block emits one Entry per block (parent identity +
 * block payload, #855), newest first, uncapped: the full set is returned
 * and the Library batches rendering (#861). find:note behavior is
 * unchanged (whole-note entries, blocks only expand text hits).
 */
import { describe, expect, it, mock } from 'bun:test'

import type { FindQueryResult, ParsedRowsQuery, RowsQueryResult } from '@bitcobblers/wod-wiki-engine'
import type { BlockIndexRow } from '@/types/storage'
import { parseQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-engine'
import type { IEffort, RowsRun } from '@bitcobblers/wod-wiki-wql'
import type { UnifiedEventRecord } from '@bitcobblers/wod-wiki-core'
function makeBlock(i: number, createdAt = i): BlockIndexRow {
  return {
    id: `static:note-${i % 5}:seg-${i}:1`,
    noteId: `feeds/feed-a/2026-01-1${i % 5}/note-${i % 5}`,
    segmentId: `seg-${i}`,
    segmentVersion: 1,
    position: 0,
    dataType: 'wod',
    rawContent: `block ${i} content`,
    noteTitle: `Note ${i % 5}`,
    createdAt,
    isStatic: true,
    sourceId: `feed:feeds/feed-a/2026-01-1${i % 5}/note-${i % 5}`,
  } as BlockIndexRow
}

let runFindImpl: (parsed: ParsedFindQuery) => Promise<FindQueryResult>
let runFindEffortImpl: ((parsed: ParsedFindQuery) => Promise<FindQueryResult>) | undefined
let runRowsImpl: ((parsed: ParsedRowsQuery) => Promise<RowsQueryResult>) | undefined

mock.module('@/services/queryService', () => ({
  queryService: {
    runFind: mock((parsed: ParsedFindQuery) => runFindImpl(parsed)),
    runFindEffort: mock((parsed: ParsedFindQuery) => runFindEffortImpl ? runFindEffortImpl(parsed) : runFindImpl(parsed)),
    runRows: mock((parsed: ParsedRowsQuery) => runRowsImpl ? runRowsImpl(parsed) : Promise.resolve({ parsed, runs: [] })),
  },
}))

const { searchEntries, StreamQueryEngine } = await import('./entrySearch')

function blockResult(raw: string, blocks: BlockIndexRow[]): FindQueryResult {
  return {
    parsed: parseQuery(raw) as ParsedFindQuery,
    notes: [],
    blocks,
    stages: { selected: blocks.length, matched: blocks.length },
  }
}

describe('searchEntries — find:block (#855, #861)', () => {
  it('emits one Entry per block with parent identity and block payload', async () => {
    const blocks = [makeBlock(0, 100), makeBlock(1, 200)]
    runFindImpl = async parsed => blockResult(parsed.raw, blocks)

    const entries = await searchEntries('find:block in all')
    expect(entries).toHaveLength(2)
    // Newest first.
    expect(entries[0]!.block?.segmentId).toBe('seg-1')
    for (const entry of entries) {
      expect(entry.kind).toBe('post')
      expect(entry.block?.dataType).toBe('wod')
      // Parent identity preserved for Open / Add-to-today.
      expect(entry.id).toMatch(/^feeds\/feed-a\//)
    }
  })

  it('returns the full set — rendering batches at the page, not the pipeline (#861)', async () => {
    const blocks = Array.from({ length: 500 }, (_, i) => makeBlock(i, i))
    runFindImpl = async parsed => blockResult(parsed.raw, blocks)

    const entries = await searchEntries('find:block in all')
    expect(entries).toHaveLength(500)
    expect(entries[0]!.block?.segmentId).toBe('seg-499')
  })
})

describe('searchEntries — find:note unchanged', () => {
  it('still returns whole-note entries for note queries', async () => {
    runFindImpl = async parsed => ({
      parsed,
      notes: [{ id: 'n-1', title: 'Note 1', createdAt: 1, type: 'note' } as never],
      blocks: [],
      stages: { selected: 1, matched: 1 },
    })

    const entries = await searchEntries('find:note in all')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('note')
    expect(entries[0]!.block).toBeUndefined()
  })
})

describe('StreamQueryEngine — secondary text search for find:note', () => {
  it('searches block bodies when text: filter is present and combines with notes', async () => {
    const calls: ParsedFindQuery[] = []
    runFindImpl = async parsed => {
      calls.push(parsed)
      if (parsed.target === 'block') {
        return {
          parsed,
          notes: [],
          blocks: [makeBlock(1, 200)],
          stages: { selected: 1, matched: 1 },
        }
      }
      return {
        parsed,
        notes: [{ id: 'note-0', title: 'Note 0', createdAt: 100, type: 'note' } as never],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      }
    }

    const engine = new StreamQueryEngine()
    const entries = await engine.query('find:note{text:squat} in all')
    expect(calls).toHaveLength(2)
    expect(calls[0]!.target).toBe('note')
    expect(calls[1]!.target).toBe('block')
    expect(entries).toHaveLength(2)
  })

  it('handles AST input directly for find:note with text: filter', async () => {
    const calls: ParsedFindQuery[] = []
    runFindImpl = async parsed => {
      calls.push(parsed)
      return {
        parsed,
        notes: [{ id: 'n-ast', title: 'AST Note', createdAt: 100, type: 'note' } as never],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      }
    }

    const ast = parseQuery('find:note{text:thruster} in all')
    const entries = await searchEntries(ast)
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('AST Note')
  })
})

describe('StreamQueryEngine — note block info (feed previews)', () => {
  it('attaches excerpt lines and the first wod blockContentId per note, same scope', async () => {
    const calls: ParsedFindQuery[] = []
    runFindImpl = async parsed => {
      calls.push(parsed)
      if (parsed.target === 'block') {
        return {
          parsed,
          notes: [],
          blocks: [
            { ...makeBlock(1, 200), noteId: 'note-0', rawContent: '21-15-9\nThrusters', position: 0, blockContentId: 'wod-1' },
            { ...makeBlock(2, 200), noteId: 'note-0', rawContent: 'Pull-ups', position: 1, blockContentId: undefined },
          ],
          stages: { selected: 2, matched: 2 },
        }
      }
      return {
        parsed,
        notes: [{ id: 'note-0', title: 'Note 0', createdAt: 100, type: 'playground', sourceId: 'playground' } as never],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      }
    }

    const engine = new StreamQueryEngine({ noteBlockInfo: true })
    const entries = await engine.query('find:note{source:playground}')

    // One companion query, identical scope (only the target pivots).
    expect(calls).toHaveLength(2)
    expect(calls[0]!.target).toBe('note')
    expect(calls[1]!.target).toBe('block')
    expect(calls[1]!.filters).toEqual(calls[0]!.filters)

    expect(entries).toHaveLength(1)
    expect(entries[0]!.excerpt).toEqual(['21-15-9', 'Thrusters', 'Pull-ups'])
    expect(entries[0]!.blockContentId).toBe('wod-1')
    expect(entries[0]!.wodBlock).toEqual({ blockContentId: 'wod-1', content: '21-15-9\nThrusters' })
  })

  it('does not run the companion query by default', async () => {
    const calls: ParsedFindQuery[] = []
    runFindImpl = async parsed => {
      calls.push(parsed)
      return {
        parsed,
        notes: [{ id: 'note-0', title: 'Note 0', createdAt: 100, type: 'note' } as never],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      }
    }

    const engine = new StreamQueryEngine()
    const entries = await engine.query('find:note in all')
    expect(calls).toHaveLength(1)
    expect(entries[0]!.excerpt).toBeUndefined()
  })

  it('withNoteBlockInfo forks the same engine with the flag on', async () => {
    runFindImpl = async parsed => {
      if (parsed.target === 'block') {
        return {
          parsed,
          notes: [],
          blocks: [{ ...makeBlock(1, 200), noteId: 'note-0', rawContent: 'Grace' }],
          stages: { selected: 1, matched: 1 },
        }
      }
      return {
        parsed,
        notes: [{ id: 'note-0', title: 'Note 0', createdAt: 100, type: 'note' } as never],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      }
    }

    const base = new StreamQueryEngine()
    const forked = base.withNoteBlockInfo()
    const entries = await forked.query('find:note in all')
    expect(entries[0]!.excerpt).toEqual(['Grace'])
  })
})

describe('StreamQueryEngine — effort plane (find:effort)', () => {
  const effortSample: IEffort = {
    id: 'eff-1',
    slug: 'back-squat',
    label: 'Back Squat',
    aliases: ['BS'],
    baseAttributes: {
      discipline: 'strength',
      met: 6.0,
      intensityTier: 'high',
    },
    registrySource: 'bundled',
  }

  it('dispatches find:effort to runFindEffort and maps to effort entries', async () => {
    let effortCalled = false
    runFindEffortImpl = async parsed => {
      effortCalled = true
      return {
        parsed,
        notes: [],
        blocks: [],
        efforts: [effortSample],
        stages: { selected: 1, matched: 1 },
      }
    }

    const engine = new StreamQueryEngine()
    const entries = await engine.query('find:effort in all')
    expect(effortCalled).toBe(true)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('effort')
    expect(entries[0]!.title).toBe('Back Squat')
    expect(entries[0]!.subtitle).toBe('strength • MET 6.0 • high')
    expect(entries[0]!.effort?.slug).toBe('back-squat')
  })

  it('accepts AST for find:effort', async () => {
    runFindEffortImpl = async parsed => ({
      parsed,
      notes: [],
      blocks: [],
      efforts: [effortSample],
      stages: { selected: 1, matched: 1 },
    })

    const ast = parseQuery('find:effort{discipline:strength} in all')
    const entries = await searchEntries(ast)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('effort')
  })
})

describe('StreamQueryEngine — telemetry plane (rows:)', () => {
  const timestamp = new Date('2026-08-15T10:00:00Z').getTime()
  const sampleRun: RowsRun = {
    resultId: 'res-42',
    noteId: 'crossfit-girls/fran',
    timestamp,
    events: [
      {
        id: 'res-42:0',
        resultId: 'res-42',
        noteId: 'crossfit-girls/fran',
        timestamp,
        grain: 'event',
        outputType: 'segment',
        effortSlug: 'thruster',
        timeSpan: { started: timestamp, ended: timestamp + 100_000 },
        metrics: [{ type: 'rep', value: 21 }, { type: 'weight', value: 95 }],
      } as UnifiedEventRecord,
      {
        id: 'res-42:1',
        resultId: 'res-42',
        noteId: 'crossfit-girls/fran',
        timestamp: timestamp + 100_000,
        grain: 'event',
        outputType: 'segment',
        effortSlug: 'pull-up',
        timeSpan: { started: timestamp + 100_000, ended: timestamp + 180_000 },
        metrics: [{ type: 'rep', value: 21 }, { type: 'tis', value: 8.5 }],
      } as UnifiedEventRecord,
    ],
  }

  it('dispatches rows:all to runRows and maps to session-level result entries', async () => {
    runRowsImpl = async parsed => ({
      parsed,
      runs: [sampleRun],
    })

    const entries = await searchEntries('rows:all{result:res-42}')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kind).toBe('result')
    expect(entries[0]!.id).toBe('res-42')
    expect(entries[0]!.date).toBe('2026-08-15')
    expect(entries[0]!.title).toBe('Fran')
    expect(entries[0]!.execution?.segmentCount).toBe(2)
    expect(entries[0]!.execution?.reps).toBe(42)
  })

  it('dispatches rows:segment to runRows and maps to segment-level entries', async () => {
    runRowsImpl = async parsed => ({
      parsed,
      runs: [sampleRun],
    })

    const entries = await searchEntries('rows:segment{result:res-42}')
    expect(entries).toHaveLength(2)
    expect(entries[0]!.kind).toBe('segment')
    expect(entries[0]!.id).toBe('res-42:0')
    expect(entries[0]!.title).toBe('Thruster')
    expect(entries[1]!.kind).toBe('segment')
    expect(entries[1]!.id).toBe('res-42:1')
    expect(entries[1]!.title).toBe('Pull Up')
  })

  it('resolves note titles via noteTitleResolver in StreamQueryEngine options', async () => {
    runRowsImpl = async parsed => ({
      parsed,
      runs: [sampleRun],
    })

    const engine = new StreamQueryEngine({
      noteTitleResolver: async noteId => (noteId === 'crossfit-girls/fran' ? 'Custom Fran Title' : undefined),
    })

    const entries = await engine.query('rows:all{result:res-42}')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('Custom Fran Title')
  })
})

describe('StreamQueryEngine — error and unsupported query handling', () => {
  it('returns empty array on parse error', async () => {
    const entries = await searchEntries('find:invalid query syntax {}}')
    expect(entries).toEqual([])
  })

  it('returns empty array on aggregate query (not supported by stream intake)', async () => {
    const entries = await searchEntries('sum:totalVolume{discipline:strength}')
    expect(entries).toEqual([])
  })

  it('returns empty array on empty query string', async () => {
    const entries = await searchEntries('')
    expect(entries).toEqual([])
  })
})
