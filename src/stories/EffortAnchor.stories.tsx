/** @jsxImportSource react */
import type { Meta, StoryObj } from '@storybook/react';
import { EffortAnchor } from '../components/clock/EffortAnchor';
import { RuntimeSpan } from '../core/RuntimeSpan';
import { RuntimeMetric } from '../core/RuntimeMetric';

const meta: Meta<typeof EffortAnchor> = {
  title: 'Components/EffortAnchor',
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

// Helper function to create mock RuntimeSpan objects with proper metric values
const createMockRuntimeSpan = (metrics: Array<{
  effort: string;
  repetitions?: number;
  resistance?: { value: number; unit: string };
  distance?: { value: number; unit: string };
}>): RuntimeSpan => {
  const runtimeMetrics: RuntimeMetric[] = metrics.map((metric, index) => ({
    effort: metric.effort,
    sourceId: `mock-source-${index}`,
    values: [
      ...(metric.repetitions ? [{
        type: 'repetitions' as const,
        value: metric.repetitions,
        unit: ''
      }] : []),
      ...(metric.resistance ? [{
        type: 'resistance' as const,
        value: metric.resistance.value,
        unit: metric.resistance.unit
      }] : []),
      ...(metric.distance ? [{
        type: 'distance' as const,
        value: metric.distance.value,
        unit: metric.distance.unit
      }] : [])
    ]
  }));
  
  return {
    metrics: runtimeMetrics,
    timeSpans: []
  };
};

export const SimpleExercise: Story = {
  args: {
    clock: createMockRuntimeSpan([{
      effort: 'Push-ups',
      repetitions: 10,
      resistance: { value: 20, unit: 'kg' }
    }]),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const WithDistance: Story = {
  args: {
    clock: createMockRuntimeSpan([{
      effort: 'Weighted Run',
      repetitions: 5,
      resistance: { value: 25, unit: 'kg' },
      distance: { value: 400, unit: 'm' }
    }]),
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
    clock: createMockRuntimeSpan([
      {
        effort: 'Burpees',
        repetitions: 15
      },
      {
        effort: 'Pull-ups',
        repetitions: 10,
        resistance: { value: 20, unit: 'kg' }
      },
      {
        effort: 'Run',
        distance: { value: 200, unit: 'm' }
      }
    ]),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const OnlyResistance: Story = {
  args: {
    clock: createMockRuntimeSpan([{
      effort: 'Deadlift',
      resistance: { value: 100, unit: 'kg' }
    }]),
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4 bg-white rounded-lg shadow">
        <Story />
      </div>
    ),
  ],
};

export const OnlyDistance: Story = {
  args: {
    clock: createMockRuntimeSpan([{
      effort: 'Sprint',
      distance: { value: 100, unit: 'm' }
    }]),
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
