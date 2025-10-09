import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedClockStory } from './UnifiedClockStory';

const meta: Meta<typeof UnifiedClockStory> = {
  title: 'Clock/Countdown Timers',
  component: UnifiedClockStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Countdown timer stories demonstrate timers that count down from a specified duration. Each story shows the clock display, memory visualization with start/stop pairs, and interactive timer controls. The memory card includes a recalculate elapsed time feature and displays all time spans in a table format.'
      }
    }
  },
  argTypes: {
    config: {
      description: 'Story configuration containing countdown timer state and metadata',
      control: 'object'
    }
  }
};

export default meta;
type Story = StoryObj<typeof UnifiedClockStory>;

// === RUNNING EXAMPLES ===

// Short Running Countdown (30 seconds)
export const ShortRunning: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 30000,
      autoStart: true,
      title: "Running 30-Second Countdown",
      description: "A countdown timer currently running with 30 seconds duration. The timer counts down from -00:30 showing elapsed time. The memory card displays the current running time span with no stop timestamp, and the timer controls allow you to pause, stop, or reset the countdown."
    }
  }
};

// Medium Running Countdown (5 minutes)
export const MediumRunning: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 300000,
      autoStart: true,
      title: "Running 5-Minute Countdown",
      description: "Countdown timer actively running for 5 minutes total duration. The clock displays elapsed time as -05:00, counting up from negative as time progresses. Use the timer controls to pause the countdown or stop it completely. The memory card shows the active time span with precise start timestamp."
    }
  }
};

// Long Running Countdown (1 hour)
export const LongRunning: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 3600000,
      autoStart: true,
      title: "Running 1-Hour Countdown",
      description: "Extended countdown timer running for a full hour duration. The clock displays -01:00:00 format showing hours, minutes, and seconds of elapsed countdown time. This demonstrates how the system handles longer countdown periods with proper time formatting and memory tracking."
    }
  }
};

// === STOPPED EXAMPLES ===

// Short Stopped Countdown (15 seconds)
export const ShortStopped: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 15000,
      autoStart: false,
      title: "Stopped 15-Second Countdown",
      description: "Countdown timer that was configured for 15 seconds but is currently stopped. The clock shows -00:15 as the total duration with no active counting. The memory card displays a completed time span showing both start and stop timestamps, and the timer controls allow you to start the countdown."
    }
  }
};

// Medium Stopped Countdown (2 minutes)
export const MediumStopped: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 120000,
      autoStart: false,
      title: "Stopped 2-Minute Countdown",
      description: "A countdown timer set for 2 minutes duration that is currently in stopped state. The clock displays -02:00 showing the configured countdown duration. The memory visualization shows the timer is ready to start with no active time spans, demonstrating the initial state before countdown begins."
    }
  }
};

// === EDGE CASES ===

// Minimum Duration Countdown (1 second)
export const MinimumDuration: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 1000,
      autoStart: true,
      title: "Minimum 1-Second Countdown",
      description: "Countdown timer with the minimum practical duration of 1 second. This edge case tests how the system handles very short countdown periods with proper millisecond precision. The clock displays -00:01 and the memory card tracks the brief time span accurately."
    }
  }
};

// Very Long Countdown (24 hours)
export const VeryLongDuration: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 86400000, // 24 hours
      autoStart: false,
      title: "24-Hour Countdown Timer",
      description: "Extended countdown timer configured for 24 hours duration. This tests the system's ability to handle very long countdown periods without overflow or formatting issues. The clock display properly shows hours, and the memory card can track extended time spans across multiple time periods."
    }
  }
};

// Countdown with Pause History
export const WithPauseHistory: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 180000, // 3 minutes total
      autoStart: true,
      timeSpans: [
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute active
        { start: new Date(Date.now() - 60000), stop: undefined }                     // 1 minute running
      ],
      title: "Countdown with Pause History",
      description: "Countdown timer that was paused and resumed, showing multiple time spans. The memory card displays both the completed 1-minute span and the current running span, demonstrating how pause/resume functionality is tracked. The clock shows cumulative elapsed time across all active periods."
    }
  }
};

// Zero Duration Edge Case
export const ZeroDuration: Story = {
  args: {
    config: {
      timerType: 'countdown',
      durationMs: 100, // Near-zero duration
      autoStart: false,
      title: "Zero Duration Countdown",
      description: "Countdown timer with effectively zero duration (100ms). This edge case tests boundary handling of minimal countdown measurements and ensures the system gracefully handles scenarios where the configured duration approaches zero. The clock shows minimal time and memory tracking handles the edge case properly."
    }
  }
};