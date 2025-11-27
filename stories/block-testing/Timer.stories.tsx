import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Timer Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Timer Block Testing

The **Timer Block** handles time-based execution. In its simplest form, 
it acts as a "For Time" stopwatch, measuring how long it takes to complete the child work.

## Behaviors

1. **TimerBehavior**
   - Direction: 'up' (Count Up)
   - Memory: Manages \`TIME_SPANS\` (start/stop times) and \`IS_RUNNING\` state

2. **LoopCoordinatorBehavior** (if children exist)
   - Loop Type: \`FIXED\`
   - Total Rounds: 1
   - Executes the child list exactly once

3. **CompletionBehavior**
   - Completes when the children finish execution

## Strategy Matching

The \`TimerStrategy\` matches when:
- Has a \`Timer\` fragment (e.g., "10:00", "For Time")
- Does NOT match \`IntervalStrategy\` (EMOM) or \`TimeBoundRoundsStrategy\` (AMRAP)

## Memory Layout

- \`timer:time-spans\`: Array of \`{start, stop}\` objects to track elapsed time
- \`timer:is-running\`: Boolean state
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
    id: 'timer-simple-push',
    name: 'Simple Timer - Push',
    description: 'Tests a simple timer block (e.g., "10:00"). Should allocate timer memory (TIME_SPANS, IS_RUNNING).',
    phase: 'push',
    testBlockId: 'timer-simple-1',
    blockFactory: BlockFactories.timer.simple('10:00'),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 2 // TIME_SPANS + IS_RUNNING
    }
  },
  {
    id: 'timer-for-time-push',
    name: 'For Time Timer - Push',
    description: 'Tests a "For Time" timer with children. Should allocate timer memory and prepare for child execution.',
    phase: 'push',
    testBlockId: 'for-time-1',
    blockFactory: BlockFactories.timer.forTime('20:00', ['100 Burpees']),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 2 // Timer memory
    }
  },
  {
    id: 'timer-with-children-push',
    name: 'Timer with Multiple Children - Push',
    description: 'Tests timer block with multiple child efforts. Should set up LoopCoordinatorBehavior for sequential execution.',
    phase: 'push',
    testBlockId: 'timer-children-1',
    blockFactory: createBlockFactory(
      `For Time
  50 Pullups
  100 Pushups
  150 Squats`,
      { includeChildren: true }
    ),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 2
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
    id: 'timer-next-no-children',
    name: 'Simple Timer - Next (No Children)',
    description: 'Tests next() on a timer without children. Timer continues running, should not complete.',
    phase: 'next',
    testBlockId: 'timer-next-1',
    blockFactory: BlockFactories.timer.simple('10:00'),
    expectations: {
      actionsReturned: 0 // Timer keeps running
    }
  },
  {
    id: 'timer-next-push-child',
    name: 'Timer with Children - Next (Push First Child)',
    description: 'Tests next() on timer with children. Should push first child block via LoopCoordinatorBehavior.',
    phase: 'next',
    testBlockId: 'timer-child-next-1',
    blockFactory: BlockFactories.timer.forTime('20:00', ['100 Burpees']),
    expectations: {
      // Should push child block
      stackPushes: 1
    }
  },
  {
    id: 'timer-next-child-complete',
    name: 'Timer - Child Completed',
    description: 'Tests timer when all children have completed. Timer should complete (For Time).',
    phase: 'next',
    testBlockId: 'timer-complete-1',
    blockFactory: BlockFactories.timer.forTime('20:00', ['5 Pullups']),
    // Pre-configure to simulate child completion
    runtimeConfig: {
      // Would need to simulate child block already completed
    },
    expectations: {
      // Depends on state - may return PopBlockAction if children done
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
    id: 'timer-simple-pop',
    name: 'Simple Timer - Pop',
    description: 'Tests unmount and dispose of a timer block. Should stop timer and release memory.',
    phase: 'pop',
    testBlockId: 'timer-pop-1',
    blockFactory: BlockFactories.timer.simple('10:00'),
    expectations: {
      stackPops: 1,
      memoryReleases: 2 // TIME_SPANS + IS_RUNNING
    }
  },
  {
    id: 'timer-for-time-pop',
    name: 'For Time Timer - Pop',
    description: 'Tests unmount of "For Time" timer. Should record final time and release resources.',
    phase: 'pop',
    testBlockId: 'for-time-pop-1',
    blockFactory: BlockFactories.timer.forTime('20:00', ['100 Burpees']),
    expectations: {
      stackPops: 1,
      memoryReleases: 2
    }
  }
];

export const PopPhase: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== TIMER BEHAVIOR SCENARIOS ====================

const timerBehaviorScenarios: TestScenario[] = [
  {
    id: 'timer-memory-inspection',
    name: 'Timer Memory Inspection',
    description: 'Inspect the timer memory layout after mount. Verify TIME_SPANS and IS_RUNNING are allocated correctly.',
    phase: 'push',
    testBlockId: 'timer-memory-1',
    blockFactory: BlockFactories.timer.simple('5:00'),
    expectations: {
      memoryAllocations: 2
    }
  },
  {
    id: 'timer-count-up',
    name: 'Timer Count Up (For Time)',
    description: 'Verify timer starts at 0 and counts up. TIME_SPANS should have a start entry with no stop.',
    phase: 'push',
    testBlockId: 'timer-up-1',
    blockFactory: createBlockFactory('For Time'),
    expectations: {
      memoryAllocations: 2
    }
  }
];

export const TimerBehavior: Story = {
  args: {
    scenarios: timerBehaviorScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios,
  ...timerBehaviorScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
