/**
 * GridHeader — Sortable, filterable column headers.
 *
 * Renders the `<thead>` for the review grid with:
 * - Click-to-sort (single click toggles asc/desc/none, shift+click for multi-sort)
 * - Graph toggle icon on graphable numeric columns
 * - Per-column filter input row (optional)
 */

import React, { useCallback } from 'react';
import type { GridColumn, GridSortConfig, SortDirection } from './types';

interface GridHeaderProps {
  /** Column definitions (only visible columns) */
  columns: GridColumn[];
  /** Current sort configuration */
  sortConfigs: GridSortConfig[];
  /** Callback to update sort */
  onSort: (columnId: string, shiftKey: boolean) => void;
  /** Callback to toggle graph tag on a column */
  onToggleGraph: (columnId: string) => void;
  /** Whether per-column filter inputs are visible */
  showFilters: boolean;
  /** Current per-column filter values */
  columnFilters: Record<string, string>;
  /** Callback to update a column filter */
  onColumnFilterChange: (columnId: string, value: string) => void;
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  columns,
  sortConfigs,
  onSort,
  onToggleGraph,
  showFilters,
  columnFilters,
  onColumnFilterChange,
}) => {
  return (
    <thead className="bg-muted/50 dark:bg-muted/30 sticky top-0 z-10">
      {/* Column labels row */}
      <tr className="border-b border-border">
        {columns.map((col) => (
          <HeaderCell
            key={col.id}
            column={col}
            sortConfig={sortConfigs.find((s) => s.columnId === col.id)}
            onSort={onSort}
            onToggleGraph={onToggleGraph}
          />
        ))}
      </tr>

      {/* Filter inputs row */}
      {showFilters && (
        <tr className="border-b border-border/50 bg-muted/20 dark:bg-muted/10">
          {columns.map((col) => (
            <FilterCell
              key={col.id}
              column={col}
              value={columnFilters[col.id] ?? ''}
              onChange={onColumnFilterChange}
            />
          ))}
        </tr>
      )}
    </thead>
  );
};

// ─── Header Cell ───────────────────────────────────────────────

interface HeaderCellProps {
  column: GridColumn;
  sortConfig?: GridSortConfig;
  onSort: (columnId: string, shiftKey: boolean) => void;
  onToggleGraph: (columnId: string) => void;
}

const HeaderCell: React.FC<HeaderCellProps> = ({
  column,
  sortConfig,
  onSort,
  onToggleGraph,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (column.sortable) {
        onSort(column.id, e.shiftKey);
      }
    },
    [column.id, column.sortable, onSort],
  );

  const handleGraphClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleGraph(column.id);
    },
    [column.id, onToggleGraph],
  );

  return (
    <th
      className={[
        'py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap select-none',
        column.sortable ? 'cursor-pointer hover:text-foreground transition-colors' : '',
      ].join(' ')}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {/* Icon */}
        {column.icon && <span className="text-sm">{column.icon}</span>}

        {/* Label */}
        <span>{column.label}</span>

        {/* Sort indicator */}
        {sortConfig && <SortIndicator direction={sortConfig.direction} />}

        {/* Graph toggle */}
        {column.graphable && (
          <button
            className={[
              'ml-auto text-sm opacity-40 hover:opacity-100 transition-opacity',
              column.isGraphed ? 'opacity-100 text-primary' : '',
            ].join(' ')}
            onClick={handleGraphClick}
            title={column.isGraphed ? 'Remove from graph' : 'Add to graph'}
          >
            📊
          </button>
        )}
      </div>
    </th>
  );
};

// ─── Sort Indicator ────────────────────────────────────────────

const SortIndicator: React.FC<{ direction: SortDirection }> = ({ direction }) => (
  <span className="text-primary text-[10px] ml-0.5">
    {direction === 'asc' ? '▲' : '▼'}
  </span>
);

// ─── Filter Cell ───────────────────────────────────────────────

interface FilterCellProps {
  column: GridColumn;
  value: string;
  onChange: (columnId: string, value: string) => void;
}

const FilterCell: React.FC<FilterCellProps> = ({ column, value, onChange }) => {
  if (!column.filterable) {
    return <th className="py-1 px-2" />;
  }

  return (
    <th className="py-1 px-2">
      <input
        type="text"
        className="w-full px-1.5 py-0.5 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
        placeholder={`Filter…`}
        value={value}
        onChange={(e) => onChange(column.id, e.target.value)}
      />
    </th>
  );
};
