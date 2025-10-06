import type { Meta, StoryObj } from '@storybook/react';
import { ClockMemoryStory } from './ClockMemoryStory';
import { validateConfig, ClockMemoryStoryConfig } from './utils/ConfigValidation';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

const meta: Meta<typeof ClockMemoryStory> = {
  title: 'Clock/ClockMemoryStory',
  component: ClockMemoryStory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ClockMemoryStory combines clock display and memory visualization in split-panel layout with hover highlighting.'
      }
    }
  },
  argTypes: {
    config: {
      description: 'Story configuration containing timer state and metadata',
      control: 'object'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ClockMemoryStory>;

// Helper function to create validated configs
const createConfig = (config: Omit<ClockMemoryStoryConfig, 'title' | 'description'> & { title: string; description: string }): ClockMemoryStoryConfig => {
  const validatedConfig = { ...config };
  validateConfig(validatedConfig);
  return validatedConfig;
};

// Basic story with completed timer
export const CompletedTimer: Story = {
  args: {
    config: createConfig({
      durationMs: 185000, // 3 minutes 5 seconds
      isRunning: false,
      title: 'Completed Timer',
      description: 'A timer that has completed running after 3 minutes and 5 seconds. The memory shows one completed time span with start and stop timestamps.'
    })
  }
};

// Running timer story
export const RunningTimer: Story = {
  args: {
    config: createConfig({
      durationMs: 120000, // 2 minutes
      isRunning: true,
      title: 'Running Timer',
      description: 'A timer currently running for 2 minutes. The memory shows an active time span with no stop timestamp, and the running state is true.'
    })
  }
};

// Complex timer with pause/resume history
export const PausedTimer: Story = {
  args: {
    config: createConfig({
      durationMs: 0, // Not used when timeSpans provided
      isRunning: true,
      timeSpans: [
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute active
        { start: new Date(Date.now() - 60000), stop: undefined } // 1 minute current running
      ],
      title: 'Timer with Pause History',
      description: 'A timer with pause/resume history showing multiple time spans. Currently running after a 1-minute pause.'
    })
  }
};

// Short timer story
export const ShortTimer: Story = {
  args: {
    config: createConfig({
      durationMs: 45000, // 45 seconds
      isRunning: false,
      title: 'Short Timer',
      description: 'A short timer that ran for 45 seconds. Demonstrates display of brief time periods.'
    })
  }
};

// Long duration timer story
export const LongTimer: Story = {
  args: {
    config: createConfig({
      durationMs: 3665000, // 1 hour, 1 minute, 5 seconds
      isRunning: false,
      title: 'Long Duration Timer',
      description: 'A timer that ran for over an hour, showing how the clock displays multiple time units (days, hours, minutes, seconds).'
    })
  }
};

// Multiple segments story
export const MultipleSegments: Story = {
  args: {
    config: createConfig({
      durationMs: 0,
      isRunning: false,
      timeSpans: [
        { start: new Date(Date.now() - 300000), stop: new Date(Date.now() - 240000) }, // 1 minute
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute
        { start: new Date(Date.now() - 60000), stop: new Date(Date.now() - 30000) } // 30 seconds
      ],
      title: 'Multiple Time Segments',
      description: 'A timer with multiple completed segments, showing complex pause/resume patterns with 3 separate time spans.'
    })
  }
};