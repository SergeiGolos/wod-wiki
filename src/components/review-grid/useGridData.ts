/**
 * Review Grid — useGridData Hook
 *
 * Transforms Segment[] (from AnalyticsTransformer) + user overrides into
 * GridRow[] / ColumnDef[] ready for table rendering via the CDL ColumnSet.
 *
 * Responsibilities:
 * - Pivot metrics from each segment into column-keyed cells
 * - Merge user overrides on top of runtime metric
 * - Apply preset filters, column filters, and global search
 * - Apply sorting (single or multi-column)
 * - Use ColumnSet for visibility, ordering, and discoverability
 */

import { useMemo } from 'react';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';
import type { Segment } from '@/core/models/AnalyticsModels';
import type {
  GridRow,
  GridCell,
  GridFilterConfig,
  GridSortConfig,
} from './types';
import { GRID_COLUMN_SET_CONFIG } from './cdlColumnDefinitions';
import { ColumnSet } from './ColumnSet';
import type { ColumnSetContext } from './ColumnSet';
import type { ColumnDef } from './column-definition-language';
import {
  compareRowsByColumn,
  matchColumnFilter,
  matchGlobalSearch,
} from './interpreters';
import { metricPresentation } from '@/core/metrics/presentation';

// ─── Public Hook ───────────────────────────────────────────────

export interface UseGridDataOptions {
  /** Analytics segments produced by AnalyticsTransformer */
  segments: Segment[];
  /** User-supplied overrides keyed by sourceBlockKey */
  userOutputOverrides: Map<string, MetricContainer>;
  /** Active preset id */
  presetId: string;
  /** Whether the workbench is in debug mode */
  isDebugMode: boolean;
  /** Current sort configuration (may be empty) */
  sortConfigs: GridSortConfig[];
  /** Additional filter overrides on top of the preset's filters */
  filterOverrides?: Partial<GridFilterConfig>;
  /** Columns currently tagged for graphing (column ids) */
  graphTaggedColumns?: Set<string>;
  /** User-added metric types to show as columns even when no segment data exists */
  extraMetricTypes?: Set<MetricType>;
  /** Per-column visibility overrides from user (id → forced visible/hidden) */
  columnVisibilityOverrides?: Record<string, boolean>;
  /** Column IDs explicitly added by the user */
  addedColumnIds?: Set<string>;
}

export interface UseGridDataReturn {
  /** Filtered and sorted rows ready for rendering */
  rows: GridRow[];
  /** Columns currently visible in the grid, in display order */
  visibleColumns: ColumnDef[];
  /** Columns the user can toggle on (not currently visible but available) */
  availableColumns: ColumnDef[];
  /** Column ids currently tagged for graphing */
  graphTaggedColumnIds: string[];
}

// Singleton ColumnSet — config is immutable
const globalColumnSet = new ColumnSet(GRID_COLUMN_SET_CONFIG);

export function useGridData(options: UseGridDataOptions): UseGridDataReturn {
  const {
    segments,
    userOutputOverrides,
    presetId,
    isDebugMode,
    sortConfigs,
    filterOverrides,
    graphTaggedColumns,
    extraMetricTypes,
    columnVisibilityOverrides,
    addedColumnIds,
  } = options;

  // 1. Identify which metrics types actually exist in the data
  const activeMetricTypes = useMemo(() => {
    const types = new Set<MetricType>();

    const addType = (ft: MetricType) => {
      if (ft == null) return;
      const surface = isDebugMode ? 'debug' as const : 'review-grid-column' as const;
      if (metricPresentation.isHidden({ type: ft, origin: 'runtime' }, surface)) return;
      types.add(ft);
    };

    for (const seg of segments) {
      if (seg.metrics) {
        for (const f of seg.metrics) {
          addType(f.type as MetricType);
        }
      }
    }

    for (const metrics of userOutputOverrides.values()) {
      for (const f of metrics) {
        addType(f.type as MetricType);
      }
    }

    if (extraMetricTypes) {
      for (const ft of extraMetricTypes) {
        addType(ft);
      }
    }

    return types;
  }, [segments, userOutputOverrides, extraMetricTypes, isDebugMode]);

  // 2. Build rows from segments + overrides
  const rows = useMemo(() => {
    const rawRows = segmentsToRows(segments, userOutputOverrides);
    // Derive Volume (reps × weight) when both Rep and Resistance are known.
    for (const row of rawRows) {
      deriveVolumeCell(row.cells);
    }
    return rawRows;
  }, [segments, userOutputOverrides]);

  // 3. Build ColumnSetContext
  const columnSetContext = useMemo<ColumnSetContext>(
    () => ({
      rows,
      activePresetId: presetId,
      isDebugMode,
      graphTaggedColumnIds: graphTaggedColumns,
      visibilityOverrides: columnVisibilityOverrides,
      addedColumnIds,
    }),
    [rows, presetId, isDebugMode, graphTaggedColumns, columnVisibilityOverrides, addedColumnIds],
  );

  // 4. Compute visible and available columns via ColumnSet
  const visibleColumns = useMemo(
    () => globalColumnSet.getVisibleColumns(columnSetContext),
    [columnSetContext],
  );

  const availableColumns = useMemo(
    () => globalColumnSet.getAvailableColumns(columnSetContext),
    [columnSetContext],
  );

  // 5. Merge filter: preset filters + user overrides
  const mergedFilter = useMemo<GridFilterConfig>(
    () => ({
      ...GRID_COLUMN_SET_CONFIG.presets[presetId]?.filters,
      ...filterOverrides,
    }),
    [presetId, filterOverrides],
  );

  // 6. Apply filters and sorting
  const filteredSortedRows = useMemo(() => {
    const filtered = applyFilters(rows, mergedFilter, visibleColumns);
    return applySorting(filtered, sortConfigs, visibleColumns);
  }, [rows, mergedFilter, sortConfigs, visibleColumns]);

  const graphTaggedColumnIds = useMemo(
    () => Array.from(graphTaggedColumns ?? []),
    [graphTaggedColumns],
  );

  return {
    rows: filteredSortedRows,
    visibleColumns,
    availableColumns,
    graphTaggedColumnIds,
  };
}

// ─── Row Construction ──────────────────────────────────────────

/**
 * Convert Segment[] into GridRow[], pivoting metrics into cells.
 * User overrides are merged into the cell data.
 */
interface SegmentWithContext extends Segment {
  context?: Record<string, unknown>;
}

function segmentsToRows(
  segments: Segment[],
  userOverrides: Map<string, MetricContainer>,
): GridRow[] {
  return segments.map((seg, idx) => {
    const cells = new Map<MetricType, GridCell>();

    if (seg.metrics) {
      for (const frag of seg.metrics) {
        groupFragmentIntoCell(cells, frag);
      }
    }

    const blockKey = extractBlockKey(seg);
    const overrides = blockKey ? userOverrides.get(blockKey) : undefined;
    if (overrides) {
      for (const frag of overrides) {
        groupFragmentIntoCell(cells, frag);
      }
    }

    for (const [, cell] of cells) {
      (cell as { hasUserOverride: boolean }).hasUserOverride = cell.metrics.some(
        (f) => f.origin === 'user',
      );
    }

    const outputType = ((seg as SegmentWithContext).context?.outputType as string) ?? seg.type;

    return {
      id: seg.id,
      index: idx + 1,
      sourceBlockKey: blockKey ?? `segment-${seg.id}`,
      sourceStatementId: (seg as SegmentWithContext).context?.sourceStatementId as number | undefined,
      outputType: outputType as GridRow['outputType'],
      stackLevel: seg.depth,
      absoluteStartTime: seg.absoluteStartTime,
      duration: seg.duration,
      elapsed: seg.elapsed,
      total: seg.total,
      spans: seg.spans ? [...seg.spans] : [],
      completionReason: (seg as SegmentWithContext).context?.completionReason as string | undefined,
      cells,
    } satisfies GridRow;
  });
}

function extractBlockKey(seg: Segment): string | undefined {
  const ctx = (seg as SegmentWithContext).context;
  if (ctx?.sourceBlockKey) return ctx.sourceBlockKey as string;
  return seg.name;
}

/**
 * Derive a Volume cell (reps × weight kg) when both Rep and Resistance cells
 * are present with numeric values.
 */
function deriveVolumeCell(cells: Map<MetricType, GridCell>): void {
  if (cells.has(MetricType.Volume)) return;

  const repCell = cells.get(MetricType.Rep);
  const resistanceCell = cells.get(MetricType.Resistance);
  if (!repCell || !resistanceCell) return;

  let reps = 0;
  for (const m of repCell.metrics) {
    if (typeof m.value === 'number') reps += m.value;
  }

  let weightKg = 0;
  let unit = 'kg';
  for (const m of resistanceCell.metrics) {
    const val = m.value as any;
    if (typeof val?.amount === 'number') {
      weightKg += val.amount;
      if (val.unit) unit = val.unit;
    } else if (typeof m.value === 'number') {
      weightKg += m.value;
    }
  }

  if (reps <= 0 || weightKg <= 0) return;

  const volume = reps * weightKg;
  cells.set(MetricType.Volume, {
    metrics: MetricContainer.empty('volume').add({
      type: MetricType.Volume,
      value: volume,
      image: `${volume} ${unit}`,
      origin: 'analyzed',
    }),
    hasUserOverride: false,
  });
}

function groupFragmentIntoCell(
  cells: Map<MetricType, GridCell>,
  frag: IMetric,
): void {
  const ft = frag.type as MetricType;

  if (ft === MetricType.Sound) {
    return;
  }

  const existing = cells.get(ft);
  if (existing) {
    cells.set(ft, {
      metrics: existing.metrics.clone().add(frag),
      hasUserOverride: existing.hasUserOverride,
    });
  } else {
    cells.set(ft, {
      metrics: MetricContainer.empty(ft).add(frag),
      hasUserOverride: false,
    });
  }
}

// ─── Filtering ─────────────────────────────────────────────────

function applyFilters(
  rows: GridRow[],
  filter: GridFilterConfig,
  columns: ColumnDef[],
): GridRow[] {
  let result = rows;

  if (filter.outputTypes && filter.outputTypes.length > 0) {
    const allowed = new Set<string>(filter.outputTypes);
    result = result.filter((r) => allowed.has(r.outputType));
  }

  if (filter.origins && filter.origins.length > 0) {
    const allowed = new Set(filter.origins);
    result = result.filter((r) => {
      for (const [, cell] of r.cells) {
        if (cell.metrics.some((f) => f.origin && allowed.has(f.origin))) {
          return true;
        }
      }
      return false;
    });
  }

  if (filter.searchText && filter.searchText.trim().length > 0) {
    const needle = filter.searchText.trim().toLowerCase();
    result = result.filter((r) =>
      matchGlobalSearch(r, columns, needle),
    );
  }

  if (filter.columnFilters) {
    for (const [colId, filterText] of Object.entries(filter.columnFilters)) {
      if (!filterText || filterText.trim().length === 0) continue;
      const col = columns.find((c) => c.id === colId);
      if (!col) continue;
      result = result.filter((r) =>
        matchColumnFilter(r, col, filterText),
      );
    }
  }

  return result;
}

// ─── Sorting ───────────────────────────────────────────────────

function applySorting(
  rows: GridRow[],
  sortConfigs: GridSortConfig[],
  columns: ColumnDef[],
): GridRow[] {
  if (sortConfigs.length === 0) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const config of sortConfigs) {
      const col = columns.find((c) => c.id === config.columnId);
      if (!col || !col.sort) continue;

      const cmp = compareRowsByColumn(a, b, col, config.direction);
      if (cmp !== 0) return cmp;
    }
    return a.index - b.index;
  });

  return sorted;
}
