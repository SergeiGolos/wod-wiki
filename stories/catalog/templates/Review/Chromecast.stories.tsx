/**
 * Catalog / Templates / Review / Chromecast
 *
 * Renders: {@link import('@/panels/review-panel-chromecast').ReceiverReviewPanel}
 * Data:     See {@link ../../../data-for-storybook.md}
 *
 * Stories:
 *  1. SimpleRows — simple rows fallback with no analyticsSummary
 *  2. WithProjections — full analytics summary with 4 projection metric cards
 *  3. FranResults — realistic 21-15-9 benchmark results
 *  4. AmrapResults — 20-min Cindy AMRAP results with filled projections
 *  5. EmomResults — 10-min EMOM results with avg work/rest breakdown
 *  6. RoundsResults — 5-round deadlift strength workout results
 *  7. EmptyReview — empty/zero-data defensive state
 *  8. LightBackground — light background variant
 *  9. AggregatedStats — per-exercise volume projections merged
 *  10. ManyProjections — 8 cards in 2-column grid
 *  11. LongProjectionNames — long projection names testing text wrapping
 *  12. LargeNumbers — 6-7 digit values testing formatting
 *  13. ZeroDuration — workout completed instantly (edge case)
 *  14. WithDismissButton — dismiss button unfocused (D-Pad affordance)
 *  15. DismissButtonFocused — dismiss button focused via D-Pad
 *  16. DismissButtonActivating — dismiss button mid activation-flash
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { cn } from '@/lib/utils';
import { ReceiverReviewPanel } from '@/panels/review-panel-chromecast';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror WorkbenchDisplayState from ChromecastProxyRuntime)
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewRow {
  label: string;
  value: string;
}

interface ReviewProjection {
  name: string;
  value: number;
  unit: string;
  metricType?: string;
  color?: string;
}

interface ReviewData {
  totalDurationMs: number;
  completedSegments: number;
  rows: ReviewRow[];
}

interface AnalyticsSummary {
  totalDurationMs: number;
  completedSegments: number;
  projections: ReviewProjection[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Story wrapper — wraps the panel in a TV-like frame
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewChromecastHarnessProps {
  reviewData: ReviewData;
  analyticsSummary?: AnalyticsSummary;
  /** Simulate the dark TV background (CastApp applies bg-black globally) */
  darkBackground?: boolean;
  /** If true, the dismiss button renders in its D-Pad focused state */
  dismissFocused?: boolean;
  /**
   * If true, the dismiss button renders in its activation-flash state
   * (`.tv-activating`). Shows the peak of the element-level confirmation
   * pulse that fires when the user presses Select on the remote.
   * AC: WOD-274 — D-Pad activation flash visible at TV distance.
   */
  dismissActivating?: boolean;
  /** Called when the dismiss button is activated */
  onDismiss?: () => void;
}

const ReviewChromecastHarness: React.FC<ReviewChromecastHarnessProps> = ({
  reviewData,
  analyticsSummary,
  darkBackground = true,
  dismissFocused = false,
  dismissActivating = false,
  onDismiss,
}) => {
  // Simulate spatial-nav props so we can show focused/unfocused/activating
  // states without needing a real useSpatialNavigation instance in Storybook.
  const mockGetFocusProps = (id: string) => ({
    'data-nav-id': id,
    'data-nav-focused': (dismissFocused || dismissActivating) && id === 'btn-dismiss',
    tabIndex: 0,
    ref: (el: HTMLElement | null) => {
      // Attach / detach the activation class so Storybook can freeze the
      // peak visual state of the D-Pad activation flash (WOD-274).
      if (el && id === 'btn-dismiss') {
        if (dismissActivating) {
          el.classList.add('tv-activating');
        } else {
          el.classList.remove('tv-activating');
        }
      }
    },
  });

  return (
    <div
      className={cn(
        'flex items-center justify-center w-full',
        darkBackground ? 'bg-black' : 'bg-background',
      )}
      style={{ minHeight: '600px', aspectRatio: '16/9' }}
    >
      <div className="w-full h-full" style={{ minHeight: '600px' }}>
        <ReceiverReviewPanel
          reviewData={reviewData}
          analyticsSummary={analyticsSummary}
          onDismiss={onDismiss}
          getFocusProps={mockGetFocusProps}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ReviewChromecastHarness> = {
  title: 'catalog/templates/Review/Chromecast',
  component: ReviewChromecastHarness,
  parameters: {
    layout: 'fullscreen',
    subsystem: 'chromecast',
    docs: {
      description: {
        component:
          'Chromecast TV review panel using the real `ReceiverReviewPanel` from ' +
          '`@/panels/review-panel-chromecast`. Populated with static fixture data ' +
          'matching the `WorkbenchDisplayState.reviewData` + `analyticsSummary` wire format. ' +
          'Because the Chromecast receiver gets these objects over WebRTC, stories ' +
          'bypass the runtime entirely and drive the panel with pre-built JSON.',
      },
    },
  },
  argTypes: {
    darkBackground: {
      control: 'boolean',
      description: 'Show the dark TV background',
    },
    dismissFocused: {
      control: 'boolean',
      description: 'Show the dismiss button in its D-Pad focused state',
    },
    dismissActivating: {
      control: 'boolean',
      description: 'Show the dismiss button mid activation-flash (WOD-274)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal review data with no projections — simple rows fallback */
const SIMPLE_ROWS_DATA: ReviewData = {
  totalDurationMs: 7 * 60_000 + 23_000, // 7:23
  completedSegments: 6,
  rows: [
    { label: 'Total Time', value: '7:23' },
    { label: 'Segments', value: '6' },
    { label: 'Thrusters', value: '45 reps' },
    { label: 'Pull-ups', value: '45 reps' },
  ],
};

/** Rich analytics summary with projections */
const PROJECTIONS_DATA: AnalyticsSummary = {
  totalDurationMs: 7 * 60_000 + 23_000,
  completedSegments: 6,
  projections: [
    {
      name: 'Total Reps',
      value: 90,
      unit: 'reps',
      metricType: 'repetitions',
      color: '#6366f1',
    },
    {
      name: 'Volume (Thruster)',
      value: 4275,
      unit: 'lb',
      metricType: 'volume',
      color: '#f59e0b',
    },
    {
      name: 'Total Volume',
      value: 4275,
      unit: 'lb',
      metricType: 'resistance',
      color: '#10b981',
    },
    {
      name: 'Avg Segment',
      value: 74,
      unit: 's',
      metricType: 'elapsed',
      color: '#3b82f6',
    },
  ],
};

/** Realistic Fran results */
const FRAN_REVIEW_DATA: ReviewData = {
  totalDurationMs: 7 * 60_000 + 23_000,
  completedSegments: 6,
  rows: [
    { label: 'Total Time', value: '7:23' },
    { label: 'Thrusters', value: '45 reps @ 95 lb' },
    { label: 'Pull-ups', value: '45 reps' },
  ],
};

const FRAN_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 7 * 60_000 + 23_000,
  completedSegments: 6,
  projections: [
    { name: 'Total Reps', value: 90, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Thruster Volume', value: 4275, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Pull-up Volume', value: 45, unit: 'reps', metricType: 'repetitions', color: '#10b981' },
    { name: 'Work Duration', value: 443, unit: 's', metricType: 'elapsed', color: '#3b82f6' },
  ],
};

/** AMRAP 20 with lots of rounds */
const AMRAP_REVIEW_DATA: ReviewData = {
  totalDurationMs: 20 * 60_000,
  completedSegments: 37,
  rows: [
    { label: 'Total Time', value: '20:00' },
    { label: 'Rounds', value: '12 + 2 reps' },
    { label: 'Pull-ups', value: '62 reps' },
    { label: 'Push-ups', value: '124 reps' },
    { label: 'Air Squats', value: '186 reps' },
  ],
};

const AMRAP_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 20 * 60_000,
  completedSegments: 37,
  projections: [
    { name: 'Total Reps', value: 372, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Rounds', value: 12, unit: 'rounds', metricType: 'repetitions', color: '#f59e0b' },
    { name: 'Pull-ups', value: 62, unit: 'reps', metricType: 'repetitions', color: '#10b981' },
    { name: 'Push-ups', value: 124, unit: 'reps', metricType: 'repetitions', color: '#ec4899' },
  ],
};

/** EMOM 10 results */
const EMOM_REVIEW_DATA: ReviewData = {
  totalDurationMs: 10 * 60_000,
  completedSegments: 10,
  rows: [
    { label: 'Total Time', value: '10:00' },
    { label: 'Rounds', value: '10' },
    { label: 'Thrusters', value: '100 reps @ 95 lb' },
    { label: 'Avg Rest', value: '23 s' },
  ],
};

const EMOM_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 10 * 60_000,
  completedSegments: 10,
  projections: [
    { name: 'Total Reps', value: 100, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Total Volume', value: 9500, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Avg Work Time', value: 37, unit: 's', metricType: 'elapsed', color: '#10b981' },
    { name: 'Avg Rest', value: 23, unit: 's', metricType: 'elapsed', color: '#3b82f6' },
  ],
};

/** 5-round strength workout */
const ROUNDS_REVIEW_DATA: ReviewData = {
  totalDurationMs: 18 * 60_000 + 45_000,
  completedSegments: 5,
  rows: [
    { label: 'Total Time', value: '18:45' },
    { label: 'Rounds', value: '5' },
    { label: 'Deadlifts', value: '50 reps @ 225 lb' },
    { label: 'Total Volume', value: '11250 lb' },
  ],
};

const ROUNDS_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 18 * 60_000 + 45_000,
  completedSegments: 5,
  projections: [
    { name: 'Total Reps', value: 50, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Total Volume', value: 11250, unit: 'lb', metricType: 'resistance', color: '#f59e0b' },
    { name: 'Avg Round', value: 225, unit: 's', metricType: 'elapsed', color: '#10b981' },
    { name: 'Load', value: 225, unit: 'lb', metricType: 'resistance', color: '#ef4444' },
  ],
};

/** Multi-exercise workout with per-exercise volume projections — triggers aggregation */
const AGGREGATED_REVIEW_DATA: ReviewData = {
  totalDurationMs: 22 * 60_000 + 15_000,
  completedSegments: 8,
  rows: [
    { label: 'Total Time', value: '22:15' },
    { label: 'Deadlifts', value: '30 reps @ 225 lb' },
    { label: 'Bench Press', value: '30 reps @ 185 lb' },
    { label: 'Squats', value: '30 reps @ 205 lb' },
  ],
};

const AGGREGATED_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 22 * 60_000 + 15_000,
  completedSegments: 8,
  projections: [
    // Per-exercise volume cards — ReceiverReviewPanel aggregates these by metricType
    { name: 'Deadlift Volume', value: 6750, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Bench Volume', value: 5550, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Squat Volume', value: 6150, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Total Reps', value: 90, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Work Time', value: 1335, unit: 's', metricType: 'elapsed', color: '#3b82f6' },
  ],
};

/** Zero rows / projections — defensive empty state */
const EMPTY_REVIEW_DATA: ReviewData = {
  totalDurationMs: 0,
  completedSegments: 0,
  rows: [],
};

/** Many projections — forces the 2-column grid to wrap */
const MANY_PROJECTIONS_DATA: AnalyticsSummary = {
  totalDurationMs: 45 * 60_000,
  completedSegments: 24,
  projections: [
    { name: 'Total Reps', value: 1240, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Total Volume', value: 28500, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Distance', value: 3200, unit: 'm', metricType: 'distance', color: '#10b981' },
    { name: 'Work Time', value: 2340, unit: 's', metricType: 'elapsed', color: '#3b82f6' },
    { name: 'Rest Time', value: 360, unit: 's', metricType: 'elapsed', color: '#8b5cf6' },
    { name: 'Avg Power', value: 185, unit: 'W', metricType: 'work', color: '#ef4444' },
    { name: 'Rounds', value: 8, unit: 'rounds', metricType: 'rounds', color: '#ec4899' },
    { name: 'Load', value: 225, unit: 'lb', metricType: 'resistance', color: '#14b8a6' },
  ],
};

/** Long projection names — tests text wrapping and layout stability */
const LONG_NAMES_DATA: AnalyticsSummary = {
  totalDurationMs: 15 * 60_000,
  completedSegments: 6,
  projections: [
    { name: 'Overhead Squat Volume (Snatch Balance)', value: 6750, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Average Time Per Round Including Rest', value: 225, unit: 's', metricType: 'elapsed', color: '#3b82f6' },
  ],
};

/** Large numbers — tests formatting and overflow */
const LARGE_NUMBERS_DATA: AnalyticsSummary = {
  totalDurationMs: 120 * 60_000,
  completedSegments: 50,
  projections: [
    { name: 'Total Reps', value: 999999, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
    { name: 'Total Volume', value: 1500000, unit: 'lb', metricType: 'volume', color: '#f59e0b' },
    { name: 'Distance', value: 42195, unit: 'm', metricType: 'distance', color: '#10b981' },
  ],
};

/** Zero duration but some segments — edge case for duration formatting */
const ZERO_DURATION_DATA: ReviewData = {
  totalDurationMs: 0,
  completedSegments: 3,
  rows: [
    { label: 'Total Time', value: '0:00' },
    { label: 'Segments', value: '3' },
  ],
};

const ZERO_DURATION_ANALYTICS: AnalyticsSummary = {
  totalDurationMs: 0,
  completedSegments: 3,
  projections: [
    { name: 'Total Reps', value: 0, unit: 'reps', metricType: 'repetitions', color: '#6366f1' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple rows fallback — no analyticsSummary, just reviewData.rows.
 * This is the minimal result format from early protocol versions.
 */
export const SimpleRows: Story = {
  name: 'Simple Rows (No Projections)',
  args: {
    reviewData: SIMPLE_ROWS_DATA,
    analyticsSummary: undefined,
    darkBackground: true,
  },
};

/**
 * Full analytics summary with 4 projection metric cards.
 */
export const WithProjections: Story = {
  name: 'With Metric Projections',
  args: {
    reviewData: SIMPLE_ROWS_DATA,
    analyticsSummary: PROJECTIONS_DATA,
    darkBackground: true,
  },
};

/**
 * Realistic Fran benchmark results: 21-15-9 Thrusters & Pull-ups.
 */
export const FranResults: Story = {
  name: 'Fran Results (7:23)',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: FRAN_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * 20-min Cindy AMRAP results with filled projections.
 */
export const AmrapResults: Story = {
  name: 'AMRAP 20 Results (Cindy)',
  args: {
    reviewData: AMRAP_REVIEW_DATA,
    analyticsSummary: AMRAP_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * 10-min EMOM results with avg work/rest breakdown.
 */
export const EmomResults: Story = {
  name: 'EMOM 10 Results',
  args: {
    reviewData: EMOM_REVIEW_DATA,
    analyticsSummary: EMOM_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * 5-round deadlift strength workout results.
 */
export const RoundsResults: Story = {
  name: '5-Round Strength Results',
  args: {
    reviewData: ROUNDS_REVIEW_DATA,
    analyticsSummary: ROUNDS_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * Empty / zero-data defensive state — no rows, no projections loaded yet.
 */
export const EmptyReview: Story = {
  name: 'Empty (Zero Data)',
  args: {
    reviewData: EMPTY_REVIEW_DATA,
    analyticsSummary: undefined,
    darkBackground: true,
  },
};

/**
 * Light background variant — useful for cross-theme comparison.
 */
export const LightBackground: Story = {
  name: 'Light Background Variant',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: FRAN_ANALYTICS,
    darkBackground: false,
  },
};

/**
 * Aggregated stats — per-exercise volume projections are merged into a
 * single session-level card by metricType.  This keeps the TV grid compact
 * (≤6 cards) when multiple exercises emit projections of the same type.
 * AC: WOD-656 — stats aggregation in ReceiverReviewPanel.
 */
export const AggregatedStats: Story = {
  name: 'Aggregated Stats (WOD-656)',
  args: {
    reviewData: AGGREGATED_REVIEW_DATA,
    analyticsSummary: AGGREGATED_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * Many projections — 8 cards in a 2-column grid to verify wrapping.
 * AC: Grid stays readable when projections exceed typical count.
 */
export const ManyProjections: Story = {
  name: 'Edge: Many Projections (8 Cards)',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: MANY_PROJECTIONS_DATA,
    darkBackground: true,
  },
};

/**
 * Long projection names — exercises text wrapping and truncation.
 */
export const LongProjectionNames: Story = {
  name: 'Edge: Long Projection Names',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: LONG_NAMES_DATA,
    darkBackground: true,
  },
};

/**
 * Large numbers — 6-7 digit values to verify formatting and overflow.
 */
export const LargeNumbers: Story = {
  name: 'Edge: Large Numbers',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: LARGE_NUMBERS_DATA,
    darkBackground: true,
  },
};

/**
 * Zero duration — workout completed instantly (edge case).
 * Verifies duration formatter handles 0 ms gracefully.
 */
export const ZeroDuration: Story = {
  name: 'Edge: Zero Duration',
  args: {
    reviewData: ZERO_DURATION_DATA,
    analyticsSummary: ZERO_DURATION_ANALYTICS,
    darkBackground: true,
  },
};

/**
 * Dismiss button unfocused — the D-Pad dismiss affordance at rest.
 * Verifies the button is present, correctly labelled, and spatially
 * registered for navigation (data-nav-id="btn-dismiss").
 * AC: Storybook shows focusable dismiss button (WOD-263).
 */
export const WithDismissButton: Story = {
  name: 'Dismiss Button (Unfocused)',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: FRAN_ANALYTICS,
    darkBackground: true,
    dismissFocused: false,
    onDismiss: fn().mockName('onDismiss'),
  },
};

/**
 * Dismiss button focused — the D-Pad dismiss affordance when selected via
 * remote.  Tests the `data-[nav-focused=true]` Tailwind variant.
 * This is the visual state the user sees immediately before pressing Select.
 * AC: Storybook shows focusable dismiss button in focused state (WOD-263).
 */
export const DismissButtonFocused: Story = {
  name: 'Dismiss Button (D-Pad Focused)',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: FRAN_ANALYTICS,
    darkBackground: true,
    dismissFocused: true,
    onDismiss: fn().mockName('onDismiss'),
  },
};

/**
 * Dismiss button mid activation-flash (WOD-274).
 *
 * Demonstrates the element-level `.tv-activating` pulse that fires when the
 * user presses Select on the TV remote. This replaces the old full-screen
 * `bg-primary/10` overlay which was imperceptible at TV (10-foot) distance.
 *
 * The `.tv-activating` keyframe scales the element up ~14% and boosts
 * brightness, creating a sharp localised burst right where the user's
 * attention is. The animation lasts 250 ms and resolves back to the
 * normal `tv-focusable` ring.
 *
 * AC: Storybook shows D-Pad activation with visible feedback at TV distance
 * (WOD-274).
 */
export const DismissButtonActivating: Story = {
  name: 'Dismiss Button (D-Pad Activating — WOD-274)',
  args: {
    reviewData: FRAN_REVIEW_DATA,
    analyticsSummary: FRAN_ANALYTICS,
    darkBackground: true,
    dismissFocused: true,
    dismissActivating: true,
    onDismiss: fn().mockName('onDismiss'),
  },
};

