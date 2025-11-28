import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/AMRAP Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const pushScenarios: TestScenario[] = [
  {
    id: 'amrap-standard-push',
    name: 'Standard AMRAP - Push',
    description: 'Tests "20:00 AMRAP" block push. Should allocate timer memory (countdown) and loop coordinator state.',
    phase: 'push',
    testBlockId: 'amrap-standard-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups', '10 Pushups', '15 Squats']),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 3 // TIME_SPANS, IS_RUNNING, loop state
    }
  },
  {
    id: 'amrap-short-push',
    name: 'Short AMRAP (7 min) - Push',
    description: 'Tests a shorter "7:00 AMRAP" - verifies timer duration parsing.',
    phase: 'push',
    testBlockId: 'amrap-short-1',
    blockFactory: createBlockFactory(
      `7:00 AMRAP
  7 Burpees`,
      { includeChildren: true }
    ),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 3
    }
  },
  {
    id: 'amrap-single-exercise-push',
    name: 'AMRAP Single Exercise - Push',
    description: 'Tests AMRAP with single exercise. Verifies minimal child setup.',
    phase: 'push',
    testBlockId: 'amrap-single-1',
    blockFactory: BlockFactories.amrap.standard('10:00', ['Max Pullups']),
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
    id: 'amrap-first-next',
    name: 'AMRAP - First Next',
    description: 'Tests first next() on AMRAP. Should push first child block and start timer.',
    phase: 'next',
    testBlockId: 'amrap-next-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups', '10 Pushups']),
    expectations: {
      stackPushes: 1 // First child pushed
    }
  },
  {
    id: 'amrap-child-complete-loop',
    name: 'AMRAP - Child Complete (Loop)',
    description: 'Tests next() after child completes while timer still running. Should push next child or restart loop.',
    phase: 'next',
    testBlockId: 'amrap-loop-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups']),
    runtimeConfig: {
      // Pre-configure: timer running, child completed
    },
    expectations: {
      stackPushes: 1 // Loop continues
    }
  },
  {
    id: 'amrap-timer-expired',
    name: 'AMRAP - Timer Expired',
    description: 'Tests next() when timer has expired. Should return PopBlockAction (workout complete).',
    phase: 'next',
    testBlockId: 'amrap-expired-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups']),
    runtimeConfig: {
      // Pre-configure: timer expired
      initialMemory: [
        { 
          type: 'timer:time-spans', 
          ownerId: 'amrap-expired-1', 
          value: [{ start: Date.now() - 1200001, stop: Date.now() }], // 20+ min elapsed
          visibility: 'public' 
        },
        { type: 'timer:is-running', ownerId: 'amrap-expired-1', value: false, visibility: 'public' }
      ]
    },
    expectations: {
      actionsReturned: 1 // PopBlockAction
    }
  },
  {
    id: 'amrap-round-count',
    name: 'AMRAP - Round Count',
    description: 'Tests that AMRAP tracks completed rounds even though loop is infinite.',
    phase: 'next',
    testBlockId: 'amrap-rounds-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups', '10 Pushups']),
    expectations: {
      // Should have round counter in memory
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
    id: 'amrap-standard-pop',
    name: 'Standard AMRAP - Pop',
    description: 'Tests unmount and dispose of AMRAP block. Should stop timer and release all memory.',
    phase: 'pop',
    testBlockId: 'amrap-pop-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups']),
    expectations: {
      stackPops: 1,
      memoryReleases: 3 // Timer + loop state
    }
  },
  {
    id: 'amrap-early-stop-pop',
    name: 'AMRAP - Early Stop Pop',
    description: 'Tests unmount when user stops AMRAP early. Timer should record partial time.',
    phase: 'pop',
    testBlockId: 'amrap-early-pop-1',
    blockFactory: BlockFactories.amrap.standard('20:00', ['5 Pullups']),
    runtimeConfig: {
      // Pre-configure: timer only partially elapsed
      initialMemory: [
        { 
          type: 'timer:time-spans', 
          ownerId: 'amrap-early-pop-1', 
          value: [{ start: Date.now() - 300000 }], // 5 min elapsed, no stop
          visibility: 'public' 
        },
        { type: 'timer:is-running', ownerId: 'amrap-early-pop-1', value: true, visibility: 'public' }
      ]
    },
    expectations: {
      stackPops: 1
      // Timer should record stop time on unmount
    }
  }
];

export const PopPhase: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== COMPOUND BEHAVIOR SCENARIOS ====================

const compoundScenarios: TestScenario[] = [
  {
    id: 'amrap-timer-loop-interaction',
    name: 'Timer + Loop Interaction',
    description: 'Verify that TimerBehavior and LoopCoordinatorBehavior work together correctly.',
    phase: 'push',
    testBlockId: 'amrap-compound-1',
    blockFactory: BlockFactories.amrap.standard('10:00', ['5 Pullups', '10 Pushups']),
    expectations: {
      // Both behaviors should initialize
    }
  },
  {
    id: 'amrap-completion-check',
    name: 'AMRAP Completion Detection',
    description: 'Tests CompletionBehavior checking timer expiration.',
    phase: 'next',
    testBlockId: 'amrap-completion-1',
    blockFactory: BlockFactories.amrap.standard('1:00', ['5 Burpees']),
    expectations: {
      // Completion should check timer state
    }
  }
];

export const CompoundBehaviors: Story = {
  args: {
    scenarios: compoundScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios,
  ...compoundScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
