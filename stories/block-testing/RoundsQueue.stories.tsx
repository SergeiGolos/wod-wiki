/**
 * Rounds Block Queue Test Stories
 * 
 * Tests for RoundsBlock using the new QueueTestHarness with
 * step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Rounds/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Rounds Block Queue Tests

Test **RoundsBlock** behavior using queue-based execution with TestableRuntime.

## Round Types

### Fixed Rounds
- "3 Rounds" - same work each round
- \`currentRound\` increments, \`targetRounds\` constant

### Rep Schemes
- "21-15-9" - variable reps per round
- Publishes current rep count to children

### Ladders
- "10-9-8-7-6-5-4-3-2-1"
- Descending/ascending patterns

## Key Behaviors

- **LoopBehavior**: Manages iteration state
- **RepsPublisher**: Publishes reps to public memory
- Memory: \`metric:loop\`, \`metric:reps\` (public)
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== FIXED ROUNDS TEST ====================

const fixedRoundsTemplate: TestTemplate = {
  id: 'rounds-fixed',
  name: 'Fixed Rounds Flow',
  description: 'Test 3 Rounds block iteration',
  wodScript: `3 Rounds
  10 Pushups
  15 Air Squats`,
  queue: [
    { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - Round 1 starts' },
    { type: 'next', label: 'Execute Round 1 children' },
    { type: 'simulate-next', label: 'Complete Pushups' },
    { type: 'simulate-next', label: 'Complete Squats' },
    { type: 'next', label: 'Round 1 done → Round 2' },
    { type: 'next', label: 'Execute Round 2 children' },
    { type: 'simulate-next', label: 'Complete Round 2 work' },
    { type: 'next', label: 'Round 2 done → Round 3' },
    { type: 'next', label: 'Execute Round 3 children' },
    { type: 'simulate-next', label: 'Complete Round 3 work' },
    { type: 'next', label: 'All rounds done (complete!)' },
  ]
};

export const FixedRoundsFlow: Story = {
  args: {
    initialTemplate: fixedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests fixed rounds block iterating through all rounds until completion.'
      }
    }
  }
};

// ==================== REP SCHEME TEST ====================

const repSchemeTemplate: TestTemplate = {
  id: 'rounds-rep-scheme',
  name: '21-15-9 Rep Scheme',
  description: 'Test rep scheme with variable reps per round',
  wodScript: `21-15-9
  Thrusters
  Pullups`,
  queue: [
    { type: 'push', label: 'Push 21-15-9 Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - publishes 21 reps' },
    { type: 'next', label: 'Round 1: 21 reps each' },
    { type: 'simulate-next', label: 'Complete 21 Thrusters' },
    { type: 'simulate-next', label: 'Complete 21 Pullups' },
    { type: 'next', label: 'Advance - publishes 15 reps' },
    { type: 'next', label: 'Round 2: 15 reps each' },
    { type: 'simulate-next', label: 'Complete Round 2' },
    { type: 'next', label: 'Advance - publishes 9 reps' },
    { type: 'next', label: 'Round 3: 9 reps each' },
    { type: 'simulate-next', label: 'Complete Round 3' },
    { type: 'next', label: 'All rounds done (complete!)' },
  ]
};

export const RepSchemeFlow: Story = {
  args: {
    initialTemplate: repSchemeTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests 21-15-9 rep scheme that publishes different rep counts each round.'
      }
    }
  }
};

// ==================== DESCENDING LADDER TEST ====================

const ladderTemplate: TestTemplate = {
  id: 'rounds-ladder',
  name: 'Descending Ladder',
  description: 'Test 10-9-8-7-6-5-4-3-2-1 ladder',
  wodScript: `10-9-8-7-6-5-4-3-2-1
  Kettlebell Swings`,
  queue: [
    { type: 'push', label: 'Push Ladder Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - Round 1 (10 reps)' },
    { type: 'next', label: 'Execute 10 swings' },
    { type: 'simulate-next', label: 'Complete round 1' },
    { type: 'next', label: 'Advance - 9 reps' },
    { type: 'simulate-next', label: 'Complete round 2' },
    { type: 'next', label: 'Advance - 8 reps' },
    { type: 'simulate-next', label: 'Continue through ladder...' },
  ]
};

export const DescendingLadderFlow: Story = {
  args: {
    initialTemplate: ladderTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests descending ladder pattern where rep count decreases each round.'
      }
    }
  }
};

// ==================== SINGLE ROUND TEST ====================

const singleRoundTemplate: TestTemplate = {
  id: 'rounds-single',
  name: 'Single Round (Edge Case)',
  description: 'Test 1 Round block',
  wodScript: `1 Round
  Run 400m`,
  queue: [
    { type: 'push', label: 'Push 1 Round Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount - only round starts' },
    { type: 'next', label: 'Execute child' },
    { type: 'simulate-next', label: 'Complete Run' },
    { type: 'next', label: 'Round done (complete!)' },
  ]
};

export const SingleRoundFlow: Story = {
  args: {
    initialTemplate: singleRoundTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests edge case of single round (essentially a group with round semantics).'
      }
    }
  }
};

// ==================== NESTED ROUNDS TEST ====================

const nestedRoundsTemplate: TestTemplate = {
  id: 'rounds-nested',
  name: 'Nested Rounds',
  description: 'Test rounds inside rounds',
  wodScript: `2 Rounds
  3 Rounds
    5 Pullups`,
  queue: [
    { type: 'push', label: 'Push Outer Rounds', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount outer (Round 1)' },
    { type: 'next', label: 'Start inner rounds' },
    { type: 'next', label: 'Inner Round 1' },
    { type: 'simulate-next', label: 'Complete inner work' },
    { type: 'next', label: 'Inner Round 2' },
    { type: 'simulate-next', label: 'Complete inner work' },
    { type: 'next', label: 'Inner Round 3 → outer Round 2' },
  ]
};

export const NestedRoundsFlow: Story = {
  args: {
    initialTemplate: nestedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests nested rounds structure (rounds within rounds).'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `21-15-9
  Thrusters
  Pullups`
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own rounds block test queue from scratch.'
      }
    }
  }
};
