/**
 * searchEntries — the shared WQL → Entry[] pipeline (issues #833/#834).
 *
 * Extracted from LibraryPage so every WQL-driven surface (the /library route
 * and the global Search Palette) resolves content identically:
 *
 *   1. WQL → `ParsedFindQuery` via `parseQuery`
 *   2. `queryService.runFind(parsed)` → primary notes/blocks
 *   3. When a free-text filter is present on a find:note query, a secondary
 *      find:block run searches block body text (notes win on id conflicts)
 *   4. Blocks synthesize minimal Note records (never inspecting sourceId —
 *      `toEntry` owns kind classification)
 *
 * Invalid WQL (parse error or non-find query) resolves to an empty list;
 * callers surface the error separately via their own parse.
 */
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery } from '@/services/analytics/query/wql'
import type { Note } from '@/types/storage'
import { toEntry, type Entry } from './entryMapper'

/** Synthesize a minimal Note for a block hit (mirrors the Library pipeline). */
function noteFromBlock(block: {
  noteId: string
  noteTitle: string
  createdAt: number
  sourceId?: string
}): Note {
  return {
    id: block.noteId,
    title: block.noteTitle,
    createdAt: block.createdAt,
    type: 'note',
    sourceId: block.sourceId,
    catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
  } as Note
}

export async function searchEntries(wql: string): Promise<Entry[]> {
  const parsed = parseQuery(wql)
  if (!isFindQuery(parsed) || parsed.error) return []

  const hasText = parsed.filters.some(f => f.key === 'text' && !f.negate)
  const primaryPromise = queryService.runFind(parsed)

  // When free-text is present, also run find:block to search body text.
  const blockWql = hasText && parsed.target === 'note'
    ? wql.replace(/^find:note/, 'find:block')
    : null
  const blockParsed = blockWql ? parseQuery(blockWql) : null
  const blockPromise = (blockParsed && isFindQuery(blockParsed) && !blockParsed.error)
    ? queryService.runFind(blockParsed)
    : Promise.resolve(null)

  const [primaryResult, blockResult] = await Promise.all([primaryPromise, blockPromise])
  const noteMap = new Map<string, Note>()

  for (const note of primaryResult.notes) {
    noteMap.set(note.id, note)
  }
  for (const block of primaryResult.blocks) {
    if (!noteMap.has(block.noteId)) noteMap.set(block.noteId, noteFromBlock(block))
  }
  if (blockResult?.blocks) {
    for (const block of blockResult.blocks) {
      if (!noteMap.has(block.noteId)) noteMap.set(block.noteId, noteFromBlock(block))
    }
  }

  return Array.from(noteMap.values()).map(toEntry)
}
