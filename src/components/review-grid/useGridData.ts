/**
 * Review Grid — useGridData Hook
 *
 * Transforms Segment[] (from AnalyticsTransformer) + user overrides into
 * GridRow[] / GridColumn[] ready for table rendering.
 *
 * Responsibilities:
 * - Pivot fragments from each segment into column-keyed cells
 * - Merge user overrides on top of runtime fragments
 * - Apply preset filters, column filters, and global search
 * - Apply sorting (single or multi-column)
 */

import { useMemo } from 'react';
import { FragmentType, type ICodeFragment } from '@/core/models/CodeFragment';
import type { Segment } from '@/core/models/AnalyticsModels';
import type {
  GridRow,
  GridCell,
  GridColumn,
  GridFilterConfig,
  GridSortConfig,
} from './types';
import { getPreset, buildAllColumns } from './gridPresets';

// ─── Public Hook ───────────────────────────────────────────────

export interface UseGridDataOptions {
  /** Analytics segments produced by AnalyticsTransformer */
  segments: Segment[];
  /** User-supplied overrides keyed by sourceBlockKey */
  userOutputOverrides: Map<string, ICodeFragment[]>;
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
  } = options;

  const preset = useMemo(() => getPreset(presetId), [presetId]);

  // 1. Identify which fragment types actually exist in the data
  //    (We check both runtime segments AND user overrides)
  const activeFragmentTypes = useMemo(() => {
    const types = new Set<FragmentType>();

    // Check runtime segments
    for (const seg of segments) {
      if (seg.fragments) {
        for (const f of seg.fragments) {
          types.add(f.fragmentType);
        }
      }
    }

    // Check user overrides
    for (const fragments of userOutputOverrides.values()) {
      for (const f of fragments) {
        types.add(f.fragmentType);
      }
    }

    return types;
  }, [segments, userOutputOverrides]);

  // Build column definitions
  const columns = useMemo(
    () => {
      const cols = buildAllColumns(preset, isDebugMode);

      // Filter: Only keep fragment columns that have data
      const activeCols = cols.filter((col) => {
        // Always keep structural columns (no fragmentType)
        if (!col.fragmentType) return true;

        // Strict debug check: 'system' columns are hidden unless in debug mode
        if (col.fragmentType === FragmentType.System && !isDebugMode) {
          return false;
        }

        // Only keep fragment columns if that type exists in the data
        return activeFragmentTypes.has(col.fragmentType);
      });

      // Map: Force visibility for active fragment columns (auto-select)
      // and apply graph tags
      return activeCols.map((col) => {
        let newCol = { ...col };

        // If it's an active fragment column, ensure it's visible by default
        if (col.fragmentType && activeFragmentTypes.has(col.fragmentType)) {
          newCol.visible = true;
        }

        // Apply graph tags
        if (graphTaggedColumns && graphTaggedColumns.has(col.id)) {
          newCol.isGraphed = true;
        }

        return newCol;
      });
    },
    [preset, isDebugMode, graphTaggedColumns, activeFragmentTypes],
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
 * Convert Segment[] into GridRow[], pivoting fragments into cells.
 * User overrides are merged into the cell data.
 */
interface SegmentWithContext extends Segment {
  context?: Record<string, unknown>;
}

function segmentsToRows(
  segments: Segment[],
  userOverrides: Map<string, ICodeFragment[]>,
): GridRow[] {
  return segments.map((seg, idx) => {
    const cells = new Map<FragmentType, GridCell>();

    // Group runtime fragments by FragmentType
    if (seg.fragments) {
      for (const frag of seg.fragments) {
        groupFragmentIntoCell(cells, frag);
      }
    }

    // Merge user overrides for this segment's block key
    const blockKey = extractBlockKey(seg);
    const overrides = blockKey ? userOverrides.get(blockKey) : undefined;
    if (overrides) {
      for (const frag of overrides) {
        groupFragmentIntoCell(cells, frag);
      }
    }

    // Mark cells that contain user overrides
    for (const [, cell] of cells) {
      (cell as { hasUserOverride: boolean }).hasUserOverride = cell.fragments.some(
        (f) => f.origin === 'user',
      );
    }

    const outputType = ((seg as SegmentWithContext).context?.outputType as string) ?? seg.type;
    const isMilestone = outputType === 'milestone';

    // Segment active time (pause-aware)
    const duration = (seg.duration ?? 0) * 1000;

    // Absolute running time from workout start to end of segment
    // seg.endTime is relative to workoutStartTime (in seconds)
    let elapsed = (seg.endTime ?? 0) * 1000;

    // For milestones, prefer the explicit Elapsed fragment if present, 
    // as it might be more precise than the span end time.
    if (isMilestone) {
      const elapsedFrag = seg.fragments?.find((f) => f.fragmentType === FragmentType.Elapsed);
      if (elapsedFrag && typeof elapsedFrag.value === 'number') {
        elapsed = elapsedFrag.value;
      }
    }

    // Fallback: if elapsed is 0 but startTime is not (highly unlikely if start is 0, but safe)
    if (elapsed === 0 && seg.startTime > 0) {
      elapsed = seg.startTime * 1000;
    }

    return {
      id: seg.id,
      index: idx + 1,
      sourceBlockKey: blockKey ?? `segment-${seg.id}`,
      sourceStatementId: (seg as SegmentWithContext).context?.sourceStatementId as number | undefined,
      outputType: outputType as GridRow['outputType'],
      stackLevel: seg.depth,
      elapsed,
      duration,
      total: ((seg.endTime ?? 0) - (seg.startTime ?? 0)) * 1000,
      spans: seg.spans,
      relativeSpans: seg.relativeSpans,
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
 * Group a single fragment into the cells map.
 */
function groupFragmentIntoCell(
  cells: Map<FragmentType, GridCell>,
  frag: ICodeFragment,
): void {
  const ft = frag.fragmentType;
  const existing = cells.get(ft);
  if (existing) {
    // Mutably append — safe because we've just allocated these arrays
    (existing.fragments as ICodeFragment[]).push(frag);
  } else {
    cells.set(ft, {
      fragments: [frag],
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

  // Filter by fragment origin
  if (filter.origins && filter.origins.length > 0) {
    const allowed = new Set(filter.origins);
    result = result.filter((r) => {
      for (const [, cell] of r.cells) {
        if (cell.fragments.some((f) => f.origin && allowed.has(f.origin))) {
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

  // Check fragment cells
  for (const [, cell] of row.cells) {
    for (const frag of cell.fragments) {
      const text = fragmentToText(frag);
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
    case '#':
      return row.index;
    case 'blockKey':
      return row.sourceBlockKey;
    case 'outputType':
      return row.outputType;
    case 'stackLevel':
      return row.stackLevel;
    case 'elapsed':
      return row.elapsed;
    case 'duration':
      return row.duration;
    case 'total':
      return row.total;
    case 'spans':
      return row.relativeSpans?.[0]?.started ?? 0;
    case 'completionReason':
      return row.completionReason ?? '';
  }

  // Fragment columns — sort by first fragment's value
  if (col.fragmentType) {
    const cell = row.cells.get(col.fragmentType);
    if (!cell || cell.fragments.length === 0) return '';
    const first = cell.fragments[0];
    if (typeof first.value === 'number') return first.value;
    return fragmentToText(first);
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
    case '#':
      return String(row.index);
    case 'blockKey':
      return row.sourceBlockKey;
    case 'outputType':
      return row.outputType;
    case 'stackLevel':
      return String(row.stackLevel);
    case 'elapsed':
      return formatDuration(row.elapsed);
    case 'duration':
      return formatDuration(row.duration);
    case 'total':
      return formatDuration(row.total);
    case 'spans':
      return formatSpans(row.relativeSpans, row.duration);
    case 'completionReason':
      return row.completionReason ?? '';
  }

  if (col.fragmentType) {
    const cell = row.cells.get(col.fragmentType);
    if (!cell) return '';
    return cell.fragments.map(fragmentToText).join(', ');
  }

  return '';
}

/**
 * Convert a fragment to its display text.
 */
function fragmentToText(frag: ICodeFragment): string {
  if (frag.image) return frag.image;
  if (frag.value !== undefined && frag.value !== null) return String(frag.value);
  return frag.type;
}

/**
 * Format milliseconds into a human-readable duration (M:SS or H:MM:SS).
 */
function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format spans into a human-readable string.
 * "start - finish" across spans, or just "timestamp" if duration is 0.
 */
function formatSpans(spans?: { started: number; ended?: number }[], durationMs: number = 0): string {
  if (!spans || spans.length === 0) return '';

  // If duration is 0 and we have at least one span, show it as a timestamp
  if (durationMs === 0 && spans.length > 0) {
    const first = spans[0];
    return formatDuration(first.started * 1000);
  }

  // Otherwise show the bracket across all spans
  const first = spans[0];
  const last = spans[spans.length - 1];
  const start = formatDuration(first.started * 1000);
  const end = last.ended !== undefined ? formatDuration(last.ended * 1000) : '...';

  return `${start} — ${end}`;
}
