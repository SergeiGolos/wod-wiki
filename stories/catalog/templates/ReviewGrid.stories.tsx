/**
 * Catalog / Templates / ReviewGrid
 *
 * ReviewGrid is the primary results-display layout used across multiple routes:
 *  - `/tracker/:runtimeId` — in-progress workout results tab
 *  - `/review/:runtimeId`  — post-workout full-page review (via FullscreenReview)
 *  - `/`                    — Home page workout history
 *
 * This story composes the lower-level `GridHeaderCell` and `MetricSourceRow`
 * sub-components into a full, working grid with real segment data.
 *
 * ## States illustrated
 *  1. EmptyState      — no segments (blank-slate, initial load)
 *  2. FranComplete    — 21-15-9 Thrusters & Pull-ups (6 effort segments)
 *  3. AmrapComplete   — 20-min AMRAP Cindy (multiple rounds)
 *  4. EmomComplete    — 10-min EMOM (10 rounds)
 *  5. RoundsComplete  — 5×10 Thrusters (5 rounds)
 *  6. MobileViewport  — portrait phone (375 × 812)
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
import { WhiteboardScript } from '@/parser/WhiteboardScript';

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

// ─── Runtime helpers ──────────────────────────────────────────────────────────

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

function runToCompletion(
  scriptText: string,
  stepMs = 30_000,
  maxSteps = 50,
): { segments: Segment[]; groups: AnalyticsGroup[]; runtime: ScriptRuntime } {
  const script = sharedParser.read(scriptText) as WhiteboardScript;
  const compiler = buildCompiler();
  const clock = createMockClock(new Date('2024-06-15T09:00:00Z'));
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });

  runtime.do(new StartSessionAction({ label: 'Story Session' }));

  let steps = 0;
  while (runtime.stack.count > 0 && steps < maxSteps) {
    clock.advance(stepMs);
    runtime.handle(new TickEvent());
    runtime.do(new NextAction());
    steps++;
  }

  const { segments, groups } = getAnalyticsFromRuntime(runtime);
  return { segments, groups, runtime };
}

// ─── ReviewGridHarness ────────────────────────────────────────────────────────

export interface ReviewGridHarnessProps {
  /** Workout script to compile and simulate. Empty string → empty state. */
  script: string;
  /** Milliseconds each simulated step takes (affects elapsed time in segments). */
  stepMs?: number;
  /** CSS height of the story canvas. */
  height?: string;
}

const ReviewGridHarness: React.FC<ReviewGridHarnessProps> = ({
  script,
  stepMs = 30_000,
  height = '600px',
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!script) {
      setSegments([]);
      setGroups([]);
      return;
    }
    const result = runToCompletion(script, stepMs);
    setSegments(result.segments);
    setGroups(result.groups);
    return () => result.runtime.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (
    id: number,
    modifiers?: { ctrlKey: boolean; shiftKey: boolean },
    visibleIds?: number[],
  ) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else if (modifiers?.shiftKey && visibleIds) {
        const lastId = Array.from(prev).pop();
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId);
          const endIdx = visibleIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) next.add(visibleIds[i]);
          } else next.add(id);
        } else next.add(id);
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

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ReviewGridHarness> = {
  title: 'catalog/templates/ReviewGrid',
  component: ReviewGridHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ReviewGrid — the primary results display layout. Composes GridHeaderCell ' +
          'and MetricSourceRow sub-components into a full sortable, filterable data ' +
          'grid. Used in the tracker, review, and home routes.',
      },
    },
  },
  argTypes: {
    script: {
      control: 'text',
      description: 'Workout script in WOD-wiki syntax',
    },
    stepMs: {
      control: { type: 'number', min: 1000, max: 600_000, step: 1000 },
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

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Empty state — no segments yet.
 * Shows the blank-slate "No output data available" message.
 */
export const EmptyState: Story = {
  name: 'Empty — No Data',
  args: {
    script: '',
    height: '400px',
  },
};

/**
 * Fran — 21-15-9 Thrusters & Pull-ups.
 * 6 effort segments produce a rich multi-column grid.
 */
export const FranComplete: Story = {
  name: 'Completed — Fran (21-15-9)',
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    stepMs: 30_000,
    height: '650px',
  },
};

/**
 * AMRAP 20 — Cindy style. Multiple rounds completed.
 */
export const AmrapComplete: Story = {
  name: 'Completed — AMRAP 20 (Cindy)',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    stepMs: 60_000,
    height: '700px',
  },
};

/**
 * EMOM 10 — 10 rounds, every minute on the minute.
 */
export const EmomComplete: Story = {
  name: 'Completed — EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    stepMs: 60_000,
    height: '650px',
  },
};

/**
 * 5×10 Rounds — simple round-based workout.
 */
export const RoundsComplete: Story = {
  name: 'Completed — 5×10 Thrusters',
  args: {
    script: '5x\n10 Thrusters @95lb',
    stepMs: 45_000,
    height: '600px',
  },
};

/**
 * Mobile viewport — same Fran data at 375 × 812.
 * Verifies the grid toolbar and columns remain usable on small screens.
 */
export const MobileViewport: Story = {
  name: 'Mobile (375 × 812) — Fran',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    stepMs: 30_000,
    height: '500px',
  },
};
