/**
 * Script Groupings — deep loader for bundled markdown directories.
 *
 * A Grouping is a bundled markdown directory of workout items under one slug:
 *   - a **Collection** is a Grouping of named items
 *     (markdown/collections/{slug}/{file}.md)
 *   - a **Feed** is a Grouping whose items carry dates
 *     (markdown/feeds/{slug}/YYYY-MM-DD/{file}.md)
 *
 * Each grouping directory may contain a README.md whose front matter
 * `category` list becomes the grouping's categories.
 *
 * This module owns file discovery and display-name derivation; the public
 * adapters (`script-collections.ts`, `script-feeds.ts`) own item shape and
 * sort order. Uses Vite's import.meta.glob — resolved at build time.
 */

import { parseFrontmatterCategories } from '@/lib/frontmatter';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GroupingItem {
  /** Filename without extension, e.g. "fran" or "monday-strength" */
  id: string;
  /** Display name derived from filename */
  name: string;
  /** Raw markdown content */
  content: string;
  /** Full glob path key */
  path: string;
  /** Publication date key YYYY-MM-DD (feeds only; parent directory name) */
  date?: string;
}

export interface Grouping {
  /** Directory name, e.g. "crossfit-girls" or "crossfit-programming" */
  id: string;
  /** Display name, e.g. "Crossfit Girls" */
  name: string;
  /** The content of README.md if it exists */
  readme?: string;
  /** Category slugs parsed from the README front matter `category` field */
  categories: string[];
  /** Items in glob order — adapters own sort order */
  items: GroupingItem[];
}

// ── Display-name helpers ───────────────────────────────────────────────────

/**
 * Parse a directory name into a display name.
 * "crossfit-girls" -> "Crossfit Girls"
 */
export function toDisplayName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse a filename into a display name.
 * "simple-and-sinister.md" -> "Simple And Sinister"
 */
export function fileToDisplayName(filename: string): string {
  const base = filename.replace(/\.md$/, '');
  if (base.toUpperCase() === 'README') return 'Overview';
  // Strip leading "day-01-" prefixes if present, then humanise
  const cleaned = base.replace(/^day-\d+-/, '');
  return cleaned
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ── Builder ────────────────────────────────────────────────────────────────

/**
 * Raw glob per root. Kept inside a function so importing this module has no
 * side effects (unit tests run under bun, which lacks Vite's glob transform);
 * Vite still resolves the literal patterns at build time.
 */
function globRoot(root: 'collections' | 'feeds'): Record<string, string> {
  if (root === 'collections') {
    return import.meta.glob(
      ['../../../../markdown/collections/**/*.md', '../../../../markdown/collections/*.md'],
      { query: '?raw', eager: true, import: 'default' },
    ) as Record<string, string>;
  }
  return import.meta.glob(
    ['../../../../markdown/feeds/**/*.md'],
    { query: '?raw', eager: true, import: 'default' },
  ) as Record<string, string>;
}

function buildGroupings(root: 'collections' | 'feeds'): Grouping[] {
  const groupMap = new Map<string, Grouping>();

  const ensureGrouping = (id: string): Grouping => {
    let grouping = groupMap.get(id);
    if (!grouping) {
      grouping = { id, name: toDisplayName(id), categories: [], items: [] };
      groupMap.set(id, grouping);
    }
    return grouping;
  };

  for (const [path, content] of Object.entries(globRoot(root))) {
    if (root === 'collections') {
      // One level deep: markdown/collections/{dir}/{file}.md
      const match = path.match(/\/markdown\/collections\/([^/]+)\/([^/]+\.md)$/);
      if (!match) continue; // root-level files are intentionally ignored
      const [, dirName, fileName] = match;
      const grouping = ensureGrouping(dirName);

      if (fileName.toLowerCase() === 'readme.md') {
        grouping.readme = content;
        grouping.categories = parseFrontmatterCategories(content);
      } else {
        grouping.items.push({
          id: fileName.replace(/\.md$/, ''),
          name: fileToDisplayName(fileName),
          content,
          path,
        });
      }
      continue;
    }

    // Feeds: README at feed root, dated items one level deeper.
    const readmeMatch = path.match(/\/markdown\/feeds\/([^/]+)\/README\.md$/i);
    if (readmeMatch) {
      const grouping = ensureGrouping(readmeMatch[1]);
      grouping.readme = content;
      grouping.categories = parseFrontmatterCategories(content);
      continue;
    }

    const itemMatch = path.match(/\/markdown\/feeds\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/([^/]+\.md)$/);
    if (itemMatch) {
      const [, slug, dateKey, fileName] = itemMatch;
      ensureGrouping(slug).items.push({
        id: fileName.replace(/\.md$/, ''),
        name: fileToDisplayName(fileName),
        content,
        path,
        date: dateKey,
      });
      continue;
    }
    // Other files (nested without date, etc.) are intentionally ignored.
  }

  return Array.from(groupMap.values())
    .filter(({ items, readme }) => items.length > 0 || readme !== undefined);
}

// ── Cache ──────────────────────────────────────────────────────────────────

const _cache = new Map<'collections' | 'feeds', Grouping[]>();

/**
 * Get all groupings for a markdown root. Results are memoised per root
 * (build-time data never changes).
 */
export function getGroupings(root: 'collections' | 'feeds'): Grouping[] {
  let groupings = _cache.get(root);
  if (!groupings) {
    groupings = buildGroupings(root);
    _cache.set(root, groupings);
  }
  return groupings;
}
