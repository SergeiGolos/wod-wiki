/**
 * searchEntries — the shared WQL → Entry[] pipeline (issues #833/#834).
 *
 * Extracted from LibraryPage so every WQL-driven surface (the /library route
 * and the global Search Palette) resolves content identically:
 *
 *   1. WQL → `ParsedFindQuery` via `parseQuery`
 *   2. `queryService.runFind(parsed)` → primary notes/blocks
 *   3. find:block queries emit one Entry PER BLOCK (parent identity + block
 *      type/preview, #855), newest first, capped at {@link BLOCK_RESULTS_CAP}
 *      — `find:block in all` is ~21k rows and the list is not virtualized yet
 *      (#861); the cap keeps the report's own scenario renderable
 *   4. When a free-text filter is present on a find:note query, a secondary
 *      find:block run searches block body text (notes win on id conflicts)
 *
 * Invalid WQL (parse error or non-find query) resolves to an empty list;
 * callers surface the error separately via their own parse.
 */
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery } from '@/services/analytics/query/wql'
import type { Note } from '@/types/storage'
import { toEntry, blockToEntry, noteFromBlock, type Entry } from './entryMapper'

/** Render cap for find:block result lists (#855; lifts with #861's
 *  virtualization). The status line still reports the true matched count. */
export const BLOCK_RESULTS_CAP = 200

export interface EntrySearchResult {
  entries: Entry[]
  /** Present when a find:block result set was truncated for rendering. */
  capped?: { shown: number; total: number }
}

export async function searchEntriesWithMeta(wql: string): Promise<EntrySearchResult> {
  const parsed = parseQuery(wql)
  if (!isFindQuery(parsed) || parsed.error) return { entries: [] }

  // Activity-anchored windows (#857): `last <n>w` measures back from the
  // index's newest entry, not wall-clock now, so windows stay meaningful on
  // snapshot/static corpora. Passed to BOTH runs so a free-text + window
  // query filters note hits and block hits under identical semantics.
  const findOptions = { anchor: 'latest-activity' as const }

  // find:block — one Entry per block, not per note (#855).
  if (parsed.target === 'block') {
    const result = await queryService.runFind(parsed, findOptions)
    const sorted = [...result.blocks].sort((a, b) => b.createdAt - a.createdAt)
    const shown = sorted.slice(0, BLOCK_RESULTS_CAP)
    return {
      entries: shown.map(blockToEntry),
      ...(sorted.length > BLOCK_RESULTS_CAP
        ? { capped: { shown: shown.length, total: sorted.length } }
        : {}),
    }
  }

  const hasText = parsed.filters.some(f => f.key === 'text' && !f.negate)
  const primaryPromise = queryService.runFind(parsed, findOptions)

  // When free-text is present, also run find:block to search body text.
  const blockWql = hasText && parsed.target === 'note'
    ? wql.replace(/^find:note/, 'find:block')
    : null
  const blockParsed = blockWql ? parseQuery(blockWql) : null
  const blockPromise = (blockParsed && isFindQuery(blockParsed) && !blockParsed.error)
    ? queryService.runFind(blockParsed, findOptions)
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

  return { entries: Array.from(noteMap.values()).map(toEntry) }
}

export async function searchEntries(wql: string): Promise<Entry[]> {
  return (await searchEntriesWithMeta(wql)).entries
}
