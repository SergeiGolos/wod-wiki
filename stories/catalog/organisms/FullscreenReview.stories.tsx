/**
 * Catalog / Organisms / FullscreenReview
 *
 * FullscreenReview is the post-workout review overlay rendered after a
 * workout completes (either naturally from FullscreenTimer or via the
 * `/review/:runtimeId` route). It wraps `ReviewGrid` in a `FocusedDialog`
 * portal (minimal variant) and supports multi-select segments.
 *
 * ## States illustrated
 *  1. EmptyState      — no segments (overlay opened before any data)
 *  2. FranComplete    — 21-15-9 Thrusters & Pull-ups — 6 effort segments
 *  3. AmrapComplete   — 20-min AMRAP Cindy — multiple rounds
 *  4. EmomComplete    — 10-min EMOM — 10 rounds
 *  5. RoundsComplete  — 5×10 Thrusters
 *
 * **Note:** Each story renders a full-viewport overlay (FocusedDialog portals
 * to document.body). Click **Open Review** to launch, then ✕ to dismiss.
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
import type { Segment } from '@/core/models/AnalyticsModels';

// UI
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview';
import { FocusedDialog } from '@/components/Editor/overlays/FocusedDialog';

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
): { segments: Segment[]; runtime: ScriptRuntime } {
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

  const { segments } = getAnalyticsFromRuntime(runtime);
  return { segments, runtime };
}

// ─── FullscreenReviewHarness ──────────────────────────────────────────────────
//
// Thin wrapper that adds a "Launch overlay" button so the FocusedDialog portal
// doesn't immediately cover the Storybook chrome — user must click to open it.

interface HarnessProps {
  /** Workout script to compile and run. Empty string → empty/no-data state. */
  script: string;
  /** Milliseconds per simulated step (affects segment durations). */
  stepMs?: number;
  /** Dialog title shown in the header. */
  title?: string;
  /** Label for the launch button. */
  label?: string;
  /** Overlay state simulation for route-level loading/errors. */
  state?: 'ready' | 'loading' | 'error';
  /** Optional error message shown when state="error". */
  errorMessage?: string;
}

const FullscreenReviewHarness: React.FC<HarnessProps> = ({
  script,
  stepMs = 30_000,
  title = 'Workout Review',
  label = 'Open Review',
  state = 'ready',
  errorMessage = 'Unable to load review data. Please retry.',
}) => {
  const [open, setOpen] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    if (!script) {
      setSegments([]);
      return;
    }
    const result = runToCompletion(script, stepMs);
    setSegments(result.segments);
    return () => result.runtime.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 bg-background border border-border rounded-xl p-6">
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        FullscreenReview renders as a full-viewport portal overlay.{' '}
        {script ? `${segments.length} segment(s) loaded.` : 'Empty — no workout data.'}
      </p>
      {script && (
        <div className="rounded-lg bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground max-w-xs w-full">
          {script.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
      >
        {label}
      </button>

      {open && (
        state === 'loading' ? (
          <FocusedDialog title={title} onClose={() => setOpen(false)} variant="minimal">
            <div className="h-[60vh] flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Loading workout review…
              </div>
            </div>
          </FocusedDialog>
        ) : state === 'error' ? (
          <FocusedDialog title={title} onClose={() => setOpen(false)} variant="minimal">
            <div className="h-[60vh] flex items-center justify-center p-8">
              <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {errorMessage}
              </div>
            </div>
          </FocusedDialog>
        ) : (
          <FullscreenReview
            segments={segments}
            title={title}
            onClose={() => setOpen(false)}
          />
        )
      )}
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof FullscreenReviewHarness> = {
  title: 'catalog/organisms/FullscreenReview',
  component: FullscreenReviewHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FullscreenReview — post-workout review overlay. Wraps ReviewGrid in a ' +
          'FocusedDialog (minimal variant) so users can analyse segment data after ' +
          'completing a workout. Click **Open Review** to launch, then ✕ to dismiss.',
      },
    },
  },
  argTypes: {
    script: { control: 'text' },
    stepMs: { control: { type: 'number', min: 1000, max: 300_000, step: 1000 } },
    title:  { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Empty state — overlay opened before any workout data exists.
 * ReviewGrid shows the blank-slate message.
 */
export const EmptyState: Story = {
  name: 'Empty — No Data',
  args: {
    script: '',
    title: 'Workout Review',
    label: 'Open Empty Review',
  },
};

/**
 * Fran — 21-15-9 Thrusters & Pull-ups (6 effort segments).
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
    title: 'Fran — Review',
    label: 'Open Fran Review',
  },
};

/**
 * AMRAP 20 — Cindy (multiple rounds completed).
 */
export const AmrapComplete: Story = {
  name: 'Completed — AMRAP 20 (Cindy)',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    stepMs: 60_000,
    title: 'AMRAP 20 — Review',
    label: 'Open AMRAP Review',
  },
};

/**
 * EMOM 10 — 10 rounds completed.
 */
export const EmomComplete: Story = {
  name: 'Completed — EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    stepMs: 60_000,
    title: 'EMOM 10 — Review',
    label: 'Open EMOM Review',
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
    title: '5 Rounds — Review',
    label: 'Open Rounds Review',
  },
};

export const LoadingState: Story = {
  name: 'Loading',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    title: 'Workout Review',
    label: 'Open Loading State',
    state: 'loading',
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: {
    script: '',
    title: 'Workout Review',
    label: 'Open Error State',
    state: 'error',
    errorMessage: 'Failed to load session analytics for this workout.',
  },
};

export const MobileFran: Story = {
  name: 'Mobile viewport — Fran',
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
    title: 'Fran — Review',
    label: 'Open Mobile Review',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
