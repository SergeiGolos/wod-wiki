import React, { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../src/runtime/RuntimeBlock';
import { TimerBehavior, TIMER_MEMORY_TYPES } from '../../src/runtime/behaviors/TimerBehavior';
import { TypedMemoryReference } from '../../src/runtime/IMemoryReference';

const meta: Meta<typeof ClockAnchor> = {
  title: 'Clock/Clock Anchor',
  component: ClockAnchor,
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ClockAnchor>;

// Helper component to create runtime and timer block
const ClockAnchorWithRuntime: React.FC<{
  durationMs: number;
  isRunning?: boolean;
}> = ({ durationMs, isRunning = false }) => {
  const runtime = useMemo(() => new ScriptRuntime(), []);
  const block = useMemo(() => {
    const behavior = new TimerBehavior();
    return new RuntimeBlock(runtime, [1], [behavior], 'Timer');
  }, [runtime]);

  useEffect(() => {
    // Push the block to initialize timer
    block.push();

    // Set up the time spans to match the desired duration
    const timeSpansRefs = runtime.memory.search({
      id: null,
      ownerId: block.key.toString(),
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null
    });

    const isRunningRefs = runtime.memory.search({
      id: null,
      ownerId: block.key.toString(),
      type: TIMER_MEMORY_TYPES.IS_RUNNING,
      visibility: null
    });

    if (timeSpansRefs.length > 0 && isRunningRefs.length > 0) {
      const timeSpansRef = timeSpansRefs[0] as TypedMemoryReference<any>;
      const isRunningRef = isRunningRefs[0] as TypedMemoryReference<boolean>;

      if (isRunning) {
        // Set up running timer
        timeSpansRef.set([{
          start: new Date(Date.now() - durationMs),
          stop: undefined
        }]);
        isRunningRef.set(true);
      } else {
        // Set up completed timer
        timeSpansRef.set([{
          start: new Date(Date.now() - durationMs),
          stop: new Date()
        }]);
        isRunningRef.set(false);
      }
    }

    return () => {
      block.dispose();
    };
  }, [runtime, block, durationMs, isRunning]);

  return (
    <RuntimeProvider runtime={runtime}>
      <ClockAnchor blockKey={block.key.toString()} />
    </RuntimeProvider>
  );
};

export const Default: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={185000} />, // 3 minutes 5 seconds
};

export const Empty: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={0} />,
};

export const OneSpanRunning: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={50000} isRunning={true} />,
};

export const LongDuration: Story = {
  render: () => (
    <ClockAnchorWithRuntime 
      durationMs={2 * 86400000 + 3 * 3600000 + 45 * 60000 + 10 * 1000} // 2 days, 3 hours, 45 minutes, 10 seconds
    />
  ),
};

export const OneMinute: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={60000} />,
};

export const SecondsOnly: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={45000} />,
};

export const ZeroDuration: Story = {
  render: () => <ClockAnchorWithRuntime durationMs={0} />,
};

export const LongHours: Story = {
  render: () => (
    <ClockAnchorWithRuntime 
      durationMs={1 * 86400000 + 23 * 3600000 + 59 * 60000 + 59 * 1000} // 1 day, 23 hours, 59 minutes, 59 seconds
    />
  ),
};
