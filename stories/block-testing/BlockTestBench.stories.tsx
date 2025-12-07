import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestBench } from '../../src/runtime-test-bench/components/BlockTestBench';
import { TestBenchProvider } from '../../src/runtime-test-bench/context/TestBenchContext';

const meta: Meta<typeof BlockTestBench> = {
  title: 'Block Testing/Block Test Bench',
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

export const LoopingBasics: Story = {
  args: {
    initialScript: `3 Rounds:
  5 Pushups
  10 Situps`,
  },
};

export const Grouping: Story = {
  args: {
    initialScript: `For Time: {
  Run 400m
  10 Pullups
}`,
  },
};

export const Inheritance: Story = {
  args: {
    initialScript: `3 Rounds:
  10 Pushups
  Rest 1:00`,
  },
};

export const ComplexAMRAP: Story = {
  args: {
    initialScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups
  15 Squats`,
  },
};
