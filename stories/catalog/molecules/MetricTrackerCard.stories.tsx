/**
 * DesignSystem / Molecules / MetricTrackerCard
 *
 * Floating bubbles that display session-total analytics computed by
 * useWorkoutTracker(). The component reads from runtime context so it
 * renders nothing without an active workout — this story documents that
 * behaviour and shows the component within a labelled container.
 *
 * ## States illustrated
 *  1. NoActiveWorkout  — no data (renders null)
 *  2. ActiveTracking   — reps + distance + load in progress
 *  3. Completed        — final session totals after workout ends
 *  4. SingleMetric     — only one metric bubble (e.g., total distance)
 *  5. CompactVariant   — compact className override
 */

import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricTrackerCard } from '@/components/track/MetricTrackerCard';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { RuntimeClock } from '@/runtime/RuntimeClock';
import { WorkoutTracker } from '@/runtime/tracking/WorkoutTracker';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

/** Build an idle runtime — no blocks pushed, just enough for the context hook. */
function buildIdleRuntime(): ScriptRuntime {
  const script = sharedParser.read('') as WodScript;
  const compiler = new JitCompiler();
  const clock = new RuntimeClock();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  return new ScriptRuntime(script, compiler, { stack, clock, eventBus });
}

/** Build a runtime pre-seeded with tracker metrics to drive MetricTrackerCard. */
function buildRuntimeWithMetrics(
  metrics: Array<{ key: string; value: number | string; unit?: string }>,
): ScriptRuntime {
  const script = sharedParser.read('') as WodScript;
  const compiler = new JitCompiler();
  const clock = new RuntimeClock();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  const tracker = new WorkoutTracker();

  // Pre-seed the tracker so getSnapshot() returns data on first render.
  for (const { key, value, unit } of metrics) {
    tracker.recordMetric('session-totals', key, value, unit);
  }

  return new ScriptRuntime(script, compiler, { stack, clock, eventBus }, { tracker });
}

// ─── Shared wrapper ───────────────────────────────────────────────────────────

const CardWrapper: React.FC<{ children: React.ReactNode; label?: string }> = ({
  children,
  label,
}) => (
  <div className="flex flex-col items-center gap-3 p-6 bg-background rounded-lg border border-border min-w-[320px]">
    {label && (
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
    )}
    {children}
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof MetricTrackerCard> = {
  title: 'catalog/molecules/metrics/MetricTrackerCard',
  component: MetricTrackerCard,
  parameters: { layout: 'centered', subsystem: 'chromecast' },
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** No active workout — component renders nothing (returns null). */
export const NoActiveWorkout: Story = {
  name: 'No active workout (renders nothing)',
  render: () => {
    const runtime = React.useMemo(() => buildIdleRuntime(), []);
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper>
          <MetricTrackerCard />
          <p className="text-xs text-muted-foreground text-center max-w-64">
            MetricTrackerCard is context-driven. It renders bubbles only when
            a workout is running and session-total analytics are available.
          </p>
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};

/** Active tracking — reps, distance, and load bubbles mid-workout. */
export const ActiveTracking: Story = {
  name: 'Active tracking — reps + distance + load',
  render: () => {
    const runtime = React.useMemo(
      () =>
        buildRuntimeWithMetrics([
          { key: 'Reps', value: 63, unit: 'reps' },
          { key: 'Distance', value: 1.2, unit: 'km' },
          { key: 'Volume', value: 5985, unit: 'lb' },
        ]),
      [],
    );
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper label="Active — mid-workout">
          <MetricTrackerCard />
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};

/** Completed state — final session totals after the workout finishes. */
export const Completed: Story = {
  name: 'Completed — final session totals',
  render: () => {
    const runtime = React.useMemo(
      () =>
        buildRuntimeWithMetrics([
          { key: 'Reps', value: 135, unit: 'reps' },
          { key: 'Distance', value: 0, unit: 'km' },
          { key: 'Volume', value: 12825, unit: 'lb' },
          { key: 'Energy', value: 87, unit: 'kcal' },
        ]),
      [],
    );
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper label="Completed">
          <MetricTrackerCard />
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};

/** Error state — metric collection temporarily unavailable. */
export const ErrorState: Story = {
  name: 'Error — metric collection unavailable',
  render: () => {
    const runtime = React.useMemo(
      () =>
        buildRuntimeWithMetrics([
          { key: 'Reps', value: 42, unit: 'reps' },
          { key: 'Volume', value: 3990, unit: 'lb' },
        ]),
      [],
    );
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper label="Error state">
          <MetricTrackerCard />
          <p className="text-xs text-destructive text-center max-w-64">
            Metric sync error: showing last known values.
          </p>
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};

/** Single metric — only one bubble (e.g., total distance for a run workout). */
export const SingleMetric: Story = {
  name: 'Single metric — distance only',
  render: () => {
    const runtime = React.useMemo(
      () =>
        buildRuntimeWithMetrics([{ key: 'Distance', value: 5, unit: 'km' }]),
      [],
    );
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper label="Single metric">
          <MetricTrackerCard />
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};

/**
 * Compact variant — many metrics in a narrow container to validate wrapping.
 * Pass a custom `className` to control the layout.
 */
export const CompactVariant: Story = {
  name: 'Compact — many metrics, narrow container',
  render: () => {
    const runtime = React.useMemo(
      () =>
        buildRuntimeWithMetrics([
          { key: 'Reps', value: 225, unit: 'reps' },
          { key: 'Distance', value: 3.2, unit: 'km' },
          { key: 'Volume', value: 21375, unit: 'lb' },
          { key: 'Energy', value: 145, unit: 'kcal' },
          { key: 'Sets', value: 15, unit: 'sets' },
        ]),
      [],
    );
    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <div className="w-64 p-4 bg-background rounded-lg border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Compact (w-64)
          </p>
          <MetricTrackerCard className="px-1" />
        </div>
      </ScriptRuntimeProvider>
    );
  },
};

/** Live update simulation — tracker metrics update every second. */
export const LiveUpdates: Story = {
  name: 'Live updates — simulated ticking',
  render: () => {
    const tracker = React.useMemo(() => new WorkoutTracker(), []);
    const runtime = React.useMemo(() => {
      const script = sharedParser.read('') as WodScript;
      const compiler = new JitCompiler();
      const clock = new RuntimeClock();
      const stack = new RuntimeStack();
      const eventBus = new EventBus();
      // Seed initial value
      tracker.recordMetric('session-totals', 'Reps', 0, 'reps');
      return new ScriptRuntime(
        script,
        compiler,
        { stack, clock, eventBus },
        { tracker },
      );
    }, [tracker]);

    // Simulate live metric updates (every 1 s)
    useEffect(() => {
      let count = 0;
      const id = setInterval(() => {
        count += 5;
        tracker.recordMetric('session-totals', 'Reps', count, 'reps');
        tracker.recordMetric('session-totals', 'Volume', count * 95, 'lb');
      }, 1000);
      return () => clearInterval(id);
    }, [tracker]);

    return (
      <ScriptRuntimeProvider runtime={runtime}>
        <CardWrapper label="Live — updates every 1s">
          <MetricTrackerCard />
          <p className="text-xs text-muted-foreground text-center max-w-64">
            Reps increment by 5 each second to simulate a live workout.
          </p>
        </CardWrapper>
      </ScriptRuntimeProvider>
    );
  },
};
