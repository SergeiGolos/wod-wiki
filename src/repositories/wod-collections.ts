/**
 * WOD Collections — Reads the wod/ directory structure to build
 * collections from subdirectories. Each subdirectory becomes a
 * "collection" with its markdown files as items.
 *
 * Uses Vite's import.meta.glob feature to discover files at build time.
 */

// Glob all markdown files inside wod/ — both nested and root-level
const collectionModules = import.meta.glob(['../../wod/**/*.md', '../../wod/*.md'], {
    query: '?raw',
    eager: true,
    import: 'default',
});

export interface WodCollectionItem {
    /** Filename without extension, e.g. "fran" */
    id: string;
    /** Display name derived from filename */
    name: string;
    /** Raw markdown content */
    content: string;
    /** Full glob path key */
    path: string;
}

export interface WodCollection {
    /** Directory name, e.g. "crossfit-girls" or "kettlebell-dan-john" */
    id: string;
    /** Display name, e.g. "Crossfit Girls" or "Dan John" */
    name: string;
    /** Parent collection ID for nested collections, e.g. "kettlebell" for "kettlebell-dan-john" */
    parent?: string;
    /** Number of markdown files */
    count: number;
    /** Markdown files in this collection */
    items: WodCollectionItem[];
}

/**
 * Parse a directory name into a display name.
 * "crossfit-girls" -> "Crossfit Girls"
 */
function toDisplayName(dirName: string): string {
    return dirName
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Parse a filename into a display name.
 * "simple-and-sinister.md" -> "Simple And Sinister"
 */
function fileToDisplayName(filename: string): string {
    const base = filename.replace(/\.md$/, '');
    return base
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/** Cached result */
let _collections: WodCollection[] | null = null;

/**
 * Get all WOD collections derived from wod/ subdirectories.
 * Supports up to two levels of nesting:
 *   wod/{dir}/{file}.md           → collection id = "{dir}"
 *   wod/{parent}/{child}/{file}.md → collection id = "{parent}-{child}"
 *   wod/{YYYY}.{NN}.md            → merged into "crossfit-games" collection
 * Results are cached after first call.
 */
export function getWodCollections(): WodCollection[] {
    if (_collections) return _collections;

    const dirMap = new Map<string, { name: string; parent?: string; items: WodCollectionItem[] }>();

    const ensureCollection = (id: string, name: string, parent?: string) => {
        if (!dirMap.has(id)) {
            dirMap.set(id, { name, parent, items: [] });
        }
    };

    for (const [path, content] of Object.entries(collectionModules)) {
        // Two-level deep: wod/parent/child/file.md
        // e.g. wod/kettlebell/dan-john/armor-building-complex.md
        //   or wod/swimming/college/distance-freestyle.md
        const match2 = path.match(/\/wod\/([^/]+)\/([^/]+)\/([^/]+\.md)$/);
        if (match2) {
            const [, parentDir, childDir, fileName] = match2;
            const collectionId = `${parentDir}-${childDir}`;
            // Short name (just the child) for grouped display; parent is the parent dir
            ensureCollection(collectionId, toDisplayName(childDir), parentDir);
            const fileId = fileName.replace(/\.md$/, '');
            dirMap.get(collectionId)!.items.push({
                id: fileId,
                name: fileToDisplayName(fileName),
                content: content as string,
                path,
            });
            continue;
        }

        // One-level deep: wod/dir/file.md
        // e.g. wod/crossfit-girls/fran.md, wod/crossfit-games/2020.01.md
        const match1 = path.match(/\/wod\/([^/]+)\/([^/]+\.md)$/);
        if (match1) {
            const [, dirName, fileName] = match1;
            ensureCollection(dirName, toDisplayName(dirName));
            const fileId = fileName.replace(/\.md$/, '');
            dirMap.get(dirName)!.items.push({
                id: fileId,
                name: fileToDisplayName(fileName),
                content: content as string,
                path,
            });
            continue;
        }

        // Root-level CrossFit Games files: wod/2007.01.md … wod/2019.14.md
        // Merge these into the shared "crossfit-games" collection.
        const matchYear = path.match(/\/wod\/(\d{4})\.(\d+)\.md$/);
        if (matchYear) {
            const [, year, num] = matchYear;
            ensureCollection('crossfit-games', 'Crossfit Games');
            const fileId = `${year}.${num.padStart(2, '0')}`;
            dirMap.get('crossfit-games')!.items.push({
                id: fileId,
                name: fileId,
                content: content as string,
                path,
            });
            continue;
        }

        // Root-level files that don't match any pattern are intentionally ignored.
    }

    _collections = Array.from(dirMap.entries())
        .filter(([, { items }]) => items.length > 0)
        .map(([id, { name, parent, items }]) => ({
            id,
            name,
            parent,
            count: items.length,
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
            // Sort: root collections alphabetically, children right after their parent
            const aRoot = a.parent ?? a.id;
            const bRoot = b.parent ?? b.id;
            const rootCmp = aRoot.localeCompare(bRoot);
            if (rootCmp !== 0) return rootCmp;
            // Same root: parent (no parent field) comes before children
            if (!a.parent && b.parent) return -1;
            if (a.parent && !b.parent) return 1;
            return a.name.localeCompare(b.name);
        });

    return _collections;
}

/**
 * Get a single collection by ID.
 */
export function getWodCollection(id: string): WodCollection | undefined {
    return getWodCollections().find(c => c.id === id);
}
