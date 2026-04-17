/**
 * Review-Mobile Stories
 *
 * Showcases the review panel (`ReviewGrid`) in a mobile (portrait) viewport.
 * Data is identical to ReviewWeb — a real ScriptRuntime is run to completion
 * using a mock clock so no real timers are needed.
 *
 * States illustrated:
 *  1. EmptyReview    — no segments yet (blank-slate)
 *  2. FranComplete   — 21-15-9 Thrusters & Pull-ups, all segments done
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

// ─────────────────────────────────────────────────────────────────────────────
// ReviewMobileHarness
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewMobileHarnessProps {
  /** Workout script text to compile and simulate */
  script: string;
  /** Run workout to completion; false shows the empty state */
  runToCompletion: boolean;
  /** Milliseconds each simulated step takes */
  stepMs?: number;
  /** Height of the story canvas */
  height?: string;
}

const ReviewMobileHarness: React.FC<ReviewMobileHarnessProps> = ({
  script,
  runToCompletion: shouldRun,
  stepMs = 30_000,
  height = '844px',
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

const meta: Meta<typeof ReviewMobileHarness> = {
  title: 'panels/Review/Mobile',
  component: ReviewMobileHarness,
  decorators: [
    (Story) => (
      <div style={{ width: '390px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobile review panel (`ReviewGrid`) populated with real segments from a ' +
          'fully-executed ScriptRuntime. Rendered at portrait phone dimensions ' +
          '(< 768 px). Same data as the Web variant.',
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

export const EmptyReview: Story = {
  name: 'Empty (No Data)',
  args: {
    script: '21 Thrusters\n21 Pull-ups',
    runToCompletion: false,
    height: '844px',
  },
};

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
    height: '844px',
  },
};

export const AmrapComplete: Story = {
  name: 'Completed: AMRAP 20 (Cindy)',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    runToCompletion: true,
    stepMs: 60_000,
    height: '844px',
  },
};

export const EmomComplete: Story = {
  name: 'Completed: EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    runToCompletion: true,
    stepMs: 60_000,
    height: '844px',
  },
};

export const RoundsComplete: Story = {
  name: 'Completed: 5×10 Thrusters',
  args: {
    script: '5x\n10 Thrusters @95lb',
    runToCompletion: true,
    stepMs: 45_000,
    height: '844px',
  },
};
