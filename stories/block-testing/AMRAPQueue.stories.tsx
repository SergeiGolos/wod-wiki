/**
 * AMRAP Block Queue Test Stories
 * 
 * Tests for AMRAP (As Many Rounds As Possible) blocks using the new
 * QueueTestHarness with step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/AMRAP/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# AMRAP Block Queue Tests

Test **AMRAP Block** behavior using queue-based execution with TestableRuntime.

## AMRAP Characteristics

- **Timer + Rounds**: Both fragments present
- **No fixed round count**: Continues until timer expires
- **Score = Rounds completed + partial reps**
- Uses \`TimerBehavior\` + \`LoopBehavior\`

## Completion Trigger

Timer expiration ends the AMRAP, not round completion.
Athletes complete as many rounds as possible within the time cap.

## Memory Allocations

- \`metric:timer\` - Timer state (elapsed, duration)
- \`metric:loop\` - Current round (no max limit)
- \`metric:rounds-completed\` - For scoring
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== CLASSIC AMRAP TEST ====================

const classicAmrapTemplate: TestTemplate = {
  id: 'amrap-classic',
  name: 'Classic 20-min AMRAP',
  description: 'Test Cindy-style AMRAP workout',
  wodScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`,
  queue: [
    { type: 'push', label: 'Push AMRAP Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - timer starts, Round 1' },
    { type: 'tick', label: 'Time passes' },
    { type: 'next', label: 'Start children (Pullups)' },
    { type: 'simulate-next', label: 'Complete Pullups' },
    { type: 'next', label: 'Advance to Pushups' },
    { type: 'simulate-next', label: 'Complete Pushups' },
    { type: 'next', label: 'Advance to Squats' },
    { type: 'simulate-next', label: 'Complete Squats' },
    { type: 'next', label: 'Round 1 done → Round 2' },
    { type: 'tick', label: 'Timer: 5:00 elapsed' },
    { type: 'next', label: 'Continue Round 2...' },
    { type: 'tick', label: 'Timer: 19:30 elapsed' },
    { type: 'tick', label: 'Timer expires (20:00)' },
    { type: 'next', label: 'Check completion (timer ended)' },
  ]
};

export const ClassicAmrapFlow: Story = {
  args: {
    initialTemplate: classicAmrapTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests classic 20-minute AMRAP like CrossFit benchmark "Cindy".'
      }
    }
  }
};

// ==================== SHORT AMRAP TEST ====================

const shortAmrapTemplate: TestTemplate = {
  id: 'amrap-short',
  name: 'Short 7-min AMRAP',
  description: 'Test short duration AMRAP',
  wodScript: `7:00 AMRAP
  7 Thrusters
  7 Burpees`,
  queue: [
    { type: 'push', label: 'Push 7-min AMRAP', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - start timer' },
    { type: 'next', label: 'Begin work' },
    { type: 'simulate-next', label: 'Complete Thrusters' },
    { type: 'simulate-next', label: 'Complete Burpees' },
    { type: 'next', label: 'Round 1 done' },
    { type: 'tick', label: 'Time: 3:30' },
    { type: 'next', label: 'Round 2...' },
    { type: 'tick', label: 'Timer expires' },
    { type: 'next', label: 'AMRAP complete' },
  ]
};

export const ShortAmrapFlow: Story = {
  args: {
    initialTemplate: shortAmrapTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests short duration AMRAP with faster round cycling.'
      }
    }
  }
};

// ==================== SINGLE MOVEMENT AMRAP ====================

const singleMovementTemplate: TestTemplate = {
  id: 'amrap-single',
  name: 'Single Movement AMRAP',
  description: 'Test max reps in time limit',
  wodScript: `10:00 AMRAP
  Row for Calories`,
  queue: [
    { type: 'push', label: 'Push AMRAP', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - start rowing' },
    { type: 'tick', label: 'Row continues...' },
    { type: 'tick', label: 'More calories...' },
    { type: 'tick', label: 'Still rowing...' },
    { type: 'tick', label: 'Timer expires' },
    { type: 'next', label: 'AMRAP complete' },
  ]
};

export const SingleMovementAmrap: Story = {
  args: {
    initialTemplate: singleMovementTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests AMRAP with single continuous movement (max effort for time).'
      }
    }
  }
};

// ==================== AMRAP TIMER EXPIRATION TEST ====================

const timerExpirationTemplate: TestTemplate = {
  id: 'amrap-timer-expiry',
  name: 'Timer Expiration',
  description: 'Test AMRAP ending mid-round',
  wodScript: `5:00 AMRAP
  5 Pullups
  10 Pushups`,
  queue: [
    { type: 'push', label: 'Push 5-min AMRAP', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount block' },
    { type: 'next', label: 'Start Round 1' },
    { type: 'simulate-next', label: 'Pullups done' },
    { type: 'next', label: 'Start Pushups' },
    { type: 'tick', label: 'Timer: 4:45' },
    { type: 'simulate-reps', label: '3 Pushups done', params: { reps: 3 } },
    { type: 'tick', label: 'Timer expires at 5:00' },
    { type: 'next', label: 'AMRAP ends mid-round' },
  ]
};

export const TimerExpirationFlow: Story = {
  args: {
    initialTemplate: timerExpirationTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests AMRAP ending in the middle of a round (partial round scoring).'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own AMRAP block test queue from scratch.'
      }
    }
  }
};
