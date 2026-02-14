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
import type { ICodeFragment, FragmentType } from '@/core/models/CodeFragment';
import type { GridSortConfig, GridFilterConfig, SortDirection } from './types';
import { useGridData } from './useGridData';
import { getPreset } from './gridPresets';
import { GridToolbar } from './GridToolbar';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { GridGraphPanel } from './GridGraphPanel';
import { UserOverrideDialog } from './UserOverrideDialog';
import { useUserOverrides } from './useUserOverrides';
import { useDebugMode } from '@/components/layout/DebugModeContext';

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
  userOutputOverrides = new Map(),
  gridViewPreset = 'default',
  onPresetChange,
  hoveredBlockKey,
  onHoverBlockKey,
}) => {
  // ── Debug mode from context ─────────────────────────────────

  const { isDebugMode } = useDebugMode();

  // ── Local UI state ──────────────────────────────────────────

  const [sortConfigs, setSortConfigs] = useState<GridSortConfig[]>([]);
  const [searchText, setSearchText] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [graphTaggedColumns, setGraphTaggedColumns] = useState<Set<string>>(new Set());
  const [columnVisibilityOverrides, setColumnVisibilityOverrides] = useState<Record<string, boolean>>({});

  // ── User override dialog state ──────────────────────────────

  const { overrides, setOverride, removeOverride } = useUserOverrides(true);

  const [overrideDialog, setOverrideDialog] = useState<{
    isOpen: boolean;
    blockKey: string;
    fragmentType: FragmentType;
    anchorRect: DOMRect | null;
    existingFragments: ICodeFragment[];
    existingUserValue?: string;
  }>({
    isOpen: false,
    blockKey: '',
    fragmentType: 'Timer' as FragmentType,
    anchorRect: null,
    existingFragments: [],
  });

  // Merge store overrides + local overrides (local wins)
  const mergedOverrides = useMemo(() => {
    const merged = new Map(userOutputOverrides);
    for (const [key, frags] of overrides) {
      merged.set(key, frags);
    }
    return merged;
  }, [userOutputOverrides, overrides]);

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

  const { rows, columns, graphTaggedColumnIds } = useGridData({
    segments,
    userOutputOverrides: mergedOverrides,
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

  const handleGraphSelectRow = useCallback(
    (id: number) => {
      onSelectSegment(id, { ctrlKey: false, shiftKey: false }, visibleRowIds);
    },
    [onSelectSegment, visibleRowIds],
  );

  const handleCellDoubleClick = useCallback(
    (blockKey: string, fragmentType: FragmentType, anchorRect: DOMRect) => {
      // Find existing fragments for context
      const row = rows.find((r) => r.sourceBlockKey === blockKey);
      const cell = row?.cells.get(fragmentType);
      const existingFragments = cell?.fragments ?? [];

      // Check for existing user override value
      const userFrag = existingFragments.find((f) => f.origin === 'user');
      const existingUserValue = userFrag?.value != null ? String(userFrag.value) : undefined;

      setOverrideDialog({
        isOpen: true,
        blockKey,
        fragmentType,
        anchorRect,
        existingFragments,
        existingUserValue,
      });
    },
    [rows],
  );

  const handleOverrideSave = useCallback(
    (value: string, image?: string) => {
      setOverride(overrideDialog.blockKey, overrideDialog.fragmentType, value, image);
      setOverrideDialog((prev) => ({ ...prev, isOpen: false }));
    },
    [overrideDialog.blockKey, overrideDialog.fragmentType, setOverride],
  );

  const handleOverrideRemove = useCallback(() => {
    removeOverride(overrideDialog.blockKey, overrideDialog.fragmentType);
    setOverrideDialog((prev) => ({ ...prev, isOpen: false }));
  }, [overrideDialog.blockKey, overrideDialog.fragmentType, removeOverride]);

  const handleOverrideClose = useCallback(() => {
    setOverrideDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

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

      {/* Graph panel (visible when columns are tagged) */}
      <GridGraphPanel
        rows={rows}
        columns={visibleColumns}
        graphTaggedColumnIds={graphTaggedColumnIds}
        selectedIds={selectedSegmentIds}
        onSelectRow={handleGraphSelectRow}
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
                    ? 'No output data available. Run a session to see results.'
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
                  onCellDoubleClick={handleCellDoubleClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User override dialog */}
      <UserOverrideDialog
        isOpen={overrideDialog.isOpen}
        blockKey={overrideDialog.blockKey}
        fragmentType={overrideDialog.fragmentType}
        existingFragments={overrideDialog.existingFragments}
        existingUserValue={overrideDialog.existingUserValue}
        anchorRect={overrideDialog.anchorRect ?? undefined}
        onSave={handleOverrideSave}
        onRemove={handleOverrideRemove}
        onClose={handleOverrideClose}
      />

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
