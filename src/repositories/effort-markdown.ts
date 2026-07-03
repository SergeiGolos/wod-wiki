/**
 * Effort Markdown Repository — Reads the markdown/efforts/ directory structure
 * to build bundled effort definitions from markdown files.
 *
 * Each markdown file contains YAML front matter with effort metadata:
 *   id, slug, label, aliases[], met, discipline, intensityTier
 *
 * Uses Vite's import.meta.glob feature to discover files at build time.
 */

import type { IEffort, IntensityTier } from '@/effort-registry/types';

// Glob all markdown files inside markdown/efforts/ subdirectories
// NOTE: import.meta.glob must be called directly (not conditionally) for Vite's
// static transform to work. Unit tests mock this module in tests/unit-setup.ts.
const effortModules = import.meta.glob('../../markdown/efforts/**/*.md', {
  query: '?raw',
  eager: true,
  import: 'default',
});

/** Extract front matter block from raw markdown */
function extractFrontmatter(raw: string): string {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

/** Extract body content after front matter */
function extractBody(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1].trim() : '';
}

/** Parse scalar value from front matter line */
function parseScalar(lines: string[], key: string): string | undefined {
  const line = lines.find((l) => l.trim().startsWith(`${key}:`));
  if (!line) return undefined;
  const value = line.slice(line.indexOf(':') + 1).trim();
  return value || undefined;
}

/** Parse string array from front matter (YAML list syntax) */
function parseStringArray(lines: string[], key: string): string[] {
  const result: string[] = [];
  let inArray = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith(`${key}:`)) {
      inArray = true;
      continue;
    }
    if (inArray) {
      const item = trimmed.match(/^-\s+(.+)$/);
      if (item) {
        result.push(item[1].trim());
      } else if (/^\S/.test(trimmed)) {
        // New top-level key — end of array block
        break;
      }
    }
  }

  return result;
}
/** Parse a flat string→string map from a single `{ k: v, k: v }` line OR
 *  a multi-line `k: v` block. Booleans/numbers are coerced; everything
 *  else is a string. Returns undefined when no entries are found. */
function parseKeyValues(lines: string[], key: string): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (inBlock) {
      if (trimmed.startsWith('}')) {
        inBlock = false;
        continue;
      }
      // A non-indented line marks the next top-level frontmatter key — end
      // the block here rather than absorbing it (checked against the
      // original `line`, not `trimmed`, since trimStart() always leaves a
      // non-whitespace character regardless of the source indentation).
      if (/^\S/.test(line)) {
        inBlock = false;
        continue;
      }
      const m = trimmed.match(/^([\w.\-]+):\s*(.*)$/);
      if (m) {
        const [, k, raw] = m;
        if (raw === 'true') result[k] = true;
        else if (raw === 'false') result[k] = false;
        else if (raw !== '' && !Number.isNaN(Number(raw))) result[k] = Number(raw);
        else result[k] = raw;
      }
    } else if (trimmed.startsWith(`${key}:`) && trimmed.includes('{')) {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (end > start) {
        const inner = trimmed.slice(start + 1, end);
        for (const pair of inner.split(',')) {
          const m = pair.match(/^\s*([\w.\-]+)\s*:\s*(.*?)\s*$/);
          if (m) {
            const [, k, raw] = m;
            if (raw === 'true') result[k] = true;
            else if (raw === 'false') result[k] = false;
            else if (raw !== '' && !Number.isNaN(Number(raw))) result[k] = Number(raw);
            else result[k] = raw;
          }
        }
        inBlock = false;
        return Object.keys(result).length > 0 ? result : undefined;
      }
    } else if (trimmed.startsWith(`${key}:`) && !trimmed.includes('{')) {
      inBlock = true;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}


/** Parse a single markdown file into an IEffort */
export function parseEffortFile(raw: string): IEffort | null {
  const fm = extractFrontmatter(raw);
  if (!fm) return null;

  const lines = fm.split('\n');
  const id = parseScalar(lines, 'id');
  const slug = parseScalar(lines, 'slug');
  const label = parseScalar(lines, 'label');
  const metStr = parseScalar(lines, 'met');
  const discipline = parseScalar(lines, 'discipline');
  const intensityTier = parseScalar(lines, 'intensityTier') as IntensityTier | undefined;
  const aliases = parseStringArray(lines, 'aliases');
  const hints = parseKeyValues(lines, 'hints');

  if (!id || !slug || !label || !metStr) return null;

  const met = parseFloat(metStr);
  if (Number.isNaN(met)) return null;

  const body = extractBody(raw);

  return {
    id,
    slug,
    label,
    aliases,
    baseAttributes: {
      met,
      ...(discipline ? { discipline } : {}),
      ...(intensityTier ? { intensityTier } : {}),
    },
    registrySource: 'bundled',
    ...(body ? { body } : {}),
    ...(hints && Object.keys(hints).length > 0 ? { hints } : {}),
  };
}

/** Cached result */
let _bundledEfforts: readonly IEffort[] | null = null;

/**
 * Get all bundled efforts derived from markdown/efforts/ markdown files.
 * Results are cached after first call.
 */
export function getBundledEfforts(): readonly IEffort[] {
  if (_bundledEfforts) return _bundledEfforts;

  const efforts: IEffort[] = [];

  for (const [path, content] of Object.entries(effortModules)) {
    const effort = parseEffortFile(content as string);
    if (effort) {
      efforts.push(effort);
    } else {
      console.warn(`[effort-markdown] Failed to parse effort file: ${path}`);
    }
  }

  _bundledEfforts = efforts.sort((a, b) => a.slug.localeCompare(b.slug));
  return _bundledEfforts;
}

/** Number of bundled efforts shipped with the app */
export function getBundledEffortCount(): number {
  return getBundledEfforts().length;
}

/**
 * Get raw markdown content for a specific effort by slug.
 * Returns null if not found.
 */
export function getEffortMarkdown(slug: string): string | null {
  const effort = getBundledEfforts().find(e => e.slug === slug);
  if (!effort) return null;
  // Reconstruct full document from parsed effort + body
  const lines = [
    '---',
    `id: ${effort.id}`,
    `slug: ${effort.slug}`,
    `label: ${effort.label}`,
    ...(effort.aliases?.length ? [`aliases:`, ...effort.aliases.map(a => `  - ${a}`)] : []),
    `met: ${effort.baseAttributes.met}`,
    ...(effort.baseAttributes.discipline ? [`discipline: ${effort.baseAttributes.discipline}`] : []),
    ...(effort.baseAttributes.intensityTier ? [`intensityTier: ${effort.baseAttributes.intensityTier}`] : []),
    '---',
  ];
  if (effort.body) {
    lines.push('', effort.body);
  }
  return lines.join('\n');
}
