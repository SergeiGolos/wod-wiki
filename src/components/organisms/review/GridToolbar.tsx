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
import type { GridViewPreset } from './types';
import { GRID_PRESETS } from './gridPresets';

interface GridToolbarProps {
  /** Currently active preset */
  activePreset: GridViewPreset;
  /** Callback to switch presets */
  onPresetChange: (presetId: string) => void;
  /** Global search text */
  searchText: string;
  /** Callback to update search text */
  onSearchChange: (text: string) => void;
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
  showFilters,
  onToggleFilters,
  totalRows,
  visibleRows,
}) => {
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

      {/* MQL Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="flex w-full group">
          <input
            type="text"
            className="flex-1 px-2.5 py-1 text-xs rounded-l border border-r-0 border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:z-10"
            placeholder="MQL (not current implement)"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            className="px-2.5 py-1 text-xs rounded-r border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center gap-1.5 border-l-0"
            title="Search with MQL"
          >
            <span>🔍</span>
            <span className="font-medium">Search</span>
          </button>
        </div>
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
