/**
 * WOD Collections — public adapter over the seeded corpus
 * (docs/prototypes/seed-data-unification.md § Module 3).
 *
 * A collection is a Grouping of named items from markdown/collections/.
 * Items are sorted by name ascending; collections are sorted by name
 * ascending. Reads go through the seed-content seam (IndexedDB-backed);
 * results are memoized per corpus snapshot and refresh when a new seed lands.
 */

import { ensureSeedContent, type SeedContentFiles } from '@/services/content/seedContent';
import { buildGroupings, type Grouping } from './groupings';

export interface ScriptCollectionItem {
    /** Filename without extension, e.g. "fran" */
    id: string;
    /** Display name derived from filename */
    name: string;
    /** Raw markdown content */
    content: string;
    /** Canonical markdown path key */
    path: string;
}

export interface ScriptCollection {
    /** Directory name, e.g. "crossfit-girls" or "dan-john" */
    id: string;
    /** Display name, e.g. "Crossfit Girls" or "Dan John" */
    name: string;
    /** Number of workout files (excluding README) */
    count: number;
    /** Markdown files in this collection */
    items: ScriptCollectionItem[];
    /** The content of README.md if it exists */
    readme?: string;
    /** Category slugs parsed from the README front matter `category` field */
    categories: string[];
}

/** Pure derivation over a corpus snapshot — the hook-level entry point. */
export function buildScriptCollections(files: SeedContentFiles): ScriptCollection[] {
    return buildGroupings('collections', files)
        .map((grouping: Grouping) => ({
            id: grouping.id,
            name: grouping.name,
            count: grouping.items.length,
            items: grouping.items
                .map(({ id, name, content, path }) => ({ id, name, content, path }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            readme: grouping.readme,
            categories: grouping.categories,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

let cacheFor: SeedContentFiles | null = null;
let cached: ScriptCollection[] = [];

/**
 * Get all WOD collections from the seeded corpus. Memoized per corpus
 * snapshot; resolves after the seed content is loaded.
 */
export async function getScriptCollections(): Promise<ScriptCollection[]> {
    const files = await ensureSeedContent();
    if (cacheFor !== files) {
        cacheFor = files;
        cached = buildScriptCollections(files);
    }
    return cached;
}

/**
 * Get a single collection by ID.
 */
export async function getScriptCollection(id: string): Promise<ScriptCollection | undefined> {
    return (await getScriptCollections()).find(c => c.id === id);
}
