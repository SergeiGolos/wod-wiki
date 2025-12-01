/**
 * Unified Testing Workbench Stories
 * 
 * Dedicated stories for the unified test+visualization workbench.
 * These stories are designed for full-screen debugging and analysis.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Unified Workbench',
  component: QueueTestHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Unified Testing Workbench

Full-screen testing environment that combines:

- **Queue Test Harness**: Step-by-step or batch execution of test actions
- **StackedClockDisplay**: Live workout output visualization
- **Snapshot Diffs**: Memory and stack state changes

## Purpose

This workbench lets you:
1. See exactly what the user would see during workout execution
2. Verify that runtime state changes produce correct visual output
3. Debug issues by stepping through execution one action at a time
4. Analyze memory allocations and stack operations

## How to Use

1. **Select a template** or enter custom WOD script
2. **Build queue** by clicking statements or adding actions
3. **Watch the workout display** on the right as you step through
4. **Analyze diffs** to see what changed at each step

## Layout

- **Left (2/3)**: Test controls, execution queue, snapshot analysis
- **Right (1/3)**: Live workout display with timer and activity cards
        `
      }
    }
  },
  argTypes: {
    initialScript: { control: 'text' },
    layout: { control: 'select', options: ['horizontal', 'vertical'] }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== MAIN WORKBENCH ====================

export const Default: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default workbench with unified test+visualization view.'
      }
    }
  }
};

// ==================== PRESET TEMPLATES ====================

const allTemplates: TestTemplate[] = [
  {
    id: 'effort-test',
    name: '💪 Effort Block',
    description: 'Test simple effort/rep completion',
    wodScript: '10 Pushups',
    queue: [
      { type: 'push', label: 'Push Effort', statementIndex: 0 },
      { type: 'mount', label: 'Mount' },
      { type: 'simulate-reps', label: 'Do 5 reps', params: { reps: 5 } },
      { type: 'next', label: 'Check status' },
      { type: 'simulate-reps', label: 'Do 5 more', params: { reps: 10 } },
      { type: 'next', label: 'Complete' },
    ]
  },
  {
    id: 'timer-countdown',
    name: '⏱️ Timer Countdown',
    description: 'Test For Time countdown timer',
    wodScript: `5:00 For Time:
  Run 400m
  20 Pushups`,
    queue: [
      { type: 'push', label: 'Push Timer', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Start Timer' },
      { type: 'tick', label: 'Advance time' },
      { type: 'next', label: 'Progress workout' },
      { type: 'tick', label: 'More time' },
      { type: 'next', label: 'Check state' },
    ]
  },
  {
    id: 'rounds-multi',
    name: '🔄 Multi-Round',
    description: 'Test multiple round iteration',
    wodScript: `3 Rounds
  10 Air Squats
  15 Situps`,
    queue: [
      { type: 'push', label: 'Push Rounds', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Start Round 1' },
      { type: 'next', label: 'R1 → R2' },
      { type: 'next', label: 'R2 → R3' },
      { type: 'next', label: 'R3 → Complete' },
    ]
  },
  {
    id: 'amrap-workout',
    name: '🏋️ AMRAP',
    description: 'As Many Rounds As Possible',
    wodScript: `15:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`,
    queue: [
      { type: 'push', label: 'Push AMRAP', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Start AMRAP' },
      { type: 'next', label: 'Round 1 done' },
      { type: 'tick', label: 'Time passes' },
      { type: 'next', label: 'Round 2 done' },
      { type: 'tick', label: 'More time' },
    ]
  },
  {
    id: 'emom-workout',
    name: '⏰ EMOM',
    description: 'Every Minute On the Minute',
    wodScript: `EMOM 10
  3 Power Cleans`,
    queue: [
      { type: 'push', label: 'Push EMOM', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Start Min 1' },
      { type: 'next', label: 'Min 1 work done' },
      { type: 'tick', label: 'Next minute' },
      { type: 'next', label: 'Min 2 work done' },
    ]
  },
  {
    id: 'nested-complex',
    name: '🧩 Nested Complex',
    description: 'Complex nested structure',
    wodScript: `For Time:
  3 Rounds
    10 Pushups
    15 Squats
  Run 400m
  2 Rounds
    5 Pullups`,
    queue: [
      { type: 'push', label: 'Push For Time', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Start workout' },
      { type: 'next', label: 'First rounds' },
      { type: 'next', label: 'Run' },
      { type: 'next', label: 'Second rounds' },
      { type: 'next', label: 'Complete' },
    ]
  }
];

export const WithAllTemplates: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    customTemplates: allTemplates,
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: `
## All Templates Workbench

Pre-loaded with all test templates:
- 💪 Effort Block - Simple rep completion
- ⏱️ Timer Countdown - For Time workout
- 🔄 Multi-Round - Round iteration
- 🏋️ AMRAP - Time-bounded rounds
- ⏰ EMOM - Interval training
- 🧩 Nested Complex - Multi-level nesting

Select any template to start testing!
        `
      }
    }
  }
};

// ==================== SPECIFIC DEBUGGING SCENARIOS ====================

export const TimerDebugging: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: {
      id: 'timer-debug',
      name: 'Timer Debug',
      description: 'Debug timer behavior step by step',
      wodScript: `3:00 For Time:
  10 Burpees`,
      queue: [
        { type: 'push', label: '1. Push Timer Block', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: '2. Mount (start timer)' },
        { type: 'tick', label: '3. Tick (30s passes)' },
        { type: 'tick', label: '4. Tick (1:00 passes)' },
        { type: 'next', label: '5. Child complete' },
        { type: 'tick', label: '6. Tick (2:00 passes)' },
        { type: 'next', label: '7. Check completion' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: `
## Timer Debugging Workbench

Step through timer behavior to debug:
- Timer initialization
- TimeSpan tracking
- Countdown display
- Child block interactions
- Completion detection
        `
      }
    }
  }
};

export const RoundsDebugging: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: {
      id: 'rounds-debug',
      name: 'Rounds Debug',
      description: 'Debug rounds iteration step by step',
      wodScript: `4 Rounds
  5 Pushups
  10 Squats
  15 Lunges`,
      queue: [
        { type: 'push', label: '1. Push Rounds', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: '2. Mount (Round 1)' },
        { type: 'next', label: '3. R1 Child 1' },
        { type: 'next', label: '4. R1 Child 2' },
        { type: 'next', label: '5. R1 Child 3' },
        { type: 'next', label: '6. → Round 2' },
        { type: 'next', label: '7. R2 Child 1' },
        { type: 'next', label: '8. R2 complete' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: `
## Rounds Debugging Workbench

Step through multi-round iteration:
- Initial round setup
- Child block progression
- Round advancement
- Round counter updates
- Memory state per round
        `
      }
    }
  }
};

export const MemoryDebugging: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: {
      id: 'memory-debug',
      name: 'Memory Debug',
      description: 'Focus on memory operations',
      wodScript: `2 Rounds
  10 Pushups`,
      queue: [
        { type: 'push', label: 'Push Block', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: 'Mount (alloc memory)' },
        { type: 'simulate-reps', label: 'Update reps', params: { reps: 5 } },
        { type: 'simulate-reps', label: 'More reps', params: { reps: 10 } },
        { type: 'next', label: 'Round complete' },
        { type: 'next', label: 'Round 2' },
        { type: 'unmount', label: 'Unmount' },
        { type: 'pop', label: 'Pop (release memory)' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: `
## Memory Debugging Workbench

Focus on memory lifecycle:
- Allocation during mount
- Value updates during execution
- Memory inheritance
- Release during dispose
        `
      }
    }
  }
};

// ==================== VERTICAL LAYOUT ====================

export const VerticalLayout: Story = {
  args: {
    showRuntimeView: true,
    layout: 'vertical',
    customTemplates: allTemplates,
    initialScript: '10 Burpees'
  },
  parameters: {
    docs: {
      description: {
        story: `
## Vertical Layout Workbench

Same features but stacked top-to-bottom:
- Test controls on top
- Workout display below
- Better for narrower screens
        `
      }
    }
  }
};
