/**
 * Tracker-Mobile Stories
 *
 * Showcases the workout tracking panel in a mobile (portrait) viewport.
 * The layout stacks the timer controls above the visual state panel
 * rather than side-by-side, matching the narrow screen experience.
 *
 * Uses the same real ScriptRuntime as TrackerWeb — nothing is mocked.
 *
 * States illustrated:
 *  1. NoBlock      — no runtime; "select a workout" placeholder
 *  2. ReadyToStart — WaitingToStart block on the stack
 *  3. ActiveFran   — Fran (21-15-9) first block active
 *  4. AmrapRunning — 20-min AMRAP running
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

// UI
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';
import { VisualStatePanel } from '@/panels/visual-state-panel';
import { TimerDisplay } from '@/panels/timer-panel';
import { useRuntimeExecution } from '@/runtime/hooks/useRuntimeExecution';

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
// TrackerMobileHarness
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackerMobileHarnessProps {
  /** Workout script text to compile and execute */
  script: string;
  /**
   * Initial stack state:
   *  - 'empty'  : no blocks pushed — shows the placeholder
   *  - 'ready'  : WaitingToStart block on the stack
   *  - 'active' : first exercise block active
   */
  initialState: 'empty' | 'ready' | 'active';
  /** Height of the story canvas */
  height?: string;
}

const TrackerMobileHarness: React.FC<TrackerMobileHarnessProps> = ({
  script,
  initialState,
  height = '844px',
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);

  const onStart = fn().mockName('tracker:start');
  const onPause = fn().mockName('tracker:pause');
  const onStop = fn().mockName('tracker:stop');
  const onNext = fn().mockName('tracker:next');

  useEffect(() => {
    if (initialState === 'empty') {
      setRuntime(null);
      return;
    }

    const rt = buildRuntime(script);
    rt.do(new StartSessionAction({ label: 'Story Session' }));

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
    return (
      <div style={{ height }} className="flex items-center justify-center bg-background text-muted-foreground border rounded-lg">
        <div className="text-center p-6 max-w-xs">
          <h3 className="text-base font-semibold mb-2 text-foreground">No Workout Selected</h3>
          <p className="text-sm text-muted-foreground">Select a WOD block from the planner to start tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <ScriptRuntimeProvider runtime={runtime}>
      <DebugModeProvider>
        <PanelSizeProvider>
          {/* Mobile: stack vertically — timer on top, visual state below */}
          <div style={{ height }} className="flex flex-col overflow-hidden border rounded-lg bg-background">
            {/* Top: Timer & Controls */}
            <div className="shrink-0 border-b border-border">
              <ExecutionBound
                runtime={runtime}
                onStart={onStart}
                onPause={onPause}
                onStop={onStop}
                onNext={onNext}
              />
            </div>
            {/* Bottom: Visual State (stack + lookahead) */}
            <div className="flex-1 min-h-0 bg-secondary/10 overflow-y-auto">
              <VisualStatePanel />
            </div>
          </div>
        </PanelSizeProvider>
      </DebugModeProvider>
    </ScriptRuntimeProvider>
  );
};

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
    <div className="flex justify-center p-3">
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

const meta: Meta<typeof TrackerMobileHarness> = {
  title: 'catalog/templates/Tracker/Mobile',
  component: TrackerMobileHarness,
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
          'Mobile workout tracking panel backed by a real ScriptRuntime. ' +
          'Timer controls are stacked above the visual state panel to fit a ' +
          'narrow portrait screen (< 768 px). Same runtime as the Web variant.',
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

export const NoBlock: Story = {
  name: 'No Block Selected',
  args: {
    script: '21 Thrusters\n21 Pull-ups',
    initialState: 'empty',
    height: '844px',
  },
};

export const ReadyToStart: Story = {
  name: 'Ready To Start',
  args: {
    script: '21 Thrusters\n21 Pull-ups\n15 Thrusters\n15 Pull-ups\n9 Thrusters\n9 Pull-ups',
    initialState: 'ready',
    height: '844px',
  },
};

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
    height: '844px',
  },
};

export const AmrapRunning: Story = {
  name: 'Active: AMRAP 20',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    initialState: 'active',
    height: '844px',
  },
};

export const EmomRunning: Story = {
  name: 'Active: EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    initialState: 'active',
    height: '844px',
  },
};
