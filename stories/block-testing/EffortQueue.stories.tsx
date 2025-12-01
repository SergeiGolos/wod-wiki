/**
 * Effort Block Queue Test Stories
 * 
 * Tests for EffortBlock using the new QueueTestHarness with
 * step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Effort/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Effort Block Queue Tests

Test **EffortBlock** behavior using queue-based execution with TestableRuntime.
Each test shows step-by-step execution with state snapshots.

## EffortBlock Types

### Generic Effort (no reps)
- Examples: "Run 400m", "Rest"
- Completes on 'next' event (user action)
- Uses \`CompletionBehavior\`

### Effort with Reps
- Examples: "5 Pullups", "10 Pushups"
- Tracks currentReps vs targetReps
- Auto-completes when reps reached

## Queue-Based Testing

1. **Push**: Compile and push block to stack
2. **Mount**: Initialize block, allocate memory
3. **Simulate**: Fire events (reps, next, tick)
4. **Next**: Check completion state
5. **Pop/Dispose**: Clean up resources
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== REP COMPLETION TEST ====================

const repCompletionTemplate: TestTemplate = {
  id: 'effort-rep-completion',
  name: 'Rep Completion Flow',
  description: 'Test EffortBlock rep tracking and completion',
  wodScript: '10 Pushups',
  queue: [
    { type: 'push', label: 'Push Effort (10 Pushups)', statementIndex: 0 },
    { type: 'mount', label: 'Mount - allocate rep memory' },
    { type: 'simulate-reps', label: 'Do 5 reps', params: { reps: 5 } },
    { type: 'next', label: 'Check state (should continue)' },
    { type: 'simulate-reps', label: 'Do 5 more reps', params: { reps: 10 } },
    { type: 'next', label: 'Check state (should complete)' },
    { type: 'unmount', label: 'Unmount block' },
    { type: 'pop', label: 'Pop and dispose' },
  ]
};

export const RepCompletionFlow: Story = {
  args: {
    initialTemplate: repCompletionTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests the complete lifecycle of rep-based effort block from push to disposal.'
      }
    }
  }
};

// ==================== GENERIC EFFORT TEST ====================

const genericEffortTemplate: TestTemplate = {
  id: 'effort-generic',
  name: 'Generic Effort Flow',
  description: 'Test generic effort that completes on user action',
  wodScript: 'Run 400m',
  queue: [
    { type: 'push', label: 'Push Generic Effort', statementIndex: 0 },
    { type: 'mount', label: 'Mount - no rep memory' },
    { type: 'next', label: 'First next() (should continue)' },
    { type: 'simulate-next', label: 'User triggers completion' },
    { type: 'next', label: 'Check state (should complete)' },
    { type: 'unmount', label: 'Unmount block' },
    { type: 'pop', label: 'Pop and dispose' },
  ]
};

export const GenericEffortFlow: Story = {
  args: {
    initialTemplate: genericEffortTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests generic effort block that requires user action to complete (no rep counting).'
      }
    }
  }
};

// ==================== REST EFFORT TEST ====================

const restEffortTemplate: TestTemplate = {
  id: 'effort-rest',
  name: 'Rest Effort Flow',
  description: 'Test Rest effort block',
  wodScript: 'Rest',
  queue: [
    { type: 'push', label: 'Push Rest', statementIndex: 0 },
    { type: 'mount', label: 'Mount Rest block' },
    { type: 'next', label: 'Check state' },
    { type: 'simulate-next', label: 'User ends rest' },
    { type: 'next', label: 'Check completion' },
    { type: 'pop', label: 'Pop and dispose' },
  ]
};

export const RestEffortFlow: Story = {
  args: {
    initialTemplate: restEffortTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests Rest effort block behavior.'
      }
    }
  }
};

// ==================== PARTIAL COMPLETION TEST ====================

const partialCompletionTemplate: TestTemplate = {
  id: 'effort-partial',
  name: 'Partial Progress Test',
  description: 'Test effort at various rep counts',
  wodScript: '20 Air Squats',
  queue: [
    { type: 'push', label: 'Push Effort (20 reps)', statementIndex: 0 },
    { type: 'mount', label: 'Mount block' },
    { type: 'simulate-reps', label: '5 reps (25%)', params: { reps: 5 } },
    { type: 'next', label: 'Check (continue)' },
    { type: 'simulate-reps', label: '10 reps (50%)', params: { reps: 10 } },
    { type: 'next', label: 'Check (continue)' },
    { type: 'simulate-reps', label: '15 reps (75%)', params: { reps: 15 } },
    { type: 'next', label: 'Check (continue)' },
    { type: 'simulate-reps', label: '19 reps (almost)', params: { reps: 19 } },
    { type: 'next', label: 'Check (continue)' },
    { type: 'simulate-reps', label: '20 reps (100%)', params: { reps: 20 } },
    { type: 'next', label: 'Check (complete!)' },
  ]
};

export const PartialProgressTest: Story = {
  args: {
    initialTemplate: partialCompletionTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests effort block at various completion percentages to verify rep tracking accuracy.'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own effort block test queue from scratch.'
      }
    }
  }
};
