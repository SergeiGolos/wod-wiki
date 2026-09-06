/**
 * Field identity — the pure normalization/identity layer for typed metric
 * fields (wayfinder datadog-analytics ticket 11, per the field discovery
 * contract §Identity and discovery).
 *
 * A metric variant is identified by **normalized full property path + value
 * kind + physical dimension where applicable**. Source, display label,
 * original spelling, and convertible unit spelling are provenance, not
 * identity. Built-in and custom metrics use the same rules.
 *
 * This module is pure data + functions with zero dependencies: `lang` and
 * `wql` (and the app adapter) both consume it through their existing core
 * dependency. Dimension resolution from units lives with the unit catalog —
 * callers attach a resolved `dimension` when one is known.
 */

/** The observed value kinds of a field variant (field discovery contract). */
export type FieldValueKind = 'number' | 'string' | 'boolean' | 'array';

/** Presence/clearing marker — null records presence, never a value. */
export type NullValueKind = 'null';

/**
 * Typed field reference — the identity of one metric variant.
 * `dimension` is the physical dimension for numeric kinds (resolved through
 * the unit registry); undefined means dimensionless or unknown.
 */
export interface FieldRef {
  /** Normalized full property path — lower camelCase components, dots delimit. */
  readonly path: string;
  /** Observed value kind of the variant. */
  readonly kind: FieldValueKind | NullValueKind;
  /** Physical dimension for numeric kinds, when known. */
  readonly dimension?: string;
}

/** Split one path component into words: whitespace/underscores/hyphens are
 *  word separators; existing camel/Pascal boundaries are recognized.
 *  Acronym runs (≥2 uppercase) end before a following upper+lower pair. */
function splitWords(component: string): string[] {
  const onSeparators = component.split(/[\s_\-\u2010-\u2015]+/).filter(Boolean);
  const words: string[] = [];
  for (const chunk of onSeparators) {
    // Insert a boundary before an uppercase letter that follows a lowercase
    // letter or digit, and before the last uppercase of an acronym run when
    // a lowercase pair follows (e.g. 'HRVValue' → 'HRV' | 'Value').
    const cased = chunk
      .replace(/([\p{Ll}\p{Nd}])(\p{Lu})/gu, '$1\u0000$2')
      .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\u0000$2');
    for (const word of cased.split('\u0000')) {
      if (word) words.push(word);
    }
  }
  return words;
}

/** Lower camelCase one path component: `heart rate`, `heart_rate`,
 *  `HeartRate`, and `heartRate` all normalize to `heartRate`; `HRV`
 *  normalizes to `hrv`. No synonym inference: `heartrate` stays `heartrate`. */
export function normalizeFieldComponent(component: string): string {
  const words = splitWords(component);
  if (words.length === 0) return '';
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/**
 * Normalize a full property path. Dots are reserved path separators, so
 * `sleep_quality.score_value` → `sleepQuality.scoreValue` and nested/flat
 * forms share one identity. Empty components collapse: `sleep..score` →
 * `sleep.score`.
 */
export function normalizeFieldPath(path: string): string {
  return path
    .split('.')
    .map(normalizeFieldComponent)
    .filter((component) => component.length > 0)
    .join('.');
}

/** Classify an observed value into a field value kind. Objects and null are
 *  deliberately outside the value kinds: objects contribute nested leaves and
 *  null records presence/clearing — neither is a value. */
export function valueKindOf(value: unknown): FieldValueKind | 'object' | 'null' | 'undefined' {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'number': return 'number';
    case 'string': return 'string';
    case 'boolean': return 'boolean';
    case 'object': return 'object';
    default: return 'undefined';
  }
}

/** One flattened leaf observation: identity path + kind, the raw value, and
 *  the original spelling/shape it was authored with (provenance). */
export interface FieldLeaf {
  /** Normalized full path. */
  readonly path: string;
  /** Value kind — 'null' leaves record presence/clearing, never a value. */
  readonly kind: FieldValueKind | NullValueKind;
  readonly value: unknown;
  /** Original path spelling/shape as authored (flat dotted or nested). */
  readonly originalPath: string;
}

/**
 * Flatten an authored property object into typed leaves.
 *
 * - Dots in keys delimit paths: flat `{"sleep.score": 85}` ≡ nested
 *   `{sleep:{score:85}}` — one identity.
 * - Objects contribute nested leaves; empty objects contribute nothing.
 * - Arrays are collections: one collection-valued leaf, never per-element
 *   observations.
 * - Null records presence under its path without a value.
 */
export function flattenFieldLeaves(
  input: Record<string, unknown>,
  prefix = '',
): FieldLeaf[] {
  const leaves: FieldLeaf[] = [];
  for (const [rawKey, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${normalizeFieldPath(rawKey)}` : normalizeFieldPath(rawKey);
    if (!path) continue;
    const kind = valueKindOf(value);
    if (kind === 'object') {
      leaves.push(...flattenFieldLeaves(value as Record<string, unknown>, path));
    } else if (kind !== 'undefined') {
      leaves.push({ path, kind, value, originalPath: prefix ? `${prefix}.${rawKey}` : rawKey });
    }
  }
  return leaves;
}

/**
 * Collision-free canonical string for a typed variant identity. JSON array
 * encoding keeps a separator character inside a path from masquerading as a
 * structural boundary (`a|number` as path cannot collide with `a` + a
 * `number` dimension).
 */
export function fieldRefKey(ref: FieldRef): string {
  return JSON.stringify([ref.path, ref.kind, ref.dimension ?? null]);
}

/** Parse a {@link fieldRefKey} back into a FieldRef (round-trip helper). */
export function fieldRefFromKey(key: string): FieldRef {
  const [path, kind, dimension] = JSON.parse(key) as [string, string, string | null];
  return { path, kind: kind as FieldRef['kind'], ...(dimension ? { dimension } : {}) };
}
