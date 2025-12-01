/**
 * Group Block Queue Test Stories
 * 
 * Tests for GroupBlock using the new QueueTestHarness with
 * step-by-step execution and TestableRuntime.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Group/Queue Tests',
  component: QueueTestHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Group Block Queue Tests

Test **GroupBlock** behavior using queue-based execution with TestableRuntime.

## Group Characteristics

- **Pure Container**: No timing or rounds
- **Sequential execution**: Children execute in order
- **Pass-through metrics**: Inherits parent context
- **Minimal memory**: Just block metadata

## Use Cases

- Logical grouping of related movements
- Warm-up/cool-down sections
- Supersets and complexes
- Nested structure within rounds/timers
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== SIMPLE GROUP TEST ====================

const simpleGroupTemplate: TestTemplate = {
  id: 'group-simple',
  name: 'Simple Group',
  description: 'Test basic group with sequential children',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats
  10 PVC Pass-throughs`,
  queue: [
    { type: 'push', label: 'Push Warm-up Group', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount group' },
    { type: 'next', label: 'Start first child (Run)' },
    { type: 'simulate-next', label: 'Complete Run 400m' },
    { type: 'next', label: 'Advance to Squats' },
    { type: 'simulate-next', label: 'Complete Air Squats' },
    { type: 'next', label: 'Advance to Pass-throughs' },
    { type: 'simulate-next', label: 'Complete Pass-throughs' },
    { type: 'next', label: 'All children done (group completes)' },
  ]
};

export const SimpleGroupFlow: Story = {
  args: {
    initialTemplate: simpleGroupTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests simple group executing children sequentially until all complete.'
      }
    }
  }
};

// ==================== SUPERSET TEST ====================

const supersetTemplate: TestTemplate = {
  id: 'group-superset',
  name: 'Superset Group',
  description: 'Test superset-style paired movements',
  wodScript: `Superset:
  5 Strict Press
  5 Pullups`,
  queue: [
    { type: 'push', label: 'Push Superset', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount superset' },
    { type: 'next', label: 'Start Press' },
    { type: 'simulate-next', label: 'Complete Press' },
    { type: 'next', label: 'Start Pullups' },
    { type: 'simulate-next', label: 'Complete Pullups' },
    { type: 'next', label: 'Superset done' },
  ]
};

export const SupersetFlow: Story = {
  args: {
    initialTemplate: supersetTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests superset-style group with complementary movements.'
      }
    }
  }
};

// ==================== BARBELL COMPLEX TEST ====================

const complexTemplate: TestTemplate = {
  id: 'group-complex',
  name: 'Barbell Complex',
  description: 'Test barbell complex with multiple movements',
  wodScript: `Barbell Complex:
  3 Deadlifts
  3 Hang Cleans
  3 Front Squats
  3 Push Press`,
  queue: [
    { type: 'push', label: 'Push Complex', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount complex' },
    { type: 'next', label: 'Deadlifts' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Hang Cleans' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Front Squats' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Push Press' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Complex done' },
  ]
};

export const BarbellComplexFlow: Story = {
  args: {
    initialTemplate: complexTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests barbell complex with 4 movements performed without rest.'
      }
    }
  }
};

// ==================== NESTED GROUP TEST ====================

const nestedGroupTemplate: TestTemplate = {
  id: 'group-nested',
  name: 'Nested Groups',
  description: 'Test groups nested within groups',
  wodScript: `Workout:
  Part A:
    Run 400m
    20 Air Squats
  Part B:
    50 Pushups`,
  queue: [
    { type: 'push', label: 'Push Outer Group', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount outer group' },
    { type: 'next', label: 'Start Part A (inner group)' },
    { type: 'next', label: 'Part A: Run' },
    { type: 'simulate-next', label: 'Complete Run' },
    { type: 'next', label: 'Part A: Squats' },
    { type: 'simulate-next', label: 'Complete Squats' },
    { type: 'next', label: 'Part A done → Part B' },
    { type: 'next', label: 'Part B: Pushups' },
    { type: 'simulate-next', label: 'Complete Pushups' },
    { type: 'next', label: 'All parts done (complete!)' },
  ]
};

export const NestedGroupFlow: Story = {
  args: {
    initialTemplate: nestedGroupTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests nested group structure (groups within groups).'
      }
    }
  }
};

// ==================== GROUP IN ROUNDS TEST ====================

const groupInRoundsTemplate: TestTemplate = {
  id: 'group-in-rounds',
  name: 'Group Inside Rounds',
  description: 'Test group as child of rounds block',
  wodScript: `3 Rounds
  Complex:
    5 Cleans
    5 Push Press
  Rest 1:00`,
  queue: [
    { type: 'push', label: 'Push Rounds', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount Rounds (R1)' },
    { type: 'next', label: 'Start Complex' },
    { type: 'next', label: 'Complex: Cleans' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Complex: Push Press' },
    { type: 'simulate-next', label: 'Complete' },
    { type: 'next', label: 'Complex done → Rest' },
    { type: 'simulate-next', label: 'Rest done' },
    { type: 'next', label: 'Round 1 done → Round 2' },
  ]
};

export const GroupInRoundsFlow: Story = {
  args: {
    initialTemplate: groupInRoundsTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests group block nested inside a rounds block.'
      }
    }
  }
};

// ==================== SINGLE CHILD GROUP ====================

const singleChildTemplate: TestTemplate = {
  id: 'group-single-child',
  name: 'Single Child Group',
  description: 'Test edge case: group with only one child',
  wodScript: `Section:
  Run 1 mile`,
  queue: [
    { type: 'push', label: 'Push Group', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount' },
    { type: 'next', label: 'Start only child' },
    { type: 'simulate-next', label: 'Complete Run' },
    { type: 'next', label: 'Group done (single child case)' },
  ]
};

export const SingleChildFlow: Story = {
  args: {
    initialTemplate: singleChildTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests edge case of group with only one child element.'
      }
    }
  }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `Warm-up:
  Run 400m
  10 Air Squats
  10 PVC Pass-throughs
  10 Lunges`
  },
  parameters: {
    docs: {
      description: {
        story: 'Build your own group block test queue from scratch.'
      }
    }
  }
};
