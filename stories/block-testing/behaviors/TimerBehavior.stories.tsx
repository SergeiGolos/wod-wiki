import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestBench } from '../../../src/runtime-test-bench/components/BlockTestBench';
import { TestBenchProvider } from '../../../src/runtime-test-bench/context/TestBenchContext';

const meta: Meta<typeof BlockTestBench> = {
  title: 'Block Testing/Behaviors/Timer Behavior',
  component: BlockTestBench,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <TestBenchProvider>
        <Story />
      </TestBenchProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MemoryAllocation: Story = {
  args: {
    initialScript: `\`\`\`wod
5:00 For Time
  Run 400m
\`\`\``,
  },
};

export const Initialization: Story = {
  args: {
    initialScript: `\`\`\`wod
3:00 For Time
  10 Burpees
\`\`\``,
  },
};

export const PauseResume: Story = {
  args: {
    initialScript: `\`\`\`wod
10:00 AMRAP
  5 Pullups
\`\`\``,
  },
};

export const ElapsedCalculation: Story = {
  args: {
    initialScript: `\`\`\`wod
5:00 For Time
  20 Pushups
\`\`\``,
  },
};
