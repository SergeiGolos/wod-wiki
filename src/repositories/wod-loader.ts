/**
 * Loads markdown content from the project's markdown directory.
 * Uses Vite's import.meta.glob feature.
 */
const markdownModules = import.meta.glob('../../markdown/**/*.md', { query: '?raw', eager: true, import: 'default' });

export function getWodContent(id: string): string | undefined {
    // Try exact matches in both collections and canvas
    const paths = [
        `../../markdown/collections/${id}.md`,
        `../../markdown/canvas/${id}.md`
    ];
    
    for (const path of paths) {
        if (markdownModules[path]) {
            return markdownModules[path] as string;
        }
    }

    // Try case-insensitive match by searching for the suffix /id.md
    const suffix = `/${id}.md`.toLowerCase();
    const entry = Object.entries(markdownModules).find(([p]) => p.toLowerCase().endsWith(suffix));

    return entry ? (entry[1] as string) : undefined;
}

export function getAllWodIds(): string[] {
    return Object.keys(markdownModules).map(path => {
        // Match: ../../markdown/{collections|canvas}/(slug).md
        const match = path.match(/\/markdown\/(?:collections|canvas)\/(.+)\.md$/);
        return match ? match[1] : path;
    });
}
