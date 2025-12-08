import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestBench } from '../../../src/runtime-test-bench/components/BlockTestBench';
import { TestBenchProvider } from '../../../src/runtime-test-bench/context/TestBenchContext';

const meta: Meta<typeof BlockTestBench> = {
  title: 'Block Testing/Behaviors/Sound Behavior',
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

export const MemoryInit: Story = {
  args: {
    initialScript: `\`\`\`wod
3:00 For Time
  Run 400m
\`\`\``,
  },
};

export const CountUpTrigger: Story = {
  args: {
    initialScript: `\`\`\`wod
  100 Burpees
\`\`\``,
  },
};

export const CountdownTrigger: Story = {
  args: {
    initialScript: `\`\`\`wod
3:00 For Time
  20 Pushups
\`\`\``,
  },
};

export const MultipleCues: Story = {
  args: {
    initialScript: `\`\`\`wod
5:00 AMRAP
  10 Air Squats
\`\`\``,
  },
};
