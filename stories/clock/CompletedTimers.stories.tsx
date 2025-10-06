import type { Meta, StoryObj } from '@storybook/react';
import { ClockMemoryStory } from './ClockMemoryStory';
import { validateConfig, ClockMemoryStoryConfig } from './utils/ConfigValidation';

const meta: Meta<typeof ClockMemoryStory> = {
  title: 'Clock/Completed Timers',
  component: ClockMemoryStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Completed timer stories demonstrating timer behavior after completion with stop timestamps and memory visualization.'
      }
    }
  },
  argTypes: {
    config: {
      description: 'Story configuration containing completed timer state and metadata',
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

// Short completed timer story
export const ShortCompleted: Story = {
  args: {
    config: createConfig({
      durationMs: 5000,
      isRunning: false,
      title: "Completed 5 Second Timer",
      description: "Shows a timer that completed a 5-second duration. The memory visualization displays a single completed time span with start and stop timestamps, demonstrating how brief timer sessions are recorded and visualized in the memory system."
    })
  }
};

// Medium completed timer story
export const MediumCompleted: Story = {
  args: {
    config: createConfig({
      durationMs: 180000, // 3 minutes
      isRunning: false,
      title: "Completed 3 Minute Timer",
      description: "Displays a timer that ran for exactly 3 minutes before stopping. The memory shows the complete session duration with precise timestamp tracking, illustrating how medium-length timer sessions are captured and displayed in both the clock and memory panels."
    })
  }
};

// Long completed timer story
export const LongCompleted: Story = {
  args: {
    config: createConfig({
      durationMs: 3600000, // 1 hour
      isRunning: false,
      title: "Completed 1 Hour Timer",
      description: "Demonstrates a timer that completed a full hour duration. The memory visualization shows how extended timer sessions are tracked, with the clock displaying hours, minutes, and seconds while the memory panel records the complete timestamp history for the long-running session."
    })
  }
};

// Very short completed timer story
export const VeryShortCompleted: Story = {
  args: {
    config: createConfig({
      durationMs: 1500, // 1.5 seconds
      isRunning: false,
      title: "Completed 1.5 Second Timer",
      description: "Shows an extremely short timer that completed in just 1.5 seconds. This story demonstrates how the system handles very brief timer sessions, with the memory visualization capturing precise millisecond-level timing for quick interval training or rapid timer usage scenarios."
    })
  }
};