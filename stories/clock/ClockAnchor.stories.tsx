import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { TimerTestHarness } from './utils/TimerTestHarness';

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

export const Default: Story = {
  render: () => (
    <TimerTestHarness durationMs={185000}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const Empty: Story = {
  render: () => (
    <TimerTestHarness durationMs={0}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const OneSpanRunning: Story = {
  render: () => (
    <TimerTestHarness durationMs={50000} isRunning={true}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const LongDuration: Story = {
  render: () => (
    <TimerTestHarness 
      durationMs={2 * 86400000 + 3 * 3600000 + 45 * 60000 + 10 * 1000} // 2 days, 3 hours, 45 minutes, 10 seconds
    >
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const OneMinute: Story = {
  render: () => (
    <TimerTestHarness durationMs={60000}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const SecondsOnly: Story = {
  render: () => (
    <TimerTestHarness durationMs={45000}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const ZeroDuration: Story = {
  render: () => (
    <TimerTestHarness durationMs={0}>
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};

export const LongHours: Story = {
  render: () => (
    <TimerTestHarness 
      durationMs={1 * 86400000 + 23 * 3600000 + 59 * 60000 + 59 * 1000} // 1 day, 23 hours, 59 minutes, 59 seconds
    >
      {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
    </TimerTestHarness>
  ),
};
