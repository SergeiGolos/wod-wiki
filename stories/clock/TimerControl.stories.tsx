import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../src/runtime/RuntimeBlock';
import { TimerBehavior } from '../../src/runtime/behaviors/TimerBehavior';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { WodScript } from '../../src/WodScript';

const meta: Meta = {
  title: 'Clock/Timer Control',
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// Interactive timer control component
const InteractiveTimerControl: React.FC = () => {
  const runtime = useMemo(() => {
    const emptyScript = new WodScript('', []);
    const jitCompiler = new JitCompiler([]);
    return new ScriptRuntime(emptyScript, jitCompiler);
  }, []);
  const [block, setBlock] = useState<RuntimeBlock | null>(null);
  const [behavior, setBehavior] = useState<TimerBehavior | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const timerBehavior = new TimerBehavior();
    const runtimeBlock = new RuntimeBlock(runtime, [1], [timerBehavior], 'Timer');
    runtimeBlock.push();
    
    setBlock(runtimeBlock);
    setBehavior(timerBehavior);
    setIsRunning(true);

    return () => {
      runtimeBlock.dispose();
    };
  }, [runtime]);

  const handlePause = () => {
    if (behavior) {
      behavior.pause();
      setIsRunning(false);
    }
  };

  const handleResume = () => {
    if (behavior) {
      behavior.resume();
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    if (block) {
      block.dispose();
      
      const timerBehavior = new TimerBehavior();
      const runtimeBlock = new RuntimeBlock(runtime, [1], [timerBehavior], 'Timer');
      runtimeBlock.push();
      
      setBlock(runtimeBlock);
      setBehavior(timerBehavior);
      setIsRunning(true);
    }
  };

  if (!block) {
    return <div>Loading...</div>;
  }

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="flex flex-col items-center gap-6">
        <ClockAnchor blockKey={block.key.toString()} />
        
        <div className="flex gap-4">
          {isRunning ? (
            <button
              onClick={handlePause}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Resume
            </button>
          )}
          
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Status: {isRunning ? 'Running' : 'Paused'}
        </div>
      </div>
    </RuntimeProvider>
  );
};

export const PauseResumeControl: Story = {
  render: () => <InteractiveTimerControl />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive timer control demonstrating pause/resume functionality with subscription-based updates.',
      },
    },
  },
};

// Pre-configured pause/resume demo
const PauseResumeDemo: React.FC = () => {
  const runtime = useMemo(() => {
    const emptyScript = new WodScript('', []);
    const jitCompiler = new JitCompiler([]);
    return new ScriptRuntime(emptyScript, jitCompiler);
  }, []);
  const block = useMemo(() => {
    const behavior = new TimerBehavior();
    return new RuntimeBlock(runtime, [1], [behavior], 'Timer');
  }, [runtime]);
  const behavior = useMemo(() => block.getBehavior(TimerBehavior), [block]);

  useEffect(() => {
    block.push();

    // Simulate a pause/resume cycle after 2 seconds
    const timer1 = setTimeout(() => {
      behavior?.pause();
    }, 2000);

    const timer2 = setTimeout(() => {
      behavior?.resume();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      block.dispose();
    };
  }, [block, behavior]);

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="flex flex-col items-center gap-6">
        <ClockAnchor blockKey={block.key.toString()} />
        <div className="text-sm text-gray-600">
          Timer will pause at 2s and resume at 4s
        </div>
      </div>
    </RuntimeProvider>
  );
};

export const AutoPauseResume: Story = {
  render: () => <PauseResumeDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Automatic pause/resume demonstration showing multiple time spans.',
      },
    },
  },
};

// Long-running timer
const LongRunningTimer: React.FC = () => {
  const runtime = useMemo(() => {
    const emptyScript = new WodScript('', []);
    const jitCompiler = new JitCompiler([]);
    return new ScriptRuntime(emptyScript, jitCompiler);
  }, []);
  const block = useMemo(() => {
    const behavior = new TimerBehavior();
    return new RuntimeBlock(runtime, [1], [behavior], 'Timer');
  }, [runtime]);

  useEffect(() => {
    block.push();

    return () => {
      block.dispose();
    };
  }, [block]);

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="flex flex-col items-center gap-6">
        <ClockAnchor blockKey={block.key.toString()} />
        <div className="text-sm text-gray-600">
          Long-running timer with live updates
        </div>
      </div>
    </RuntimeProvider>
  );
};

export const LiveTimer: Story = {
  render: () => <LongRunningTimer />,
  parameters: {
    docs: {
      description: {
        story: 'Live timer showing real-time updates via subscription system (no polling when stopped).',
      },
    },
  },
};
