/**
 * Loads markdown content from the project's WOD directory.
 * Uses Vite's import.meta.glob feature.
 */
const wodModules = import.meta.glob('../../wod/**/*.md', { query: '?raw', eager: true, import: 'default' });

export function getWodContent(id: string): string | undefined {
    // Try exact match first
    const path = `../../wod/${id}.md`;
    if (wodModules[path]) {
        return wodModules[path] as string;
    }

    // Try case-insensitive match by searching for the suffix /id.md
    const suffix = `/${id}.md`.toLowerCase();
    const entry = Object.entries(wodModules).find(([p]) => p.toLowerCase().endsWith(suffix));

    return entry ? (entry[1] as string) : undefined;
}

export function getAllWodIds(): string[] {
    return Object.keys(wodModules).map(path => {
        const match = path.match(/\/wod\/(.+)\.md$/);
        return match ? match[1] : path;
    });
}
