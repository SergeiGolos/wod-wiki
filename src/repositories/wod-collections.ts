/**
 * WOD Collections — Reads the markdown/collections/ directory structure to build
 * collections from subdirectories. Each subdirectory becomes a
 * "collection" with its markdown files as items.
 *
 * Uses Vite's import.meta.glob feature to discover files at build time.
 */

// Glob all markdown files inside markdown/collections/ — both nested and root-level
const collectionModules = import.meta.glob(['../../markdown/collections/**/*.md', '../../markdown/collections/*.md'], {
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
    /** Directory name, e.g. "crossfit-girls" or "dan-john" */
    id: string;
    /** Display name, e.g. "Crossfit Girls" or "Dan John" */
    name: string;
    /** Number of workout files (excluding README) */
    count: number;
    /** Markdown files in this collection */
    items: WodCollectionItem[];
    /** The content of README.md if it exists */
    readme?: string;
}

/**
 * Parse a directory name into a display name.
 * "crossfit-girls" -> "Crossfit Girls"
 */
function toDisplayName(dirName: string): string {
    return dirName
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Parse a filename into a display name.
 * "simple-and-sinister.md" -> "Simple And Sinister"
 */
function fileToDisplayName(filename: string): string {
    const base = filename.replace(/\.md$/, '');
    if (base.toUpperCase() === 'README') return 'Overview';
    return base
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/** Cached result */
let _collections: WodCollection[] | null = null;

/**
 * Get all WOD collections derived from markdown/collections/ subdirectories.
 * Supports one level of nesting:
 *   markdown/collections/{dir}/{file}.md           → collection id = "{dir}"
 * Results are cached after first call.
 */
export function getWodCollections(): WodCollection[] {
    if (_collections) return _collections;

    const dirMap = new Map<string, { name: string; items: WodCollectionItem[]; readme?: string }>();

    const ensureCollection = (id: string, name: string) => {
        if (!dirMap.has(id)) {
            dirMap.set(id, { name, items: [] });
        }
    };

    for (const [path, content] of Object.entries(collectionModules)) {
        // One-level deep: markdown/collections/dir/file.md
        // e.g. markdown/collections/crossfit-girls/fran.md, markdown/collections/dan-john/README.md
        const match1 = path.match(/\/markdown\/collections\/([^/]+)\/([^/]+\.md)$/);
        if (match1) {
            const [, dirName, fileName] = match1;
            ensureCollection(dirName, toDisplayName(dirName));
            
            if (fileName.toLowerCase() === 'readme.md') {
                dirMap.get(dirName)!.readme = content as string;
            } else {
                const fileId = fileName.replace(/\.md$/, '');
                dirMap.get(dirName)!.items.push({
                    id: fileId,
                    name: fileToDisplayName(fileName),
                    content: content as string,
                    path,
                });
            }
            continue;
        }

        // Root-level files that don't match any pattern are intentionally ignored.
    }

    _collections = Array.from(dirMap.entries())
        .filter(([, { items, readme }]) => items.length > 0 || readme)
        .map(([id, { name, items, readme }]) => ({
            id,
            name,
            count: items.length,
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
            readme,
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
