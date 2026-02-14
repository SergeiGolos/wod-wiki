/**
 * GridCell — Multi-fragment cell renderer.
 *
 * Renders all fragments of a single FragmentType within one table cell.
 * Multiple fragments appear as stacked pills/badges.
 */

import React from 'react';
import type { GridCell as GridCellData } from './types';
import { FragmentPill } from './FragmentPill';

interface GridCellProps {
  /** Cell data (may be undefined if the row has no fragments of this type) */
  cell?: GridCellData;
}

/**
 * Render a grid cell containing zero or more fragment pills.
 * Empty cells render as a dim dash.
 */
export const GridCell: React.FC<GridCellProps> = ({ cell }) => {
  if (!cell || cell.fragments.length === 0) {
    return (
      <td className="py-1 px-2 text-muted-foreground/40 text-center">
        —
      </td>
    );
  }

  return (
    <td className="py-1 px-2">
      <div className="flex flex-wrap gap-1">
        {cell.fragments.map((frag, idx) => (
          <FragmentPill key={idx} fragment={frag} />
        ))}
      </div>
    </td>
  );
};
