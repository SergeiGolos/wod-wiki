/**
 * Effort Markdown Repository — the single home of the effort-document format.
 *
 * An effort document is YAML frontmatter + a markdown body. The canonical
 * shape is the nested form:
 *
 *   ---
 *   id: effort-bundled-air-squat
 *   slug: air-squat
 *   label: Air Squat
 *   aliases:
 *     - air squat
 *   baseAttributes:
 *     met: 5.5
 *     discipline: bodyweight
 *     intensityTier: moderate
 *   ---
 *
 * This module owns both directions:
 *   - `effortToDocument` / `documentToEffort` — serialize/parse user and
 *     bundled effort documents (round-trip safe).
 *   - `getBundledEfforts` / `getBundledEffortCount` / `getEffortMarkdown` —
 *     the bundled markdown/efforts/ repository (Vite import.meta.glob).
 */

import { v4 as uuidv4 } from 'uuid';
import { parseFrontmatter, getScalar, getList } from '@/lib/frontmatter';
import { isEffortDiscipline } from '@/effort-registry/disciplines';
import type {
  IEffort,
  EffortBaseAttributes,
  EffortDerivation,
  EffortRegistrySource,
  IntensityTier,
} from '@/effort-registry/types';

/* ── YAML helpers ─────────────────────────────────────────────────── */

/**
 * Validate a parsed discipline against the canonical vocabulary. Unknown
 * values are dropped (undefined) with a warning — the resolver would silently
 * score them at the 1.0 default anyway, and a typo must not mint a new
 * vocabulary member.
 */
function parseDiscipline(val: string | undefined): EffortBaseAttributes['discipline'] {
  if (!val) return undefined;
  const normalized = unquoteYaml(val.trim()).toLowerCase();
  if (isEffortDiscipline(normalized)) return normalized;
  console.warn(`[effort-markdown] unknown discipline '${val}' — expected one of the canonical values; treating as unset`);
  return undefined;
}

function quoteYaml(val: string): string {
  if (!val) return '""';
  if (/[:"'\n#{}[\],&*?|\-<>=%!@`]/.test(val) || val !== val.trim()) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

function unquoteYaml(val: string): string {
  if (val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/\\'/g, "'");
  }
  return val;
}

function parseYamlScalar(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  try {
    return JSON.parse(val);
  } catch {
    return unquoteYaml(val);
  }
}

/* ── Serialize ────────────────────────────────────────────────────── */

/**
 * Convert an IEffort into a YAML-frontmatter markdown document.
 */
export function effortToDocument(effort: IEffort): string {
  const lines: string[] = ['---'];

  lines.push(`id: ${effort.id}`);
  lines.push(`slug: ${effort.slug}`);
  lines.push(`label: ${quoteYaml(effort.label)}`);

  if (effort.aliases.length > 0) {
    lines.push('aliases:');
    for (const alias of effort.aliases) {
      lines.push(`  - ${quoteYaml(alias)}`);
    }
  } else {
    lines.push('aliases: []');
  }

  lines.push('baseAttributes:');
  lines.push(`  met: ${effort.baseAttributes.met}`);
  if (effort.baseAttributes.discipline) {
    lines.push(`  discipline: ${effort.baseAttributes.discipline}`);
  }
  if (effort.baseAttributes.intensityTier) {
    lines.push(`  intensityTier: ${effort.baseAttributes.intensityTier}`);
  }

  lines.push(`registrySource: ${effort.registrySource}`);

  if (effort.derivation) {
    lines.push('derivation:');
    if (effort.derivation.parentSlug) {
      lines.push(`  parentSlug: ${effort.derivation.parentSlug}`);
    }
    if (effort.derivation.coefficients && Object.keys(effort.derivation.coefficients).length > 0) {
      lines.push('  coefficients:');
      for (const [k, v] of Object.entries(effort.derivation.coefficients)) {
        lines.push(`    ${k}: ${v}`);
      }
    }
    if (effort.derivation.hardOverrides && Object.keys(effort.derivation.hardOverrides).length > 0) {
      lines.push('  hardOverrides:');
      for (const [k, v] of Object.entries(effort.derivation.hardOverrides)) {
        lines.push(`    ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  if (effort.createdAt) {
    lines.push(`createdAt: ${effort.createdAt}`);
  }
  if (effort.updatedAt) {
    lines.push(`updatedAt: ${effort.updatedAt}`);
  }

  lines.push('---');

  if (effort.body) {
    lines.push('');
    lines.push(effort.body);
  }

  return lines.join('\n');
}

/* ── Parse ────────────────────────────────────────────────────────── */

export interface ParseResult {
  effort: IEffort;
  errors: string[];
}

/**
 * Parse a YAML-frontmatter markdown document back into an IEffort.
 * Falls back to the provided `baseEffort` for missing fields.
 */
export function documentToEffort(doc: string, baseEffort?: IEffort): ParseResult {
  const errors: string[] = [];
  const fmMatch = doc.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    errors.push('Missing YAML frontmatter delimiters (---)');
    return {
      effort: baseEffort ?? createDefaultEffort(),
      errors,
    };
  }

  // Extract body: everything after the closing --- delimiter
  const bodyStart = fmMatch.index! + fmMatch[0].length;
  const body = doc.slice(bodyStart).replace(/^\r?\n+/, '');

  const lines = fmMatch[1].split('\n');
  const result: Partial<IEffort> = {};
  const baseAttributes: Partial<EffortBaseAttributes> = {};
  const derivation: Partial<EffortDerivation> = {};
  let coefficients: Record<string, number> | undefined;
  let hardOverrides: Record<string, unknown> | undefined;

  type Context = 'root' | 'baseAttributes' | 'derivation' | 'coefficients' | 'hardOverrides';
  let context: Context = 'root';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      context = 'root';
      if (trimmed === 'baseAttributes:') {
        context = 'baseAttributes';
        continue;
      }
      if (trimmed === 'derivation:') {
        context = 'derivation';
        continue;
      }

      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        switch (key) {
          case 'id':
            result.id = val;
            break;
          case 'slug':
            result.slug = val;
            break;
          case 'label':
            result.label = unquoteYaml(val);
            break;
          case 'aliases':
            if (val === '[]') result.aliases = [];
            break;
          case 'registrySource':
            result.registrySource = val as EffortRegistrySource;
            break;
          case 'createdAt':
            result.createdAt = val;
            break;
          case 'updatedAt':
            result.updatedAt = val;
            break;
        }
      }
    } else if (indent === 2) {
      if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim();
        if (!result.aliases) result.aliases = [];
        result.aliases.push(unquoteYaml(val));
      } else if (trimmed === 'coefficients:') {
        context = 'coefficients';
        coefficients = {};
        derivation.coefficients = coefficients;
      } else if (trimmed === 'hardOverrides:') {
        context = 'hardOverrides';
        hardOverrides = {};
        derivation.hardOverrides = hardOverrides;
      } else {
        const match = trimmed.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          if (context === 'baseAttributes') {
            switch (key) {
              case 'met':
                baseAttributes.met = parseFloat(val) || 0;
                break;
              case 'discipline':
                baseAttributes.discipline = parseDiscipline(val);
                break;
              case 'intensityTier':
                baseAttributes.intensityTier = val as IntensityTier;
                break;
            }
          } else if (context === 'derivation') {
            switch (key) {
              case 'parentSlug':
                derivation.parentSlug = val || undefined;
                break;
            }
          }
        }
      }
    } else if (indent === 4) {
      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (context === 'coefficients' && coefficients) {
          coefficients[key] = parseFloat(val) || 0;
        } else if (context === 'hardOverrides' && hardOverrides) {
          hardOverrides[key] = parseYamlScalar(val);
        }
      }
    }
  }

  if (!result.aliases) result.aliases = [];
  result.baseAttributes = {
    met: baseEffort?.baseAttributes.met ?? 0,
    ...baseAttributes,
  };
  if (Object.keys(derivation).length > 0 || coefficients || hardOverrides) {
    result.derivation = derivation;
  }

  result.body = body || undefined;

  // Validation
  const slug = result.slug?.trim() ?? '';
  if (!slug) {
    errors.push('Missing required field: slug');
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Invalid slug: must be lowercase letters, numbers, and hyphens only');
  }

  if (!result.label?.trim()) errors.push('Missing required field: label');

  const met = result.baseAttributes?.met;
  if (met === undefined || met === null) {
    errors.push('Missing required field: met');
  } else if (typeof met !== 'number' || Number.isNaN(met) || met <= 0) {
    errors.push('Invalid met: must be a positive number');
  }

  if (!result.id) result.id = baseEffort?.id || `effort-user-${uuidv4()}`;
  if (!result.registrySource) result.registrySource = baseEffort?.registrySource || 'user';

  const effort = result as IEffort;
  return { effort, errors };
}

function createDefaultEffort(): IEffort {
  return {
    id: `effort-user-${uuidv4()}`,
    slug: '',
    label: '',
    aliases: [],
    baseAttributes: { met: 5.0 },
    registrySource: 'user',
  };
}

/* ── Bundled repository ───────────────────────────────────────────── */

/**
 * Coerce a scalar from a nested block: booleans/numbers are coerced;
 * everything else stays a string.
 */
function coerceNestedScalar(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

/**
 * Read a nested (`key:` followed by indented entries) section from frontmatter
 * lines. Two levels are supported (`derivation.coefficients.*`).
 *
 * Boundary rule: a nested block ends at the next non-indented (top-level)
 * line, checked against the original un-trimmed line.
 */
function readNestedSection(lines: string[], key: string): Record<string, unknown> | undefined {
  const start = lines.findIndex(l => new RegExp(`^${key}:\\s*$`).test(l));
  if (start === -1) return undefined;

  const result: Record<string, unknown> = {};
  let subKey: string | null = null;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // next top-level key ends the block

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const m = trimmed.match(/^([\w.\-]+):\s*(.*)$/);
    if (!m) continue;
    const [, k, rawVal] = m;

    if (indent === 2) {
      if (rawVal === '') {
        subKey = k;
        result[k] = {};
      } else {
        subKey = null;
        result[k] = coerceNestedScalar(rawVal);
      }
    } else if (indent >= 4 && subKey !== null) {
      (result[subKey] as Record<string, unknown>)[k] = coerceNestedScalar(rawVal);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Raw glob, deferred into a function so importing this module has no side
 * effects (unit tests run under bun, which lacks Vite's glob transform);
 * Vite still resolves the literal pattern at build time.
 */
function globEffortModules(): Record<string, string> {
  return import.meta.glob('../../markdown/efforts/**/*.md', {
    query: '?raw',
    eager: true,
    import: 'default',
  }) as Record<string, string>;
}

/** Parse a single markdown file into an IEffort */
export function parseEffortFile(raw: string): IEffort | null {
  const blockMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!blockMatch) return null;

  const { meta, body } = parseFrontmatter(raw);
  const innerLines = blockMatch[1].split(/\r?\n/);

  const id = getScalar(meta, 'id');
  const slug = getScalar(meta, 'slug');
  const label = getScalar(meta, 'label');
  const aliases = getList(meta, 'aliases');

  const baseAttrs = readNestedSection(innerLines, 'baseAttributes');
  const hints = readNestedSection(innerLines, 'hints');
  const derivation = readNestedSection(innerLines, 'derivation');

  const metRaw = baseAttrs?.met;
  const met = typeof metRaw === 'number' ? metRaw : Number(metRaw);
  if (!id || !slug || !label || metRaw === undefined || Number.isNaN(met)) return null;

  const discipline = parseDiscipline(
    typeof baseAttrs?.discipline === 'string' ? baseAttrs.discipline : undefined,
  );
  const intensityTier = baseAttrs?.intensityTier;
  const trimmedBody = body.trim();

  return {
    id: String(id),
    slug: String(slug),
    label: String(label),
    aliases,
    baseAttributes: {
      met,
      ...(discipline ? { discipline } : {}),
      ...(intensityTier ? { intensityTier: intensityTier as IntensityTier } : {}),
    },
    registrySource: 'bundled',
    ...(trimmedBody ? { body: trimmedBody } : {}),
    ...(hints ? { hints } : {}),
    ...(derivation ? { derivation: derivation as IEffort['derivation'] } : {}),
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

  for (const [path, content] of Object.entries(globEffortModules())) {
    const effort = parseEffortFile(content);
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
  return effortToDocument(effort);
}
