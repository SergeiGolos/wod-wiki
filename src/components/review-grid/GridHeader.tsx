/**
 * GridHeader — Sortable, filterable column headers.
 *
 * Renders the `<thead>` for the review grid with:
 * - Click-to-sort (single click toggles asc/desc/none, shift+click for multi-sort)
 * - Graph toggle icon on graphable numeric columns
 * - Per-column filter input row (optional)
 * - ＋ button at the end of the header to add metric columns
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { MetricType } from '@/core/models/Metric';
import type { GridColumn, GridSortConfig, SortDirection } from './types';
import { getMetricIcon } from '@/views/runtime/metricColorMap';

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
  /** Metric types available to add (not yet visible as columns) */
  availableToAdd?: MetricType[];
  /** Called when the user selects a metric type to add */
  onAddColumn?: (type: MetricType) => void;
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  columns,
  sortConfigs,
  onSort,
  onToggleGraph,
  showFilters,
  columnFilters,
  onColumnFilterChange,
  availableToAdd,
  onAddColumn,
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
        {/* ＋ Add column button */}
        {onAddColumn && (
          <th className="py-2 px-1 w-8">
            <AddColumnButton availableToAdd={availableToAdd ?? []} onAddColumn={onAddColumn} />
          </th>
        )}
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
          {/* Blank cell under the + button */}
          {onAddColumn && <th className="py-1 px-1" />}
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

// ─── Add Column Button ─────────────────────────────────────────

interface AddColumnButtonProps {
  availableToAdd: MetricType[];
  onAddColumn: (type: MetricType) => void;
}

const METRIC_LABELS: Partial<Record<string, { label: string }>> = {
  duration:      { label: 'Duration' },
  rep:           { label: 'Reps' },
  effort:        { label: 'Effort' },
  distance:      { label: 'Distance' },
  rounds:        { label: 'Rounds' },
  resistance:    { label: 'Resistance' },
  action:        { label: 'Action' },
  increment:     { label: 'Increment' },
  metric:        { label: 'Metric' },
  label:         { label: 'Label' },
  text:          { label: 'Text' },
  'current-round': { label: 'Current Round' },
  volume:        { label: 'Volume' },
  intensity:     { label: 'Intensity' },
  load:          { label: 'Load' },
  work:          { label: 'Work' },
  lap:           { label: 'Lap' },
  group:         { label: 'Group' },
};

const AddColumnButton: React.FC<AddColumnButtonProps> = ({ availableToAdd, onAddColumn }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (availableToAdd.length === 0) return null;

  return (
    <div className="relative flex items-center justify-center">
      <button
        ref={buttonRef}
        title="Add metric column"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={[
          'flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold transition-all',
          'text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/40',
          'border border-dashed border-muted-foreground/40',
          open ? 'bg-primary/10 border-primary/40 text-foreground' : '',
        ].join(' ')}
      >
        ＋
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] max-h-64 overflow-y-auto
                     bg-popover border border-border rounded-md shadow-xl py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
            Add metric column
          </div>
          {availableToAdd.map((type) => {
            const cfg = METRIC_LABELS[type as string];
            const icon = getMetricIcon(type) ?? '•';
            const label = cfg?.label ?? (type.charAt(0).toUpperCase() + type.slice(1));
            return (
              <button
                key={type}
                onClick={() => {
                  onAddColumn(type);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-foreground transition-colors"
              >
                <span className="text-sm w-4 text-center">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
