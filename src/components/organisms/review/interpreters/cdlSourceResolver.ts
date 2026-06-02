/**
 * CDL Source Resolver
 *
 * Resolves a ColumnSource declaration into a concrete value from a GridRow.
 * Handles fixed fields, metric-type lookups, derived computations, and
 * delegates fallback chains to the dedicated fallback chain interpreter.
 */

import type { GridRow } from './types';
import type {
  ColumnSource,
  FixedFieldSource,
  MetricTypeSource,
  DerivedSource,
  FallbackSource,
  ComputeContext,
  ColumnDef,
} from './column-definition-language';
import { interpretFallbackChain } from './cdlFallbackInterpreter';

// ─── Public API ────────────────────────────────────────────────

/**
 * Resolve a ColumnSource against a GridRow, returning the raw value.
 *
 * @param row             The grid row to read from
 * @param source          The column source definition
 * @param context         Optional context for derived sources (e.g. allRows)
 * @param definitionMap   Map of column definitions for dependency resolution
 * @param dependencyStack Stack tracking current dependency resolution path (for cycle detection)
 * @returns               The resolved value, or undefined if absent
 */
export function resolveColumnSource(
  row: GridRow,
  source: ColumnSource,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  switch (source.type) {
    case 'fixed-field':
      return resolveFixedField(row, source);
    case 'metric-type':
      return resolveMetricType(row, source);
    case 'derived':
      return resolveDerived(row, source, context, definitionMap, dependencyStack);
    case 'fallback':
      return resolveFallback(row, source, context, definitionMap, dependencyStack);
    default:
      return undefined;
  }
}

// ─── Source Resolvers ──────────────────────────────────────────

function resolveFixedField(row: GridRow, source: FixedFieldSource): unknown {
  return (row as unknown as Record<string, unknown>)[source.field];
}

function resolveMetricType(row: GridRow, source: MetricTypeSource): unknown {
  return row.cells.get(source.metricType);
}

function resolveDerived(
  row: GridRow,
  source: DerivedSource,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  const dependencies = new Map<string, unknown>();

  if (source.dependencies && definitionMap) {
    for (const depId of source.dependencies) {
      if (dependencyStack?.includes(depId)) {
        throw new Error(
          `Circular dependency detected in column '${depId}': ${(dependencyStack ?? []).join(' -> ')} -> ${depId}`,
        );
      }
      const depDef = definitionMap.get(depId);
      if (depDef) {
        const depValue = resolveColumnSource(
          row,
          depDef.source,
          context,
          definitionMap,
          [...(dependencyStack ?? []), depId],
        );
        dependencies.set(depId, depValue);
      }
    }
  }

  const mergedContext: ComputeContext = {
    ...context,
    allRows: context?.allRows ?? [row],
    rowIndex: context?.rowIndex ?? 0,
    columnDef: context?.columnDef ?? { id: 'unknown', label: '', source, format: { type: 'text' } },
    dependencies,
    ...source.context,
  };

  return source.compute(row, mergedContext);
}

function resolveFallback(
  row: GridRow,
  source: FallbackSource,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  return interpretFallbackChain(row, source, context, definitionMap, dependencyStack);
}
