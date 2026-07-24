/**
 * Shared frontmatter parser utilities.
 *
 * Handles:
 *   - Scalar key-value pairs:  title: "WOD 761"
 *   - Block arrays:            category:\n  - kettlebell\n  - strength
 *   - Flat nested keys:        book.title: "Kettlebell Simple & Sinister"
 *   - Link widget extraction
 *   - YouTube video ID extraction
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedFrontmatter {
  meta: Record<string, string | number | string[]>
  body: string
}

export interface LinkWidget {
  kind: 'youtube' | 'amazon' | 'strava' | 'source' | 'website' | 'book';
  url?: string;
  label: string;
  videoId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Leading `---` … `---` block; body is everything after the closing delimiter. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Strip matched wrapping quotes: `"x"` / `'x'` → `x`; mismatched quotes are kept. */
function unquote(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

/**
 * Parse the leading YAML frontmatter block of a markdown string.
 *
 * Semantics:
 *   - No block → `{ meta: {}, body: raw }`.
 *   - Scalar `key: value` (key `/^[A-Za-z][\w.-]*$/`, dots allow flat nested
 *     keys like `book.title`): matched wrapping quotes stripped; numeric
 *     strings become `number`.
 *   - `key:` with empty value followed by indented `- item` lines → `string[]`;
 *     the list ends at the next top-level key; case is preserved.
 *   - `key:` with empty value and no list items → `''`.
 *   - Inline `key: [a, b]` stays a plain scalar string.
 *   - Indented non-list lines (nested maps) are ignored by this generic parser.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw };

  const meta: ParsedFrontmatter['meta'] = {};
  const lines = match[1].split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const keyMatch = lines[i].match(/^([A-Za-z][\w.-]*)\s*:(.*)$/);
    if (!keyMatch) continue; // indented/nested/list lines are not top-level keys

    const key = keyMatch[1];
    const rawVal = keyMatch[2].trim();

    if (rawVal === '') {
      // Look ahead for an indented `- item` block list
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const itemMatch = lines[i + 1].match(/^\s+-\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        i++;
      }
      meta[key] = items.length > 0 ? items : '';
    } else {
      const value = unquote(rawVal);
      const num = Number(value);
      meta[key] = value !== '' && !isNaN(num) ? num : value;
    }
  }

  return { meta, body: raw.slice(match[0].length) };
}

/** Body of `raw` with the leading frontmatter block removed. */
export function stripFrontmatter(raw: string): string {
  return parseFrontmatter(raw).body;
}

/** Scalar value at `key`, or `undefined` when absent or a list. */
export function getScalar(
  meta: ParsedFrontmatter['meta'],
  key: string,
): string | number | undefined {
  const value = meta[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

/** List value at `key`, or `[]` when absent or a scalar. */
export function getList(meta: ParsedFrontmatter['meta'], key: string): string[] {
  const value = meta[key];
  return Array.isArray(value) ? value : [];
}

/**
 * Parse the `category` YAML array from a full markdown string's frontmatter.
 * Lowercases all extracted values.
 */
export function parseFrontmatterCategories(raw: string): string[] {
  return getList(parseFrontmatter(raw).meta, 'category').map(c => c.toLowerCase());
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

/** Coerce a frontmatter value to a plain string for widget extraction. */
function asString(value: string | number | string[] | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value.join(', ') : String(value);
}

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
function detectWidgetSubtype(props: ParsedFrontmatter['meta']): LinkWidget['kind'] | null {
  const typeValue = asString(props.type).toLowerCase();
  if (typeValue === 'youtube') return 'youtube';
  if (typeValue === 'amazon') return 'amazon';
  if (typeValue === 'strava') return 'strava';

  const url = asString(props.url || props.link);
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
export function extractLinkWidgets(props: ParsedFrontmatter['meta']): LinkWidget[] {
  const widgets: LinkWidget[] = [];

  if (props.youtube) {
    const url = asString(props.youtube);
    widgets.push({
      kind: 'youtube',
      url,
      label: 'Video',
      videoId: extractYouTubeVideoId(url) || undefined,
    });
  }

  if (props.amazon) {
    widgets.push({
      kind: 'amazon',
      url: asString(props.amazon),
      label: 'Amazon',
    });
  }

  const subtype = detectWidgetSubtype(props);
  const url = asString(props.url || props.link);
  const label = asString(props.title || props.label);

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
      url: asString(props.source_url),
      label: 'Source',
    });
  }

  if (props.website) {
    widgets.push({
      kind: 'website',
      url: asString(props.website),
      label: 'Website',
    });
  }

  if (props.book) {
    widgets.push({
      kind: 'book',
      label: asString(props.book),
    });
  }

  return widgets;
}
