/**
 * CDL Filter Interpreter
 *
 * Extracts filterable text from a GridRow using a ColumnDef's filter config,
 * and performs match logic against a filter query.
 * Replaces the scattered switch statements in useGridData.ts (getCellTextForColumn,
 * rowMatchesSearch, applyFilters).
 */

import type { GridRow } from '../types';
import type { ColumnDef, ComputeContext } from '../column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';

// ─── Combined Filter Helpers ───────────────────────────────────

/**
 * Extract filterable text from a combined (grouped) value array.
 *
 * Joins all present elements into a single string using the given
 * separator (defaults to space). Useful for filter.extractor on
 * columns with `all-present-combined` fallback sources.
 */
export function extractCombinedFilterText(
  combinedValue: unknown,
  separator: string = ' ',
): string {
  if (!Array.isArray(combinedValue)) {
    return String(combinedValue ?? '');
  }
  return combinedValue
    .map((v) => {
      if (v === undefined || v === null) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return String(v);
      const cell = v as any;
      if (cell?.metrics) {
        const arr = cell.metrics.toArray?.() ?? cell.metrics ?? [];
        if (arr.length > 0) {
          const first = arr[0];
          if (first?.image) return first.image;
          if (first?.value !== undefined) return String(first.value);
        }
      }
      return String(v);
    })
    .filter((s) => s.length > 0)
    .join(separator);
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Extract filterable text from a row for the given column.
 *
 * @param row           The grid row
 * @param colDef        The column definition (must have filter config)
 * @param context       Optional derived-source context
 * @param definitionMap Map of column definitions for dependency resolution
 * @returns             Text suitable for filter matching, or empty string
 */
export function extractFilterText(
  row: GridRow,
  colDef: ColumnDef,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): string {
  if (!colDef.filter) {
    return '';
  }

  const raw = resolveColumnSource(row, colDef.source, context, definitionMap);
  const text = colDef.filter.extractor(raw);

  return text ?? '';
}

/**
 * Check whether a row matches the given filter text for a specific column.
 *
 * @param row           The grid row
 * @param colDef        The column definition
 * @param filterText    The user's filter query
 * @param context       Optional derived-source context
 * @param definitionMap Map of column definitions for dependency resolution
 * @returns             true if the row matches
 */
export function matchColumnFilter(
  row: GridRow,
  colDef: ColumnDef,
  filterText: string,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): boolean {
  if (!filterText || filterText.trim().length === 0) {
    return true;
  }

  if (!colDef.filter) {
    return true;
  }

  const cellText = extractFilterText(row, colDef, context, definitionMap);
  const needle = colDef.filter.caseInsensitive !== false
    ? filterText.trim().toLowerCase()
    : filterText.trim();
  const haystack = colDef.filter.caseInsensitive !== false
    ? cellText.toLowerCase()
    : cellText;

  // Use custom matcher if provided
  if (colDef.filter.matcher) {
    return colDef.filter.matcher(haystack, needle);
  }

  return haystack.includes(needle);
}

/**
 * Check whether a row matches a global search query across all given columns.
 * Returns true if ANY column matches.
 *
 * @param row           The grid row
 * @param colDefs       All column definitions to search
 * @param searchText    The global search query
 * @param context       Optional derived-source context
 * @param definitionMap Map of column definitions for dependency resolution
 * @returns             true if the row matches in any column
 */
export function matchGlobalSearch(
  row: GridRow,
  colDefs: ColumnDef[],
  searchText: string,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): boolean {
  if (!searchText || searchText.trim().length === 0) {
    return true;
  }

  const needle = searchText.trim().toLowerCase();

  for (const colDef of colDefs) {
    if (!colDef.filter) continue;
    const cellText = extractFilterText(row, colDef, context, definitionMap).toLowerCase();
    if (cellText.includes(needle)) {
      return true;
    }
  }

  return false;
}
