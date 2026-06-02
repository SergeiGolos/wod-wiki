/**
 * GridRow — Row renderer for the review grid.
 *
 * Renders one table row per GridRow, mapping visible columns to cells.
 * All cells are rendered through the unified CDL cell renderer.
 */

import React from 'react';
import { MetricType } from '@/core/models/Metric';
import type { GridRow as GridRowData } from './types';
import type { ColumnDef } from './column-definition-language';
import { UnifiedCellRenderer } from './interpreters/cdlCellRenderer';
import { cn } from '@/lib/utils';
import { getGridColumnMinWidth } from './gridWidthPolicy';

interface GridRowProps {
  /** The row data to render */
  row: GridRowData;
  /** All rows in the grid (for derived column context) */
  allRows: GridRowData[];
  /** Index of this row within allRows (for derived column context) */
  rowIndex: number;
  /** Visible column definitions (already filtered) */
  columns: ColumnDef[];
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
  allRows,
  rowIndex,
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
      {columns.map((colDef) => {
        const isEffort =
          colDef.source.type === 'metric-type' &&
          colDef.source.metricType === MetricType.Effort;
        return (
          <UnifiedCellRenderer
            key={colDef.id}
            columnDef={colDef}
            row={row}
            allRows={allRows}
            rowIndex={rowIndex}
            indent={isEffort ? row.stackLevel : 0}
            onDoubleClick={onCellDoubleClick}
            style={{ minWidth: getGridColumnMinWidth(colDef) }}
          />
        );
      })}
    </tr>
  );
};
