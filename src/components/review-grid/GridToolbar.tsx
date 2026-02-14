/**
 * GridToolbar — Toolbar above the review grid.
 *
 * Contains:
 * - View preset selector (Default / Debug)
 * - Global search input
 * - Column visibility toggle chips
 * - Filter toggle button
 * - Row count indicator
 */

import React from 'react';
import type { GridColumn, GridViewPreset } from './types';
import { GRID_PRESETS } from './gridPresets';
import { getFragmentIcon } from '@/views/runtime/fragmentColorMap';

interface GridToolbarProps {
  /** Currently active preset */
  activePreset: GridViewPreset;
  /** Callback to switch presets */
  onPresetChange: (presetId: string) => void;
  /** Global search text */
  searchText: string;
  /** Callback to update search text */
  onSearchChange: (text: string) => void;
  /** Column definitions (for visibility toggles) */
  columns: GridColumn[];
  /** Callback to toggle column visibility */
  onToggleColumnVisibility: (columnId: string) => void;
  /** Whether per-column filter row is showing */
  showFilters: boolean;
  /** Callback to toggle filter row visibility */
  onToggleFilters: () => void;
  /** Total number of rows (before filtering) */
  totalRows: number;
  /** Visible number of rows (after filtering) */
  visibleRows: number;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
  activePreset,
  onPresetChange,
  searchText,
  onSearchChange,
  columns,
  onToggleColumnVisibility,
  showFilters,
  onToggleFilters,
  totalRows,
  visibleRows,
}) => {
  // Only show fragment columns in the visibility toggles
  const fragmentColumns = columns.filter((c) => c.fragmentType);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted/10 dark:bg-muted/5">
      {/* Preset selector */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-muted-foreground font-medium">View:</label>
        <select
          className="text-xs rounded border border-border bg-background text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
          value={activePreset.id}
          onChange={(e) => onPresetChange(e.target.value)}
        >
          {Object.values(GRID_PRESETS).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border" />

      {/* Global search */}
      <div className="flex items-center gap-1 flex-1 max-w-xs">
        <span className="text-muted-foreground text-sm">🔍</span>
        <input
          type="text"
          className="w-full px-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          placeholder="Search all cells…"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border" />

      {/* Column visibility chips */}
      <div className="flex flex-wrap items-center gap-1">
        {fragmentColumns.map((col) => {
          const icon = col.fragmentType ? getFragmentIcon(col.fragmentType) : null;
          return (
            <button
              key={col.id}
              className={[
                'text-[11px] px-1.5 py-0.5 rounded border transition-colors',
                col.visible
                  ? 'bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/40'
                  : 'bg-muted/30 border-border text-muted-foreground opacity-50',
              ].join(' ')}
              onClick={() => onToggleColumnVisibility(col.id)}
              title={`${col.visible ? 'Hide' : 'Show'} ${col.label} column`}
            >
              {icon && <span className="mr-0.5">{icon}</span>}
              {col.label}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border" />

      {/* Filter toggle */}
      <button
        className={[
          'text-xs px-2 py-1 rounded border transition-colors',
          showFilters
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground',
        ].join(' ')}
        onClick={onToggleFilters}
        title={showFilters ? 'Hide column filters' : 'Show column filters'}
      >
        🔽 Filters
      </button>

      {/* Row count */}
      <div className="ml-auto text-xs text-muted-foreground tabular-nums">
        {visibleRows === totalRows
          ? `${totalRows} rows`
          : `${visibleRows} / ${totalRows} rows`}
      </div>
    </div>
  );
};
