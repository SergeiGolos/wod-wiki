/**
 * Review-Chromecast Stories
 *
 * Showcases the Chromecast review panel that is rendered on the TV screen
 * after a workout completes.  The panel is driven by `WorkbenchDisplayState`
 * data from `ChromecastProxyRuntime`, so no runtime object is needed — stories
 * use pre-built JSON fixtures that match the exact wire format.
 *
 * The `ReceiverReviewPanel` component is private to `receiver-rpc.tsx`;
 * this file replicates it faithfully so stories can be viewed in isolation.
 *
 * States illustrated:
 *  1. SimpleRows      — reviewData only (no analyticsSummary / no projections)
 *  2. WithProjections — full analyticsSummary: 2-column metric cards + icons
 *  3. FranResults     — realistic Fran workout results
 *  4. AmrapResults    — AMRAP results with rounds + reps
 *  5. EmomResults     — EMOM results with avg timing
 *  6. FiveBySomething — 5-round workout with volume metrics
 *  7. EmptyReview     — reviewData present but zero rows / projections
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Timer,
  CheckCircle2,
  Dumbbell,
  BarChart3,
  Zap,
  Activity,
  Wind,
  Gauge,
  Hash,
  Flame,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
// ReceiverReviewPanel — faithful replica of the private component in receiver-rpc.tsx
// (kept in sync with the original; should be extracted to a shared module)
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  power: Zap,
  heart_rate: Activity,
  cadence: Wind,
  speed: Gauge,
  resistance: Dumbbell,
  repetitions: Hash,
  calories: Flame,
  duration: Timer,
  elapsed: Clock,
  volume: Dumbbell,
  pace: Gauge,
  distance: ArrowRight,
  reps: Hash,
};

function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getIcon(
  metricType?: string,
): React.ComponentType<{ className?: string }> {
  return ICON_MAP[metricType ?? ''] ?? BarChart3;
}

interface ReceiverReviewPanelProps {
  reviewData: ReviewData;
  analyticsSummary?: AnalyticsSummary;
}

const ReceiverReviewPanel: React.FC<ReceiverReviewPanelProps> = ({
  reviewData,
  analyticsSummary,
}) => {
  const projections = analyticsSummary?.projections ?? [];
  const totalDurationMs =
    analyticsSummary?.totalDurationMs ?? reviewData.totalDurationMs ?? 0;
  const completedSegments =
    analyticsSummary?.completedSegments ?? reviewData.completedSegments ?? 0;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-8 p-12 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h1 className="text-4xl font-bold text-foreground">Workout Complete</h1>
      </div>

      {/* Analytics Summary View */}
      {projections.length > 0 ? (
        <div className="w-full max-w-2xl flex flex-col gap-4">
          {/* Total Duration Card */}
          <div className="bg-card/50 border border-border/60 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Duration</span>
                <span className="text-3xl font-bold text-foreground font-mono">
                  {formatDurationMs(totalDurationMs)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-mono uppercase tracking-wider">
                {completedSegments} segments
              </span>
            </div>
          </div>

          {/* Projection Results Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {projections.map((proj, index) => {
              const IconComponent = getIcon(proj.metricType);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex flex-col items-center gap-3 p-5 rounded-xl border transition-all',
                    'bg-card/50 border-border/60 hover:bg-card/80',
                  )}
                  style={{
                    borderColor: proj.color ? `${proj.color}40` : undefined,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="h-10 w-10 flex items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: proj.color
                        ? `${proj.color}20`
                        : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Metric Value */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-foreground font-mono">
                      {proj.value.toLocaleString()}
                      <span className="text-sm font-medium text-muted-foreground ml-1">
                        {proj.unit}
                      </span>
                    </span>
                  </div>

                  {/* Metric Name */}
                  <span className="text-sm font-medium text-muted-foreground text-center">
                    {proj.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Fallback to simple rows when no projections available
        <div className="w-full max-w-md flex flex-col gap-2">
          {reviewData.rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between rounded-lg px-5 py-3 text-base',
                i === 0
                  ? 'bg-primary/10 border border-primary/30 font-bold'
                  : 'bg-card/40 border border-border/40',
              )}
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-mono font-semibold text-foreground">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-muted-foreground/50">
        <BarChart3 className="h-4 w-4" />
        <span className="text-xs font-mono uppercase tracking-widest">
          {completedSegments} segments completed
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Story wrapper — wraps the panel in a TV-like frame
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewChromecastHarnessProps {
  reviewData: ReviewData;
  analyticsSummary?: AnalyticsSummary;
  /** Simulate the dark TV background (CastApp applies bg-black globally) */
  darkBackground?: boolean;
}

const ReviewChromecastHarness: React.FC<ReviewChromecastHarnessProps> = ({
  reviewData,
  analyticsSummary,
  darkBackground = true,
}) => (
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
      />
    </div>
  </div>
);

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
          'Chromecast TV review panel populated with static fixture data matching ' +
          'the `WorkbenchDisplayState.reviewData` + `analyticsSummary` wire format. ' +
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

/** Zero rows / projections — defensive empty state */
const EMPTY_REVIEW_DATA: ReviewData = {
  totalDurationMs: 0,
  completedSegments: 0,
  rows: [],
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
