import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { LabelAnchor } from '../../src/clock/anchors/LabelAnchor';
import { CollectionSpan } from '../../src/CollectionSpan';

const meta: Meta = {
  title: 'Clock/Components',
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

const StoryRenderer = (args: { span?: CollectionSpan }) => (
    <div className="flex flex-col items-center justify-center">
        <ClockAnchor span={args.span} />
        <div className="mb-12 text-center mt-8">
            <LabelAnchor span={args.span} variant="badge" template="Warm-up" />
            <LabelAnchor span={args.span} variant="title" template="{{blockKey}}" />
            <LabelAnchor span={args.span} variant="subtitle" template="30 seconds" />
        </div>
        <LabelAnchor span={args.span} variant="next-up" template="Next up: 30s Plank" />
    </div>
);

const defaultSpan: CollectionSpan = {
  blockKey: 'Jumping Jacks',
  duration: 185000, // 3 minutes 5 seconds
  timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
  metrics: [],
};

export const Default: Story = {
  args: {
    span: defaultSpan,
  },
  render: StoryRenderer,
};

export const Empty: Story = {
  args: {
    span: new CollectionSpan(),
  },
  render: StoryRenderer,
};

const oneSpanRunning: CollectionSpan = {
  blockKey: 'Running Timer',
  duration: 50000,
  timeSpans: [{ start: new Date(Date.now() - 50000) }],
  metrics: [],
};

export const OneSpanRunning: Story = {
  args: {
    span: oneSpanRunning,
  },
  render: StoryRenderer,
};

const longDurationSpan: CollectionSpan = {
  blockKey: 'Multi-day Event',
  duration: 2 * 86400000 + 3 * 3600000 + 45 * 60000 + 10 * 1000, // 2 days, 3 hours, 45 minutes, 10 seconds
  timeSpans: [{ start: new Date(Date.now() - (2 * 86400000 + 3 * 3600000 + 45 * 60000 + 10 * 1000)), stop: new Date() }],
  metrics: [],
};

export const LongDuration: Story = {
  args: {
    span: longDurationSpan,
  },
  render: StoryRenderer,
};

const oneMinuteSpan: CollectionSpan = {
    blockKey: 'One Minute Drill',
    duration: 60000,
    timeSpans: [{ start: new Date(Date.now() - 60000), stop: new Date() }],
    metrics: [],
};

export const OneMinute: Story = {
    args: {
        span: oneMinuteSpan,
    },
    render: StoryRenderer,
};

const secondsOnlySpan: CollectionSpan = {
    blockKey: 'Sprint',
    duration: 45000,
    timeSpans: [{ start: new Date(Date.now() - 45000), stop: new Date() }],
    metrics: [],
};

export const SecondsOnly: Story = {
    args: {
        span: secondsOnlySpan,
    },
    render: StoryRenderer,
};

const zeroDurationSpan: CollectionSpan = {
    blockKey: 'Zero Duration',
    duration: 0,
    timeSpans: [],
    metrics: [],
};

export const ZeroDuration: Story = {
    args: {
        span: zeroDurationSpan,
    },
    render: StoryRenderer,
};

const longHoursSpan: CollectionSpan = {
    blockKey: 'Almost Two Days',
    duration: 1 * 86400000 + 23 * 3600000 + 59 * 60000 + 59 * 1000, // 1 day, 23 hours, 59 minutes, 59 seconds
    timeSpans: [{ start: new Date(Date.now() - (1 * 86400000 + 23 * 3600000 + 59 * 60000 + 59 * 1000)), stop: new Date() }],
    metrics: [],
};

export const LongHours: Story = {
    args: {
        span: longHoursSpan,
    },
    render: StoryRenderer,
};
