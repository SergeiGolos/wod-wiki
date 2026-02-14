/**
 * FragmentPill — Single fragment badge styled by type and origin.
 *
 * Renders a compact pill showing the fragment's display value,
 * color-coded by FragmentType and visually distinguished when
 * the origin is 'user'.
 */

import React from 'react';
import type { ICodeFragment } from '@/core/models/CodeFragment';
import { getFragmentColorClasses } from '@/views/runtime/fragmentColorMap';

interface FragmentPillProps {
  /** The fragment to display */
  fragment: ICodeFragment;
}

/**
 * Render a single fragment as a pill/badge.
 * - Color is driven by `fragmentType` via `fragmentColorMap`.
 * - User-origin fragments get a dashed border + italic text + `(u)` suffix.
 * - Tooltip shows full metadata on hover.
 */
export const FragmentPill: React.FC<FragmentPillProps> = ({ fragment }) => {
  const colorClasses = getFragmentColorClasses(fragment.fragmentType);
  const isUser = fragment.origin === 'user';
  const displayText = fragmentDisplayText(fragment);

  const tooltip = buildTooltip(fragment);

  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border',
        colorClasses,
        isUser ? 'border-dashed italic ring-1 ring-offset-1 ring-primary/30' : '',
      ].join(' ')}
      title={tooltip}
    >
      {displayText}
      {isUser && (
        <span className="text-[10px] opacity-70 ml-0.5">(u)</span>
      )}
    </span>
  );
};

/**
 * Extract the display text from a fragment.
 */
function fragmentDisplayText(frag: ICodeFragment): string {
  if (frag.image) return frag.image;
  if (frag.value !== undefined && frag.value !== null) return String(frag.value);
  return frag.type;
}

/**
 * Build a tooltip string with metadata.
 */
function buildTooltip(frag: ICodeFragment): string {
  const parts: string[] = [];
  parts.push(`Type: ${frag.fragmentType}`);
  if (frag.value !== undefined) parts.push(`Value: ${frag.value}`);
  if (frag.origin) parts.push(`Origin: ${frag.origin}`);
  if (frag.sourceBlockKey) parts.push(`Block: ${frag.sourceBlockKey}`);
  if (frag.timestamp) parts.push(`Time: ${frag.timestamp.toISOString()}`);
  if (frag.behavior) parts.push(`Behavior: ${frag.behavior}`);
  return parts.join('\n');
}
