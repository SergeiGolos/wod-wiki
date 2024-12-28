import type { Meta, StoryObj } from '@storybook/react';
import { WodTimer } from '../src/components/WodTimer';
import React from 'react';
import { DisplayBlock } from '../src/lib/timer.types';

const meta: Meta<typeof WodTimer> = {
  title: 'Components/WodTimer',
  component: WodTimer,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-gray-50">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WodTimer>;

const baseBlock: DisplayBlock = {
  block: { effort: "For Time" }
  timmestamps: [],
  index: 0
};

export const Idle: Story = {
  args: {
    timestamps: [],
    block: baseBlock,
  },
};

export const Running: Story = {
  args: {
    timestamps: [{
      start: new Date(Date.now()),
      stop: undefined
    }],
    block: baseBlock,
  },
};

export const StoppedSeconds: Story = {
  args: {
    timestamps: [{
      start: new Date(Date.now() - 45 * 1000),  // 45 seconds ago
      stop: new Date(Date.now())
    }],
    block: baseBlock,
  },
};

export const StoppedMinutesSeconds: Story = {
  args: {
    timestamps: [{
      start: new Date(Date.now() - 5 * 60 * 1000),  // 5 minutes ago
      stop: new Date(Date.now())
    }],
    block: baseBlock,
  },
};

export const StoppedHoursMinutesSeconds: Story = {
  args: {
    timestamps: [{
      start: new Date(Date.now() - 2 * 60 * 60 * 1000),  // 2 hours ago
      stop: new Date(Date.now())
    }],
    block: baseBlock,
  },
};

export const StoppedMultipleDays: Story = {
  args: {
    timestamps: [{
      start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),  // 5 days ago
      stop: new Date(Date.now())
    }],
    block: baseBlock,
  },
};
