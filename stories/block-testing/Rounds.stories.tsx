/**
 * Rounds Block Test Scenarios
 * 
 * Tests for multi-round workout blocks (3 Rounds, 21-15-9, etc.).
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/Rounds Block',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Rounds Block Testing

The **Rounds Block** manages multi-round workout execution with loop tracking.
It uses \`LoopBehavior\` to iterate through rounds and \`RepsPublisher\` for rep schemes.

## Rounds Variations

### 1. Fixed Rounds
- Same work each round (e.g., "3 Rounds:")
- \`currentRound\` increments, \`targetRounds\` is constant

### 2. Rep Schemes
- Variable reps per round (e.g., "21-15-9:")
- \`RepsPublisher\` manages the rep sequence
- Publishes current rep count to public memory for child efforts

### 3. Descending/Ascending
- Patterns like "10-9-8-7-6-5-4-3-2-1"
- Each round publishes different rep count

## Strategy Matching

The \`RoundsStrategy\` matches when:
- \`Rounds\` fragment IS present
- NO \`Timer\` fragment (otherwise TimeBoundRoundsStrategy matches)

## Memory Allocations

RoundsBlocks allocate:
- \`metric:loop\` - Current loop index and iteration state
- \`metric:reps\` - Published reps for current round (public visibility)
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const fixedRoundsPush: ScenarioDefinition = {
  id: 'rounds-fixed-push',
  name: 'Fixed Rounds - Push',
  description: 'Tests "3 Rounds:" block initialization. Should allocate loop memory with 3 iterations.',
  wodScript: `3 Rounds:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const repSchemePush: ScenarioDefinition = {
  id: 'rounds-rep-scheme-push',
  name: 'Rep Scheme (21-15-9) - Push',
  description: 'Tests "21-15-9:" rep scheme initialization. Should allocate loop for 3 rounds and publish 21 to public memory.',
  wodScript: `21-15-9:
  Thrusters
  Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const descendingRoundsPush: ScenarioDefinition = {
  id: 'rounds-descending-push',
  name: 'Descending Rounds - Push',
  description: 'Tests "10-9-8-7-6-5-4-3-2-1:" ladder initialization.',
  wodScript: `10-9-8-7-6-5-4-3-2-1:
  Kettlebell Swings`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const singleRoundPush: ScenarioDefinition = {
  id: 'rounds-single-push',
  name: 'Single Round - Push',
  description: 'Tests "1 Round:" block (essentially a group). Should work but degenerate case.',
  wodScript: `1 Round:
  Run 400m`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

export const FixedRoundsPush: Story = {
  args: { initialScenario: fixedRoundsPush }
};

export const RepSchemePush: Story = {
  args: { initialScenario: repSchemePush }
};

export const DescendingRoundsPush: Story = {
  args: { initialScenario: descendingRoundsPush }
};

export const SingleRoundPush: Story = {
  args: { initialScenario: singleRoundPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const roundsFirstRound: ScenarioDefinition = {
  id: 'rounds-first-round',
  name: 'Rounds - First Round',
  description: 'Tests rounds block at loop index 0 (first round). Should continue iterating.',
  wodScript: `3 Rounds:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 0, totalIterations: 3 } }
  ],
  testPhase: 'next'
};

const roundsMidProgress: ScenarioDefinition = {
  id: 'rounds-mid-progress',
  name: 'Rounds - Mid Progress',
  description: 'Tests rounds block at loop index 1 (second of 3 rounds). Should continue.',
  wodScript: `3 Rounds:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 1, totalIterations: 3 } }
  ],
  testPhase: 'next'
};

const roundsFinalRound: ScenarioDefinition = {
  id: 'rounds-final-round',
  name: 'Rounds - Final Round',
  description: 'Tests rounds block at last iteration (index 2 of 3). After children complete, should pop.',
  wodScript: `3 Rounds:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 2, totalIterations: 3 } }
  ],
  testPhase: 'next'
};

const repSchemeSecondRound: ScenarioDefinition = {
  id: 'rep-scheme-second-round',
  name: 'Rep Scheme - Second Round (15)',
  description: 'Tests 21-15-9 at index 1. Should publish 15 reps to public memory.',
  wodScript: `21-15-9:
  Thrusters`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 1, totalIterations: 3 } }
  ],
  testPhase: 'next'
};

const repSchemeLastRound: ScenarioDefinition = {
  id: 'rep-scheme-last-round',
  name: 'Rep Scheme - Last Round (9)',
  description: 'Tests 21-15-9 at index 2 (last round). Should publish 9 reps.',
  wodScript: `21-15-9:
  Thrusters`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 2, totalIterations: 3 } }
  ],
  testPhase: 'next'
};

export const RoundsFirstRound: Story = {
  args: { initialScenario: roundsFirstRound }
};

export const RoundsMidProgress: Story = {
  args: { initialScenario: roundsMidProgress }
};

export const RoundsFinalRound: Story = {
  args: { initialScenario: roundsFinalRound }
};

export const RepSchemeSecondRound: Story = {
  args: { initialScenario: repSchemeSecondRound }
};

export const RepSchemeLastRound: Story = {
  args: { initialScenario: repSchemeLastRound }
};

// ==================== POP PHASE SCENARIOS ====================

const roundsPop: ScenarioDefinition = {
  id: 'rounds-pop',
  name: 'Rounds - Pop',
  description: 'Tests unmount and dispose of rounds block. Should release loop memory.',
  wodScript: `3 Rounds:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

const repSchemePop: ScenarioDefinition = {
  id: 'rep-scheme-pop',
  name: 'Rep Scheme - Pop',
  description: 'Tests unmount of rep scheme block. Should release both loop and public reps memory.',
  wodScript: `21-15-9:
  Thrusters`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

export const RoundsPop: Story = {
  args: { initialScenario: roundsPop }
};

export const RepSchemePop: Story = {
  args: { initialScenario: repSchemePop }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `21-15-9:
  Thrusters
  Pullups`
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive scenario builder for creating custom rounds block tests.'
      }
    }
  }
};
