import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LandingTemplateProps {
  /** Optional top-right actions (e.g. theme toggle) */
  actionsSlot?: ReactNode;

  /** Hero section rendered above the main content */
  heroSlot?: ReactNode;

  /** Main content area */
  children: ReactNode;

  /** Additional CSS classes on the root element */
  className?: string;
}

/**
 * LandingTemplate
 *
 * Centered max-width container for landing/marketing pages.
 * Provides consistent outer padding, max-width constraints, and
 * optional hero + actions slots.
 *
 * ```
 * ┌──────────────────────────────────────────┐
 * │  ┌────────────────────────────────────┐  │
 * │  │ Actions (top-right)                │  │
 * │  ├────────────────────────────────────┤  │
 * │  │ Hero section                       │  │
 * │  ├────────────────────────────────────┤  │
 * │  │                                    │  │
 * │  │ Main content                       │  │
 * │  │                                    │  │
 * │  └────────────────────────────────────┘  │
 * └──────────────────────────────────────────┘
 * ```
 */
export function LandingTemplate({
  actionsSlot,
  heroSlot,
  children,
  className,
}: LandingTemplateProps) {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-7xl px-6 py-10 sm:px-8 lg:px-12 lg:py-14',
        className,
      )}
    >
      {actionsSlot && (
        <div className="mb-6 flex justify-end">
          {actionsSlot}
        </div>
      )}
      {heroSlot}
      {children}
    </main>
  );
}

export default LandingTemplate;
