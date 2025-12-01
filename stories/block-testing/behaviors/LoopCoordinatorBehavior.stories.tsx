/**
 * LoopCoordinatorBehavior Queue-Based Tests
 * 
 * Tests for LoopCoordinatorBehavior using the QueueTestHarness framework.
 * Migrated from src/runtime/behaviors/tests/LoopCoordinatorBehavior.test.ts
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Behaviors/Loop Coordinator',
  component: QueueTestHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# LoopCoordinatorBehavior Tests

Tests for the unified LoopCoordinatorBehavior which manages round iteration,
child group progression, and completion detection.

## Loop Types

1. **FIXED** - Fixed number of rounds (e.g., "3 Rounds")
2. **REP_SCHEME** - Rep scheme per round (e.g., "21-15-9")
3. **TIME_BOUND** - AMRAP (continue until time expires)
4. **INTERVAL** - EMOM (interval-based progression)

## Key Behaviors Tested

1. **State Calculations** - Index, position, rounds tracking
2. **Fixed Rounds** - Complete after specified rounds
3. **Rep Scheme** - Correct reps per round
4. **Child Progression** - Cycles through child groups
5. **Completion Detection** - Knows when to stop
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

// ==================== LOOP COORDINATOR TEMPLATES ====================

const fixedRoundsTemplate: TestTemplate = {
  id: 'fixed-rounds',
  name: '🔄 Fixed Rounds',
  description: 'Test fixed round iteration (3 Rounds)',
  wodScript: `3 Rounds
  10 Pushups
  15 Squats`,
  queue: [
    { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Round 1)' },
    { type: 'next', label: 'Round 1 Child 1' },
    { type: 'next', label: 'Round 1 Child 2' },
    { type: 'next', label: '→ Round 2' },
    { type: 'next', label: 'Round 2 Child 1' },
    { type: 'next', label: 'Round 2 Child 2' },
    { type: 'next', label: '→ Round 3' },
    { type: 'next', label: 'Round 3 Child 1' },
    { type: 'next', label: 'Round 3 Child 2' },
    { type: 'next', label: 'Complete (no more rounds)' },
  ]
};

const repSchemeTemplate: TestTemplate = {
  id: 'rep-scheme',
  name: '📊 Rep Scheme (21-15-9)',
  description: 'Test rep scheme iteration like Fran',
  wodScript: `21-15-9
  Thrusters
  Pullups`,
  queue: [
    { type: 'push', label: 'Push Rep Scheme Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (21 reps)' },
    { type: 'next', label: '21 Thrusters' },
    { type: 'next', label: '21 Pullups' },
    { type: 'next', label: '→ 15 reps' },
    { type: 'next', label: '15 Thrusters' },
    { type: 'next', label: '15 Pullups' },
    { type: 'next', label: '→ 9 reps' },
    { type: 'next', label: '9 Thrusters' },
    { type: 'next', label: '9 Pullups' },
    { type: 'next', label: 'Complete' },
  ]
};

const timeBoundAMRAPTemplate: TestTemplate = {
  id: 'time-bound-amrap',
  name: '⏱️ AMRAP (Time-Bound)',
  description: 'Test AMRAP continues until time expires',
  wodScript: `15:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`,
  queue: [
    { type: 'push', label: 'Push AMRAP Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Start AMRAP)' },
    { type: 'next', label: 'Round 1: Pullups' },
    { type: 'next', label: 'Round 1: Pushups' },
    { type: 'next', label: 'Round 1: Squats' },
    { type: 'next', label: '→ Round 2' },
    { type: 'tick', label: 'Timer tick' },
    { type: 'next', label: 'Round 2: Pullups' },
    { type: 'next', label: 'Round 2: Pushups' },
    { type: 'tick', label: 'Timer tick (continues...)' },
  ]
};

const intervalEMOMTemplate: TestTemplate = {
  id: 'interval-emom',
  name: '⏰ EMOM (Intervals)',
  description: 'Test EMOM interval-based progression',
  wodScript: `EMOM 10
  5 Power Cleans`,
  queue: [
    { type: 'push', label: 'Push EMOM Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Minute 1)' },
    { type: 'next', label: 'Minute 1: Cleans' },
    { type: 'tick', label: 'Interval ends → Minute 2' },
    { type: 'next', label: 'Minute 2: Cleans' },
    { type: 'tick', label: 'Interval ends → Minute 3' },
    { type: 'next', label: 'Minute 3: Cleans' },
  ]
};

const singleChildGroupTemplate: TestTemplate = {
  id: 'single-child-group',
  name: '1️⃣ Single Child',
  description: 'Test single child group (position always 0)',
  wodScript: `5 Rounds
  10 Burpees`,
  queue: [
    { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Round 1)' },
    { type: 'next', label: 'Round 1: Burpees' },
    { type: 'next', label: '→ Round 2: Burpees' },
    { type: 'next', label: '→ Round 3: Burpees' },
    { type: 'next', label: '→ Round 4: Burpees' },
    { type: 'next', label: '→ Round 5: Burpees' },
    { type: 'next', label: 'Complete' },
  ]
};

const threeChildGroupsTemplate: TestTemplate = {
  id: 'three-child-groups',
  name: '3️⃣ Three Child Groups',
  description: 'Test 3 child groups with position cycling 0→1→2→0...',
  wodScript: `2 Rounds
  Run 200m
  20 Pushups
  10 Pullups`,
  queue: [
    { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (Round 1)' },
    { type: 'next', label: 'R1 pos=0: Run' },
    { type: 'next', label: 'R1 pos=1: Pushups' },
    { type: 'next', label: 'R1 pos=2: Pullups' },
    { type: 'next', label: '→ Round 2' },
    { type: 'next', label: 'R2 pos=0: Run' },
    { type: 'next', label: 'R2 pos=1: Pushups' },
    { type: 'next', label: 'R2 pos=2: Pullups' },
    { type: 'next', label: 'Complete' },
  ]
};

const completionDetectionTemplate: TestTemplate = {
  id: 'completion-detection',
  name: '✅ Completion Detection',
  description: 'Test isComplete() returns true after all rounds',
  wodScript: `2 Rounds
  5 Squats`,
  queue: [
    { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (isComplete=false)' },
    { type: 'next', label: 'Round 1 (isComplete=false)' },
    { type: 'next', label: 'Round 2 (isComplete=false)' },
    { type: 'next', label: 'After Round 2 (isComplete=true)' },
  ]
};

// ==================== STORIES ====================

export const Default: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    customTemplates: [
      fixedRoundsTemplate,
      repSchemeTemplate,
      timeBoundAMRAPTemplate,
      intervalEMOMTemplate,
      singleChildGroupTemplate,
      threeChildGroupsTemplate,
      completionDetectionTemplate,
    ],
    initialTemplate: fixedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'All LoopCoordinatorBehavior tests available via template selection.'
      }
    }
  }
};

export const FixedRounds: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: fixedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Fixed Rounds

Tests fixed round iteration (e.g., "3 Rounds").

**Expected:**
- Cycles through all children in each round
- Advances to next round after last child
- Completes after totalRounds rounds
- \`isComplete()\` returns true after all rounds
        `
      }
    }
  }
};

export const RepScheme: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: repSchemeTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Rep Scheme (21-15-9)

Tests rep scheme iteration like Fran.

**Expected:**
- Round 0: 21 reps
- Round 1: 15 reps
- Round 2: 9 reps
- \`getRepsForCurrentRound()\` returns correct value
        `
      }
    }
  }
};

export const TimeBoundAMRAP: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timeBoundAMRAPTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: AMRAP (Time-Bound)

Tests AMRAP continues until time expires.

**Expected:**
- Loop continues indefinitely while timer running
- Completes when timer:complete event received
- Tracks completed rounds via \`getCompletedRounds()\`
        `
      }
    }
  }
};

export const IntervalEMOM: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: intervalEMOMTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: EMOM (Intervals)

Tests EMOM interval-based progression.

**Expected:**
- Work starts at beginning of each interval
- Interval timer controls progression
- Next interval starts on tick event
        `
      }
    }
  }
};

export const SingleChildGroup: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: singleChildGroupTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Single Child Group

Tests single child group where position is always 0.

**Expected:**
- Position always 0
- Rounds = index (when only 1 child)
- Each \`next()\` advances one round
        `
      }
    }
  }
};

export const ThreeChildGroups: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: threeChildGroupsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Three Child Groups

Tests 3 child groups with position cycling.

**Expected:**
- Position cycles: 0 → 1 → 2 → 0 → 1 → 2 → ...
- Round advances after position wraps
- State: \`rounds = floor(index / 3)\`
        `
      }
    }
  }
};

export const CompletionDetection: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: completionDetectionTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Completion Detection

Tests \`isComplete()\` returns true after all rounds.

**Expected:**
- \`isComplete()\` returns false during execution
- \`isComplete()\` returns true after last round
- \`onNext()\` returns empty array when complete
        `
      }
    }
  }
};
