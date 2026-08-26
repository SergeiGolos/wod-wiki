/**
 * listCatalogs — derive the catalog list for the WQL Composer Panel's
 * `+ Filter → Catalog` menu from a block_index. One entry per distinct
 * first path segment of `noteId`, with the `feeds/` wrapper stripped.
 *
 * Does NOT include the synthetic 'journal' catalog — the panel adds it
 * separately so it always appears first regardless of the corpus.
 */
import type { BlockIndexRow } from '@/types/storage'

export interface CatalogEntry {
  id: string
  name: string
}

function catalogOf(noteId: string): string {
  return noteId.startsWith('feeds/') ? noteId.split('/')[1]! : noteId.split('/')[0]!
}

export function listCatalogs(blocks: BlockIndexRow[]): CatalogEntry[] {
  const ids = new Set<string>()
  for (const b of blocks) {
    // Only static rows contribute a catalog id. The corpus sets isStatic on
    // every block; we also accept a sourceId-prefix fallback so the helper
    // is robust to test fixtures that omit isStatic but set sourceId.
    if (b.isStatic === false) continue
    if (!b.isStatic && !b.sourceId?.startsWith('collection:') && !b.sourceId?.startsWith('feed:')) continue
    const id = catalogOf(b.noteId)
    if (id) ids.add(id)
  }
  return Array.from(ids)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(id => ({ id, name: id }))
}
