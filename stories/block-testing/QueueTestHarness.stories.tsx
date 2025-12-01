/**
 * Queue Test Harness Stories
 * 
 * Interactive testing workbench using TestableRuntime with queue-based execution.
 * Supports step-by-step or all-at-once execution with 3 default templates.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Queue Test Harness',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Queue Test Harness

A queue-based testing workbench that uses **TestableRuntime** to execute 
test scenarios step-by-step or all at once.

## Features

- **Parse & Select**: Enter WOD script and click statements to add push actions
- **Build Queue**: Add actions like mount, next, unmount, tick, simulate events
- **Execute**: Run step-by-step or all at once
- **Visualize**: See stack/memory state changes after each action
- **Templates**: 3 default templates for common behavior testing

## Default Templates

### 1. Effort Completion
Tests EffortBlock completion behavior when reps reach target.
- Push effort block
- Mount and simulate rep events
- Verify completion when target reached

### 2. Timer Expiration  
Tests TimerBlock completion when time expires.
- Push timer block with children
- Mount and simulate ticks
- Verify completion on timer expiration

### 3. Rounds Iteration
Tests RoundsBlock iteration through multiple rounds.
- Push rounds block with children
- Mount and advance through rounds
- Verify completion after all rounds

## Usage

1. Select a template or enter custom WOD script
2. Build execution queue by clicking statements or adding actions
3. Click "Step" for step-by-step or "Run All" for batch execution
4. Review snapshot diffs to verify behavior
        `
      }
    }
  },
  argTypes: {
    initialScript: { control: 'text' },
    className: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== DEFAULT STORIES ====================

export const Default: Story = {
  args: {
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic queue test harness. Build your own execution queue from scratch.'
      }
    }
  }
};

export const EffortCompletionTemplate: Story = {
  args: {
    initialTemplate: {
      id: 'effort-completion',
      name: 'Effort Completion',
      description: 'Test EffortBlock completion behavior when reps reach target',
      wodScript: '5 Pullups',
      queue: [
        { type: 'push', label: 'Push Effort Block', statementIndex: 0 },
        { type: 'mount', label: 'Mount Block' },
        { type: 'simulate-reps', label: 'Simulate 3 Reps', params: { reps: 3 } },
        { type: 'next', label: 'Call next() (should continue)' },
        { type: 'simulate-reps', label: 'Simulate 2 More Reps', params: { reps: 5 } },
        { type: 'next', label: 'Call next() (should complete)' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-loaded with Effort Completion template for testing rep-based completion.'
      }
    }
  }
};

export const TimerExpirationTemplate: Story = {
  args: {
    initialTemplate: {
      id: 'timer-expiration',
      name: 'Timer Expiration',
      description: 'Test TimerBlock completion when time expires',
      wodScript: `5:00 For Time:
  Run 400m`,
      queue: [
        { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: 'Mount Block' },
        { type: 'tick', label: 'Tick (simulate time)' },
        { type: 'next', label: 'Call next() (should continue)' },
        { type: 'tick', label: 'Tick (more time)' },
        { type: 'next', label: 'Call next() (check completion)' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-loaded with Timer Expiration template for testing time-based completion.'
      }
    }
  }
};

export const RoundsIterationTemplate: Story = {
  args: {
    initialTemplate: {
      id: 'rounds-iteration',
      name: 'Rounds Iteration',
      description: 'Test RoundsBlock iteration through multiple rounds',
      wodScript: `3 Rounds
  10 Pushups
  15 Squats`,
      queue: [
        { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: 'Mount Block (Round 1)' },
        { type: 'next', label: 'Complete Round 1 children' },
        { type: 'next', label: 'Advance to Round 2' },
        { type: 'next', label: 'Complete Round 2 children' },
        { type: 'next', label: 'Advance to Round 3' },
        { type: 'next', label: 'Complete Round 3 children' },
        { type: 'next', label: 'Call next() (should complete)' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-loaded with Rounds Iteration template for testing multi-round execution.'
      }
    }
  }
};

// ==================== CUSTOM TEMPLATE EXAMPLES ====================

const amrapTemplate: TestTemplate = {
  id: 'amrap-test',
  name: 'AMRAP Test',
  description: 'Test AMRAP block with timer and rounds behavior',
  wodScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`,
  queue: [
    { type: 'push', label: 'Push AMRAP Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Start AMRAP)' },
    { type: 'next', label: 'Complete Round 1' },
    { type: 'tick', label: 'Timer tick' },
    { type: 'next', label: 'Complete Round 2' },
    { type: 'tick', label: 'Timer tick' },
    { type: 'next', label: 'Complete Round 3' },
  ]
};

const emomTemplate: TestTemplate = {
  id: 'emom-test',
  name: 'EMOM Test',
  description: 'Test EMOM interval block',
  wodScript: `EMOM 10
  3 Power Cleans`,
  queue: [
    { type: 'push', label: 'Push EMOM Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Start Minute 1)' },
    { type: 'next', label: 'Complete Minute 1 work' },
    { type: 'tick', label: 'Timer: next minute' },
    { type: 'next', label: 'Start Minute 2' },
    { type: 'next', label: 'Complete Minute 2 work' },
  ]
};

export const WithCustomTemplates: Story = {
  args: {
    initialScript: '5 Pullups',
    customTemplates: [amrapTemplate, emomTemplate]
  },
  parameters: {
    docs: {
      description: {
        story: 'Includes custom AMRAP and EMOM templates in addition to defaults.'
      }
    }
  }
};

// ==================== COMPLEX WORKOUT STORIES ====================

export const ComplexWorkout: Story = {
  args: {
    initialTemplate: {
      id: 'complex-workout',
      name: 'Complex Multi-Modal',
      description: 'Test a complex workout with nested structure',
      wodScript: `For Time:
  3 Rounds
    10 Pushups
    15 Squats
  Run 400m
  2 Rounds
    5 Pullups
    10 Lunges`,
      queue: [
        { type: 'push', label: 'Push For Time Block', statementIndex: 0, includeChildren: true },
        { type: 'mount', label: 'Mount Timer' },
        { type: 'next', label: 'Start first child (Rounds)' },
        { type: 'next', label: 'Advance rounds...' },
        { type: 'next', label: 'Continue...' },
      ]
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'A complex workout with nested rounds to test hierarchical block management.'
      }
    }
  }
};
