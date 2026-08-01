/**
 * searchEntriesWithMeta — find:block emits one Entry per block (parent
 * identity + block payload, #855), newest first, capped at BLOCK_RESULTS_CAP
 * with a cap record so the page can say "showing 200 of 21,329". find:note
 * behavior is unchanged (whole-note entries, blocks only expand text hits).
 */
import { afterEach, describe, expect, it, mock } from 'bun:test'

import * as realQuery from '@/services/analytics/query'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'
import type { BlockIndexRow } from '@/types/storage'
import { parseQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'

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

mock.module('@/services/analytics/query', () => ({
  ...realQuery,
  queryService: {
    runFind: mock((parsed: ParsedFindQuery) => runFindImpl(parsed)),
  },
}))

const { searchEntriesWithMeta, searchEntries, BLOCK_RESULTS_CAP } = await import('./entrySearch')

afterEach(() => {})

function blockResult(raw: string, blocks: BlockIndexRow[]): FindQueryResult {
  return {
    parsed: parseQuery(raw) as ParsedFindQuery,
    notes: [],
    blocks,
    stages: { selected: blocks.length, matched: blocks.length },
  }
}

describe('searchEntriesWithMeta — find:block (#855)', () => {
  it('emits one Entry per block with parent identity and block payload', async () => {
    const blocks = [makeBlock(0, 100), makeBlock(1, 200)]
    runFindImpl = async parsed => blockResult(parsed.raw, blocks)

    const { entries, capped } = await searchEntriesWithMeta('find:block in all')
    expect(entries).toHaveLength(2)
    expect(capped).toBeUndefined()
    // Newest first.
    expect(entries[0]!.block?.segmentId).toBe('seg-1')
    for (const entry of entries) {
      expect(entry.kind).toBe('post')
      expect(entry.block?.dataType).toBe('wod')
      expect(entry.block?.preview).toEqual([expect.stringContaining('content')] as unknown as string[])
      // Parent identity preserved for Open / Add-to-today.
      expect(entry.id).toMatch(/^feeds\/feed-a\//)
    }
  })

  it('caps oversized block results and reports shown/total', async () => {
    const blocks = Array.from({ length: BLOCK_RESULTS_CAP + 50 }, (_, i) => makeBlock(i, i))
    runFindImpl = async parsed => blockResult(parsed.raw, blocks)

    const { entries, capped } = await searchEntriesWithMeta('find:block in all')
    expect(entries).toHaveLength(BLOCK_RESULTS_CAP)
    expect(capped).toEqual({ shown: BLOCK_RESULTS_CAP, total: BLOCK_RESULTS_CAP + 50 })
    // The cap keeps the newest, not the first rows in index order.
    expect(entries[0]!.block?.segmentId).toBe(`seg-${BLOCK_RESULTS_CAP + 49}`)
  })

  it('does not cap at exactly the cap size', async () => {
    const blocks = Array.from({ length: BLOCK_RESULTS_CAP }, (_, i) => makeBlock(i, i))
    runFindImpl = async parsed => blockResult(parsed.raw, blocks)

    const { entries, capped } = await searchEntriesWithMeta('find:block in all')
    expect(entries).toHaveLength(BLOCK_RESULTS_CAP)
    expect(capped).toBeUndefined()
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
