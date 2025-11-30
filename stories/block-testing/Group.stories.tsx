/**
 * Group Block Test Scenarios
 * 
 * Tests for structural grouping blocks that organize child statements.
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/Group Block',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Group Block Testing

The **Group Block** is a structural container that organizes child statements
without adding timing or round constraints. It's the simplest parent block type.

## Key Characteristics

- **No timing**: Children execute sequentially without time pressure
- **No rounds**: Single pass through all children
- **Sequential execution**: First child → Last child → Complete
- **Pass-through metrics**: Inherits parent metrics to children

## Strategy Matching

The \`GroupStrategy\` matches when:
- Statement HAS children
- NO \`Timer\` fragment
- NO \`Rounds\` fragment  
- NO special actions (EMOM, etc.)

This is essentially the fallback for parent statements.

## Use Cases

1. **Logical grouping**: Organize related movements
2. **Complex workout structure**: Nest within rounds/timers
3. **Warm-up/Cool-down**: Group preparation work
4. **Super-sets**: Group complementary movements

## Memory Allocations

Group blocks allocate minimal memory:
- Standard block metadata only
- No timer, loop, or effort-specific memory
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const simpleGroupPush: ScenarioDefinition = {
  id: 'group-simple-push',
  name: 'Simple Group - Push',
  description: 'Tests a basic group with multiple child statements. Should initialize as container.',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats
  10 PVC Pass-throughs`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const nestedGroupPush: ScenarioDefinition = {
  id: 'group-nested-push',
  name: 'Nested Group - Push',
  description: 'Tests a group nested inside another structure.',
  wodScript: `3 Rounds:
  Complex:
    5 Pullups
    10 Pushups
  Run 200m`,
  targetStatementId: 2,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const supersetGroupPush: ScenarioDefinition = {
  id: 'group-superset-push',
  name: 'Superset Group - Push',
  description: 'Tests a superset-style group with complementary movements.',
  wodScript: `Superset:
  5 Strict Press
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const emptyParentPush: ScenarioDefinition = {
  id: 'group-empty-parent-push',
  name: 'Parent Without Children - Push',
  description: 'Tests a labeled statement that has no explicit children (edge case).',
  wodScript: `Section A:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

export const SimpleGroupPush: Story = {
  args: { initialScenario: simpleGroupPush }
};

export const NestedGroupPush: Story = {
  args: { initialScenario: nestedGroupPush }
};

export const SupersetGroupPush: Story = {
  args: { initialScenario: supersetGroupPush }
};

export const EmptyParentPush: Story = {
  args: { initialScenario: emptyParentPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const groupFirstChild: ScenarioDefinition = {
  id: 'group-first-child',
  name: 'Group - First Child Executing',
  description: 'Tests group with first child on stack. Should continue to next child when first completes.',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats
  10 Lunges`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'next'
};

const groupMiddleChild: ScenarioDefinition = {
  id: 'group-middle-child',
  name: 'Group - Middle Child Executing',
  description: 'Tests group after first child completed, second child in progress.',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats
  10 Lunges`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'next'
};

const groupLastChild: ScenarioDefinition = {
  id: 'group-last-child',
  name: 'Group - Last Child Completing',
  description: 'Tests group when last child is about to complete. Group should then pop.',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'next'
};

const groupSingleChild: ScenarioDefinition = {
  id: 'group-single-child',
  name: 'Group - Single Child',
  description: 'Tests group with only one child (degenerate case).',
  wodScript: `Section:
  Run 1 mile`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'next'
};

export const GroupFirstChild: Story = {
  args: { initialScenario: groupFirstChild }
};

export const GroupMiddleChild: Story = {
  args: { initialScenario: groupMiddleChild }
};

export const GroupLastChild: Story = {
  args: { initialScenario: groupLastChild }
};

export const GroupSingleChild: Story = {
  args: { initialScenario: groupSingleChild }
};

// ==================== POP PHASE SCENARIOS ====================

const groupPop: ScenarioDefinition = {
  id: 'group-pop',
  name: 'Group - Pop',
  description: 'Tests unmount and dispose of group block. Should release minimal memory.',
  wodScript: `Warm-up:
  Run 400m
  10 Air Squats`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

const nestedGroupPop: ScenarioDefinition = {
  id: 'group-nested-pop',
  name: 'Nested Group - Pop',
  description: 'Tests unmount of a group that was nested in another structure.',
  wodScript: `3 Rounds:
  Complex:
    5 Pullups
    10 Pushups
  Run 200m`,
  targetStatementId: 2,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

export const GroupPop: Story = {
  args: { initialScenario: groupPop }
};

export const NestedGroupPop: Story = {
  args: { initialScenario: nestedGroupPop }
};

// ==================== COMPLEX NESTING SCENARIOS ====================

const deeplyNestedGroup: ScenarioDefinition = {
  id: 'group-deeply-nested',
  name: 'Deeply Nested Groups',
  description: 'Tests multiple levels of group nesting.',
  wodScript: `Workout:
  Part A:
    5 Pullups
    10 Pushups
  Part B:
    Run 400m`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const groupInsideRounds: ScenarioDefinition = {
  id: 'group-inside-rounds',
  name: 'Group Inside Rounds',
  description: 'Tests group that lives inside a rounds block.',
  wodScript: `3 Rounds:
  Complex:
    5 Power Cleans
    5 Front Squats
    5 Push Press
  Rest 1:00`,
  targetStatementId: 2,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const groupInsideTimer: ScenarioDefinition = {
  id: 'group-inside-timer',
  name: 'Group Inside Timer',
  description: 'Tests group that lives inside a timer block.',
  wodScript: `10:00 For Time:
  Barbell Complex:
    5 Deadlifts
    5 Hang Cleans
    5 Thrusters
  Run 200m`,
  targetStatementId: 2,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

export const DeeplyNestedGroup: Story = {
  args: { initialScenario: deeplyNestedGroup }
};

export const GroupInsideRounds: Story = {
  args: { initialScenario: groupInsideRounds }
};

export const GroupInsideTimer: Story = {
  args: { initialScenario: groupInsideTimer }
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
        story: 'Interactive scenario builder for creating custom group block tests.'
      }
    }
  }
};
