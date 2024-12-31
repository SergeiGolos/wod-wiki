import type { Meta, StoryObj } from '@storybook/react';
import { WodTimer } from '../src/components/timer/WodTimer';
import React from 'react';
import { DisplayBlock, EffortFragment, StatementFragment, StatementBlock, Timestamp } from '../src/lib/timer.types';

const meta: Meta<typeof WodTimer> = {
  title: 'Components/Timer',
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
  ]
};

export default meta;
type Story = StoryObj<typeof WodTimer>;

const baseBlock: DisplayBlock = {
  block: {
    fragments: [
      { type: "effort", effort: "For Time", } as EffortFragment,
      { 
        type: "increment", 
        increment: -1,
        meta: { 
          line: 0, 
          startOffset: 0, 
          endOffset: 0, 
          columnStart: 0, 
          columnEnd: 0, 
          length: 0 
        },
        toPart: () => `increment ${-1}`
      } as StatementFragment
    ], id: -1, parents: [], children: [], type: "block", meta: { line: 0, startOffset: 0, endOffset: 0, columnStart: 0, columnEnd: 0, length: 0 }
  },
  timestamps: [] as Timestamp[],
  id: 0,
  depth: 0,
  duration: 0,
  round: 0,
  increment: -1,
  getFragment: function <T extends StatementFragment>(type: string, block?: StatementBlock): T | undefined {
    return (block || this.block)?.fragments?.find((fragment: StatementFragment) =>
        fragment.type === type
    ) as T;
  },
  getParts: function (filter?: string[]): string[] {
    throw new Error('Function not implemented.');
  },
  startRound: function (): void {
    throw new Error('Function not implemented.');
  }
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
