import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedClockStory } from './UnifiedClockStory';

const meta: Meta<typeof UnifiedClockStory> = {
  title: 'Clock/Count Up Timers',
  component: UnifiedClockStory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Count up timer stories demonstrate timers that count elapsed time from zero. Each story shows the clock display with positive elapsed time, memory visualization with start/stop pairs, and interactive timer controls. The memory card includes a recalculate elapsed time feature and displays all time spans in a table format.'
      }
    }
  },
  argTypes: {
    config: {
      description: 'Story configuration containing count up timer state and metadata',
      control: 'object'
    }
  }
};

export default meta;
type Story = StoryObj<typeof UnifiedClockStory>;

// === RUNNING EXAMPLES ===

// Short Running Count Up (30 seconds)
export const ShortRunning: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 30000,
      autoStart: true,
      title: "Running 30-Second Count Up",
      description: "A count up timer currently running with 30 seconds of elapsed time. The timer counts up from zero showing 00:30 elapsed time. The memory card displays the current running time span with no stop timestamp, and the timer controls allow you to pause, stop, or reset the count up timer."
    }
  }
};

// Medium Running Count Up (5 minutes)
export const MediumRunning: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 300000,
      autoStart: true,
      title: "Running 5-Minute Count Up",
      description: "Count up timer actively running for 5 minutes total elapsed time. The clock displays 05:00 as the elapsed time, counting up from zero. Use the timer controls to pause the count up or stop it completely. The memory card shows the active time span with precise start timestamp."
    }
  }
};

// Long Running Count Up (1 hour)
export const LongRunning: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 3600000,
      autoStart: true,
      title: "Running 1-Hour Count Up",
      description: "Extended count up timer running for a full hour of elapsed time. The clock displays 01:00:00 format showing hours, minutes, and seconds of elapsed time. This demonstrates how the system handles longer count up periods with proper time formatting and memory tracking."
    }
  }
};

// === STOPPED EXAMPLES ===

// Short Stopped Count Up (15 seconds)
export const ShortStopped: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 15000,
      autoStart: false,
      title: "Stopped 15-Second Count Up",
      description: "Count up timer that ran for 15 seconds and is now stopped. The clock shows 00:15 as the total elapsed time with no active counting. The memory card displays a completed time span showing both start and stop timestamps, and the timer controls allow you to start a new count up or resume."
    }
  }
};

// Medium Stopped Count Up (2 minutes)
export const MediumStopped: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 120000,
      autoStart: false,
      title: "Stopped 2-Minute Count Up",
      description: "A count up timer that recorded 2 minutes of elapsed time and is currently in stopped state. The clock displays 02:00 showing the total elapsed time. The memory visualization shows the completed time span with start and stop timestamps, demonstrating the final state after count up completes."
    }
  }
};

// === EDGE CASES ===

// Minimum Duration Count Up (1 second)
export const MinimumDuration: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 1000,
      autoStart: true,
      title: "Minimum 1-Second Count Up",
      description: "Count up timer with the minimum practical duration of 1 second. This edge case tests how the system handles very short count up periods with proper millisecond precision. The clock displays 00:01 and the memory card tracks the brief time span accurately."
    }
  }
};

// Very Long Count Up (24 hours)
export const VeryLongDuration: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 86400000, // 24 hours
      autoStart: false,
      title: "24-Hour Count Up Timer",
      description: "Extended count up timer that recorded 24 hours of elapsed time. This tests the system's ability to handle very long count up periods without overflow or formatting issues. The clock display properly shows hours, and the memory card can track extended time spans across multiple time periods."
    }
  }
};

// Count Up with Pause History
export const WithPauseHistory: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 180000, // 3 minutes total elapsed
      autoStart: true,
      timeSpans: [
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute active
        { start: new Date(Date.now() - 60000), stop: undefined }                     // 1 minute running
      ],
      title: "Count Up with Pause History",
      description: "Count up timer that was paused and resumed, showing multiple time spans. The memory card displays both the completed 1-minute span and the current running span, demonstrating how pause/resume functionality is tracked. The clock shows cumulative elapsed time across all active periods."
    }
  }
};

// Zero Duration Edge Case
export const ZeroDuration: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 100, // Near-zero duration
      autoStart: false,
      title: "Zero Duration Count Up",
      description: "Count up timer with effectively zero duration (100ms). This edge case tests boundary handling of minimal count up measurements and ensures the system gracefully handles scenarios where the elapsed time approaches zero. The clock shows minimal time and memory tracking handles the edge case properly."
    }
  }
};

// Multiple Segments Count Up
export const MultipleSegments: Story = {
  args: {
    config: {
      timerType: 'countup',
      durationMs: 300000, // 5 minutes total
      autoStart: true,
      timeSpans: [
        { start: new Date(Date.now() - 300000), stop: new Date(Date.now() - 240000) }, // 1 minute
        { start: new Date(Date.now() - 180000), stop: new Date(Date.now() - 120000) }, // 1 minute
        { start: new Date(Date.now() - 60000), stop: undefined }                     // 1 minute running
      ],
      title: "Count Up with Multiple Segments",
      description: "Count up timer with complex history showing 3 separate active segments with pauses in between. The memory card table clearly displays all start/stop pairs, and the clock shows the total cumulative elapsed time of 3 minutes. This demonstrates how the system handles interval training or workout scenarios with multiple active periods."
    }
  }
};