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
  ComputeContext,
  ColumnDef,
} from '../column-definition-language';
import { MetricContainer } from '@bitcobblers/wod-wiki-engine';


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
// ─── Fallback Chain Interpreter ───────────────────────────────

export function interpretFallbackChain(
  row: GridRow,
  source: FallbackSource,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  if (!source.sources || source.sources.length === 0) {
    return undefined;
  }

  switch (source.semantics) {
    case 'first-present':
      return resolveFirstPresent(row, source.sources, context, definitionMap, dependencyStack);
    case 'all-present-joined':
      return resolveAllPresentJoined(row, source.sources, source.joinString, context, definitionMap, dependencyStack);
    case 'all-present-combined':
      return resolveAllPresentCombined(row, source.sources, context, definitionMap, dependencyStack);
    default:
      return undefined;
  }
}

function resolveFirstPresent(
  row: GridRow,
  sources: ColumnSource[],
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  for (const src of sources) {
    const value = resolveColumnSource(row, src, context, definitionMap, dependencyStack);
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
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  const values: unknown[] = [];

  for (const src of sources) {
    const value = resolveColumnSource(row, src, context, definitionMap, dependencyStack);
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
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
  dependencyStack?: string[],
): unknown {
  const values: unknown[] = [];

  for (const src of sources) {
    const value = resolveColumnSource(row, src, context, definitionMap, dependencyStack);
    if (value === undefined || value === null) {
      return undefined;
    }
    values.push(value);
  }

  return values;
}

function displayTextFromMetrics(metrics: unknown): string {
  if (metrics == null) return '';

  const arr = Array.isArray(metrics)
    ? metrics
    : metrics instanceof MetricContainer
      ? metrics.toArray()
      : [];

  if (arr.length === 0) return '';

  const first = arr[0];
  if (first != null && typeof first === 'object') {
    if ('image' in first && typeof first.image === 'string') {
      return first.image;
    }
    if ('value' in first && first.value !== undefined) {
      return String(first.value);
    }
  }

  return String(first);
}

export function extractDisplayText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);

  if (typeof value === 'object' && 'metrics' in value) {
    const text = displayTextFromMetrics(value.metrics);
    if (text.length > 0) return text;
  }

  return String(value);
}
