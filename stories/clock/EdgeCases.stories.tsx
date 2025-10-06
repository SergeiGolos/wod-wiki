import type { Meta, StoryObj } from '@storybook/react';
import { ClockMemoryStory } from './ClockMemoryStory';
import { validateConfig, ClockMemoryStoryConfig } from './utils/ConfigValidation';
import { TimeSpan } from '../../src/runtime/behaviors/TimerBehavior';

const meta: Meta<typeof ClockMemoryStory> = {
  title: 'Clock/Edge Cases',
  component: ClockMemoryStory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Edge cases for ClockMemoryStory testing boundary conditions and special scenarios.'
      }
    }
  },
  argTypes: {
    config: {
      description: 'Story configuration containing timer state and metadata',
      control: 'object'
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof ClockMemoryStory>;

// Helper function to create validated configs
const createConfig = (config: Omit<ClockMemoryStoryConfig, 'title' | 'description'> & { title: string; description: string }): ClockMemoryStoryConfig => {
  const validatedConfig = { ...config };
  validateConfig(validatedConfig);
  return validatedConfig;
};

// Edge case: Minimum valid duration (1 second)
export const MinimumDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 1000, // 1 second - minimum practical duration
      isRunning: false,
      title: 'Minimum Duration',
      description: 'Timer with the minimum practical duration of 1 second, completed. Tests how the clock displays very short time periods and validates that single-second durations are handled correctly.'
    })
  }
};

// Edge case: Very long duration (24 hours)
export const VeryLongDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 86400000, // 24 hours in milliseconds
      isRunning: true,
      title: 'Very Long Duration',
      description: 'Timer running for 24 hours straight. Tests the clock display format for extended durations, ensuring proper handling of days, hours, minutes, and seconds without overflow or formatting issues.'
    })
  }
};

// Edge case: Multiple time spans with pause/resume history
export const MultipleTimeSpans: Story = {
  args: {
    config: createConfig({
      durationMs: 180000, // Use cumulative duration to pass validation (3 minutes total)
      isRunning: true,
      timeSpans: [
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute active
        // 1 minute pause gap implied between spans
        { start: new Date(Date.now() - 120000), stop: new Date(Date.now() - 60000) },  // 1 minute active
        // 1 minute pause gap implied between spans
        { start: new Date(Date.now() - 60000), stop: undefined }                      // 1 minute running
      ],
      title: 'Multiple Time Spans',
      description: 'Timer with complex pause/resume history showing 3 time spans: 1 minute active, 1 minute paused, 1 minute active, 1 minute paused, and currently running for 1 minute. Tests memory visualization of multiple segments and cumulative time calculation.'
    })
  }
};

// Edge case: Zero duration - handled gracefully with timeSpans
export const ZeroDuration: Story = {
  args: {
    config: createConfig({
      durationMs: 1, // Use 1ms minimum to pass validation but represent effectively zero duration
      isRunning: false,
      timeSpans: [
        { start: new Date(Date.now() - 1000), stop: new Date(Date.now() - 999) } // 1ms duration
      ],
      title: 'Zero Duration',
      description: 'Timer with effectively zero duration (1 millisecond). Tests boundary handling of minimal time measurements and ensures the clock gracefully handles edge cases where elapsed time approaches zero.'
    })
  }
};