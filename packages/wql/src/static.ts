import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';
import { extractFrontmatterTags } from './dashboard/frontmatter';
import { catalogOfItem } from './QueryService';

/**
 * Landing/catalog projection for a block row, derived from its sourceId route
 * (`collection:<catalog>/<item>`, `page:collection:<catalog>`,
 * `feed:feeds/<catalog>/…`) — never from `noteId`, which is a UUID for
 * imported notes. Legacy path-keyed rows keep deriving from the noteId stem
 * through `catalogOfItem` (undefined for UUID or no path); a bare
 * `collection:<catalog>` route is the legacy landing and gets its canonical
 * `page:collection:` sourceId.
 */
export function staticCatalogRoute(block: Pick<BlockIndexRow, 'noteId' | 'sourceId'>): {
  landing: boolean;
  catalog?: string;
  sourceId?: string;
} {
  const sourceId = block.sourceId;
  if (sourceId?.startsWith('page:collection:')) {
    const catalog = sourceId.slice('page:collection:'.length);
    if (catalog) return { landing: true, catalog, sourceId };
  } else if (sourceId?.startsWith('collection:')) {
    const route = sourceId.slice('collection:'.length);
    if (route) {
      const slash = route.indexOf('/');
      return slash === -1
        ? { landing: true, catalog: route, sourceId: `page:collection:${route}` }
        : { landing: false, catalog: route.slice(0, slash), sourceId };
    }
  } else if (sourceId?.startsWith('feed:')) {
    const route = sourceId.slice('feed:'.length);
    if (route) {
      const stem = route.startsWith('feeds/') ? route.slice('feeds/'.length) : route;
      return { landing: false, catalog: stem.split('/')[0], sourceId };
    }
  }
  // Non-collection/feed routes and degenerate ones: legacy path-stem
  // derivation via catalogOfItem — undefined for UUID noteIds (no UUID
  // catalog fallback) or path-less stems.
  return { landing: false, catalog: catalogOfItem({ noteId: block.noteId, sourceId: block.sourceId }), sourceId };
}

/**
 * Pure projection of a block_index into static Notes — one Note per distinct
 * noteId. `id` stays the canonical storage identity (UUID for imported rows);
 * `catalog` and feed-landing status come from the sourceId route, not
 * the noteId path. The catalog (e.g. `crossfit-girls`) is what the Library's
 * panel uses to target the `+ Filter → Catalog` menu.
 */
export function staticNotesFromBlocks(blocks: BlockIndexRow[]): Note[] {
  const map = new Map<string, Note>();
  for (const block of blocks) {
    if (map.has(block.noteId)) continue;
    const route = staticCatalogRoute(block);
    map.set(block.noteId, {
      id: block.noteId,
      title: block.noteTitle,
      createdAt: block.createdAt,
      type: route.landing ? 'feed' : 'note',
      sourceId: route.sourceId,
      catalog: route.catalog,
    });
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
