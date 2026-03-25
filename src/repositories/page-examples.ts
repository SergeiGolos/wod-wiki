/**
 * Page Examples — Loads markdown files from markdown/canvas/ to provide
 * editable example content for the home page, getting-started, and syntax pages.
 *
 * Frontmatter format:
 *   ---
 *   title: Tab Title
 *   subtitle: Short description
 *   section: statement   (groups tabs within a page)
 *   order: 1             (sort order within section)
 *   ---
 *   <markdown content shown in the editor>
 *
 * Uses Vite's import.meta.glob — resolved at build time.
 */

const exampleModules = import.meta.glob('../../markdown/canvas/**/*.md', {
    query: '?raw',
    eager: true,
    import: 'default',
});

export interface PageTabExample {
    title: string;
    subtitle: string;
    section: string;
    order: number;
    content: string;
}

/**
 * Parse simple YAML frontmatter (flat key: value only, no nesting).
 * Returns parsed metadata and the body after the closing `---`.
 */
function parseFrontmatter(raw: string): { meta: Record<string, string | number>; body: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };

    const meta: Record<string, string | number> = {};
    for (const line of match[1].split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const rawVal = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        const num = Number(rawVal);
        meta[key] = rawVal !== '' && !isNaN(num) ? num : rawVal;
    }
    return { meta, body: match[2].trim() };
}

/**
 * Return all tab examples for a given page and section, sorted by order.
 *
 * @param page    Subdirectory name under markdown/canvas/, e.g. 'getting-started' or 'syntax'
 * @param section Value of the `section` frontmatter field, e.g. 'statement'
 */
export function getTabExamples(page: string, section: string): PageTabExample[] {
    const results: PageTabExample[] = [];

    for (const [path, content] of Object.entries(exampleModules)) {
        // Path: ../../markdown/canvas/{page}/{file}.md
        const match = path.match(/\/markdown\/canvas\/([^/]+)\/[^/]+\.md$/);
        if (!match || match[1] !== page) continue;

        const { meta, body } = parseFrontmatter(content as string);
        if (meta.section !== section) continue;

        results.push({
            title: String(meta.title ?? ''),
            subtitle: String(meta.subtitle ?? ''),
            section: String(meta.section ?? ''),
            order: Number(meta.order ?? 0),
            content: body,
        });
    }

    return results.sort((a, b) => a.order - b.order);
}

/**
 * Return the raw markdown content of a single named file from markdown/canvas/home/.
 * Used for wod script examples on the home page parallax.
 */
export function getHomeExample(name: string): string {
    const key = Object.keys(exampleModules).find(k =>
        k.endsWith(`/markdown/canvas/home/${name}.md`)
    );
    if (!key) return '';
    const { body } = parseFrontmatter(exampleModules[key] as string);
    return body;
}
