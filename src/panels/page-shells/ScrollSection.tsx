/**
 * ScrollSection Component
 *
 * Simple scrollable content section with optional max-height constraint.
 * Used inside page shells for static or lightly interactive content areas.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollSectionProps {
  /** Section content */
  children: ReactNode;

  /** Optional max-height constraint (CSS value, e.g. '60vh') */
  maxHeight?: string;

  /** Padding override (CSS value, default 'p-6') */
  padding?: string;

  /** Section id for anchor navigation */
  id?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * ScrollSection — bounded scrollable area for page shells.
 *
 * Wraps content in a div with optional max-height and overflow-y-auto.
 * When no maxHeight is supplied, the section grows to fit its content.
 */
export function ScrollSection({
  children,
  maxHeight,
  padding = 'p-6',
  id,
  className,
}: ScrollSectionProps) {
  return (
    <div
      id={id}
      className={cn(padding, maxHeight && 'overflow-y-auto', className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}

export default ScrollSection;
