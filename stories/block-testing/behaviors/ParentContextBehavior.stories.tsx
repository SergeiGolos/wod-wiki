import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestBench } from '../../../src/runtime-test-bench/components/BlockTestBench';
import { TestBenchProvider } from '../../../src/runtime-test-bench/context/TestBenchContext';

const meta: Meta<typeof BlockTestBench> = {
  title: 'Block Testing/Behaviors/Parent Context',
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

export const NestedRounds: Story = {
  args: {
    initialScript: `\`\`\`wod
3 Rounds
  2 Rounds
    5 Pushups
\`\`\``,
  },
};

export const TimerWithChild: Story = {
  args: {
    initialScript: `\`\`\`wod
5:00 For Time
  10 Burpees
  Run 200m
\`\`\``,
  },
};

export const DeepNesting: Story = {
  args: {
    initialScript: `\`\`\`wod
  3 Rounds
    2 Rounds
      5 Squats
\`\`\``,
  },
};

export const AMRAPContext: Story = {
  args: {
    initialScript: `\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
\`\`\``,
  },
};
