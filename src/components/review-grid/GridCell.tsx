/**
 * GridCell — Multi-fragment cell renderer.
 *
 * Renders all fragments of a single FragmentType within one table cell.
 * Multiple fragments appear as stacked pills/badges.
 * Double-clicking opens the user override dialog.
 */

import React, { useCallback, useRef } from 'react';
import type { FragmentType } from '@/core/models/CodeFragment';
import type { GridCell as GridCellData } from './types';
import { FragmentPill } from './FragmentPill';

interface GridCellProps {
  /** Cell data (may be undefined if the row has no fragments of this type) */
  cell?: GridCellData;
  /** Fragment type for this column (needed for override targeting) */
  fragmentType?: FragmentType;
  /** Block key of the row (needed for override targeting) */
  blockKey?: string;
  /** Callback when a cell is double-clicked for override editing */
  onDoubleClick?: (blockKey: string, fragmentType: FragmentType, anchorRect: DOMRect) => void;
}

/**
 * Render a grid cell containing zero or more fragment pills.
 * Empty cells render as a dim dash. Double-click triggers override dialog.
 */
export const GridCell: React.FC<GridCellProps> = ({ cell, fragmentType, blockKey, onDoubleClick }) => {
  const tdRef = useRef<HTMLTableCellElement>(null);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (fragmentType && blockKey && onDoubleClick && tdRef.current) {
        const rect = tdRef.current.getBoundingClientRect();
        onDoubleClick(blockKey, fragmentType, rect);
      }
    },
    [fragmentType, blockKey, onDoubleClick],
  );

  if (!cell || cell.fragments.length === 0) {
    return (
      <td
        ref={tdRef}
        className="py-1 px-2 text-muted-foreground/40 text-center cursor-cell"
        onDoubleClick={handleDoubleClick}
      >
        —
      </td>
    );
  }

  return (
    <td ref={tdRef} className="py-1 px-2 cursor-cell" onDoubleClick={handleDoubleClick}>
      <div className="flex flex-wrap gap-1">
        {cell.fragments.map((frag, idx) => (
          <FragmentPill key={idx} fragment={frag} />
        ))}
      </div>
    </td>
  );
};
