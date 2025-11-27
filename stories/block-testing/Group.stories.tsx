import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { BlockFactories, createBlockFactory } from './blockFactories';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Group Block',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Group Block Testing

The **Group Block** acts as a structural container for nested exercises that do not fit 
into specific Timer or Round patterns. It is primarily used to organize hierarchy.

## Strategy: GroupStrategy

Matches when:
- Has child statements (nested content)
- Does NOT match higher-priority strategies (Timer, Rounds, Interval, TimeBoundRounds)

## Intended Behavior

### Current Implementation Status
- **Status**: Placeholder
- The matching logic identifies nested structures
- Compilation creates a simple pass-through block

### Future Implementation
Will use \`LoopCoordinatorBehavior\` with:
- **Loop Type**: \`FIXED\`
- **Total Rounds**: 1
- Executes child blocks in order, once

## Use Cases

### Structural Organization
Grouping exercises under a label:
\`\`\`
Warmup
  Stretch
  Jog
\`\`\`

### Complex Nesting
Creating custom sequences inside other blocks:
\`\`\`
Part A
  10 Pushups
  20 Squats
\`\`\`
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
    id: 'group-simple-push',
    name: 'Simple Group - Push',
    description: 'Tests a simple nested group (e.g., "Warmup" with children). Should set up for sequential execution.',
    phase: 'push',
    testBlockId: 'group-simple-1',
    blockFactory: BlockFactories.group.simple('Warmup', ['Stretch', 'Jog']),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'group-labeled-push',
    name: 'Labeled Group - Push',
    description: 'Tests a group with a label like "Part A". Verifies label is preserved.',
    phase: 'push',
    testBlockId: 'group-labeled-1',
    blockFactory: createBlockFactory(
      `Part A
  10 Pullups
  20 Pushups`,
      { includeChildren: true }
    ),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'group-many-children-push',
    name: 'Group with Many Children - Push',
    description: 'Tests a group with multiple nested items.',
    phase: 'push',
    testBlockId: 'group-many-1',
    blockFactory: createBlockFactory(
      `Mobility
  Hip Circles
  Arm Swings
  Leg Swings
  Torso Twists
  Neck Rolls`,
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
    id: 'group-first-next',
    name: 'Group - First Next',
    description: 'Tests first next() on group. Should push first child block.',
    phase: 'next',
    testBlockId: 'group-next-1',
    blockFactory: BlockFactories.group.simple('Warmup', ['Stretch', 'Jog']),
    expectations: {
      stackPushes: 1 // First child
    }
  },
  {
    id: 'group-advance-child',
    name: 'Group - Advance to Next Child',
    description: 'Tests next() after first child completes. Should push second child.',
    phase: 'next',
    testBlockId: 'group-advance-1',
    blockFactory: BlockFactories.group.simple('Warmup', ['Stretch', 'Jog', 'Run']),
    runtimeConfig: {
      // Pre-configure: first child done
    },
    expectations: {
      stackPushes: 1 // Next child
    }
  },
  {
    id: 'group-all-children-complete',
    name: 'Group - All Children Complete',
    description: 'Tests next() when all children have completed. Should return PopBlockAction.',
    phase: 'next',
    testBlockId: 'group-complete-1',
    blockFactory: BlockFactories.group.simple('Warmup', ['Stretch']),
    runtimeConfig: {
      // Pre-configure: all children done
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
    id: 'group-simple-pop',
    name: 'Simple Group - Pop',
    description: 'Tests unmount and dispose of a group block.',
    phase: 'pop',
    testBlockId: 'group-pop-1',
    blockFactory: BlockFactories.group.simple('Warmup', ['Stretch', 'Jog']),
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

// ==================== STRUCTURAL SCENARIOS ====================

const structuralScenarios: TestScenario[] = [
  {
    id: 'group-child-ordering',
    name: 'Group - Child Ordering',
    description: 'Verify that group executes children in the correct order (top to bottom).',
    phase: 'next',
    testBlockId: 'group-order-1',
    blockFactory: BlockFactories.group.simple('Sequence', ['First', 'Second', 'Third']),
    expectations: {
      // First child should be pushed
    }
  },
  {
    id: 'group-single-pass',
    name: 'Group - Single Pass Only',
    description: 'Verify that group executes children exactly once (no looping).',
    phase: 'push',
    testBlockId: 'group-single-1',
    blockFactory: BlockFactories.group.simple('OneTime', ['Task A', 'Task B']),
    expectations: {
      // Loop type should be FIXED with 1 round
    }
  }
];

export const StructuralBehavior: Story = {
  args: {
    scenarios: structuralScenarios,
    showDetailedDiff: true
  }
};

// ==================== ALL PHASES COMBINED ====================

const allScenarios: TestScenario[] = [
  ...pushScenarios,
  ...nextScenarios,
  ...popScenarios,
  ...structuralScenarios
];

export const AllPhases: Story = {
  args: {
    scenarios: allScenarios,
    showDetailedDiff: true
  }
};
