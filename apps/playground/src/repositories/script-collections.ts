/**
 * WOD Collections — public adapter over the script-groupings loader.
 *
 * A collection is a Grouping of named items from markdown/collections/.
 * Items are sorted by name ascending; collections are sorted by name
 * ascending. Results are memoised after first call (build-time data).
 */

import { getGroupings } from './script-groupings';

export interface ScriptCollectionItem {
    /** Filename without extension, e.g. "fran" */
    id: string;
    /** Display name derived from filename */
    name: string;
    /** Raw markdown content */
    content: string;
    /** Full glob path key */
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

/** Cached result */
let _collections: ScriptCollection[] | null = null;

/**
 * Get all WOD collections derived from markdown/collections/ subdirectories.
 * Results are cached after first call.
 */
export function getScriptCollections(): ScriptCollection[] {
    if (_collections) return _collections;

    _collections = getGroupings('collections')
        .map(grouping => ({
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

    return _collections;
}

/**
 * Get a single collection by ID.
 */
export function getScriptCollection(id: string): ScriptCollection | undefined {
    return getScriptCollections().find(c => c.id === id);
}
