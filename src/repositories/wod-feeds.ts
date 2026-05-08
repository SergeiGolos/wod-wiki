/**
 * WOD Feeds — Reads the markdown/feeds/ directory structure to build
 * date-organised feed content at build time.
 *
 * Directory layout:
 *   markdown/feeds/{feed-slug}/README.md          → feed header + front matter
 *   markdown/feeds/{feed-slug}/YYYY-MM-DD/{file}.md → feed items (dated)
 *
 * Each feed has a name, readme, categories, and a flat list of items sorted
 * by date (most recent first). Each item carries the date it belongs to so
 * callers can group by date for calendar display.
 */

// Glob all markdown files inside markdown/feeds/
const feedModules = import.meta.glob(
  ['../../markdown/feeds/**/*.md'],
  { query: '?raw', eager: true, import: 'default' },
) as Record<string, string>;

// ── Types ──────────────────────────────────────────────────────────────────

export interface WodFeedItem {
  /** Filename without extension, e.g. "monday-strength" */
  id: string;
  /** Display name derived from filename */
  name: string;
  /** Raw markdown content */
  content: string;
  /** Publication date key: YYYY-MM-DD (parent directory name) */
  feedDate: string;
  /** Full glob path key */
  path: string;
}

export interface WodFeed {
  /** Directory name, e.g. "crossfit-programming" */
  id: string;
  /** Display name, e.g. "CrossFit Programming" */
  name: string;
  /** The content of README.md if it exists */
  readme?: string;
  /** Category slugs parsed from the README front matter `category` field */
  categories: string[];
  /** All feed items sorted by feedDate descending (most recent first) */
  items: WodFeedItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse YAML-style front matter categories (scalar or block array).
 *   category:
 *     - crossfit
 *     - conditioning
 */
function parseFrontmatterCategories(raw: string): string[] {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];

  const lines = match[1].split('\n');
  let inCategory = false;
  const categories: string[] = [];

  for (const line of lines) {
    if (/^category\s*:/.test(line)) {
      inCategory = true;
      continue;
    }
    if (inCategory) {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item) {
        categories.push(item[1].trim().toLowerCase());
      } else if (/^\S/.test(line)) {
        break;
      }
    }
  }

  return categories;
}

function toDisplayName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fileToDisplayName(filename: string): string {
  const base = filename.replace(/\.md$/, '');
  if (base.toUpperCase() === 'README') return 'Overview';
  // Strip leading "day-01-" prefixes if present, then humanise
  const cleaned = base.replace(/^day-\d+-/, '');
  return cleaned
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ── Cache ──────────────────────────────────────────────────────────────────

let _feeds: WodFeed[] | null = null;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all WOD feeds derived from markdown/feeds/ subdirectories.
 * Results are memoised after first call (build-time data never changes).
 */
export function getWodFeeds(): WodFeed[] {
  if (_feeds) return _feeds;

  const feedMap = new Map<string, {
    name: string;
    readme?: string;
    categories: string[];
    items: WodFeedItem[];
  }>();

  const ensureFeed = (id: string) => {
    if (!feedMap.has(id)) {
      feedMap.set(id, { name: toDisplayName(id), categories: [], items: [] });
    }
    return feedMap.get(id)!;
  };

  for (const [path, content] of Object.entries(feedModules)) {
    // README at feed root: …/feeds/{slug}/README.md
    const readmeMatch = path.match(/\/markdown\/feeds\/([^/]+)\/README\.md$/i);
    if (readmeMatch) {
      const [, slug] = readmeMatch;
      const feed = ensureFeed(slug);
      feed.readme = content;
      feed.categories = parseFrontmatterCategories(content);
      continue;
    }

    // Dated item: …/feeds/{slug}/YYYY-MM-DD/{file}.md
    const itemMatch = path.match(/\/markdown\/feeds\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/([^/]+\.md)$/);
    if (itemMatch) {
      const [, slug, dateKey, fileName] = itemMatch;
      const feed = ensureFeed(slug);
      feed.items.push({
        id: fileName.replace(/\.md$/, ''),
        name: fileToDisplayName(fileName),
        content,
        feedDate: dateKey,
        path,
      });
      continue;
    }
    // Other files (nested without date, etc.) are intentionally ignored.
  }

  _feeds = Array.from(feedMap.entries())
    .filter(([, { items, readme }]) => items.length > 0 || readme)
    .map(([id, { name, readme, categories, items }]) => ({
      id,
      name,
      readme,
      categories,
      // Most recent dates first
      items: items.sort((a, b) => b.feedDate.localeCompare(a.feedDate)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return _feeds;
}

/** Get a single feed by ID. */
export function getWodFeed(id: string): WodFeed | undefined {
  return getWodFeeds().find(f => f.id === id);
}

/** Get a specific item within a feed by date + item id. */
export function getWodFeedItem(
  feedId: string,
  feedDate: string,
  itemId: string,
): WodFeedItem | undefined {
  return getWodFeed(feedId)?.items.find(
    i => i.feedDate === feedDate && i.id === itemId,
  );
}

/** Unique date keys present in a feed, most recent first. */
export function getFeedDateKeys(feed: WodFeed): string[] {
  return Array.from(new Set(feed.items.map(i => i.feedDate))).sort().reverse();
}
