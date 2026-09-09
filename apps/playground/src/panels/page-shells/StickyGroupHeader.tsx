/**
 * StickyGroupHeader — the ONE sticky bucket header for every grouped
 * scrolling list (the WQL `by {dim}` buckets: date, week, month, year,
 * discipline, tag, …), so grouping looks and behaves identically across
 * the library family's cards / feed / explorer lists.
 *
 * Pages measure the page's sticky stack ONCE with useStickyBoundaryOffset
 * (the live bottom of the sticky boundary — StickyPageHeader on desktop,
 * the mobile navbar on mobile) and pass it as `top`. One measurement per
 * page, N headers share it; the header then stacks flush under the page
 * header and hands off to the next group as it scrolls in.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StickyGroupHeaderProps {
  /** Viewport `top` for the sticky header — the page sticky boundary's
   *  live bottom, measured once per page via useStickyBoundaryOffset. */
  top: number;
  /** Bucket label — the group key rendered for humans (date, discipline…). */
  label: ReactNode;
  /** Leading icon (calendar, folder…). */
  icon?: ReactNode;
  /** Chips after the label (e.g. the "Today" badge). */
  badge?: ReactNode;
  /** Trailing meta — entry counts, links (right-aligned). */
  meta?: ReactNode;
  /** Optional data-testid passthrough. */
  testId?: string;
  className?: string;
}

export function StickyGroupHeader({
  top,
  label,
  icon,
  badge,
  meta,
  testId,
  className,
}: StickyGroupHeaderProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'sticky z-10 flex items-center gap-2 border-y border-border/60 bg-card/95 px-6 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur',
        className,
      )}
      style={{ top: `${top}px` }}
    >
      {icon}
      <span className="min-w-0 truncate text-xs font-bold text-foreground">{label}</span>
      {badge}
      {meta && (
        <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-muted-foreground">
          {meta}
        </span>
      )}
    </div>
  );
}
