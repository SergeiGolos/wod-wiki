import type { BlockIndexRow, Note } from '@wod-wiki/core';
import { extractFrontmatterTags } from './dashboard/frontmatter';

/**
 * Pure projection of a block_index into static Notes — one Note per distinct
 * noteId, with a `catalog` field set to `noteId.split('/')[0]`. The catalog is
 * the directory the file lives under (e.g. `crossfit-girls` for collections,
 * `crossfit-programming` for feeds) and is what the Library's panel uses to
 * target the `+ Filter → Catalog` menu.
 */
export function staticNotesFromBlocks(blocks: BlockIndexRow[]): Note[] {
  const map = new Map<string, Note>();
  for (const block of blocks) {
    if (!map.has(block.noteId)) {
      map.set(block.noteId, {
        id: block.noteId,
        title: block.noteTitle,
        createdAt: block.createdAt,
        type: 'note',
        sourceId: block.sourceId,
        catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Tag → noteIds index over a block index's frontmatter rows. Static-corpus
 * notes declare tags only in frontmatter `tags:`; this recovers the mapping
 * the note store needs to answer `tags:` clauses (issue #853 — the store
 * previously returned an empty set for every tag).
 */
export function staticTagIndexFromBlocks(blocks: BlockIndexRow[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const block of blocks) {
    if (block.dataType !== 'frontmatter') continue;
    for (const tag of extractFrontmatterTags(block.rawContent)) {
      const ids = index.get(tag);
      if (ids) ids.add(block.noteId);
      else index.set(tag, new Set([block.noteId]));
    }
  }
  return index;
}
