/**
 * Groupings — pure builder over a seeded-content file map
 * (docs/prototypes/seed-data-unification.md: item shape + ordering).
 *
 * A grouping is one subdirectory of `markdown/collections/` or
 * `markdown/feeds/`: its README (front-matter categories + prose) plus its
 * dated (feeds) or plain (collections) items. The map keys follow the
 * canonical `markdown/<root>/…` form that `seedContent` serves.
 */
import { parseFrontmatterCategories } from '@/lib/frontmatter';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GroupingItem {
  /** Filename without extension, e.g. "fran" */
  id: string;
  /** Display name derived from filename */
  name: string;
  /** Raw markdown content */
  content: string;
  /** Canonical markdown path key, e.g. "markdown/collections/crossfit-girls/fran.md" */
  path: string;
  /** Date key (feeds only): YYYY-MM-DD parent directory */
  date?: string;
}

export interface Grouping {
  /** Directory name, e.g. "crossfit-girls" */
  id: string;
  /** Display name derived from the directory name */
  name: string;
  /** The content of README.md if it exists */
  readme?: string;
  /** Category slugs parsed from the README front matter `category` field */
  categories: string[];
  /** Items in this grouping (unsorted — adapters own sort order) */
  items: GroupingItem[];
}

export type GroupingRoot = 'collections' | 'feeds';

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
 * Build the groupings for one root from a seeded-content file map. Pure —
 * the same map always yields the same groupings.
 */
export function buildGroupings(root: GroupingRoot, files: Record<string, string>): Grouping[] {
  const groupMap = new Map<string, Grouping>();

  const ensureGrouping = (id: string): Grouping => {
    let grouping = groupMap.get(id);
    if (!grouping) {
      grouping = { id, name: toDisplayName(id), categories: [], items: [] };
      groupMap.set(id, grouping);
    }
    return grouping;
  };

  for (const [path, content] of Object.entries(files)) {
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
