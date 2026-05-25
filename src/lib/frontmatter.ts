/**
 * Shared frontmatter parser utilities.
 *
 * Handles:
 *   - Scalar key-value pairs:  title: "WOD 761"
 *   - Arrays:                  category:\n  - kettlebell\n  - strength
 *   - Flat nested keys:        book.title: "Kettlebell Simple & Sinister"
 *   - Link widget extraction
 *   - YouTube video ID extraction
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LinkWidget {
  kind: 'youtube' | 'amazon' | 'strava' | 'source' | 'website' | 'book';
  url?: string;
  label: string;
  videoId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the inner content between `---` delimiters.
 * Returns `null` if no valid frontmatter block is found.
 */
function extractFrontmatterBlock(raw: string): string | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Parse scalar key-value pairs from a full markdown string's frontmatter.
 *
 * Behavior matches the original inline parser in CollectionCard.tsx:
 *   - Only scalar lines (key: value) are captured.
 *   - Array lines (starting with "  -") are ignored.
 *   - Surrounding quotes are stripped from values.
 *   - Empty values are skipped.
 */
export function parseFrontmatter(raw: string): Record<string, string> {
  const block = extractFrontmatterBlock(raw);
  if (!block) return {};

  const meta: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

    // Skip array items and empty values
    if (key && val && !key.startsWith('-')) {
      meta[key] = val;
    }
  }
  return meta;
}

/**
 * Parse the `category` YAML array from a full markdown string's frontmatter.
 *
 * Behavior matches the original inline parser in wod-collections.ts:
 *   - Looks for `category:` followed by indented `- item` lines.
 *   - Stops when a new top-level key is encountered.
 *   - Lowercases all extracted values.
 */
export function parseFrontmatterCategories(raw: string): string[] {
  const block = extractFrontmatterBlock(raw);
  if (!block) return [];

  const lines = block.split('\n');
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
        // New top-level key — end of category block
        break;
      }
    }
  }

  return categories;
}

/**
 * Parse flat scalar key-value pairs from raw inner content (no delimiters).
 *
 * Behavior matches the original inline parser in FrontmatterCompanion.tsx:
 *   - Each `key: value` line becomes an entry.
 *   - Quotes are NOT stripped (the original did not strip them).
 *   - Handles CRLF line endings.
 */
export function parseFlatProperties(innerContent: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of innerContent.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

/**
 * Parse scalar key-value pairs from an array of lines.
 *
 * Behavior matches the original inline parser in frontmatter-preview.ts:
 *   - Each `key: value` line becomes an entry.
 *   - Quotes are NOT stripped.
 */
export function parseFrontmatterProps(lines: string[]): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

// ─────────────────────────────────────────────────────────────────────────────
// Link widgets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract an 11-character YouTube video ID from a URL.
 *
 * Supports:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  const standard = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (standard) return standard[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return short[1];
  const embed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

/**
 * Detect the subtype of a frontmatter block from its properties.
 */
function detectWidgetSubtype(props: Record<string, string>): LinkWidget['kind'] | null {
  const typeValue = (props.type || '').toLowerCase();
  if (typeValue === 'youtube') return 'youtube';
  if (typeValue === 'amazon') return 'amazon';
  if (typeValue === 'strava') return 'strava';

  const url = props.url || props.link || '';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/amazon\.com|amzn\.to/i.test(url)) return 'amazon';
  if (/strava\.com/i.test(url)) return 'strava';

  return null;
}

/**
 * Extract link widgets from frontmatter properties.
 *
 * Pulls out: youtube, amazon, source_url, website, book
 */
export function extractLinkWidgets(props: Record<string, string>): LinkWidget[] {
  const widgets: LinkWidget[] = [];

  const subtype = detectWidgetSubtype(props);
  const url = props.url || props.link || '';
  const label = props.title || props.label || '';

  if (subtype === 'youtube' && url) {
    widgets.push({
      kind: 'youtube',
      url,
      label,
      videoId: extractYouTubeVideoId(url) || undefined,
    });
  } else if (subtype === 'amazon' && url) {
    widgets.push({
      kind: 'amazon',
      url,
      label,
    });
  } else if (subtype === 'strava' && url) {
    widgets.push({
      kind: 'strava',
      url,
      label,
    });
  }

  if (props.source_url) {
    widgets.push({
      kind: 'source',
      url: props.source_url,
      label: 'Source',
    });
  }

  if (props.website) {
    widgets.push({
      kind: 'website',
      url: props.website,
      label: 'Website',
    });
  }

  if (props.book) {
    widgets.push({
      kind: 'book',
      label: props.book,
    });
  }

  return widgets;
}
