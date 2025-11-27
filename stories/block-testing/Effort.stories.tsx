import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Effort Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Effort Block Testing

The **Effort Block** is the fundamental unit of work in the WOD Wiki runtime. 
It represents a single exercise or action to be performed.

## Variations

### 1. Generic Effort (RuntimeBlock)
- No explicit reps specified (e.g., "Run 400m", "Rest")
- Uses \`CompletionBehavior\` configured to complete on 'next' event
- Requires user interaction to advance

### 2. Specialized EffortBlock  
- Has explicit reps (e.g., "5 Pullups")
- Tracks \`currentReps\` and \`targetReps\`
- Auto-completes when \`currentReps >= targetReps\`
- Allocates public memory with effort state

## Strategy Matching

The \`EffortStrategy\` matches when:
- NO \`Timer\` fragments present
- NO \`Rounds\` fragments present

This makes it the fallback strategy for simple instruction lines.
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
    id: 'effort-generic-push',
    name: 'Generic Effort - Push',
    description: 'Tests a generic effort block (no reps) like "Run 400m". Should allocate standard block memory but no effort-specific memory.',
    phase: 'push',
    testBlockId: 'generic-effort-1',
    blockFactory: BlockFactories.effort.generic('Run 400m'),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'effort-with-reps-push',
    name: 'Effort with Reps - Push',
    description: 'Tests an effort block with explicit reps (e.g., "5 Pullups"). Should create specialized EffortBlock with rep tracking memory.',
    phase: 'push',
    testBlockId: 'effort-reps-1',
    blockFactory: BlockFactories.effort.withReps(5, 'Pullups'),
    expectations: {
      stackPushes: 1,
      memoryAllocations: 1 // effort state
    }
  },
  {
    id: 'effort-rest-push',
    name: 'Rest Effort - Push',
    description: 'Tests a "Rest" effort block. Should be a generic effort that completes on next event.',
    phase: 'push',
    testBlockId: 'rest-effort-1',
    blockFactory: BlockFactories.effort.rest(),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'effort-inherited-reps-push',
    name: 'Effort with Inherited Reps - Push',
    description: 'Tests an effort block that inherits reps from parent context (e.g., child of "21-15-9"). Pre-seeds public METRIC_REPS memory.',
    phase: 'push',
    testBlockId: 'inherited-effort-1',
    blockFactory: createBlockFactory('Thrusters'),
    runtimeConfig: {
      initialMemory: [
        { type: 'metric:reps', ownerId: 'parent-rounds', value: 21, visibility: 'public' }
      ]
    },
    expectations: {
      stackPushes: 1,
      memoryAllocations: 1 // Should create EffortBlock with inherited reps
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
    id: 'effort-generic-next-no-event',
    name: 'Generic Effort - Next (No Event)',
    description: 'Tests next() on generic effort WITHOUT "next" event. Should NOT complete because CompletionBehavior only triggers on explicit "next" event, not on tick.',
    phase: 'next',
    testBlockId: 'generic-next-1',
    blockFactory: BlockFactories.effort.generic('Run 400m'),
    expectations: {
      actionsReturned: 0 // Should not complete on tick-driven next()
    }
  },
  {
    id: 'effort-reps-partial',
    name: 'Effort with Reps - Partial Progress',
    description: 'Tests EffortBlock with partial rep completion. Block should NOT complete because currentReps < targetReps.',
    phase: 'next',
    testBlockId: 'effort-partial-1',
    blockFactory: BlockFactories.effort.withReps(10, 'Pushups'),
    expectations: {
      actionsReturned: 0 // Not complete yet
    }
  },
  {
    id: 'effort-reps-complete',
    name: 'Effort with Reps - Complete',
    description: 'Tests EffortBlock where reps are already at target. Block should be complete and return PopBlockAction.',
    phase: 'next',
    testBlockId: 'effort-complete-1',
    blockFactory: BlockFactories.effort.withReps(5, 'Pullups'),
    // Pre-configure the effort state to show completion
    runtimeConfig: {
      // Note: In real usage, we'd need to set effort state after mount
      // This tests the completion detection logic
    },
    expectations: {
      // Depends on implementation - may need event simulation
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
    id: 'effort-generic-pop',
    name: 'Generic Effort - Pop',
    description: 'Tests unmount and dispose of a generic effort block. Should release all allocated memory.',
    phase: 'pop',
    testBlockId: 'generic-pop-1',
    blockFactory: BlockFactories.effort.generic('Run 400m'),
    expectations: {
      stackPops: 1
    }
  },
  {
    id: 'effort-reps-pop',
    name: 'Effort with Reps - Pop',
    description: 'Tests unmount and dispose of specialized EffortBlock. Should release effort state memory.',
    phase: 'pop',
    testBlockId: 'effort-reps-pop-1',
    blockFactory: BlockFactories.effort.withReps(5, 'Pullups'),
    expectations: {
      stackPops: 1,
      memoryReleases: 1 // effort state
    }
  }
];

export const PopPhase: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
