/**
 * CDL Fallback Chain Interpreter
 *
 * Resolves FallbackSource declarations into concrete values from a GridRow.
 * Handles all three semantics:
 *   - first-present: return first non-null/non-undefined source
 *   - all-present-joined: return joined string only if ALL sources present
 *   - all-present-combined: return array only if ALL sources present
 *
 * Edge cases handled:
 *   - Empty source arrays → undefined
 *   - Nested fallback chains → recursive resolution
 *   - Null / undefined values in chains → skipped (first-present) or abort (all-present)
 *   - GridCell-like values in joined semantics → extracts display text
 *
 * @see docs/adr/0011-column-definition-language.md
 */

import type { GridRow } from '../types';
import type {
  FallbackSource,
  ColumnSource,
  DerivedSourceContext,
} from '../column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Interpret a fallback chain source against a GridRow.
 *
 * @param row      The grid row to read from
 * @param source   The fallback source definition
 * @param context  Optional context for derived sources
 * @returns        Resolved value, or undefined if chain cannot be satisfied
 */
export function interpretFallbackChain(
  row: GridRow,
  source: FallbackSource,
  context?: DerivedSourceContext,
): unknown {
  if (!source.sources || source.sources.length === 0) {
    return undefined;
  }

  switch (source.semantics) {
    case 'first-present':
      return resolveFirstPresent(row, source.sources, context);
    case 'all-present-joined':
      return resolveAllPresentJoined(row, source.sources, source.joinString, context);
    case 'all-present-combined':
      return resolveAllPresentCombined(row, source.sources, context);
    default:
      return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════
// Semantic Resolvers
// ═══════════════════════════════════════════════════════════════

function resolveFirstPresent(
  row: GridRow,
  sources: ColumnSource[],
  context?: DerivedSourceContext,
): unknown {
  for (const src of sources) {
    const value = resolveColumnSource(row, src, context);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function resolveAllPresentJoined(
  row: GridRow,
  sources: ColumnSource[],
  joinString: string | undefined,
  context?: DerivedSourceContext,
): unknown {
  const values: unknown[] = [];

  for (const src of sources) {
    const value = resolveColumnSource(row, src, context);
    if (value === undefined || value === null) {
      return undefined;
    }
    values.push(value);
  }

  const separator = joinString ?? ' ';
  return values.map((v) => extractDisplayText(v)).join(separator);
}

function resolveAllPresentCombined(
  row: GridRow,
  sources: ColumnSource[],
  context?: DerivedSourceContext,
): unknown {
  const values: unknown[] = [];

  for (const src of sources) {
    const value = resolveColumnSource(row, src, context);
    if (value === undefined || value === null) {
      return undefined;
    }
    values.push(value);
  }

  return values;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Convert an arbitrary resolved value into a display string.
 * Used by joined fallback semantics.
 */
function extractDisplayText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);

  // GridCell-like object
  const v = value as any;
  if (v.metrics) {
    const arr = v.metrics.toArray?.() ?? v.metrics ?? [];
    if (arr.length > 0) {
      const first = arr[0];
      if (first?.image) return first.image;
      if (first?.value !== undefined) return String(first.value);
    }
  }

  return String(value);
}
