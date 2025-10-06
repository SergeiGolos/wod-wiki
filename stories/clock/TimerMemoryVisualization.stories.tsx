import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimerMemoryVisualization } from '../../src/clock/TimerMemoryVisualization';
import { TypedMemoryReference } from '../../src/runtime/IMemoryReference';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

// Mock memory reference for testing
class MockMemoryReference<T> implements TypedMemoryReference<T> {
  private _value: T;
  private _subscribers: Array<(value: T) => void> = [];

  constructor(value: T) {
    this._value = value;
  }

  get(): T {
    return this._value;
  }

  set(value: T): void {
    this._value = value;
    this._subscribers.forEach(callback => callback(value));
  }

  subscribe(callback: (value: T) => void): () => void {
    this._subscribers.push(callback);
    return () => {
      const index = this._subscribers.indexOf(callback);
      if (index > -1) {
        this._subscribers.splice(index, 1);
      }
    };
  }

  readonly type: string = 'mock-type';
  readonly id: string = 'mock-id';
  readonly ownerId: string = 'mock-owner';
  readonly visibility: 'public' | 'private' = 'public';
}

const meta: Meta<typeof TimerMemoryVisualization> = {
  title: 'Clock/TimerMemoryVisualization',
  component: TimerMemoryVisualization,
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: `
TimerMemoryVisualization displays timer memory allocations in a structured format.

Features:
- Displays time spans array with start/stop timestamps
- Shows running state with visual indicator (green=running, gray=stopped)
- Shows block key in monospace font
- Supports hover interactions with callbacks
- Highlights when isHighlighted=true
- Handles missing memory gracefully
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TimerMemoryVisualization>;

// Mock data for testing
const completedTimeSpans: TimeSpan[] = [
  {
    start: new Date(Date.now() - 185000),
    stop: new Date()
  }
];

const runningTimeSpans: TimeSpan[] = [
  {
    start: new Date(Date.now() - 120000),
    stop: undefined
  }
];

const multipleTimeSpans: TimeSpan[] = [
  {
    start: new Date(Date.now() - 300000),
    stop: new Date(Date.now() - 240000)
  },
  {
    start: new Date(Date.now() - 180000),
    stop: new Date(Date.now() - 60000)
  },
  {
    start: new Date(Date.now() - 30000),
    stop: undefined
  }
];

export const CompletedTimer: Story = {
  render: () => {
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(completedTimeSpans);
    const isRunningRef = new MockMemoryReference<boolean>(false);
    const blockKey = 'block-timer-001';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef}
        isRunningRef={isRunningRef}
        blockKey={blockKey}
      />
    );
  },
  name: 'Completed Timer',
  parameters: {
    docs: {
      storyDescription: 'Shows a completed timer with finished time span.'
    }
  }
};

export const RunningTimer: Story = {
  render: () => {
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(runningTimeSpans);
    const isRunningRef = new MockMemoryReference<boolean>(true);
    const blockKey = 'block-timer-002';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef}
        isRunningRef={isRunningRef}
        blockKey={blockKey}
      />
    );
  },
  name: 'Running Timer',
  parameters: {
    docs: {
      storyDescription: 'Shows a running timer with active time span.'
    }
  }
};

export const MultipleSpans: Story = {
  render: () => {
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(multipleTimeSpans);
    const isRunningRef = new MockMemoryReference<boolean>(true);
    const blockKey = 'block-timer-003';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef}
        isRunningRef={isRunningRef}
        blockKey={blockKey}
      />
    );
  },
  name: 'Multiple Time Spans',
  parameters: {
    docs: {
      storyDescription: 'Shows timer with multiple spans (pause/resume pattern).'
    }
  }
};

export const WithHoverCallback: Story = {
  render: () => {
    const [hovered, setHovered] = React.useState(false);
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(completedTimeSpans);
    const isRunningRef = new MockMemoryReference<boolean>(false);
    const blockKey = 'block-timer-004';

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Hover state: {hovered ? 'HOVERED' : 'NOT HOVERED'}
        </div>
        <TimerMemoryVisualization
          timeSpansRef={timeSpansRef}
          isRunningRef={isRunningRef}
          blockKey={blockKey}
          onMemoryHover={setHovered}
        />
      </div>
    );
  },
  name: 'With Hover Callback',
  parameters: {
    docs: {
      storyDescription: 'Demonstrates hover callback functionality.'
    }
  }
};

export const WithHighlight: Story = {
  render: () => {
    const [highlighted, setHighlighted] = React.useState(false);
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(runningTimeSpans);
    const isRunningRef = new MockMemoryReference<boolean>(true);
    const blockKey = 'block-timer-005';

    return (
      <div className="space-y-4">
        <button
          onClick={() => setHighlighted(!highlighted)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Highlight
        </button>
        <TimerMemoryVisualization
          timeSpansRef={timeSpansRef}
          isRunningRef={isRunningRef}
          blockKey={blockKey}
          isHighlighted={highlighted}
        />
      </div>
    );
  },
  name: 'With Highlight',
  parameters: {
    docs: {
      storyDescription: 'Shows highlight state when isHighlighted=true.'
    }
  }
};

export const EmptyTimeSpans: Story = {
  render: () => {
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>([]);
    const isRunningRef = new MockMemoryReference<boolean>(false);
    const blockKey = 'block-timer-006';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef}
        isRunningRef={isRunningRef}
        blockKey={blockKey}
      />
    );
  },
  name: 'Empty Time Spans',
  parameters: {
    docs: {
      storyDescription: 'Shows component with no time spans recorded.'
    }
  }
};

export const MissingMemory: Story = {
  render: () => {
    const timeSpansRef = new MockMemoryReference<TimeSpan[] | undefined>(undefined);
    const isRunningRef = new MockMemoryReference<boolean | undefined>(undefined);
    const blockKey = 'block-timer-007';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef as any}
        isRunningRef={isRunningRef as any}
        blockKey={blockKey}
      />
    );
  },
  name: 'Missing Memory',
  parameters: {
    docs: {
      storyDescription: 'Shows graceful handling of missing memory.'
    }
  }
};

export const LongDurationTimer: Story = {
  render: () => {
    const longDurationSpans: TimeSpan[] = [
      {
        start: new Date(Date.now() - (2 * 86400000 + 3 * 3600000 + 45 * 60000 + 10 * 1000)),
        stop: new Date()
      }
    ];
    const timeSpansRef = new MockMemoryReference<TimeSpan[]>(longDurationSpans);
    const isRunningRef = new MockMemoryReference<boolean>(false);
    const blockKey = 'block-timer-008';

    return (
      <TimerMemoryVisualization
        timeSpansRef={timeSpansRef}
        isRunningRef={isRunningRef}
        blockKey={blockKey}
      />
    );
  },
  name: 'Long Duration Timer',
  parameters: {
    docs: {
      storyDescription: 'Shows timer with duration spanning multiple days.'
    }
  }
};