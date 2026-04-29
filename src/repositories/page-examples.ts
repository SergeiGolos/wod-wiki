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

import { parseFrontmatter } from '@/utils/frontmatter';

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
            content: body.trim(),
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
    return body.trim();
}
