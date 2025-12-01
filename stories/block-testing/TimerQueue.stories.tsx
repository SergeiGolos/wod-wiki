/**
 * Timer Block Queue Test Stories
 * 
 * Tests for TimerBlock using the new QueueTestHarness with
 * step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Timer/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Timer Block Queue Tests

Test **TimerBlock** behavior using queue-based execution with TestableRuntime.

## Timer Types

### For Time (count up)
- Tracks elapsed time
- Completes when children complete
- No time cap

### Time Capped (countdown)
- Has maximum duration
- Completes when timer expires OR children complete
- \`TimerMode.Countdown\`

### Standalone Timer
- Simple duration without children
- Completes on timer expiration

## Key Behaviors

- **TimerBehavior**: Manages timer state
- **Memory**: Allocates \`metric:timer\` for state
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== FOR TIME TEST ====================

const forTimeTemplate: TestTemplate = {
  id: 'timer-for-time',
  name: 'For Time Flow',
  description: 'Test For Time timer that completes when work is done',
  wodScript: `For Time:
  Run 400m
  50 Pushups`,
  queue: [
    { type: 'push', label: 'Push For Time Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - start timer' },
    { type: 'tick', label: 'Timer tick (time passes)' },
    { type: 'next', label: 'Check state (children executing)' },
    { type: 'tick', label: 'More time passes' },
    { type: 'simulate-next', label: 'Complete first child (Run)' },
    { type: 'next', label: 'Advance to next child' },
    { type: 'simulate-next', label: 'Complete second child (Pushups)' },
    { type: 'next', label: 'All children done (should complete)' },
  ]
};

export const ForTimeFlow: Story = {
  args: {
    initialTemplate: forTimeTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests For Time timer that completes when all child work is finished.'
      }
    }
  }
};

// ==================== TIME CAP TEST ====================

const timeCapTemplate: TestTemplate = {
  id: 'timer-time-cap',
  name: 'Time Cap Flow',
  description: 'Test timer with time cap that can expire',
  wodScript: `10:00 For Time:
  Run 1 mile
  100 Pushups`,
  queue: [
    { type: 'push', label: 'Push Time Cap Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - start 10:00 timer' },
    { type: 'tick', label: 'Tick (time progresses)' },
    { type: 'next', label: 'Check (still running)' },
    { type: 'tick', label: 'More ticks...' },
    { type: 'tick', label: 'Timer approaching cap' },
    { type: 'next', label: 'Check timer status' },
    { type: 'tick', label: 'Timer expires!' },
    { type: 'next', label: 'Check (should complete)' },
  ]
};

export const TimeCapFlow: Story = {
  args: {
    initialTemplate: timeCapTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests timer block with a time cap that expires regardless of work completion.'
      }
    }
  }
};

// ==================== STANDALONE TIMER TEST ====================

const standaloneTimerTemplate: TestTemplate = {
  id: 'timer-standalone',
  name: 'Standalone Timer',
  description: 'Test simple duration timer without children',
  wodScript: '3:00',
  queue: [
    { type: 'push', label: 'Push 3:00 Timer', statementIndex: 0 },
    { type: 'mount', label: 'Mount - start countdown' },
    { type: 'tick', label: 'Tick (1:00 elapsed)' },
    { type: 'next', label: 'Check (2:00 remaining)' },
    { type: 'tick', label: 'Tick (2:00 elapsed)' },
    { type: 'next', label: 'Check (1:00 remaining)' },
    { type: 'tick', label: 'Timer expires' },
    { type: 'next', label: 'Check completion' },
  ]
};

export const StandaloneTimerFlow: Story = {
  args: {
    initialTemplate: standaloneTimerTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests a simple countdown timer without any child blocks.'
      }
    }
  }
};

// ==================== TIMER WITH NESTED ROUNDS ====================

const timerWithRoundsTemplate: TestTemplate = {
  id: 'timer-nested-rounds',
  name: 'Timer with Nested Rounds',
  description: 'Test timer containing rounds block',
  wodScript: `15:00 For Time:
  3 Rounds
    10 Pullups
    15 Pushups`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount timer' },
    { type: 'next', label: 'Start rounds child' },
    { type: 'tick', label: 'Time passes' },
    { type: 'next', label: 'Advance through rounds' },
    { type: 'tick', label: 'More time' },
    { type: 'next', label: 'Continue...' },
  ]
};

export const TimerWithNestedRounds: Story = {
  args: {
    initialTemplate: timerWithRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests timer block containing nested rounds structure.'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `10:00 For Time:
  Run 400m
  21-15-9
    Thrusters
    Pullups`
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own timer block test queue from scratch.'
      }
    }
  }
};
