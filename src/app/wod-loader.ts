/**
 * Loads markdown content from the project's WOD directory.
 * Uses Vite's import.meta.glob feature.
 */
const wodModules = import.meta.glob('../../wod/*.md', { query: '?raw', eager: true, import: 'default' });

export function getWodContent(id: string): string | undefined {
    // Try exact match first
    let path = `../../wod/${id}.md`;
    if (wodModules[path]) {
        return wodModules[path] as string;
    }

    // Try case-insensitive match
    const lowerId = id.toLowerCase();
    const entry = Object.entries(wodModules).find(([p]) => p.toLowerCase().endsWith(`/${lowerId}.md`));

    return entry ? (entry[1] as string) : undefined;
}

export function getAllWodIds(): string[] {
    return Object.keys(wodModules).map(path => {
        const match = path.match(/\/([^/]+)\.md$/);
        return match ? match[1] : path;
    });
}
