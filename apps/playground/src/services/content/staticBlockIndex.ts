/**
 * Corpus block store — the derived static-corpus plane, now backed by the
 * `block_index` store (docs/prototypes/seed-data-unification.md § Module 3).
 *
 * The seed importer materializes precomputed BlockIndexRow[] rows (from the
 * `block-index.<n>` seed chunks) into `block_index` next to user rows; this
 * module derives the corpus projections the Query Service's note plane and
 * the WQL composer suggestions need. The old ~8 MB generated JSON import
 * (src/generated/static-block-index.json) is gone.
 */
import type { BlockIndexRow, Note } from '@/types/storage';
import type { NoteQueryStore } from '@bitcobblers/wod-wiki-engine';
import { extractFrontmatterTags } from '@/lib/frontmatter';
import { staticCatalogRoute } from '@bitcobblers/wod-wiki-wql';
import {
    CANONICAL_BLOCK_TYPES,
    blockTypesFromBlocks,
    canonicalSuggestionItems,
    catalogIdsFromBlocks,
    getSuggestionBinding,
    mergeSuggestionItems,
    mergeTagSuggestions,
    setSuggestionBinding,
} from '@bitcobblers/wod-wiki-ui';
import { EFFORT_DISCIPLINES, INTENSITY_TIERS, type IEffort } from '@bitcobblers/wod-wiki-lang';
import { storageService } from '@/services/storage';
import { getAppEffortRegistry } from '@/services/effortRegistry';
import { getScriptCollections } from '@/repositories/script-collections';
let corpusBlocksPromise: Promise<BlockIndexRow[]> | null = null;

/** Memoized corpus (`isStatic`) block rows from the block_index store. */
export function loadCorpusBlocks(): Promise<BlockIndexRow[]> {
    if (!corpusBlocksPromise) {
        corpusBlocksPromise = storageService
            .getAllBlockIndex()
            .then((rows) => rows.filter((row) => row.isStatic === true))
            .catch((err) => {
                corpusBlocksPromise = null;
                throw err;
            });
    }
    return corpusBlocksPromise;
}

/** Drop the memoized corpus read — call when a new seed lands. */
export function invalidateCorpusBlocks(): void {
    corpusBlocksPromise = null;
    staticNotesPromise = null;
    staticTagIndexPromise = null;
}

/**
 * Created-at timestamp for a feed entry's date key (`yyyy-mm-dd` from the
 * file path). Returns 0 (undated) for malformed keys — undated rows are
 * excluded from dated time windows but present in unbounded queries.
 */
export function feedDateToCreatedAt(dateKey: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 0;
    const ts = Date.parse(`${dateKey}T00:00:00Z`);
    return Number.isNaN(ts) ? 0 : ts;
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

/**
 * Pure projection of a block_index into static Notes — one Note per distinct
 * noteId. `id` stays the canonical storage identity (UUID for imported rows);
 * `catalog` and collection-landing status come from the sourceId route via
 * the shared `staticCatalogRoute` (`catalog` is undefined for UUID-keyed rows
 * without a route — never a UUID). The catalog (e.g. `crossfit-girls`) is
 * what the Library's panel uses to target the `+ Filter → Catalog` menu.
 */
export function staticNotesFromBlocks(blocks: BlockIndexRow[]): Note[] {
    const map = new Map<string, Note>();
    const tagsByNote = new Map<string, string[]>();
    for (const block of blocks) {
        if (block.dataType === 'frontmatter') {
            const tags = extractFrontmatterTags(block.rawContent);
            if (tags.length > 0) tagsByNote.set(block.noteId, tags);
        }
        if (!map.has(block.noteId)) {
            const route = staticCatalogRoute(block);
            map.set(block.noteId, {
                id: block.noteId,
                title: block.noteTitle,
                createdAt: block.createdAt,
                type: route.landing ? 'collection' : 'note',
                sourceId: route.sourceId,
                catalog: route.catalog,
                sourcePath: block.sourcePath,
            });
        }
    }
    for (const [noteId, tags] of tagsByNote.entries()) {
        const n = map.get(noteId);
        if (n) n.tags = tags;
    }
    return Array.from(map.values());
}

let staticNotesPromise: Promise<Note[]> | null = null;
export function loadStaticNotes(): Promise<Note[]> {
    if (!staticNotesPromise) {
        staticNotesPromise = loadCorpusBlocks().then(async (blocks) => {
            const notes = staticNotesFromBlocks(blocks);
            const hasCollectionPages = notes.some(n => n.type === 'collection' && n.sourceId?.startsWith('page:collection:'));
            if (!hasCollectionPages) {
                try {
                    const collections = await getScriptCollections();
                    for (const col of collections) {
                        notes.push({
                            id: col.id,
                            title: col.name,
                            createdAt: 0,
                            type: 'collection',
                            sourceId: `page:collection:${col.id}`,
                            catalog: col.id,
                            tags: col.categories,
                        });
                    }
                } catch {
                    // test environment
                }
            }
            return notes;
        });
    }
    return staticNotesPromise;
}

let staticTagIndexPromise: Promise<Map<string, Set<string>>> | null = null;
/**
 * Memoized tag → noteIds index over the static corpus, derived lazily so
 * the ~21k-row scan only runs when a `tags:` clause actually executes.
 */
export function loadStaticTagIndex(): Promise<Map<string, Set<string>>> {
    if (!staticTagIndexPromise) {
        staticTagIndexPromise = loadCorpusBlocks().then(async (blocks) => {
            const index = staticTagIndexFromBlocks(blocks);
            try {
                const collections = await getScriptCollections();
                for (const col of collections) {
                    for (const cat of col.categories) {
                        const set = index.get(cat);
                        if (set) set.add(col.id);
                        else index.set(cat, new Set([col.id]));
                    }
                }
            } catch {
                // test environment
            }
            return index;
        });
    }
    return staticTagIndexPromise;
}
export const staticNoteStore: NoteQueryStore = {
    getAllNotes: () => loadStaticNotes(),
    getNoteIdsForTag: async (label) =>
        (await loadStaticTagIndex()).get(label) ?? new Set<string>(),
    // The corpus notes' tags live on their frontmatter block rows.
    getNoteTagLabels: async (noteId) => {
        const notes = await loadStaticNotes();
        const note = notes.find((n) => n.id === noteId);
        if (note?.tags && note.tags.length > 0) return note.tags;
        const blocks = await loadCorpusBlocks();
        return blocks
            .filter((b) => b.noteId === noteId && b.dataType === 'frontmatter')
            .flatMap((b) => extractFrontmatterTags(b.rawContent));
    },
};

// ── Composer suggestion bindings ───────────────────────────────────────────

// The executor's effort plane — the CompositeEffortRegistry (bundled + user),
// the same source RegistryEffortStore serves queries from. Storage-only reads
// would miss the bundled tier when it is not materialized in IndexedDB.
async function executorEfforts(): Promise<readonly IEffort[]> {
    const registry = getAppEffortRegistry();
    if (!registry.isInitialized()) {
        await registry.loadBundled();
    }
    return registry.list();
}

// Effort filters read actual registry values first (vault), then the canonical
// static vocabulary, deduped case-insensitively with canonical spelling for
// enum keys. Labels are display-only — completion inserts `item.value`.
setSuggestionBinding('discipline', {
    load: async () => {
        try {
            const vault = (await executorEfforts())
                .map((effort) => effort.baseAttributes?.discipline)
                .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
                .map((d) => ({ value: d.trim(), label: d.trim() }));
            return mergeSuggestionItems(vault, canonicalSuggestionItems(EFFORT_DISCIPLINES));
        } catch {
            return canonicalSuggestionItems(EFFORT_DISCIPLINES);
        }
    },
    cache: { ttlMs: 60_000 },
    open: false,
    emptyText: 'No disciplines available',
});

// Effort slugs — actual registry rows: value = slug (the inserted token),
// label = display name.
setSuggestionBinding('effort', {
    load: async () => {
        try {
            const items = (await executorEfforts())
                .filter((effort) => effort.slug)
                .map((effort) => ({ value: effort.slug, label: effort.label || effort.slug }));
            return mergeSuggestionItems(items, []).sort((a, b) => a.value.localeCompare(b.value));
        } catch {
            return [];
        }
    },
    cache: { ttlMs: 60_000 },
    open: true,
    emptyText: 'No efforts indexed yet — type one to filter',
});

setSuggestionBinding('intensity', {
    load: async () => {
        try {
            const vault = (await executorEfforts())
                .map((effort) => effort.baseAttributes?.intensityTier)
                .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
                .map((t) => ({ value: t.trim(), label: t.trim() }));
            return mergeSuggestionItems(vault, canonicalSuggestionItems(INTENSITY_TIERS));
        } catch {
            return canonicalSuggestionItems(INTENSITY_TIERS);
        }
    },
    cache: { ttlMs: 60_000 },
    open: false,
    emptyText: 'No intensity tiers indexed yet',
});

// Block types — actual indexed corpus types first, canonical static after.
setSuggestionBinding('type', {
    load: async () => {
        try {
            const vault = blockTypesFromBlocks(await loadCorpusBlocks())
                .map((t) => ({ value: t, label: t }));
            return mergeSuggestionItems(vault, canonicalSuggestionItems(CANONICAL_BLOCK_TYPES));
        } catch {
            return canonicalSuggestionItems(CANONICAL_BLOCK_TYPES);
        }
    },
    cache: { ttlMs: 300_000 },
    open: false,
    emptyText: 'No indexed block types yet',
});

setSuggestionBinding('catalog', {
    load: async () => {
        const blocks = await loadCorpusBlocks();
        const catalogIds = catalogIdsFromBlocks(blocks);
        return catalogIds.map((id) => ({ value: id, label: id }));
    },
    cache: 'static',
    open: false,
    emptyText: 'No catalogs in the static corpus',
});

setSuggestionBinding('tag', {
    load: async () => {
        const tagIndex = await loadStaticTagIndex();
        const staticTags = Array.from(tagIndex.keys());
        let userTags: string[] = [];
        try {
            userTags = (await storageService.getAllTags()).map((t) => t.label);
        } catch {
            // IndexedDB not ready in isolated test environments
        }
        // User tags first, corpus after, case-insensitive dedup keeping the
        // user's spelling.
        return mergeTagSuggestions(userTags, staticTags).map((t) => ({ value: t, label: t }));
    },
    cache: { ttlMs: 30_000 },
    open: true,
    emptyText: 'No tags yet — type one to filter by it',
});

for (const type of ['domain', 'format', 'equipment', 'quality', 'intent']) {
    setSuggestionBinding(type, {
        load: async () => {
            try {
                const tags = await storageService.getTags(type);
                return tags.map((t) => ({ value: t.label, label: t.label }));
            } catch {
                return [];
            }
        },
        cache: { ttlMs: 60_000 },
        open: true,
        emptyText: `No ${type}s indexed yet`,
    });
}

// Effort origins — the distinct registrySource values across stored effort
// rows (engine type is open: 'bundled' | 'user' | string), never a hardcoded
// enum. Open slot: unindexed origins remain typeable.
setSuggestionBinding('origin', {
    load: async () => {
        try {
            const efforts = await storageService.getAllEfforts();
            const origins = new Set<string>();
            for (const effort of efforts) {
                if (effort.registrySource) origins.add(effort.registrySource);
            }
            return Array.from(origins).sort().map((o) => ({ value: o, label: o }));
        } catch {
            return [];
        }
    },
    cache: { ttlMs: 60_000 },
    open: true,
    emptyText: 'No effort origins indexed yet — type one to filter',
});

// Registered dynamic tag keys: user-created tag types beyond the standard
// typed keys become real suggestion-backed filter/dimension sources. Types
// already bound (standard keys, discipline, block types) keep their source.
void (async () => {
    try {
        const types = await storageService.getAllTagTypes();
        for (const tagType of types) {
            if (getSuggestionBinding(tagType.name)) continue;
            setSuggestionBinding(tagType.name, {
                load: async () => {
                    try {
                        const tags = await storageService.getTags(tagType.name);
                        return tags.map((t) => ({ value: t.label, label: t.label }));
                    } catch {
                        return [];
                    }
                },
                cache: { ttlMs: 60_000 },
                open: true,
                emptyText: `No ${tagType.label}s indexed yet`,
            });
        }
    } catch {
        // IndexedDB not ready in isolated test environments
    }
})();
