import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Rounds Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Rounds Block Testing

The **Rounds Block** is a structural container that executes its child blocks multiple times. 
It handles standard multi-round workouts and variable repetition schemes.

## Variations

### 1. Fixed Rounds
Standard looping behavior where the block repeats its children a set number of times.

\`\`\`
3 Rounds
  5 Pullups
  10 Pushups
\`\`\`

- **Loop Type**: \`FIXED\`
- Cycles through child groups N times

### 2. Rep Schemes
Variable looping where the "reps" count changes for each round.

\`\`\`
21-15-9
  Thrusters
  Pullups
\`\`\`

- **Loop Type**: \`REP_SCHEME\`
- Allocates \`METRIC_REPS\` in public memory
- Updates value each round (21 → 15 → 9)
- Child EffortBlocks inherit this value

## Strategy Matching

The \`RoundsStrategy\` matches when:
- Has a \`Rounds\` fragment (e.g., "3 rounds", "21-15-9")
- Has NO \`Timer\` fragment (Timer takes precedence)

## Behaviors

1. **LoopCoordinatorBehavior**
   - Manages iteration, round tracking
   - JIT compiles children on demand

2. **HistoryBehavior** 
   - Records execution history

3. **CompletionBehavior**
   - Completes when all rounds finished
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const pushScenarios: TestScenario[] = [
  {
    id: 'rounds-fixed-push',
    name: 'Fixed Rounds - Push',
    description: 'Tests "3 Rounds" block push. Should allocate round tracking memory and set up LoopCoordinatorBehavior.',
    phase: 'push',
    testBlockId: 'rounds-fixed-1',
    blockFactory: BlockFactories.rounds.fixed(3, ['10 Pushups']),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 1 // Round state
    }
  },
  {
    id: 'rounds-rep-scheme-push',
    name: 'Rep Scheme (21-15-9) - Push',
    description: 'Tests "21-15-9" rep scheme block push. Should allocate METRIC_REPS in public memory for child inheritance.',
    phase: 'push',
    testBlockId: 'rep-scheme-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters', 'Pullups']),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 2 // Round state + METRIC_REPS (public)
    }
  },
  {
    id: 'rounds-single-round-push',
    name: 'Single Round - Push',
    description: 'Tests "1 Round" block - effectively a group with round tracking.',
    phase: 'push',
    testBlockId: 'single-round-1',
    blockFactory: BlockFactories.rounds.fixed(1, ['50 Pullups']),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'rounds-many-children-push',
    name: 'Rounds with Many Children - Push',
    description: 'Tests rounds block with multiple child efforts.',
    phase: 'push',
    testBlockId: 'rounds-many-1',
    blockFactory: createBlockFactory(
      `5 Rounds
  10 Pullups
  20 Pushups
  30 Squats
  40 Situps`,
      { includeChildren: true }
    ),
    expectations: {
      stackPushes: 1
    }
  }
];

export const PushPhase: Story = {
  args: {
    scenarios: pushScenarios,
    showDetailedDiff: true
  }
};

// ==================== NEXT PHASE SCENARIOS ====================

const nextScenarios: TestScenario[] = [
  {
    id: 'rounds-first-next',
    name: 'Fixed Rounds - First Next',
    description: 'Tests first next() call on rounds block. Should push first child block.',
    phase: 'next',
    testBlockId: 'rounds-next-1',
    blockFactory: BlockFactories.rounds.fixed(3, ['10 Pushups']),
    expectations: {
      stackPushes: 1 // First child pushed
    }
  },
  {
    id: 'rounds-rep-scheme-next',
    name: 'Rep Scheme - First Next',
    description: 'Tests first next() on "21-15-9". Should push first child AND have METRIC_REPS=21 in memory.',
    phase: 'next',
    testBlockId: 'rep-scheme-next-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters']),
    expectations: {
      stackPushes: 1
      // Should also verify METRIC_REPS value is 21
    }
  },
  {
    id: 'rounds-round-transition',
    name: 'Rounds - Round Transition',
    description: 'Tests next() after completing first round. Should increment round counter and restart children.',
    phase: 'next',
    testBlockId: 'rounds-transition-1',
    blockFactory: BlockFactories.rounds.fixed(3, ['5 Pullups']),
    runtimeConfig: {
      // Pre-configure to simulate round 1 completed
      initialMemory: [
        { type: 'rounds:current', ownerId: 'rounds-transition-1', value: 1, visibility: 'private' }
      ]
    },
    expectations: {
      // Should advance to round 2
    }
  },
  {
    id: 'rounds-rep-scheme-transition',
    name: 'Rep Scheme - Round Transition (21→15)',
    description: 'Tests rep scheme transitioning from round 1 to 2. METRIC_REPS should update from 21 to 15.',
    phase: 'next',
    testBlockId: 'scheme-transition-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters']),
    runtimeConfig: {
      // Pre-configure round 1 complete
    },
    expectations: {
      // Verify METRIC_REPS changes
    }
  },
  {
    id: 'rounds-final-round-complete',
    name: 'Rounds - Final Round Complete',
    description: 'Tests next() when all rounds are done. Should return PopBlockAction.',
    phase: 'next',
    testBlockId: 'rounds-complete-1',
    blockFactory: BlockFactories.rounds.fixed(3, ['5 Pullups']),
    runtimeConfig: {
      // Pre-configure at final round
      initialMemory: [
        { type: 'rounds:current', ownerId: 'rounds-complete-1', value: 3, visibility: 'private' }
      ]
    },
    expectations: {
      actionsReturned: 1 // PopBlockAction
    }
  }
];

export const NextPhase: Story = {
  args: {
    scenarios: nextScenarios,
    showDetailedDiff: true
  }
};

// ==================== POP PHASE SCENARIOS ====================

const popScenarios: TestScenario[] = [
  {
    id: 'rounds-fixed-pop',
    name: 'Fixed Rounds - Pop',
    description: 'Tests unmount and dispose of rounds block. Should release round tracking memory.',
    phase: 'pop',
    testBlockId: 'rounds-pop-1',
    blockFactory: BlockFactories.rounds.fixed(3, ['10 Pushups']),
    expectations: {
      stackPops: 1,
      memoryReleases: 1
    }
  },
  {
    id: 'rounds-rep-scheme-pop',
    name: 'Rep Scheme - Pop',
    description: 'Tests unmount of rep scheme block. Should release round state AND public METRIC_REPS.',
    phase: 'pop',
    testBlockId: 'rep-scheme-pop-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters']),
    expectations: {
      stackPops: 1,
      memoryReleases: 2 // Round state + METRIC_REPS
    }
  }
];

export const PopPhase: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== METRIC INHERITANCE SCENARIOS ====================

const inheritanceScenarios: TestScenario[] = [
  {
    id: 'rounds-metric-visibility',
    name: 'Rep Scheme - METRIC_REPS Visibility',
    description: 'Verify that rep scheme allocates METRIC_REPS with PUBLIC visibility for child inheritance.',
    phase: 'push',
    testBlockId: 'metric-visibility-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters']),
    expectations: {
      // Check memory has public visibility
    }
  },
  {
    id: 'rounds-child-inherits-reps',
    name: 'Child Effort Inherits Reps',
    description: 'Tests that child effort blocks can find and inherit METRIC_REPS from parent rounds block.',
    phase: 'next',
    testBlockId: 'child-inherit-1',
    blockFactory: BlockFactories.rounds.repScheme([21, 15, 9], ['Thrusters']),
    expectations: {
      // Child should become EffortBlock with 21 reps
    }
  }
];

export const MetricInheritance: Story = {
  args: {
    scenarios: inheritanceScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios,
  ...inheritanceScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
