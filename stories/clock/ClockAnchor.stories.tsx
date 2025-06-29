import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { CollectionSpan } from '../../src/CollectionSpan';

const meta: Meta<typeof ClockAnchor> = {
  title: 'Clock/Clock Anchor',
  component: ClockAnchor,
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
};

export const Empty: Story = {
  args: {
    span: new CollectionSpan(),
  },
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
};
