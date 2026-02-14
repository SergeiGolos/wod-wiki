/**
 * GridRow — Row renderer for the review grid.
 *
 * Renders one table row per GridRow, mapping visible columns to cells.
 * Fixed columns render their scalar values directly; fragment columns
 * delegate to GridCell for multi-pill rendering.
 */

import React from 'react';
import type { GridRow as GridRowData, GridColumn } from './types';
import { FIXED_COLUMN_IDS } from './types';
import { GridCell } from './GridCell';

interface GridRowProps {
  /** The row data to render */
  row: GridRowData;
  /** Visible columns (already filtered) */
  columns: GridColumn[];
  /** Whether this row is currently selected */
  isSelected: boolean;
  /** Callback when the row is clicked */
  onSelect: (id: number, modifiers: { ctrlKey: boolean; shiftKey: boolean }) => void;
  /** Whether the row's block key is currently hovered (cross-panel highlight) */
  isHovered: boolean;
  /** Callback when the mouse enters/leaves row */
  onHover: (blockKey: string | null) => void;
}

/**
 * Render a single data row in the review grid table.
 */
export const GridRow: React.FC<GridRowProps> = ({
  row,
  columns,
  isSelected,
  onSelect,
  isHovered,
  onHover,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(row.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
  };

  return (
    <tr
      className={[
        'border-b border-border/20 last:border-0 transition-colors cursor-pointer',
        isSelected
          ? 'bg-primary/10 dark:bg-primary/20'
          : isHovered
            ? 'bg-muted/50 dark:bg-muted/40'
            : 'hover:bg-muted/30 dark:hover:bg-muted/20',
      ].join(' ')}
      onClick={handleClick}
      onMouseEnter={() => onHover(row.sourceBlockKey)}
      onMouseLeave={() => onHover(null)}
    >
      {columns.map((col) => (
        <React.Fragment key={col.id}>
          {renderFixedCell(col, row) ?? (
            <GridCell cell={col.fragmentType ? row.cells.get(col.fragmentType) : undefined} />
          )}
        </React.Fragment>
      ))}
    </tr>
  );
};

/**
 * Render a fixed (non-fragment) column cell, or return null to fall through
 * to the GridCell renderer.
 */
function renderFixedCell(col: GridColumn, row: GridRowData): React.ReactNode | null {
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return (
        <td className="py-1 pl-3 pr-2 text-muted-foreground font-mono text-xs w-10 text-right">
          {row.index}
        </td>
      );

    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return (
        <td className="py-1 px-2 text-foreground truncate max-w-[160px] text-sm" title={row.sourceBlockKey}>
          {row.sourceBlockKey}
        </td>
      );

    case FIXED_COLUMN_IDS.OUTPUT_TYPE:
      return (
        <td className="py-1 px-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${outputTypeBadgeClass(row.outputType)}`}>
            {row.outputType}
          </span>
        </td>
      );

    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return (
        <td className="py-1 px-2 text-muted-foreground font-mono text-xs text-center w-12">
          {row.stackLevel}
        </td>
      );

    case FIXED_COLUMN_IDS.ELAPSED:
      return (
        <td className="py-1 px-2 text-foreground font-mono text-xs text-right w-20">
          {formatDuration(row.elapsed)}
        </td>
      );

    case FIXED_COLUMN_IDS.TOTAL:
      return (
        <td className="py-1 px-2 text-foreground font-mono text-xs text-right w-20">
          {formatDuration(row.total)}
        </td>
      );

    case FIXED_COLUMN_IDS.COMPLETION_REASON:
      return (
        <td className="py-1 px-2 text-muted-foreground text-xs truncate max-w-[120px]" title={row.completionReason}>
          {row.completionReason ?? ''}
        </td>
      );

    default:
      return null;
  }
}

/**
 * Badge color classes for output types.
 */
function outputTypeBadgeClass(type: string): string {
  switch (type) {
    case 'segment':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'completion':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    case 'milestone':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
    case 'label':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
    case 'metric':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200';
    case 'system':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Format milliseconds into M:SS or H:MM:SS.
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
