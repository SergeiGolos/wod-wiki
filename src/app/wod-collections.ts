/**
 * WOD Collections — Reads the wod/ directory structure to build
 * collections from subdirectories. Each subdirectory becomes a
 * "collection" with its markdown files as items.
 *
 * Uses Vite's import.meta.glob feature to discover files at build time.
 */

// Glob all markdown files inside wod/ subdirectories (recursive)
const collectionModules = import.meta.glob('../../wod/**/*.md', {
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
    /** Directory name, e.g. "crossfit-girls" */
    id: string;
    /** Display name, e.g. "Crossfit Girls" */
    name: string;
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
 * Results are cached after first call.
 */
export function getWodCollections(): WodCollection[] {
    if (_collections) return _collections;

    const dirMap = new Map<string, WodCollectionItem[]>();

    for (const [path, content] of Object.entries(collectionModules)) {
        // path looks like "../../wod/crossfit-girls/fran.md"
        // We want to extract: dir = "crossfit-girls", file = "fran.md"
        const match = path.match(/\/wod\/([^/]+)\/([^/]+\.md)$/);
        if (!match) continue;

        const [, dirName, fileName] = match;
        const fileId = fileName.replace(/\.md$/, '');

        if (!dirMap.has(dirName)) {
            dirMap.set(dirName, []);
        }

        dirMap.get(dirName)!.push({
            id: fileId,
            name: fileToDisplayName(fileName),
            content: content as string,
            path,
        });
    }

    _collections = Array.from(dirMap.entries())
        .filter(([, items]) => items.length > 0) // skip empty dirs
        .map(([dirName, items]) => ({
            id: dirName,
            name: toDisplayName(dirName),
            count: items.length,
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return _collections;
}

/**
 * Get a single collection by ID.
 */
export function getWodCollection(id: string): WodCollection | undefined {
    return getWodCollections().find(c => c.id === id);
}
