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

/** Strip matched wrapping quotes: `"x"` / `'x'` → `x`; mismatched quotes are kept.
 *  Double-quoted values also collapse the serializer's escapes (`\\"`, `\\\\`). */
function unquote(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, (_match, quote: string, inner: string) =>
    quote === '"' ? inner.replace(/\\(["\\])/g, '$1') : inner,
  );
}

/**
 * Parse the leading YAML frontmatter block of a markdown string.
 *
 * Semantics:
 *   - No block → `{ meta: {}, body: raw }`.
 *   - Scalar `key: value` (key `/^[A-Za-z][\w.-]*$/`, dots allow flat nested
 *     keys like `book.title`): matched wrapping quotes stripped; bare numeric
 *     strings become `number`, quoted scalars always stay strings.
 *   - `key:` with empty value followed by indented `- item` lines → `string[]`;
 *     the list ends at the next top-level key; case is preserved.
 *   - `key:` with empty value and no list items → `''`.
 *   - Inline `key: [a, b]` stays a plain scalar string.
 *   - Indented non-list lines (nested maps) are ignored by this generic parser.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw };

  return { meta: parseMetaLines(match[1].split(/\r?\n/)), body: raw.slice(match[0].length) };
}

/** Shared scalar/list line parser behind `parseFrontmatter` and `parseFrontmatterBody`. */
function parseMetaLines(lines: string[]): ParsedFrontmatter['meta'] {
  const meta: ParsedFrontmatter['meta'] = {};

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
      // Quoted scalars stay strings (YAML semantics); only bare numeric
      // strings coerce to numbers.
      const wasQuoted = /^(['"])(.*)\1$/.test(rawVal);
      const value = unquote(rawVal);
      const num = Number(value);
      meta[key] = !wasQuoted && value !== '' && !isNaN(num) ? num : value;
    }
  }

  return meta;
}

/**
 * Parse frontmatter body content (the lines between the `---` delimiters)
 * with the same semantics as `parseFrontmatter`. Used by editor overlays
 * that hold the section's inner content rather than the full document.
 */
export function parseFrontmatterBody(innerContent: string): ParsedFrontmatter['meta'] {
  return parseMetaLines(innerContent.split(/\r?\n/));
}

/** Quote a scalar when it would not round-trip through `parseFrontmatter` unchanged. */
function quoteYamlScalar(value: string): string {
  if (value === '') return '""';
  const looksNumeric = !isNaN(Number(value));
  const looksKeyword = /^(true|false|null|yes|no|on|off)$/i.test(value);
  if (/[":'\n#{}[\],&*?|<>=%!@`]/.test(value) || value !== value.trim() || value.startsWith('-') || looksNumeric || looksKeyword) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Serialize frontmatter metadata back to YAML body lines (no `---`
 * delimiters). Inverse of `parseFrontmatterBody`: scalars are quoted only
 * when needed to round-trip, numbers emit bare, lists emit block style
 * (`key:` + indented `- item`), preserving key order.
 */
export function serializeFrontmatter(meta: ParsedFrontmatter['meta']): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: ""`);
        continue;
      }
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${quoteYamlScalar(item)}`);
      }
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${quoteYamlScalar(value)}`);
    }
  }
  return lines.join('\n');
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
 * Extract the `tags` list from a frontmatter block's raw content — with or
 * without the `---` delimiters (section rawContent keeps them; overlays hold
 * the inner body). Accepts the block-list form (`tags:\n  - crossfit`), a
 * bare scalar (`tags: crossfit`), and the inline form (`tags: [a, b]`).
 * Values are trimmed, empties dropped, duplicates removed; case is preserved.
 */
export function extractFrontmatterTags(raw: string): string[] {
  const meta = FRONTMATTER_RE.test(raw)
    ? parseFrontmatter(raw).meta
    : parseFrontmatterBody(raw);
  const tags = meta['tags'];
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === 'string' && tags.trim()
      ? tags.trim().startsWith('[') && tags.trim().endsWith(']')
        ? tags.trim().slice(1, -1).split(',')
        : [tags]
      : [];
  return [...new Set(list.map(tag => tag.trim()).filter(Boolean))];
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
  return detectUrlSubtype(url);
}

/** URL-classifiable link subtypes. */
export type LinkUrlSubtype = 'youtube' | 'amazon' | 'strava';

/**
 * Classify a URL-ish value by its host. Compares the exact host (and its
 * subdomains) against known providers, so lookalike domains such as
 * `youtube.com.evil.com` or `notyoutube.com` are rejected.
 */
export function detectUrlSubtype(url: string): LinkUrlSubtype | null {
  if (!url) return null;
  const withoutScheme = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = withoutScheme.split(/[/?#:]/, 1)[0].toLowerCase();
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com') || host.endsWith('.youtu.be')) return 'youtube';
  if (host === 'amazon.com' || host === 'amzn.to' || host.endsWith('.amazon.com') || host.endsWith('.amzn.to')) return 'amazon';
  if (host === 'strava.com' || host.endsWith('.strava.com')) return 'strava';
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
