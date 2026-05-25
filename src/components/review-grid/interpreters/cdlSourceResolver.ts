/**
 * CDL Source Resolver
 *
 * Resolves a ColumnSource declaration into a concrete value from a GridRow.
 * Handles fixed fields, metric-type lookups, derived computations, and
 * fallback chains with all three semantics (first-present, all-present-joined,
 * all-present-combined).
 */

import type {
  GridRow,
} from '../types';
import type {
  ColumnSource,
  FixedFieldSource,
  MetricTypeSource,
  DerivedSource,
  FallbackSource,
  DerivedSourceContext,
} from '../column-definition-language';

// ─── Public API ────────────────────────────────────────────────

/**
 * Resolve a ColumnSource against a GridRow, returning the raw value.
 *
 * @param row      The grid row to read from
 * @param source   The column source definition
 * @param context  Optional context for derived sources (e.g. allRows)
 * @returns        The resolved value, or undefined if absent
 */
export function resolveColumnSource(
  row: GridRow,
  source: ColumnSource,
  context?: DerivedSourceContext,
): unknown {
  switch (source.type) {
    case 'fixed-field':
      return resolveFixedField(row, source);
    case 'metric-type':
      return resolveMetricType(row, source);
    case 'derived':
      return resolveDerived(row, source, context);
    case 'fallback':
      return resolveFallback(row, source, context);
    default:
      return undefined;
  }
}

// ─── Source Resolvers ──────────────────────────────────────────

function resolveFixedField(row: GridRow, source: FixedFieldSource): unknown {
  return (row as Record<string, unknown>)[source.field];
}

function resolveMetricType(row: GridRow, source: MetricTypeSource): unknown {
  return row.cells.get(source.metricType);
}

function resolveDerived(
  row: GridRow,
  source: DerivedSource,
  context?: DerivedSourceContext,
): unknown {
  return source.compute(row, context);
}

function resolveFallback(
  row: GridRow,
  source: FallbackSource,
  context?: DerivedSourceContext,
): unknown {
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

// ─── Fallback Semantics ────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────

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
    const first = v.metrics[0] ?? v.metrics.first?.();
    if (first?.image) return first.image;
    if (first?.value !== undefined) return String(first.value);
  }

  return String(value);
}
