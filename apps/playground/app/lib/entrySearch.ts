/**
 * searchEntries — the shared WQL → Entry[] pipeline (issues #833/#834).
 *
 * Extracted from LibraryPage so every WQL-driven surface (the /library route
 * and the global Search Palette) resolves content identically:
 *
 *   1. WQL → `ParsedFindQuery` via `parseQuery`
 *   2. `queryService.runFind(parsed)` → primary notes/blocks
 *   3. find:block queries emit one Entry PER BLOCK (parent identity + block
 *      type/preview, #855), newest first. The full set is returned — the
 *      Library batches rendering (infinite scroll, #861), so `find:block in
 *      all`'s ~21k rows never hit the DOM at once
 *   4. When a free-text filter is present on a find:note query, a secondary
 *      find:block run searches block body text (notes win on id conflicts)
 *
 * Invalid WQL (parse error or non-find query) resolves to an empty list;
 * callers surface the error separately via their own parse.
 */
import { queryService } from '@/services/queryService';
import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-engine';
import type { Note } from '@/types/storage'
import { toEntry, blockToEntry, noteFromBlock, type Entry } from './entryMapper'

export async function searchEntries(wql: string): Promise<Entry[]> {
  const parsed = parseQuery(wql)
  if (!isFindQuery(parsed) || parsed.error) return []

  // find:block — one Entry per block, not per note (#855).
  if (parsed.target === 'block') {
    const result = await queryService.runFind(parsed)
    return [...result.blocks].sort((a, b) => b.createdAt - a.createdAt).map(blockToEntry)
  }

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
