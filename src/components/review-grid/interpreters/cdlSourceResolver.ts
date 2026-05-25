/**
 * CDL Source Resolver
 *
 * Resolves a ColumnSource declaration into a concrete value from a GridRow.
 * Handles fixed fields, metric-type lookups, derived computations, and
 * delegates fallback chains to the dedicated fallback chain interpreter.
 */

import type { GridRow } from '../types';
import type {
  ColumnSource,
  FixedFieldSource,
  MetricTypeSource,
  DerivedSource,
  FallbackSource,
  DerivedSourceContext,
} from '../column-definition-language';
import { interpretFallbackChain } from './cdlFallbackInterpreter';

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
  return interpretFallbackChain(row, source, context);
}
