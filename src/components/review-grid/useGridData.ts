/**
 * Review Grid — useGridData Hook
 *
 * Transforms Segment[] (from AnalyticsTransformer) + user overrides into
 * GridRow[] / GridColumn[] ready for table rendering.
 *
 * Responsibilities:
 * - Pivot metrics from each segment into column-keyed cells
 * - Merge user overrides on top of runtime metric
 * - Apply preset filters, column filters, and global search
 * - Apply sorting (single or multi-column)
 */

import { useMemo } from 'react';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';
import type { Segment } from '@/core/models/AnalyticsModels';
import type {
  GridRow,
  GridCell,
  GridColumn,
  GridFilterConfig,
  GridSortConfig,
} from './types';
import { FIXED_COLUMN_IDS } from './types';
import { getPreset, buildAllColumns } from './gridPresets';
import { formatSecondsMMSS, formatSecondsHHMMSS } from '@/lib/formatTime';

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
}

export interface UseGridDataReturn {
  /** Filtered and sorted rows ready for rendering */
  rows: GridRow[];
  /** Complete column definitions with visibility applied */
  columns: GridColumn[];
  /** Column ids currently tagged for graphing */
  graphTaggedColumnIds: string[];
}

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
  } = options;

  const preset = useMemo(() => getPreset(presetId), [presetId]);

  // 1. Identify which metrics types actually exist in the data
  //    (We check both runtime segments AND user overrides)
  const activeMetricTypes = useMemo(() => {
    const types = new Set<MetricType>();

    const addType = (ft: MetricType) => {
      // Guard: skip undefined/null metricType (defensive against malformed metric)
      if (ft == null) return;
      
      // Noise suppression: Sound is hidden
      if (ft === MetricType.Sound) return;
      
      // Elapsed and Total are now combined into a fixed column, suppress as metrics
      if (ft === MetricType.Elapsed || ft === MetricType.Total) return;
      
      types.add(ft);
    };

    // Check runtime segments
    for (const seg of segments) {
      if (seg.metrics) {
        for (const f of seg.metrics) {
          addType(f.type as MetricType);
        }
      }
    }

    // Check user overrides
    for (const metrics of userOutputOverrides.values()) {
      for (const f of metrics) {
        addType(f.type as MetricType);
      }
    }

    // Merge user-added columns (shown even when no data exists)
    if (extraMetricTypes) {
      for (const ft of extraMetricTypes) {
        addType(ft);
      }
    }

    return types;
  }, [segments, userOutputOverrides, extraMetricTypes]);

  // Build column definitions
  const columns = useMemo(
    () => {
      const cols = buildAllColumns(preset, isDebugMode);

      // Filter: Only keep metrics columns that have data
      const activeCols = cols.filter((col) => {
        // Always keep structural columns (no metricType)
        if (!col.type) return true;

        // Strict debug check: 'system' columns are hidden unless in debug mode
        if (col.type === MetricType.System && !isDebugMode) {
          return false;
        }

        // EXCEPTION: Always keep structural columns (no metricType)
        // or specifically requested columns like Timestamp/Spans
        if (
          !col.type ||
          col.id === FIXED_COLUMN_IDS.TIMESTAMP ||
          col.id === FIXED_COLUMN_IDS.SPANS
        ) {
          return true;
        }

        // Only keep metrics columns if that type exists in the data
        return activeMetricTypes.has(col.type);
      });

      // Map: Force visibility for active metrics columns (auto-select)
      // and apply graph tags
      const mappedCols = activeCols.map((col) => {
        let newCol = { ...col };

        // If it's an active metrics column, ensure it's visible by default
        if (col.type && activeMetricTypes.has(col.type)) {
          // System metric columns only auto-show in debug mode
          // (Does not affect Timestamp/Spans as they use different MetricTypes)
          if (col.type === MetricType.System) {
            newCol.visible = isDebugMode;
          } else {
            newCol.visible = true;
          }
        }

        // Apply graph tags
        if (graphTaggedColumns && graphTaggedColumns.has(col.id)) {
          newCol.isGraphed = true;
        }

        return newCol;
      });

      // 3. Identify and add "orphan" columns
      // (Fragment types present in data but not in ALL_FRAGMENT_COLUMNS)
      const knownTypes = new Set(mappedCols.map(c => c.type).filter(Boolean));

      const orphanTypes = Array.from(activeMetricTypes).filter(ft => {
        if (knownTypes.has(ft)) return false;
        
        // Strict suppression for system types that shouldn't auto-appear
        if (ft === MetricType.System && !isDebugMode) return false;
        
        // Elapsed and Total are now combined into a fixed column, suppress as metrics
        if (ft === MetricType.Elapsed || ft === MetricType.Total) return false;
        
        return true;
      });

      const orphanCols: GridColumn[] = orphanTypes.map(ft => ({
        id: ft,
        type: ft,
        label: ft.charAt(0).toUpperCase() + ft.slice(1),
        sortable: true,
        filterable: true,
        graphable: false, // Assume false for unknown types
        isGraphed: false,
        visible: true, // Always show orphans if they have data
      }));

      return [...mappedCols, ...orphanCols];
    },
    [preset, isDebugMode, graphTaggedColumns, activeMetricTypes],
  );

  // Merge filter: preset filters + user overrides
  const mergedFilter = useMemo<GridFilterConfig>(
    () => ({
      ...preset.filters,
      ...filterOverrides,
    }),
    [preset.filters, filterOverrides],
  );

  // Transform segments → rows, merge user overrides, filter, sort
  const rows = useMemo(() => {
    const rawRows = segmentsToRows(segments, userOutputOverrides);
    const filtered = applyFilters(rawRows, mergedFilter, columns);
    return applySorting(filtered, sortConfigs, columns);
  }, [segments, userOutputOverrides, mergedFilter, sortConfigs, columns]);

  const graphTaggedColumnIds = useMemo(
    () => columns.filter((c) => c.isGraphed).map((c) => c.id),
    [columns],
  );

  return { rows, columns, graphTaggedColumnIds };
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

    // Group runtime metrics by MetricType
    if (seg.metrics) {
      for (const frag of seg.metrics) {
        groupFragmentIntoCell(cells, frag);
      }
    }

    // Merge user overrides for this segment's block key
    const blockKey = extractBlockKey(seg);
    const overrides = blockKey ? userOverrides.get(blockKey) : undefined;
    if (overrides) {
      for (const frag of overrides) {
        // Remove hinted placeholders (origin === 'hinted') of the same type so
        // the user value replaces the '?' instead of appearing alongside it.
        const existing = cells.get(frag.type as MetricType);
        if (existing) {
          const withoutHinted = existing.metrics.filter((m) => m.origin !== 'hinted');
          if (withoutHinted.length === 0) {
            cells.delete(frag.type as MetricType);
          } else {
            cells.set(frag.type as MetricType, {
              metrics: MetricContainer.from(withoutHinted, frag.type),
              hasUserOverride: false
            });
          }
        }
        groupFragmentIntoCell(cells, frag);
      }
    }

    // Mark cells that contain user overrides
    for (const [, cell] of cells) {
      (cell as { hasUserOverride: boolean }).hasUserOverride = cell.metrics.some(
        (f) => f.origin === 'user',
      );
    }

    // Derive Volume (reps × weight) when both Rep and Resistance are known.
    // This re-runs whenever user overrides supply a missing rep or weight value.
    deriveVolumeCell(cells);

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

/**
 * Extract the source block key from a segment.
 * Segments carry a `name` that's often the block key or effort label.
 * We also check context for an explicit sourceBlockKey.
 */
function extractBlockKey(seg: Segment): string | undefined {
  const ctx = (seg as SegmentWithContext).context;
  if (ctx?.sourceBlockKey) return ctx.sourceBlockKey as string;
  return seg.name;
}

/**
 * Derive a Volume cell (reps × weight kg) when both Rep and Resistance cells
 * are present with numeric values.  Skips if a Volume cell already exists or
 * either source cell is missing.
 */
function deriveVolumeCell(cells: Map<MetricType, GridCell>): void {
  // Already have a computed volume — don't overwrite
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

/**
 * Group a single metrics into the cells map.
 * NO LONGER combining Label/Text/CurrentRound into Effort.
 */
function groupFragmentIntoCell(
  cells: Map<MetricType, GridCell>,
  frag: IMetric,
): void {
  const ft = frag.type as MetricType;

  // Hide noise: Sounds are no longer displayed in the grid
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
  columns: GridColumn[],
): GridRow[] {
  let result = rows;

  // Filter by output type
  if (filter.outputTypes && filter.outputTypes.length > 0) {
    const allowed = new Set<string>(filter.outputTypes);
    result = result.filter((r) => allowed.has(r.outputType));
  }

  // Filter by metrics origin
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

  // Global text search
  if (filter.searchText && filter.searchText.trim().length > 0) {
    const needle = filter.searchText.trim().toLowerCase();
    result = result.filter((r) => rowMatchesSearch(r, needle));
  }

  // Per-column filters
  if (filter.columnFilters) {
    for (const [colId, filterText] of Object.entries(filter.columnFilters)) {
      if (!filterText || filterText.trim().length === 0) continue;
      const needle = filterText.trim().toLowerCase();
      const col = columns.find((c) => c.id === colId);
      if (!col) continue;

      result = result.filter((r) => {
        const cellText = getCellTextForColumn(r, col);
        return cellText.toLowerCase().includes(needle);
      });
    }
  }

  return result;
}

/**
 * Check if any cell in the row contains the search text.
 */
function rowMatchesSearch(row: GridRow, needle: string): boolean {
  // Check fixed fields
  if (row.sourceBlockKey.toLowerCase().includes(needle)) return true;
  if (row.outputType.toLowerCase().includes(needle)) return true;
  if (row.completionReason?.toLowerCase().includes(needle)) return true;

  // Check metrics cells
  for (const [, cell] of row.cells) {
    for (const frag of cell.metrics) {
      const text = metricToText(frag);
      if (text.toLowerCase().includes(needle)) return true;
    }
  }
  return false;
}

// ─── Sorting ───────────────────────────────────────────────────

function applySorting(
  rows: GridRow[],
  sortConfigs: GridSortConfig[],
  columns: GridColumn[],
): GridRow[] {
  if (sortConfigs.length === 0) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const config of sortConfigs) {
      const col = columns.find((c) => c.id === config.columnId);
      if (!col) continue;

      const valA = getSortValue(a, col);
      const valB = getSortValue(b, col);
      const cmp = compareSortValues(valA, valB);

      if (cmp !== 0) {
        return config.direction === 'asc' ? cmp : -cmp;
      }
    }
    // Stable fallback: sort by index
    return a.index - b.index;
  });

  return sorted;
}

/**
 * Extract a comparable value from a row for a given column.
 */
function getSortValue(row: GridRow, col: GridColumn): string | number {
  // Fixed columns
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return row.index;
    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return row.sourceBlockKey;
    case FIXED_COLUMN_IDS.OUTPUT_TYPE:
      return row.outputType;
    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return row.stackLevel;
    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return row.elapsed;
    case FIXED_COLUMN_IDS.DURATION:
      return row.duration ?? Infinity;
    case FIXED_COLUMN_IDS.SPANS:
      return row.spans?.[0]?.started ?? 0;
    case FIXED_COLUMN_IDS.COMPLETION_REASON:
      return row.completionReason ?? '';
    case FIXED_COLUMN_IDS.TIMESTAMP:
      return row.absoluteStartTime ?? 0;
  }

  // Fragment columns — sort by first metrics's value
  if (col.type) {
    const cell = row.cells.get(col.type);
    if (!cell || cell.metrics.length === 0) return '';
    const first = cell.metrics[0];
    if (typeof first.value === 'number') return first.value;
    return metricToText(first);
  }

  return '';
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Get display text for a cell in a specific column.
 */
function getCellTextForColumn(row: GridRow, col: GridColumn): string {
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return String(row.index);
    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return row.sourceBlockKey;
    case FIXED_COLUMN_IDS.OUTPUT_TYPE:
      return row.outputType;
    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return String(row.stackLevel);
    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return row.elapsed === row.total
        ? formatDuration(row.elapsed)
        : `${formatDuration(row.elapsed)} / ${formatDuration(row.total)}`;
    case FIXED_COLUMN_IDS.DURATION:
      return formatDuration(row.duration);
    case FIXED_COLUMN_IDS.SPANS:
      return formatSpans(row.spans, row.duration);
    case FIXED_COLUMN_IDS.COMPLETION_REASON:
      return row.completionReason ?? '';
    case FIXED_COLUMN_IDS.TIMESTAMP:
      return String(row.absoluteStartTime);
  }

  if (col.type) {
    const cell = row.cells.get(col.type);
    if (!cell) return '';
    return cell.metrics.map(metricToText).join(', ');
  }

  return '';
}

/**
 * Convert a metrics to its display text.
 */
function metricToText(frag: IMetric): string {
  if (frag.image) return frag.image;
  if (frag.value !== undefined && frag.value !== null) {
    if (typeof frag.value === 'object') {
      const val = frag.value as any;
      if ('text' in val) return val.text;
      if ('current' in val) return `Round ${val.current}`;
      
      return JSON.stringify(frag.value);
    }
    return String(frag.value);
  }
  return frag.type;
}

/**
 * Format duration (in seconds) into a human-readable duration (M:SS or H:MM:SS).
 */
function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return '';
  }
  
  if (seconds >= 3600) {
    return formatSecondsHHMMSS(seconds);
  }
  return formatSecondsMMSS(seconds);
}

/**
 * Format spans into a human-readable string.
 * "start - finish" across spans, or just "timestamp" if duration is 0.
 */
function formatSpans(spans?: { started: number; ended?: number }[], durationSeconds: number = 0): string {
  if (!spans || spans.length === 0) return '';

  const format = (s: number) => formatDuration(s);

  // If duration is 0 and we have at least one span, show it as a relative time
  if (durationSeconds === 0 && spans.length > 0) {
    const first = spans[0];
    return format(first.started);
  }

  // Otherwise show the bracket across all spans
  const first = spans[0];
  const last = spans[spans.length - 1];
  const start = format(first.started);
  const end = last.ended !== undefined ? format(last.ended) : '...';

  return `${start} — ${end}`;
}
