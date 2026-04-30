/**
 * StorybookWorkbench — Acceptance-test harness for the full Workbench.
 *
 * Renders the real Workbench component (plan/track/review views) so that
 * Playwright e2e tests can interact with the runtime: start workouts,
 * click Next, and observe the review panel.
 *
 * Context provided by the global StorybookHost decorator:
 *   ThemeProvider, AudioProvider, DebugModeProvider, MemoryRouter,
 *   NuqsTestingAdapter, NotebookProvider, CommandProvider
 *
 * Workbench sets up its own WorkbenchProvider + RuntimeLifecycleProvider
 * internally, so no duplication is needed here.
 */

import React from 'react';
import { Workbench, WorkbenchProps } from '@/components/layout/Workbench';

interface StorybookWorkbenchProps extends WorkbenchProps {
  initialContent?: string;
  /** Optional collection label (unused — kept for story arg compatibility) */
  collection?: string;
  /** Page title (unused — kept for story arg compatibility) */
  title?: string;
  /** @deprecated — WorkbenchProps does not have these; kept for story compat */
  initialShowPlan?: boolean;
  initialShowTrack?: boolean;
  initialShowReview?: boolean;
  showToolbar?: boolean;
  readonly?: boolean;
  theme?: string;
}

export const StorybookWorkbench: React.FC<StorybookWorkbenchProps> = ({
  initialContent,
  initialViewMode,
  // Absorb unknown/compat props so they don't leak to Workbench
  collection: _collection,
  title: _title,
  initialShowPlan: _showPlan,
  initialShowTrack: _showTrack,
  initialShowReview: _showReview,
  showToolbar: _showToolbar,
  readonly: _readonly,
  theme: _theme,
  ...rest
}) => {
  return (
    <Workbench
      initialContent={initialContent}
      initialViewMode={initialViewMode ?? 'plan'}
      mode="static"
      {...rest}
    />
  );
};

export default StorybookWorkbench;
