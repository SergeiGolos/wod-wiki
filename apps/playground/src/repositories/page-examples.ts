/**
 * Page Examples — tab examples and home snippets from the seeded corpus
 * (markdown/canvas/**, via the seed-content seam).
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
 * The old Vite import.meta.glob is gone — content loads from IndexedDB.
 */

import { parseFrontmatter } from '@/lib/frontmatter';
import { ensureSeedContent } from '@/services/content/seedContent';

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
export async function getTabExamples(page: string, section: string): Promise<PageTabExample[]> {
    const files = await ensureSeedContent();
    const results: PageTabExample[] = [];

    for (const [path, content] of Object.entries(files)) {
        // Path: markdown/canvas/{page}/{file}.md
        const match = path.match(/^markdown\/canvas\/([^/]+)\/[^/]+\.md$/);
        if (!match || match[1] !== page) continue;

        const { meta, body } = parseFrontmatter(content);
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
export async function getHomeExample(name: string): Promise<string> {
    const files = await ensureSeedContent();
    const key = Object.keys(files).find((k) => k === `markdown/canvas/home/${name}.md`);
    if (!key) return '';
    const { body } = parseFrontmatter(files[key]);
    return body.trim();
}
