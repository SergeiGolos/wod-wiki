/**
 * Catalog / Templates / Tracker / Web
 *
 * Renders: Timer + VisualStatePanel at web dimensions — no dedicated web panel exists yet
 *
 * Stories:
 *  1. NoBlock — displays the "select a workout" placeholder
 *  2. ReadyToStart — runtime initialized, WaitingToStart on stack
 *  3. ActiveFran — classic 21-15-9 benchmark (first exercise block active)
 *  4. ActiveAmrap — 20-minute As Many Rounds As Possible
 *  5. ActiveRounds — 5 rounds of 10 Thrusters
 *  6. ActiveEmom — 10-minute Every Minute On the Minute
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ScriptRuntime } from '@bitcobblers/wod-wiki-engine';
import { JitCompiler } from '@bitcobblers/wod-wiki-engine';
import { RuntimeStack } from '@bitcobblers/wod-wiki-engine';
import { EventBus } from '@bitcobblers/wod-wiki-engine';
import { RuntimeClock } from '@bitcobblers/wod-wiki-engine';
import { createParser } from '@bitcobblers/wod-wiki-engine';
import { WhiteboardScript } from '@bitcobblers/wod-wiki-engine';

// Strategies — the same set used in production
import { AmrapLogicStrategy } from '@bitcobblers/wod-wiki-engine';
import { IntervalLogicStrategy } from '@bitcobblers/wod-wiki-engine';
import { GenericTimerStrategy } from '@bitcobblers/wod-wiki-engine';
import { GenericLoopStrategy } from '@bitcobblers/wod-wiki-engine';
import { GenericGroupStrategy } from '@bitcobblers/wod-wiki-engine';
import { SoundStrategy } from '@bitcobblers/wod-wiki-engine';
import { ReportOutputStrategy } from '@bitcobblers/wod-wiki-engine';
import { ChildrenStrategy } from '@bitcobblers/wod-wiki-engine';
import { EffortFallbackStrategy } from '@bitcobblers/wod-wiki-engine';

// Actions (runtime control)
import { StartSessionAction } from '@bitcobblers/wod-wiki-engine';
import { NextAction } from '@bitcobblers/wod-wiki-engine';

// UI
import { ScriptRuntimeProvider } from '@bitcobblers/wod-wiki-engine';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { DebugModeProvider } from '@/contexts/DebugModeContext'
import { VisualStatePanel } from '@/panels/visual-state-panel';
import { TimerDisplay } from '@/panels/wallclock-panel';
import { useRuntimeExecution } from '@bitcobblers/wod-wiki-engine';
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
  const script = createParser().read(scriptText) as WhiteboardScript;
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
      rt.do(new NextAction(undefined, rt.nowProvider));
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
    runtime.do(new NextAction(undefined, runtime.nowProvider));
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
  title: 'catalog/templates/Tracker/Web',
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
