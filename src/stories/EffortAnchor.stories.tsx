/** @jsxImportSource react */
import type { Meta, StoryObj } from '@storybook/react';
import { EffortAnchor } from '../components/clock/EffortAnchor';
import { RuntimeSpan } from '../core/RuntimeSpan';
import { RuntimeMetric } from '../core/RuntimeMetric';

const meta: Meta<typeof EffortAnchor> = {
  title: 'Clock/EffortAnchor',
  component: EffortAnchor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    clock: {
      control: 'object',
      description: 'RuntimeSpan object containing effort information',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create mock RuntimeSpan objects
const createMockRuntimeSpan = (effort: string): RuntimeSpan => {
  const metric: RuntimeMetric = {
    effort,
    values: [],
    sourceId: 'mock-source'
  };
  
  return {
    metrics: [metric],
    timeSpans: []
  };
};

export const SimpleExercise: Story = {
  args: {
    clock: createMockRuntimeSpan('Push-ups (10reps, 20kg)'),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const MultipleModifiers: Story = {
  args: {
    clock: createMockRuntimeSpan('Weighted Run (5reps, 25kg, 400m)'),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const MultipleExercises: Story = {
  args: {
    clock: createMockRuntimeSpan('AMRAP\nBurpees (15reps)\nPull-ups (10reps, 20kg)\nRun (200m)'),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const NoEffortData: Story = {
  args: {
    clock: undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};
