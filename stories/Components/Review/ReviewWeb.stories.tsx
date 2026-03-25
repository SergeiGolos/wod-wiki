/**
 * Review-Web Stories
 *
 * Showcases the web-based review panel (`ReviewGrid`) with segments derived
 * from a fully-executed real ScriptRuntime.
 *
 * The harness builds a real runtime, runs the workout to completion by
 * repeatedly calling NextAction (simulating "user advanced each step"),
 * then feeds `getAnalyticsFromRuntime()` directly into `ReviewGrid`.
 *
 * Nothing is mocked — the segments in the grid are the exact same objects
 * that the production workbench would show after clicking Stop.
 *
 * States illustrated:
 *  1. EmptyReview    — no segments yet (blank-slate review state)
 *  2. FranComplete   — 21-15-9 Thrusters & Pull-ups, all 6 segments finished
 *  3. AmrapComplete  — 20-min AMRAP, multiple rounds completed
 *  4. EmomComplete   — 10-min EMOM, 10 rounds completed
 *  5. RoundsComplete — 5×10 Thrusters, 5 rounds completed
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// Runtime
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

// Strategies
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

// Actions
import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';
import { TickEvent } from '@/runtime/events/TickEvent';

// Analytics
import { getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer';
import type { Segment, AnalyticsGroup } from '@/core/models/AnalyticsModels';

// UI
import { ReviewGrid } from '@/components/review-grid/ReviewGrid';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildCompiler(): JitCompiler {
  const compiler = new JitCompiler();
  compiler.registerStrategy(new AmrapLogicStrategy());
  compiler.registerStrategy(new IntervalLogicStrategy());
  compiler.registerStrategy(new GenericTimerStrategy());
  compiler.registerStrategy(new GenericLoopStrategy());
  compiler.registerStrategy(new GenericGroupStrategy());
  compiler.registerStrategy(new SoundStrategy());
  compiler.registerStrategy(new ReportOutputStrategy());
  compiler.registerStrategy(new ChildrenStrategy());
  compiler.registerStrategy(new EffortFallbackStrategy());
  return compiler;
}

/**
 * Build a runtime, run the workout to completion by advancing a mock clock and
 * repeatedly calling NextAction for each step, then return the final analytics.
 *
 * @param scriptText   Workout script to compile
 * @param stepMs       How many milliseconds each "segment" takes (mock elapsed time)
 * @param maxSteps     Safety cap on NextAction calls (prevents infinite loops)
 */
function runToCompletion(
  scriptText: string,
  stepMs = 30_000,
  maxSteps = 50,
): { segments: Segment[]; groups: AnalyticsGroup[]; runtime: ScriptRuntime } {
  const script = sharedParser.read(scriptText) as WodScript;
  const compiler = buildCompiler();
  const clock = createMockClock(new Date('2024-06-15T09:00:00Z'));
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });

  // Start session — pushes SessionRootBlock + WaitingToStart
  runtime.do(new StartSessionAction({ label: 'Story Session' }));

  let steps = 0;
  while (runtime.stack.count > 0 && steps < maxSteps) {
    // Advance time so elapsed metrics on the block are non-zero
    clock.advance(stepMs);

    // Dispatch a tick so timer behaviors see the new time
    runtime.handle(new TickEvent());

    // Advance to next block (user pressing "Next" or block auto-completing)
    runtime.do(new NextAction());

    steps++;
  }

  const { segments, groups } = getAnalyticsFromRuntime(runtime);
  return { segments, groups, runtime };
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewWebHarness — the shared story component
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewWebHarnessProps {
  /** Workout script text to compile and simulate */
  script: string;
  /**
   * Whether to actually run the workout to completion (true = real segments)
   * or show an empty grid.
   */
  runToCompletion: boolean;
  /** Milliseconds each simulated step takes (affects elapsed time in segments) */
  stepMs?: number;
  /** Height of the story canvas */
  height?: string;
}

const ReviewWebHarness: React.FC<ReviewWebHarnessProps> = ({
  script,
  runToCompletion: shouldRun,
  stepMs = 30_000,
  height = '600px',
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!shouldRun) {
      setSegments([]);
      setGroups([]);
      return;
    }

    // Run synchronously — mock clock means no real timers needed
    const result = runToCompletion(script, stepMs);
    setSegments(result.segments);
    setGroups(result.groups);

    return () => {
      result.runtime.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (
    id: number,
    modifiers?: { ctrlKey: boolean; shiftKey: boolean },
  ) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <DebugModeProvider>
      <div style={{ height }} className="border rounded-lg overflow-hidden bg-background">
        <ReviewGrid
          runtime={null}
          segments={segments}
          selectedSegmentIds={selectedIds}
          onSelectSegment={handleSelect}
          groups={groups}
        />
      </div>
    </DebugModeProvider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ReviewWebHarness> = {
  title: 'Panels/Review/Web',
  component: ReviewWebHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Web review panel (`ReviewGrid`) populated with real segments from a ' +
          'fully-executed ScriptRuntime. The mock clock advances synchronously ' +
          'so no real timers are needed — data matches what production generates.',
      },
    },
  },
  argTypes: {
    script: {
      control: 'text',
      description: 'Workout script in WOD-wiki syntax',
    },
    runToCompletion: {
      control: 'boolean',
      description: 'Run workout to completion; false shows the empty state',
    },
    stepMs: {
      control: { type: 'number', min: 1000, max: 600000, step: 1000 },
      description: 'Mock elapsed time per step (ms)',
    },
    height: {
      control: 'text',
      description: 'CSS height of the story canvas',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Empty state — review panel with no segments yet.
 * This is what the user sees when they navigate to Review before finishing a workout.
 */
export const EmptyReview: Story = {
  name: 'Empty (No Data)',
  args: {
    script: '21 Thrusters\n21 Pull-ups',
    runToCompletion: false,
    height: '500px',
  },
};

/**
 * Fran — classic 21-15-9 benchmark.
 * 6 effort segments + session root and child rounds produce a rich grid.
 */
export const FranComplete: Story = {
  name: 'Completed: Fran (21-15-9)',
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    runToCompletion: true,
    stepMs: 30_000,
    height: '650px',
  },
};

/**
 * Grace — 30 clean & jerks for time.
 */
export const GraceComplete: Story = {
  name: 'Completed: Grace (30 C&J)',
  args: {
    script: '30 Clean & Jerk @135lb',
    runToCompletion: true,
    stepMs: 150_000, // 2.5 min
    height: '500px',
  },
};

/**
 * AMRAP 20 — Cindy style, multiple rounds completed.
 */
export const AmrapComplete: Story = {
  name: 'Completed: AMRAP 20 (Cindy)',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    runToCompletion: true,
    stepMs: 60_000, // 1 min per step (gets through multiple rounds)
    height: '700px',
  },
};

/**
 * EMOM 10 — every-minute-on-the-minute.
 */
export const EmomComplete: Story = {
  name: 'Completed: EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    runToCompletion: true,
    stepMs: 60_000,
    height: '650px',
  },
};

/**
 * 5×10 Rounds — simple round-based workout.
 */
export const RoundsComplete: Story = {
  name: 'Completed: 5×10 Thrusters',
  args: {
    script: '5x\n10 Thrusters @95lb',
    runToCompletion: true,
    stepMs: 45_000,
    height: '600px',
  },
};

/**
 * Multi-movement complex — longer workout with multiple movement types.
 */
export const DeadliftWorkoutComplete: Story = {
  name: 'Completed: Deadlift Complex',
  args: {
    script: [
      '15 Deadlift @225lb',
      '12 Hang Power Clean @135lb',
      '9 Front Squat @135lb',
      '6 Push Jerk @135lb',
    ].join('\n'),
    runToCompletion: true,
    stepMs: 90_000,
    height: '650px',
  },
};
