import type { Meta, StoryObj } from '@storybook/react';
import { ClockMemoryStory } from './ClockMemoryStory';
import { validateConfig, ClockMemoryStoryConfig } from './utils/ConfigValidation';

const meta: Meta<typeof ClockMemoryStory> = {
  title: 'Clock/Running Timers',
  component: ClockMemoryStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Running timers showcase active timer states with memory visualization. Each story demonstrates a timer that is currently running with different durations, showing how the clock display and memory visualization work together to represent the current state and time elapsed.'
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

// Short Duration Timer (5 seconds)
export const ShortDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 5000,
      isRunning: true,
      title: "Timer Running for 5 Seconds",
      description: "Shows a timer that has been actively running for 5 seconds. The memory visualization displays a single time span with a start timestamp and no stop timestamp, indicating the timer is still in progress. The clock shows 00:05 elapsed time with seconds precision."
    })
  }
};

// Medium Duration Timer (3 minutes)
export const MediumDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 180000,
      isRunning: true,
      title: "Timer Running for 3 Minutes",
      description: "Displays a timer that has been running for exactly 3 minutes. The clock shows 03:00 elapsed time with minute and second precision. The memory visualization shows an active time span spanning 3 minutes, demonstrating how longer durations are represented in both the clock display and memory visualization."
    })
  }
};

// Long Duration Timer (15 minutes)
export const LongDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 900000,
      isRunning: true,
      title: "Timer Running for 15 Minutes",
      description: "Demonstrates a timer that has been actively running for 15 minutes. The clock displays 15:00 elapsed time, showing how the system handles longer duration timers. The memory visualization shows a substantial time span, illustrating the clear connection between the visual clock display and the underlying memory representation of elapsed time."
    })
  }
};

// Very Short Duration Timer (10 seconds)
export const VeryShortDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 10000,
      isRunning: true,
      title: "Timer Running for 10 Seconds",
      description: "Shows a timer that has been running for 10 seconds, demonstrating how the system handles brief time intervals. The clock displays 00:10 elapsed time with second-level precision. The memory visualization shows a short but complete time span, perfect for testing scenarios involving quick timer operations and immediate visual feedback."
    })
  }
};