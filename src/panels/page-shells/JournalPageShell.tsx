/**
 * JournalPageShell Component
 *
 * Layout shell for stored-note / journal pages (Configuration 3).
 * Renders a full-width editor with dialog-based timer and review overlays.
 *
 * Uses useWorkbenchRuntime for workout lifecycle + analytics.
 * Runtime is scoped to the shell and disposed on navigation away.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface JournalPageShellProps {
  /** Editor panel content — typically a PlanPanel with stored note */
  editor: ReactNode;

  /** Optional timer overlay (dialog-based, rendered over editor) */
  timerOverlay?: ReactNode;

  /** Optional review overlay (dialog-based, rendered over editor) */
  reviewOverlay?: ReactNode;

  /** Whether the timer dialog is currently open */
  isTimerOpen?: boolean;

  /** Whether the review dialog is currently open */
  isReviewOpen?: boolean;

  /** Callback to close the timer dialog */
  onCloseTimer?: () => void;

  /** Callback to close the review dialog */
  onCloseReview?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * JournalPageShell
 *
 * ```
 * ┌──────────────────────────────────────────────────────┐
 * │  Editor Panel (full width, stored note)              │
 * ├──────────────────────────────────────────────────────┤
 * │  FullscreenTimer (dialog overlay)                    │
 * │  FullscreenReview (dialog overlay)                   │
 * └──────────────────────────────────────────────────────┘
 * ```
 */
export function JournalPageShell({
  editor,
  timerOverlay,
  reviewOverlay,
  isTimerOpen = false,
  isReviewOpen = false,
  onCloseTimer,
  onCloseReview,
  className,
}: JournalPageShellProps) {
  return (
    <div className={cn('relative flex flex-col min-h-screen bg-background', className)}>
      {/* Full-width editor */}
      <div className="flex-1 min-h-0">
        {editor}
      </div>

      {/* Timer dialog overlay */}
      {isTimerOpen && timerOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-end p-4">
              <button
                onClick={onCloseTimer}
                className="px-3 py-1.5 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {timerOverlay}
            </div>
          </div>
        </div>
      )}

      {/* Review dialog overlay */}
      {isReviewOpen && reviewOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-end p-4">
              <button
                onClick={onCloseReview}
                className="px-3 py-1.5 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {reviewOverlay}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalPageShell;
