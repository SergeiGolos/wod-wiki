/**
 * GridRow — Row renderer for the review grid.
 *
 * Renders one table row per GridRow, mapping visible columns to cells.
 * All cells are rendered through the unified CDL cell renderer.
 */

import React, { useMemo } from 'react';
import { MetricType } from '@/core/models/Metric';
import type { GridRow as GridRowData, GridColumn } from './types';
import { UnifiedCellRenderer, inferColumnDefFromGridColumn } from './interpreters/cdlCellRenderer';
import { cn } from '@/lib/utils';

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
  /** Callback when a metrics cell is double-clicked for override editing */
  onCellDoubleClick?: (blockKey: string, metricType: MetricType, anchorRect: DOMRect) => void;
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
  onCellDoubleClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(row.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
  };

  const isGroup = row.outputType === 'group';

  // Pre-compute ColumnDefs to avoid re-inferring on every render
  const columnDefs = useMemo(
    () => columns.map((col) => inferColumnDefFromGridColumn(col)),
    [columns],
  );

  return (
    <tr
      className={cn(
        'border-b border-border transition-colors cursor-pointer',
        isGroup ? 'bg-muted/50 font-bold' : '',
        isSelected
          ? 'bg-accent dark:bg-accent/20'
          : isHovered
            ? 'bg-muted/50 dark:bg-muted/40'
            : 'hover:bg-muted/30 dark:hover:bg-muted/20',
      )}
      onClick={handleClick}
      onMouseEnter={() => onHover(row.sourceBlockKey)}
      onMouseLeave={() => onHover(null)}
    >
      {columns.map((col, idx) => (
        <UnifiedCellRenderer
          key={col.id}
          columnDef={columnDefs[idx]}
          row={row}
          indent={col.type === MetricType.Effort ? row.stackLevel : 0}
          onDoubleClick={onCellDoubleClick}
        />
      ))}
    </tr>
  );
};
