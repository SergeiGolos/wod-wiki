/**
 * searchEntries — find:block emits one Entry per block (parent identity +
 * block payload, #855), newest first, uncapped: the full set is returned
 * and the Library batches rendering (#861). find:note behavior is
 * unchanged (whole-note entries, blocks only expand text hits).
 */
import { describe, expect, it, mock } from 'bun:test'

import * as realQuery from '@bitcobblers/wod-wiki-engine'
import type { FindQueryResult } from '@bitcobblers/wod-wiki-engine'
import type { BlockIndexRow } from '@/types/storage'
import { parseQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-engine'

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

mock.module('@/services/queryService', () => ({
  queryService: {
    runFind: mock((parsed: ParsedFindQuery) => runFindImpl(parsed)),
  },
}))

const { searchEntries } = await import('./entrySearch')

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
