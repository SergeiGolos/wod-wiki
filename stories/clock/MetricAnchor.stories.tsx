import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricAnchor } from '../../src/clock/anchors/MetricAnchor';
import { CollectionSpan, Metric } from '../../src/CollectionSpan';

const meta: Meta<typeof MetricAnchor> = {
  title: 'Clock/Anchors/MetricAnchor',
  component: MetricAnchor,
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MetricAnchor>;

const metrics: Metric[] = [
  { sourceId: 1, values: [{ type: 'reps', value: 10 }, { type: 'weight', value: 50 }] },
  { sourceId: 1, values: [{ type: 'reps', value: 12 }, { type: 'weight', value: 50 }] },
  { sourceId: 2, values: [{ type: 'reps', value: 8 }, { type: 'weight', value: 60 }] },
];

const defaultSpan: CollectionSpan = {
  blockKey: 'Push-ups',
  duration: 0,
  timeSpans: [],
  metrics: metrics,
};

export const Sum: Story = {
  args: {
    span: defaultSpan,
    metricType: 'reps',
    aggregator: 'sum',
  },
};

export const Average: Story = {
  args: {
    span: defaultSpan,
    metricType: 'reps',
    aggregator: 'avg',
  },
};

export const Min: Story = {
  args: {
    span: defaultSpan,
    metricType: 'reps',
    aggregator: 'min',
  },
};

export const Max: Story = {
  args: {
    span: defaultSpan,
    metricType: 'reps',
    aggregator: 'max',
  },
};

export const Count: Story = {
  args: {
    span: defaultSpan,
    metricType: 'reps',
    aggregator: 'count',
  },
};

export const FilteredBySource: Story = {
  args: {
    span: defaultSpan,
    sourceId: 1,
    metricType: 'reps',
    aggregator: 'sum',
  },
};

export const Empty: Story = {
  args: {
    span: new CollectionSpan(),
  },
};
