/**
 * AMRAP Block Test Scenarios
 * 
 * Tests for "As Many Rounds As Possible" time-bound round blocks.
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/AMRAP Block',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# AMRAP Block Testing

The **AMRAP Block** (As Many Rounds As Possible) combines time-bound execution 
with unlimited round iteration. Athletes complete as many rounds as possible
within the time cap.

## Key Characteristics

- **Timer + Rounds**: Both fragments present
- **No fixed round count**: Rounds continue until timer expires
- **Combines behaviors**: \`TimerBehavior\` + \`LoopBehavior\`
- **Completion trigger**: Timer expiration (not round count)

## Strategy Matching

The \`TimeBoundRoundsStrategy\` matches when:
- \`Timer\` fragment IS present
- \`Rounds\` fragment IS present

This takes precedence over both \`TimerStrategy\` and \`RoundsStrategy\`.

## Memory Allocations

AMRAP blocks allocate:
- \`metric:timer\` - Timer state (elapsed, duration, running)
- \`metric:loop\` - Current round number (no max)
- \`metric:rounds-completed\` - Total rounds completed (for scoring)
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const amrapBasicPush: ScenarioDefinition = {
  id: 'amrap-basic-push',
  name: 'Basic AMRAP - Push',
  description: 'Tests "20:00 AMRAP:" block initialization. Should allocate both timer and loop memory.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups
  15 Air Squats`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const amrapShortPush: ScenarioDefinition = {
  id: 'amrap-short-push',
  name: 'Short AMRAP - Push',
  description: 'Tests a short "7:00 AMRAP:" workout initialization.',
  wodScript: `7:00 AMRAP:
  7 Thrusters
  7 Burpees`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const amrapSingleMovementPush: ScenarioDefinition = {
  id: 'amrap-single-movement-push',
  name: 'Single Movement AMRAP - Push',
  description: 'Tests AMRAP with single movement (e.g., max calories).',
  wodScript: `10:00 AMRAP:
  Row for Calories`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

export const AmrapBasicPush: Story = {
  args: { initialScenario: amrapBasicPush }
};

export const AmrapShortPush: Story = {
  args: { initialScenario: amrapShortPush }
};

export const AmrapSingleMovementPush: Story = {
  args: { initialScenario: amrapSingleMovementPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const amrapFirstRound: ScenarioDefinition = {
  id: 'amrap-first-round',
  name: 'AMRAP - First Round (Timer Running)',
  description: 'Tests AMRAP in first round with timer at 2 minutes. Both timer and loop active.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 120000, durationMs: 1200000, isRunning: true, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 0, totalIterations: -1 } }
  ],
  testPhase: 'next'
};

const amrapMidWorkout: ScenarioDefinition = {
  id: 'amrap-mid-workout',
  name: 'AMRAP - Mid Workout (Round 3)',
  description: 'Tests AMRAP at round 3 with 10 minutes elapsed. Should continue until timer expires.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 600000, durationMs: 1200000, isRunning: true, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 2, totalIterations: -1 } }
  ],
  testPhase: 'next'
};

const amrapTimerExpiring: ScenarioDefinition = {
  id: 'amrap-timer-expiring',
  name: 'AMRAP - Timer Expiring',
  description: 'Tests AMRAP with timer at 19:30 of 20:00. Last 30 seconds - should still allow work.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 1170000, durationMs: 1200000, isRunning: true, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 5, totalIterations: -1 } }
  ],
  testPhase: 'next'
};

const amrapTimerComplete: ScenarioDefinition = {
  id: 'amrap-timer-complete',
  name: 'AMRAP - Timer Complete',
  description: 'Tests AMRAP after timer has expired. Should signal completion regardless of round state.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 1200000, durationMs: 1200000, isRunning: false, isComplete: true, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 6, totalIterations: -1 } }
  ],
  testPhase: 'next'
};

const amrapPaused: ScenarioDefinition = {
  id: 'amrap-paused',
  name: 'AMRAP - Paused',
  description: 'Tests AMRAP in paused state. Timer should not advance, rounds frozen.',
  wodScript: `15:00 AMRAP:
  Run 200m
  10 Burpees`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 450000, durationMs: 900000, isRunning: false, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 2, totalIterations: -1 } }
  ],
  testPhase: 'next'
};

export const AmrapFirstRound: Story = {
  args: { initialScenario: amrapFirstRound }
};

export const AmrapMidWorkout: Story = {
  args: { initialScenario: amrapMidWorkout }
};

export const AmrapTimerExpiring: Story = {
  args: { initialScenario: amrapTimerExpiring }
};

export const AmrapTimerComplete: Story = {
  args: { initialScenario: amrapTimerComplete }
};

export const AmrapPaused: Story = {
  args: { initialScenario: amrapPaused }
};

// ==================== POP PHASE SCENARIOS ====================

const amrapPop: ScenarioDefinition = {
  id: 'amrap-pop',
  name: 'AMRAP - Pop',
  description: 'Tests unmount and dispose of AMRAP block. Should release both timer and loop memory.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

const amrapWithStatePop: ScenarioDefinition = {
  id: 'amrap-state-pop',
  name: 'AMRAP with State - Pop',
  description: 'Tests unmount after completing 6 rounds in 20 minutes. Should preserve final score.',
  wodScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 1200000, durationMs: 1200000, isRunning: false, isComplete: true, mode: 'countdown' } },
    { type: 'setLoopIndex', params: { blockKey: '{{currentBlock}}', currentIndex: 6, totalIterations: -1 } }
  ],
  testPhase: 'unmount'
};

export const AmrapPop: Story = {
  args: { initialScenario: amrapPop }
};

export const AmrapWithStatePop: Story = {
  args: { initialScenario: amrapWithStatePop }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `20:00 AMRAP:
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive scenario builder for creating custom AMRAP block tests.'
      }
    }
  }
};
