/**
 * ReviewGrid — Main grid component.
 *
 * Replaces both ReviewPanelIndex + ReviewPanelPrimary with a single
 * full-width data grid that pivots IOutputStatement fragments into columns.
 *
 * Manages local UI state (sort, column filters, search, column visibility,
 * filter row visibility, graph tags) and delegates data transformation to
 * the useGridData hook.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Segment, AnalyticsGroup } from '@/core/models/AnalyticsModels';
import type { AnalyticsDataPoint } from '@/services/AnalyticsTransformer';
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
import type { ICodeFragment } from '@/core/models/CodeFragment';
import type { GridSortConfig, GridFilterConfig, SortDirection } from './types';
import { useGridData } from './useGridData';
import { getPreset } from './gridPresets';
import { GridToolbar } from './GridToolbar';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';

// ─── Props ─────────────────────────────────────────────────────

export interface ReviewGridProps {
  /** Script runtime instance (reserved for future use) */
  runtime: IScriptRuntime | null;
  /** Analytics segments from the transformer */
  segments: Segment[];
  /** Currently selected segment IDs */
  selectedSegmentIds: Set<number>;
  /** Segment selection handler (mirrors existing toggleAnalyticsSegment) */
  onSelectSegment: (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => void;
  /** Analytics groups (reserved for Phase 3 graph panel) */
  groups: AnalyticsGroup[];
  /** Raw analytics data points (reserved for Phase 3 graph panel) */
  rawData: AnalyticsDataPoint[];
  /** Whether the workbench is in debug mode */
  isDebugMode: boolean;
  /** User override map from the store */
  userOutputOverrides?: Map<string, ICodeFragment[]>;
  /** Active grid preset id from the store */
  gridViewPreset?: string;
  /** Callback to update the preset in the store */
  onPresetChange?: (presetId: string) => void;
  /** Block key currently hovered in other panels */
  hoveredBlockKey?: string | null;
  /** Callback for cross-panel hover highlighting */
  onHoverBlockKey?: (key: string | null) => void;
}

// ─── Component ─────────────────────────────────────────────────

export const ReviewGrid: React.FC<ReviewGridProps> = ({
  segments,
  selectedSegmentIds,
  onSelectSegment,
  isDebugMode,
  userOutputOverrides = new Map(),
  gridViewPreset = 'default',
  onPresetChange,
  hoveredBlockKey,
  onHoverBlockKey,
}) => {
  // ── Local UI state ──────────────────────────────────────────

  const [sortConfigs, setSortConfigs] = useState<GridSortConfig[]>([]);
  const [searchText, setSearchText] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [graphTaggedColumns, setGraphTaggedColumns] = useState<Set<string>>(new Set());
  const [columnVisibilityOverrides, setColumnVisibilityOverrides] = useState<Record<string, boolean>>({});

  // ── Derived preset (debug mode auto-switches) ───────────────

  const effectivePresetId = isDebugMode ? 'debug' : gridViewPreset;
  const activePreset = useMemo(() => getPreset(effectivePresetId), [effectivePresetId]);

  // ── Filter overrides (merge search + column filters) ────────

  const filterOverrides = useMemo<Partial<GridFilterConfig>>(
    () => ({
      searchText: searchText || undefined,
      columnFilters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
    }),
    [searchText, columnFilters],
  );

  // ── Grid data ────────────────────────────────────────────────

  const { rows, columns } = useGridData({
    segments,
    userOutputOverrides,
    presetId: effectivePresetId,
    isDebugMode,
    sortConfigs,
    filterOverrides,
    graphTaggedColumns,
  });

  // Apply local visibility overrides on top of preset defaults
  const visibleColumns = useMemo(
    () =>
      columns.map((col) => {
        if (col.id in columnVisibilityOverrides) {
          return { ...col, visible: columnVisibilityOverrides[col.id] };
        }
        return col;
      }),
    [columns, columnVisibilityOverrides],
  );

  const displayColumns = useMemo(
    () => visibleColumns.filter((c) => c.visible),
    [visibleColumns],
  );

  // Unfiltered row count (for the toolbar counter)
  const totalRows = segments.length;

  // Visible row IDs (for shift-click range selection)
  const visibleRowIds = useMemo(() => rows.map((r) => r.id), [rows]);

  // ── Callbacks ────────────────────────────────────────────────

  const handleSort = useCallback((columnId: string, shiftKey: boolean) => {
    setSortConfigs((prev) => {
      const existing = prev.find((s) => s.columnId === columnId);

      if (shiftKey) {
        // Multi-sort: toggle this column in the list
        if (existing) {
          if (existing.direction === 'asc') {
            return prev.map((s) =>
              s.columnId === columnId ? { ...s, direction: 'desc' as SortDirection } : s,
            );
          }
          // Already desc → remove from multi-sort
          return prev.filter((s) => s.columnId !== columnId);
        }
        return [...prev, { columnId, direction: 'asc' as SortDirection }];
      }

      // Single sort: replace entire sort config
      if (existing) {
        if (existing.direction === 'asc') {
          return [{ columnId, direction: 'desc' as SortDirection }];
        }
        // Already desc → clear sort
        return [];
      }
      return [{ columnId, direction: 'asc' as SortDirection }];
    });
  }, []);

  const handleToggleGraph = useCallback((columnId: string) => {
    setGraphTaggedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleColumnFilterChange = useCallback((columnId: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[columnId];
        return next;
      }
      return { ...prev, [columnId]: value };
    });
  }, []);

  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibilityOverrides((prev) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col) return prev;
      const currentlyVisible = columnId in prev ? prev[columnId] : col.visible;
      return { ...prev, [columnId]: !currentlyVisible };
    });
  }, [columns]);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      // Reset local overrides when switching presets
      setColumnVisibilityOverrides({});
      setColumnFilters({});
      setSearchText('');
      onPresetChange?.(presetId);
    },
    [onPresetChange],
  );

  const handleSelectRow = useCallback(
    (id: number, modifiers: { ctrlKey: boolean; shiftKey: boolean }) => {
      onSelectSegment(id, modifiers, visibleRowIds);
    },
    [onSelectSegment, visibleRowIds],
  );

  const handleHover = useCallback(
    (blockKey: string | null) => {
      onHoverBlockKey?.(blockKey);
    },
    [onHoverBlockKey],
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <GridToolbar
        activePreset={activePreset}
        onPresetChange={handlePresetChange}
        searchText={searchText}
        onSearchChange={setSearchText}
        columns={visibleColumns}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((p) => !p)}
        totalRows={totalRows}
        visibleRows={rows.length}
      />

      {/* Grid table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <GridHeader
            columns={displayColumns}
            sortConfigs={sortConfigs}
            onSort={handleSort}
            onToggleGraph={handleToggleGraph}
            showFilters={showFilters}
            columnFilters={columnFilters}
            onColumnFilterChange={handleColumnFilterChange}
          />

          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length}
                  className="py-8 text-center text-muted-foreground text-sm"
                >
                  {segments.length === 0
                    ? 'No output data available. Run a workout to see results.'
                    : 'No rows match the current filters.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <GridRow
                  key={row.id}
                  row={row}
                  columns={displayColumns}
                  isSelected={selectedSegmentIds.has(row.id)}
                  onSelect={handleSelectRow}
                  isHovered={hoveredBlockKey === row.sourceBlockKey}
                  onHover={handleHover}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/10 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {selectedSegmentIds.size > 0
            ? `${selectedSegmentIds.size} selected`
            : 'Click a row to select'}
        </span>
        <span className="tabular-nums">
          {rows.length} / {totalRows} rows
        </span>
      </div>
    </div>
  );
};
