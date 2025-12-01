/**
 * TimerBehavior Queue-Based Tests
 * 
 * Tests for TimerBehavior using the QueueTestHarness framework.
 * Migrated from src/runtime/behaviors/TimerBehavior.test.ts
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Behaviors/Timer Behavior',
  component: QueueTestHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# TimerBehavior Tests

Tests for the TimerBehavior class which manages timer state, pause/resume,
and elapsed time calculation.

## Key Behaviors Tested

1. **Memory Allocation** - Timer allocates memory references on mount
2. **Initialization** - Timer starts with one span in running state
3. **Pause/Resume** - Creates new spans when pausing and resuming
4. **Elapsed Time** - Calculates total time across multiple spans
5. **Multiple Timers** - Timers don't conflict with each other
6. **Subscriber Notification** - Memory changes notify subscribers
        `
      }
    }
  },
  argTypes: {
    showRuntimeView: { control: 'boolean' },
    layout: { control: 'select', options: ['horizontal', 'vertical'] }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== TIMER BEHAVIOR TEMPLATES ====================

const timerAllocateMemoryTemplate: TestTemplate = {
  id: 'timer-allocate-memory',
  name: '🧠 Memory Allocation',
  description: 'Verify timer allocates memory references on mount',
  wodScript: `5:00 For Time:
  Run 400m`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (allocates timer memory)' },
  ]
};

const timerInitializationTemplate: TestTemplate = {
  id: 'timer-initialization',
  name: '⏱️ Initialization',
  description: 'Verify timer initializes with one span and running state',
  wodScript: `3:00 For Time:
  10 Burpees`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (verify running)' },
  ]
};

const timerPauseResumeTemplate: TestTemplate = {
  id: 'timer-pause-resume',
  name: '⏸️ Pause/Resume',
  description: 'Test pause creates stopped span, resume creates new span',
  wodScript: `10:00 AMRAP
  5 Pullups`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (running)' },
    { type: 'custom', label: 'Pause Timer', params: { action: 'pause' } },
    { type: 'tick', label: 'Tick (paused)' },
    { type: 'custom', label: 'Resume Timer', params: { action: 'resume' } },
    { type: 'tick', label: 'Tick (running again)' },
  ]
};

const timerElapsedCalculationTemplate: TestTemplate = {
  id: 'timer-elapsed-calculation',
  name: '⏱️ Elapsed Time',
  description: 'Test total elapsed time across multiple spans',
  wodScript: `5:00 For Time:
  20 Pushups`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (accumulate time)' },
    { type: 'tick', label: 'Tick (more time)' },
    { type: 'tick', label: 'Tick (even more time)' },
  ]
};

const timerDisposeTemplate: TestTemplate = {
  id: 'timer-dispose',
  name: '🛑 Timer Dispose',
  description: 'Test timer stops on dispose',
  wodScript: `2:00 For Time:
  15 Squats`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (running)' },
    { type: 'unmount', label: 'Unmount' },
    { type: 'pop', label: 'Pop (dispose - stops timer)' },
  ]
};

const multipleTimersTemplate: TestTemplate = {
  id: 'multiple-timers',
  name: '⏱️⏱️ Multiple Timers',
  description: 'Test multiple timers don\'t conflict',
  wodScript: `10:00 AMRAP
  3:00 For Time:
    Run 200m`,
  queue: [
    { type: 'push', label: 'Push Outer AMRAP', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Outer Timer' },
    { type: 'tick', label: 'Outer tick' },
    { type: 'next', label: 'Push Inner Timer' },
    { type: 'tick', label: 'Both ticking' },
    { type: 'next', label: 'Inner complete' },
  ]
};

// ==================== STORIES ====================

export const Default: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    customTemplates: [
      timerAllocateMemoryTemplate,
      timerInitializationTemplate,
      timerPauseResumeTemplate,
      timerElapsedCalculationTemplate,
      timerDisposeTemplate,
      multipleTimersTemplate,
    ],
    initialTemplate: timerAllocateMemoryTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'All TimerBehavior tests available via template selection.'
      }
    }
  }
};

export const MemoryAllocation: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerAllocateMemoryTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Memory Allocation

Verifies that TimerBehavior allocates timer memory references on mount.

**Expected:**
- After mount, memory should contain timer references
- Timer reference should be owned by the block
- Reference should have 'public' visibility
        `
      }
    }
  }
};

export const Initialization: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerInitializationTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Initialization

Verifies timer initializes with one span in running state.

**Expected:**
- Timer starts with exactly one TimeSpan
- First span has \`start\` timestamp set
- First span has \`stop\` undefined (running)
- \`isRunning()\` returns true
        `
      }
    }
  }
};

export const PauseResume: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerPauseResumeTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Pause/Resume

Tests pause creates stopped span, resume creates new span.

**Expected:**
- Pause sets \`stop\` on current span
- Resume creates a new span with \`start\` set
- Multiple pause/resume cycles create multiple spans
        `
      }
    }
  }
};

export const ElapsedCalculation: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerElapsedCalculationTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Elapsed Time Calculation

Tests total elapsed time calculation across multiple spans.

**Expected:**
- Elapsed time accumulates across all spans
- Running span includes time up to now
- Stopped spans include their full duration
        `
      }
    }
  }
};

export const TimerDispose: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerDisposeTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Timer Dispose

Tests timer stops on dispose (pop).

**Expected:**
- After pop, timer's last span has \`stop\` set
- \`isRunning()\` returns false after dispose
        `
      }
    }
  }
};

export const MultipleTimers: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: multipleTimersTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Multiple Timers

Tests that multiple timers don't conflict with each other.

**Expected:**
- Each timer has its own memory references
- Timers can run independently
- Pausing one timer doesn't affect others
        `
      }
    }
  }
};
