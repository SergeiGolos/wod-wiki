import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { LabelAnchor } from '../../src/clock/anchors/LabelAnchor';
import { MetricAnchor } from '../../src/clock/anchors/MetricAnchor';
import { CollectionSpan, Metric } from '../../src/CollectionSpan';

const meta: Meta = {
  title: 'Clock/Compositions',
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;

const metrics: Metric[] = [
  { sourceId: 1, values: [{ type: 'reps', value: 10 }, { type: 'weight', value: 50 }] },
  { sourceId: 1, values: [{ type: 'reps', value: 12 }, { type: 'weight', value: 50 }] },
  { sourceId: 2, values: [{ type: 'reps', value: 8 }, { type: 'weight', value: 60 }] },
];

const defaultSpan: CollectionSpan = {
  blockKey: 'Jumping Jacks',
  duration: 185000, // 3 minutes 5 seconds
  timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
  metrics: metrics,
};

const StoryRenderer = (args: { span?: CollectionSpan }) => (
    <div className="flex flex-col items-center justify-center">
        <ClockAnchor span={args.span} />
        <div className="mb-12 text-center mt-8">
            <LabelAnchor span={args.span} variant="badge" template="Warm-up" />
            <LabelAnchor span={args.span} variant="title" template="{{blockKey}}" />
            <LabelAnchor span={args.span} variant="subtitle" template="30 seconds" />
        </div>
        <div className="flex gap-4">
            <MetricAnchor span={args.span} metricType="reps" aggregator="sum" />
            <MetricAnchor span={args.span} metricType="reps" aggregator="avg" />
        </div>
        <LabelAnchor span={args.span} variant="next-up" template="Next up: 30s Plank" />
    </div>
);

export const Default: StoryObj = {
  args: {
    span: defaultSpan,
  },
  render: StoryRenderer,
};

export const Empty: StoryObj = {
  args: {
    span: new CollectionSpan(),
  },
  render: StoryRenderer,
};