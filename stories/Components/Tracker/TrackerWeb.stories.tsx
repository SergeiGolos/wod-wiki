/**
 * Tracker-Web Stories
 *
 * Showcases the web-based workout tracking panel (`TimerScreen` / `VisualStatePanel`)
 * using a real ScriptRuntime backed by a JIT-compiled workout script.
 *
 * The harness stands up a real runtime, pushes blocks onto the stack, and
 * renders the actual production components — nothing is mocked at the
 * component level.  The Storybook Controls/actions panel lets you inspect
 * the events fired from the UI controls (start, pause, stop, next).
 *
 * States illustrated:
 *  1. NoBlock      — no runtime; shows the preview / "select a workout" panel
 *  2. ReadyToStart — runtime initialised with a WaitingToStart block on the stack
 *  3. ActiveFran   — Fran (21-15-9 Thrusters & Pull-ups) with active session block
 *  4. AmrapRunning — 20-min AMRAP with a running AMRAP block
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { RuntimeClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

// Strategies — the same set used in production
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

// Actions (runtime control)
import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';

// UI
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';
import { VisualStatePanel } from '@/panels/visual-state-panel';
import { TimerDisplay } from '@/panels/timer-panel';
import { useRuntimeExecution } from '@/runtime-test-bench/hooks/useRuntimeExecution';
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

function buildRuntime(scriptText: string): ScriptRuntime {
  const script = sharedParser.read(scriptText) as WodScript;
  const compiler = buildCompiler();
  const clock = new RuntimeClock();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  return new ScriptRuntime(script, compiler, { stack, clock, eventBus });
}

// ─────────────────────────────────────────────────────────────────────────────
// TrackerWebHarness — the shared storybook component
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackerWebHarnessProps {
  /** Workout script text to compile and execute */
  script: string;
  /**
   * Initial stack state:
   *  - 'empty'  : no blocks pushed — shows preview/no-runtime UI
   *  - 'ready'  : StartSessionAction pushed so WaitingToStart is on the stack
   *  - 'active' : StartSessionAction + one NextAction to transition past WaitingToStart
   */
  initialState: 'empty' | 'ready' | 'active';
  /** Height of the story canvas */
  height?: string;
}

const TrackerWebHarness: React.FC<TrackerWebHarnessProps> = ({
  script,
  initialState,
  height = '600px',
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);

  const onStart = fn().mockName('tracker:start');
  const onPause = fn().mockName('tracker:pause');
  const onStop = fn().mockName('tracker:stop');
  const onNext = fn().mockName('tracker:next');

  // Build and initialise the runtime once on mount
  useEffect(() => {
    if (initialState === 'empty') {
      setRuntime(null);
      return;
    }

    const rt = buildRuntime(script);

    // Push the session root so WaitingToStart lands on the stack
    rt.do(new StartSessionAction({ label: 'Story Session' }));

    // Advance past WaitingToStart into the first real block
    if (initialState === 'active') {
      rt.do(new NextAction());
    }

    setRuntime(rt);

    return () => {
      rt.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!runtime) {
    // Empty / no-runtime state
    return (
      <div style={{ height }} className="flex items-center justify-center bg-background text-muted-foreground border rounded-lg">
        <div className="text-center p-8 max-w-sm">
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Workout Selected</h3>
          <p className="text-sm text-muted-foreground">Select a WOD block from the planner to start tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <ScriptRuntimeProvider runtime={runtime}>
      <DebugModeProvider>
        <PanelSizeProvider>
          <div style={{ height }} className="flex overflow-hidden border rounded-lg bg-background">
            {/* Left: Visual State (stack + lookahead) */}
            <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
              <VisualStatePanel />
            </div>
            {/* Right: Timer & Controls */}
            <div className="w-1/2 flex flex-col">
              <ExecutionBound
                runtime={runtime}
                onStart={onStart}
                onPause={onPause}
                onStop={onStop}
                onNext={onNext}
              />
            </div>
          </div>
        </PanelSizeProvider>
      </DebugModeProvider>
    </ScriptRuntimeProvider>
  );
};

/**
 * Inner component that has access to the runtime execution hook and wires
 * up TimerDisplay. Lives inside the ScriptRuntimeProvider tree so hooks work.
 */
const ExecutionBound: React.FC<{
  runtime: ScriptRuntime;
  onStart: (...args: unknown[]) => void;
  onPause: (...args: unknown[]) => void;
  onStop: (...args: unknown[]) => void;
  onNext: (...args: unknown[]) => void;
}> = ({ runtime, onStart, onPause, onStop, onNext }) => {
  const execution = useRuntimeExecution(runtime);

  const handleStart = () => {
    execution.start();
    onStart({ elapsed: execution.elapsedTime, status: execution.status });
  };
  const handlePause = () => {
    execution.pause();
    onPause({ elapsed: execution.elapsedTime, status: execution.status });
  };
  const handleStop = () => {
    execution.stop();
    onStop({ elapsed: execution.elapsedTime });
  };
  const handleNext = () => {
    runtime.do(new NextAction());
    onNext({ elapsed: execution.elapsedTime });
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-4">
      <TimerDisplay
        elapsedMs={execution.elapsedTime}
        hasActiveBlock={runtime.stack.count > 0}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        onNext={handleNext}
        isRunning={execution.status === 'running'}
        enableDisplayStack
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof TrackerWebHarness> = {
  title: 'Components/Tracker/Web',
  component: TrackerWebHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Web-based workout tracking panel backed by a real ScriptRuntime. ' +
          'Blocks are compiled and pushed onto the stack so components render ' +
          'their true production state. Use the Actions panel to see events fired.',
      },
    },
  },
  argTypes: {
    script: {
      control: 'text',
      description: 'Workout script in WOD-wiki syntax',
    },
    initialState: {
      control: { type: 'select' },
      options: ['empty', 'ready', 'active'],
      description: 'Stack state to initialise the harness with',
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
 * No WOD block selected — displays the "select a workout" placeholder.
 */
export const NoBlock: Story = {
  name: 'No Block Selected',
  args: {
    script: '21 Thrusters\n21 Pull-ups',
    initialState: 'empty',
    height: '500px',
  },
};

/**
 * Ready to Start — runtime initialised, WaitingToStart block is on the stack.
 * Press Start / Next to transition into the workout.
 */
export const ReadyToStart: Story = {
  name: 'Ready To Start',
  args: {
    script: '21 Thrusters\n21 Pull-ups\n15 Thrusters\n15 Pull-ups\n9 Thrusters\n9 Pull-ups',
    initialState: 'ready',
    height: '600px',
  },
};

/**
 * Active Fran — classic CrossFit benchmark 21-15-9 Thrusters & Pull-ups.
 * The session has been started and the first exercise block is active.
 */
export const ActiveFran: Story = {
  name: 'Active: Fran (21-15-9)',
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    initialState: 'active',
    height: '650px',
  },
};

/**
 * Active AMRAP — 20-minute As Many Rounds As Possible.
 */
export const ActiveAmrap: Story = {
  name: 'Active: AMRAP 20',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    initialState: 'active',
    height: '650px',
  },
};

/**
 * Active Rounds — 5 rounds of 10 Thrusters.
 */
export const ActiveRounds: Story = {
  name: 'Active: 5×10 Thrusters',
  args: {
    script: '5x\n10 Thrusters @95lb',
    initialState: 'active',
    height: '650px',
  },
};

/**
 * Active EMOM — 10-minute Every Minute On the Minute.
 */
export const ActiveEmom: Story = {
  name: 'Active: EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    initialState: 'active',
    height: '650px',
  },
};
