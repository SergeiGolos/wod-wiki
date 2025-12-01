/**
 * EMOM Block Queue Test Stories
 * 
 * Tests for EMOM (Every Minute On the Minute) blocks using the new
 * QueueTestHarness with step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/EMOM/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# EMOM Block Queue Tests

Test **EMOM Block** behavior using queue-based execution with TestableRuntime.

## EMOM Characteristics

- **Timer + EMOM Action**: Interval-based execution
- **Fixed intervals**: Work restarts at each interval
- **Built-in rest**: Faster completion = more rest
- Uses \`TimerBehavior\` + \`IntervalBehavior\`

## EMOM Variations

### Standard EMOM
- Same work every minute
- 60-second intervals

### Alternating EMOM
- Different movements cycle each minute
- E.g., odd minutes: A, even minutes: B

### Custom Intervals
- E.g., every 90 seconds, every 2 minutes
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== STANDARD EMOM TEST ====================

const standardEmomTemplate: TestTemplate = {
  id: 'emom-standard',
  name: 'Standard 10-min EMOM',
  description: 'Test basic EMOM with same work each minute',
  wodScript: `EMOM 10
  3 Power Cleans`,
  queue: [
    { type: 'push', label: 'Push EMOM Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - Minute 1 starts' },
    { type: 'next', label: 'Begin work' },
    { type: 'simulate-next', label: 'Complete 3 cleans' },
    { type: 'tick', label: 'Resting... waiting for minute 2' },
    { type: 'tick', label: 'Minute 2 starts!' },
    { type: 'next', label: 'Minute 2 work begins' },
    { type: 'simulate-next', label: 'Complete 3 cleans' },
    { type: 'tick', label: 'Rest...' },
    { type: 'tick', label: 'Continue through minutes...' },
    { type: 'tick', label: 'Minute 10 - final interval' },
    { type: 'simulate-next', label: 'Complete final work' },
    { type: 'tick', label: 'EMOM complete' },
    { type: 'next', label: 'Check completion' },
  ]
};

export const StandardEmomFlow: Story = {
  args: {
    initialTemplate: standardEmomTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests standard EMOM with the same work performed each minute.'
      }
    }
  }
};

// ==================== ALTERNATING EMOM TEST ====================

const alternatingEmomTemplate: TestTemplate = {
  id: 'emom-alternating',
  name: 'Alternating EMOM',
  description: 'Test EMOM with different work on odd/even minutes',
  wodScript: `EMOM 12
  10 Pushups
  10 Air Squats`,
  queue: [
    { type: 'push', label: 'Push Alternating EMOM', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - Minute 1 (Pushups)' },
    { type: 'next', label: 'Minute 1: Pushups' },
    { type: 'simulate-next', label: 'Complete 10 Pushups' },
    { type: 'tick', label: 'Minute 2 starts' },
    { type: 'next', label: 'Minute 2: Squats' },
    { type: 'simulate-next', label: 'Complete 10 Squats' },
    { type: 'tick', label: 'Minute 3 starts' },
    { type: 'next', label: 'Minute 3: Pushups again' },
    { type: 'simulate-next', label: 'Complete Pushups' },
    { type: 'tick', label: 'Continue alternating...' },
  ]
};

export const AlternatingEmomFlow: Story = {
  args: {
    initialTemplate: alternatingEmomTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests alternating EMOM where movements cycle each minute.'
      }
    }
  }
};

// ==================== TRIPLE MOVEMENT EMOM ====================

const tripleEmomTemplate: TestTemplate = {
  id: 'emom-triple',
  name: 'Triple Movement EMOM',
  description: 'Test EMOM with 3 movements cycling',
  wodScript: `EMOM 15
  5 Pullups
  10 Pushups
  15 Air Squats`,
  queue: [
    { type: 'push', label: 'Push 3-movement EMOM', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - Minute 1' },
    { type: 'next', label: 'Min 1: Pullups' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'tick', label: 'Minute 2' },
    { type: 'next', label: 'Min 2: Pushups' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'tick', label: 'Minute 3' },
    { type: 'next', label: 'Min 3: Squats' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'tick', label: 'Minute 4' },
    { type: 'next', label: 'Min 4: Pullups (cycle repeats)' },
  ]
};

export const TripleMovementEmom: Story = {
  args: {
    initialTemplate: tripleEmomTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests EMOM with 3 different movements cycling through (Cindy-style intervals).'
      }
    }
  }
};

// ==================== INTERVAL TRANSITION TEST ====================

const intervalTransitionTemplate: TestTemplate = {
  id: 'emom-transition',
  name: 'Interval Transition',
  description: 'Test minute-to-minute transition behavior',
  wodScript: `EMOM 5
  5 Burpees`,
  queue: [
    { type: 'push', label: 'Push EMOM', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Start at 0:00' },
    { type: 'tick', label: 'Time: 0:15' },
    { type: 'next', label: 'Working...' },
    { type: 'simulate-next', label: 'Burpees done at 0:30' },
    { type: 'tick', label: 'Rest 0:30-0:59' },
    { type: 'tick', label: 'TRANSITION at 1:00!' },
    { type: 'next', label: 'Minute 2 starts automatically' },
    { type: 'tick', label: 'Work minute 2' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'tick', label: 'Transition to minute 3' },
  ]
};

export const IntervalTransitionFlow: Story = {
  args: {
    initialTemplate: intervalTransitionTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests the automatic interval transition at minute boundaries.'
      }
    }
  }
};

// ==================== INCOMPLETE INTERVAL TEST ====================

const incompleteIntervalTemplate: TestTemplate = {
  id: 'emom-incomplete',
  name: 'Work Not Finished',
  description: 'Test when work takes longer than interval',
  wodScript: `EMOM 3
  20 Burpees`,
  queue: [
    { type: 'push', label: 'Push EMOM (challenging)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Minute 1 starts' },
    { type: 'next', label: 'Begin 20 burpees' },
    { type: 'tick', label: 'Time: 0:30 - still working' },
    { type: 'simulate-reps', label: '10 burpees done', params: { reps: 10 } },
    { type: 'tick', label: 'Time: 0:55 - almost to next minute' },
    { type: 'tick', label: 'Minute 2 starts - work interrupted!' },
    { type: 'next', label: 'Reset for new interval' },
  ]
};

export const IncompleteIntervalFlow: Story = {
  args: {
    initialTemplate: incompleteIntervalTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests behavior when work is not completed before interval ends.'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `EMOM 10
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own EMOM block test queue from scratch.'
      }
    }
  }
};
