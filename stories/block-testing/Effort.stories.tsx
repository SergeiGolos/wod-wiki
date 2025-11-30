/**
 * Effort Block Test Scenarios
 * 
 * Tests for the fundamental unit of work in the WOD Wiki runtime.
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/Effort Block',
  component: BlockTestScenarioBuilder,
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

const genericEffortPush: ScenarioDefinition = {
  id: 'effort-generic-push',
  name: 'Generic Effort - Push',
  description: 'Tests a generic effort block (no reps) like "Run 400m". Should allocate standard block memory but no effort-specific memory.',
  wodScript: 'Run 400m',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'mount'
};

const effortWithRepsPush: ScenarioDefinition = {
  id: 'effort-with-reps-push',
  name: 'Effort with Reps - Push',
  description: 'Tests an effort block with explicit reps (e.g., "5 Pullups"). Should create specialized EffortBlock with rep tracking memory.',
  wodScript: '5 Pullups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'mount'
};

const restEffortPush: ScenarioDefinition = {
  id: 'effort-rest-push',
  name: 'Rest Effort - Push',
  description: 'Tests a "Rest" effort block. Should be a generic effort that completes on next event.',
  wodScript: 'Rest',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'mount'
};

const inheritedRepsPush: ScenarioDefinition = {
  id: 'effort-inherited-reps-push',
  name: 'Effort with Inherited Reps - Push',
  description: 'Tests an effort block that inherits reps from parent context (e.g., child of "21-15-9"). Pre-seeds public METRIC_REPS memory.',
  wodScript: 'Thrusters',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [
    { type: 'allocateTestMemory', params: { type: 'metric:reps', ownerId: 'parent-rounds', value: 21, visibility: 'public' } }
  ],
  testPhase: 'mount'
};

export const GenericEffortPush: Story = {
  args: { initialScenario: genericEffortPush }
};

export const EffortWithRepsPush: Story = {
  args: { initialScenario: effortWithRepsPush }
};

export const RestEffortPush: Story = {
  args: { initialScenario: restEffortPush }
};

export const InheritedRepsPush: Story = {
  args: { initialScenario: inheritedRepsPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const effortPartialProgress: ScenarioDefinition = {
  id: 'effort-reps-partial',
  name: 'Effort with Reps - Partial Progress',
  description: 'Tests EffortBlock with partial rep completion. Block should NOT complete because currentReps < targetReps.',
  wodScript: '10 Pushups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [
    { type: 'setEffortState', params: { blockKey: '{{currentBlock}}', currentReps: 5, targetReps: 10 } }
  ],
  testPhase: 'next'
};

const effortAlmostComplete: ScenarioDefinition = {
  id: 'effort-reps-almost',
  name: 'Effort with Reps - Almost Complete',
  description: 'Tests EffortBlock where reps are one away from target. Block should NOT complete yet.',
  wodScript: '10 Pushups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [
    { type: 'setEffortState', params: { blockKey: '{{currentBlock}}', currentReps: 9, targetReps: 10 } }
  ],
  testPhase: 'next'
};

const effortComplete: ScenarioDefinition = {
  id: 'effort-reps-complete',
  name: 'Effort with Reps - Complete',
  description: 'Tests EffortBlock where reps have reached target. Block should be complete and return PopBlockAction.',
  wodScript: '5 Pullups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [
    { type: 'setEffortState', params: { blockKey: '{{currentBlock}}', currentReps: 5, targetReps: 5, isComplete: true } }
  ],
  testPhase: 'next'
};

export const EffortPartialProgress: Story = {
  args: { initialScenario: effortPartialProgress }
};

export const EffortAlmostComplete: Story = {
  args: { initialScenario: effortAlmostComplete }
};

export const EffortComplete: Story = {
  args: { initialScenario: effortComplete }
};

// ==================== POP PHASE SCENARIOS ====================

const genericEffortPop: ScenarioDefinition = {
  id: 'effort-generic-pop',
  name: 'Generic Effort - Pop',
  description: 'Tests unmount and dispose of a generic effort block. Should release all allocated memory.',
  wodScript: 'Run 400m',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'unmount'
};

const effortRepsPop: ScenarioDefinition = {
  id: 'effort-reps-pop',
  name: 'Effort with Reps - Pop',
  description: 'Tests unmount and dispose of specialized EffortBlock. Should release effort state memory.',
  wodScript: '5 Pullups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'unmount'
};

export const GenericEffortPop: Story = {
  args: { initialScenario: genericEffortPop }
};

export const EffortRepsPop: Story = {
  args: { initialScenario: effortRepsPop }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive scenario builder for creating custom effort block tests.'
      }
    }
  }
};
