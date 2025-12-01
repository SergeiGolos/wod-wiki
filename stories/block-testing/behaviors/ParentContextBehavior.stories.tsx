/**
 * ParentContextBehavior Queue-Based Tests
 * 
 * Tests for ParentContextBehavior using the QueueTestHarness framework.
 * Migrated from src/runtime/behaviors/tests/parent-context.contract.test.ts
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Behaviors/Parent Context',
  component: QueueTestHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# ParentContextBehavior Tests

Tests for the ParentContextBehavior which manages parent-child block relationships
and context inheritance.

## Key Behaviors Tested

1. **Parent Reference Storage** - Store and retrieve parent block reference
2. **Immutability** - Parent reference cannot be modified after construction
3. **Nested Contexts** - Support for grandparent→parent→child hierarchies
4. **Context Access** - Access parent block properties through behavior
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

// ==================== PARENT CONTEXT TEMPLATES ====================

const nestedRoundsTemplate: TestTemplate = {
  id: 'nested-rounds',
  name: '🔗 Nested Parent Context',
  description: 'Test parent-child context inheritance with nested blocks',
  wodScript: `3 Rounds
  2 Rounds
    5 Pushups`,
  queue: [
    { type: 'push', label: 'Push Outer Rounds (parent)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Outer' },
    { type: 'next', label: 'Push Inner Rounds (child)' },
    { type: 'next', label: 'Inner has parent context' },
    { type: 'next', label: 'Advance inner' },
  ]
};

const timerWithChildTemplate: TestTemplate = {
  id: 'timer-with-child',
  name: '⏱️ Timer → Child Context',
  description: 'Test timer block provides parent context to children',
  wodScript: `5:00 For Time:
  10 Burpees
  Run 200m`,
  queue: [
    { type: 'push', label: 'Push Timer (parent)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Timer' },
    { type: 'next', label: 'Push Effort (child has timer context)' },
    { type: 'next', label: 'Effort can access timer' },
    { type: 'next', label: 'Push Run (also has timer context)' },
  ]
};

const deepNestingTemplate: TestTemplate = {
  id: 'deep-nesting',
  name: '📊 Deep Nesting (3 levels)',
  description: 'Test grandparent→parent→child context chain',
  wodScript: `For Time:
  3 Rounds
    2 Rounds
      5 Squats`,
  queue: [
    { type: 'push', label: 'Push Timer (grandparent)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Timer' },
    { type: 'next', label: 'Push Outer Rounds (parent)' },
    { type: 'next', label: 'Push Inner Rounds (child)' },
    { type: 'next', label: 'Push Effort (grandchild)' },
  ]
};

const amrapContextTemplate: TestTemplate = {
  id: 'amrap-context',
  name: '🏋️ AMRAP Context',
  description: 'Test AMRAP provides both timer and rounds context',
  wodScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`,
  queue: [
    { type: 'push', label: 'Push AMRAP (parent)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount AMRAP' },
    { type: 'next', label: 'Child has timer+rounds context' },
    { type: 'tick', label: 'Tick (context maintained)' },
    { type: 'next', label: 'Next child same context' },
  ]
};

const siblingContextTemplate: TestTemplate = {
  id: 'sibling-context',
  name: '👫 Sibling Context Independence',
  description: 'Test siblings have independent contexts',
  wodScript: `3 Rounds
  5 Pushups
  10 Squats`,
  queue: [
    { type: 'push', label: 'Push Rounds (parent)', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Rounds' },
    { type: 'next', label: 'Push Pushups (sibling 1)' },
    { type: 'next', label: 'Pop Pushups, Push Squats (sibling 2)' },
    { type: 'next', label: 'Siblings share same parent context' },
  ]
};

// ==================== STORIES ====================

export const Default: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    customTemplates: [
      nestedRoundsTemplate,
      timerWithChildTemplate,
      deepNestingTemplate,
      amrapContextTemplate,
      siblingContextTemplate,
    ],
    initialTemplate: nestedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'All ParentContextBehavior tests available via template selection.'
      }
    }
  }
};

export const NestedRounds: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: nestedRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Nested Parent Context

Tests parent-child context inheritance with nested rounds blocks.

**Expected:**
- Inner rounds can access outer rounds as parent
- \`getParentContext()\` returns outer rounds block
- \`hasParentContext()\` returns true for inner block
        `
      }
    }
  }
};

export const TimerWithChild: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: timerWithChildTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Timer → Child Context

Tests timer block provides parent context to children.

**Expected:**
- Child effort blocks can access timer parent
- Timer's time state available to children
- Multiple children share same parent reference
        `
      }
    }
  }
};

export const DeepNesting: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: deepNestingTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Deep Nesting (3 levels)

Tests grandparent→parent→child context chain.

**Expected:**
- Each level has its own parent context
- Child can access parent but not grandparent directly
- Context chain is maintained through hierarchy
        `
      }
    }
  }
};

export const AMRAPContext: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: amrapContextTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: AMRAP Context

Tests AMRAP provides both timer and rounds context.

**Expected:**
- Children inherit both timer and rounds behavior context
- Round counter accessible through parent
- Timer state accessible through parent
        `
      }
    }
  }
};

export const SiblingContextIndependence: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: siblingContextTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Sibling Context Independence

Tests siblings have independent but share parent context.

**Expected:**
- Each sibling gets same parent reference
- Siblings don't affect each other's context
- Parent context immutable during execution
        `
      }
    }
  }
};
