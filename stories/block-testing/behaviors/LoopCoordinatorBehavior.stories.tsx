import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestBench } from '../../../src/runtime-test-bench/components/BlockTestBench';
import { TestBenchProvider } from '../../../src/runtime-test-bench/context/TestBenchContext';

const meta: Meta<typeof BlockTestBench> = {
  title: 'Block Testing/Behaviors/Loop Coordinator',
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

export const FixedRounds: Story = {
  args: {
    initialScript: `\`\`\`wod
3 Rounds
  10 Pushups
  15 Squats
\`\`\``,
  },
};

export const RepScheme: Story = {
  args: {
    initialScript: `\`\`\`wod
21-15-9
  Thrusters
  Pullups
\`\`\``,
  },
};

export const TimeBoundAMRAP: Story = {
  args: {
    initialScript: `\`\`\`wod
15:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats
\`\`\``,
  },
};

export const IntervalEMOM: Story = {
  args: {
    initialScript: `\`\`\`wod
EMOM 10
  5 Power Cleans
\`\`\``,
  },
};

export const SingleChildGroup: Story = {
  args: {
    initialScript: `\`\`\`wod
5 Rounds
  10 Burpees
\`\`\``,
  },
};

export const ThreeChildGroups: Story = {
  args: {
    initialScript: `\`\`\`wod
2 Rounds
  Run 200m
  20 Pushups
  10 Pullups
\`\`\``,
  },
};

export const CompletionDetection: Story = {
  args: {
    initialScript: `\`\`\`wod
2 Rounds
  5 Squats
\`\`\``,
  },
};
