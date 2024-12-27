import type { Meta, StoryObj } from '@storybook/react';
import { WodTimer } from '../src/components/WodTimer';
import React from 'react';

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

export const Idle: Story = {
  args: {
    time: '00:00:00',
    status: 'idle',
  },
};

export const Running: Story = {
  args: {
    time: '01:30:45',
    status: 'running',
  },
};

export const Paused: Story = {
  args: {
    time: '00:45:30',
    status: 'paused',
  },
};
