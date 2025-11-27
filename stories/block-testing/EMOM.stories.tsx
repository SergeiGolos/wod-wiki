import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/EMOM Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# EMOM (Interval) Block Testing

The **Interval Block** manages "Every Minute On the Minute" (EMOM) style workouts. 
It repeats work at fixed time intervals.

## Strategy: IntervalStrategy

Matches when:
- Has a \`Timer\` fragment
- Has an \`Action\` or \`Effort\` fragment containing "EMOM"

## Behaviors

1. **LoopCoordinatorBehavior**
   - Loop Type: \`INTERVAL\`
   - Interval Duration: Derived from timer (e.g., "1:00" = 60000ms per minute)
   - Total Rounds: Derived from syntax (e.g., "10" minutes = 10 rounds)
   - Execution:
     - Starts the children
     - When children complete, waits for remainder of interval
     - Restarts children at next interval boundary

2. **HistoryBehavior** 
   - Records "EMOM" history

3. **CompletionBehavior** 
   - Completes when all intervals finished

## Example

\`\`\`
EMOM 10
  3 Cleans
\`\`\`

- Minute 0: "3 Cleans" executes
- User completes at 0:20
- System waits until 1:00
- Minute 1: "3 Cleans" restarts
- Repeats until Minute 10
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
    id: 'emom-standard-push',
    name: 'Standard EMOM (10 min) - Push',
    description: 'Tests "EMOM 10" block push. Should allocate interval tracking state.',
    phase: 'push',
    testBlockId: 'emom-standard-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 2 // Timer + interval state
    }
  },
  {
    id: 'emom-short-push',
    name: 'Short EMOM (5 min) - Push',
    description: 'Tests shorter "EMOM 5" - verifies minute count parsing.',
    phase: 'push',
    testBlockId: 'emom-short-1',
    blockFactory: createBlockFactory(
      `EMOM 5
  10 Pushups`,
      { includeChildren: true }
    ),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'emom-multiple-exercises-push',
    name: 'EMOM Multiple Exercises - Push',
    description: 'Tests EMOM with multiple exercises per interval.',
    phase: 'push',
    testBlockId: 'emom-multi-1',
    blockFactory: createBlockFactory(
      `EMOM 12
  3 Power Cleans
  6 Pushups
  9 Squats`,
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
    id: 'emom-first-next',
    name: 'EMOM - First Next (Start Interval)',
    description: 'Tests first next() on EMOM. Should push first child and start interval timer.',
    phase: 'next',
    testBlockId: 'emom-next-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    expectations: {
      stackPushes: 1 // First child pushed
    }
  },
  {
    id: 'emom-child-complete-wait',
    name: 'EMOM - Child Complete (Wait for Interval)',
    description: 'Tests next() after child completes mid-interval. Should wait for interval end.',
    phase: 'next',
    testBlockId: 'emom-wait-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    runtimeConfig: {
      // Pre-configure: child done, interval not expired
    },
    expectations: {
      actionsReturned: 0 // Waiting for interval
    }
  },
  {
    id: 'emom-interval-boundary',
    name: 'EMOM - Interval Boundary',
    description: 'Tests next() at interval boundary. Should push child for next interval.',
    phase: 'next',
    testBlockId: 'emom-boundary-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    runtimeConfig: {
      // Pre-configure: at interval boundary
    },
    expectations: {
      stackPushes: 1 // Next interval starts
    }
  },
  {
    id: 'emom-final-interval-complete',
    name: 'EMOM - Final Interval Complete',
    description: 'Tests next() when all intervals done. Should return PopBlockAction.',
    phase: 'next',
    testBlockId: 'emom-complete-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    runtimeConfig: {
      // Pre-configure: all 10 intervals done
      initialMemory: [
        { type: 'interval:current', ownerId: 'emom-complete-1', value: 10, visibility: 'private' }
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
    id: 'emom-standard-pop',
    name: 'Standard EMOM - Pop',
    description: 'Tests unmount and dispose of EMOM block. Should release interval tracking.',
    phase: 'pop',
    testBlockId: 'emom-pop-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    expectations: {
      stackPops: 1,
      memoryReleases: 2
    }
  },
  {
    id: 'emom-early-stop-pop',
    name: 'EMOM - Early Stop Pop',
    description: 'Tests unmount when user stops EMOM before all intervals complete.',
    phase: 'pop',
    testBlockId: 'emom-early-pop-1',
    blockFactory: BlockFactories.emom.standard(10, ['3 Cleans']),
    runtimeConfig: {
      // Pre-configure: only 5 intervals done
      initialMemory: [
        { type: 'interval:current', ownerId: 'emom-early-pop-1', value: 5, visibility: 'private' }
      ]
    },
    expectations: {
      stackPops: 1
    }
  }
];

export const PopPhase: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== INTERVAL BEHAVIOR SCENARIOS ====================

const intervalScenarios: TestScenario[] = [
  {
    id: 'emom-interval-duration',
    name: 'EMOM - Interval Duration',
    description: 'Verify that EMOM correctly calculates 1-minute interval duration (60000ms).',
    phase: 'push',
    testBlockId: 'emom-duration-1',
    blockFactory: BlockFactories.emom.standard(10, ['5 Burpees']),
    expectations: {
      // Check interval duration in memory
    }
  },
  {
    id: 'emom-round-tracking',
    name: 'EMOM - Round/Interval Tracking',
    description: 'Tests that EMOM tracks which interval is current (1/10, 2/10, etc.).',
    phase: 'push',
    testBlockId: 'emom-tracking-1',
    blockFactory: BlockFactories.emom.standard(10, ['5 Pullups']),
    expectations: {
      // Should have interval counter in memory
    }
  }
];

export const IntervalBehavior: Story = {
  args: {
    scenarios: intervalScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios,
  ...intervalScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
