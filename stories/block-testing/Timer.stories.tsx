/**
 * Timer Block Test Scenarios
 * 
 * Tests for time-bound workout blocks that manage countdown timers.
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/Timer Block',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Timer Block Testing

The **Timer Block** manages time-bound workouts with countdown functionality.
It uses \`TimerBehavior\` to track elapsed time and trigger completion.

## Timer Types

### 1. Simple Timer (For Time)
- Tracks elapsed time without a cap (e.g., "For Time:")
- \`TimerMode.ForTime\` - stops when work completes

### 2. Capped Timer (Time Cap)
- Has a maximum duration (e.g., "20:00 For Time:")
- \`TimerMode.Countdown\` - completes when timer expires

### 3. Timer with Children
- Manages child block execution within time limit
- Children auto-advance based on TimerBehavior ticks

## Strategy Matching

The \`TimerStrategy\` matches when:
- \`Timer\` fragment IS present
- NO \`Rounds\` fragments (otherwise TimeBoundRoundsStrategy matches)
- NO \`EMOM\` action (otherwise IntervalStrategy matches)

## Memory Allocations

TimerBlocks allocate:
- \`metric:timer\` - Current timer state (elapsed, duration, mode)
- \`metric:timer-state\` - Running/paused/stopped state
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const simpleTimerPush: ScenarioDefinition = {
  id: 'timer-simple-push',
  name: 'Simple Timer - Push',
  description: 'Tests "For Time:" timer block initialization. Should allocate timer memory with ForTime mode.',
  wodScript: `For Time:
  5 Pullups
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const cappedTimerPush: ScenarioDefinition = {
  id: 'timer-capped-push',
  name: 'Capped Timer - Push',
  description: 'Tests timer with time cap (e.g., "20:00 For Time:"). Should initialize with countdown mode.',
  wodScript: `20:00 For Time:
  Run 400m
  21-15-9
    Thrusters
    Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const standaloneTimerPush: ScenarioDefinition = {
  id: 'timer-standalone-push',
  name: 'Standalone Timer - Push',
  description: 'Tests a simple duration timer without children (e.g., "3:00"). Should initialize with countdown.',
  wodScript: '3:00',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [],
  testPhase: 'mount'
};

export const SimpleTimerPush: Story = {
  args: { initialScenario: simpleTimerPush }
};

export const CappedTimerPush: Story = {
  args: { initialScenario: cappedTimerPush }
};

export const StandaloneTimerPush: Story = {
  args: { initialScenario: standaloneTimerPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const timerMidProgress: ScenarioDefinition = {
  id: 'timer-mid-progress',
  name: 'Timer - Mid Progress',
  description: 'Tests timer at 50% elapsed. Timer should still be running.',
  wodScript: `20:00 For Time:
  Run 400m`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 600000, durationMs: 1200000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const timerNearComplete: ScenarioDefinition = {
  id: 'timer-near-complete',
  name: 'Timer - Near Complete',
  description: 'Tests timer at 95% elapsed. Timer should still be running but close to completion.',
  wodScript: `5:00 For Time:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 285000, durationMs: 300000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const timerExpired: ScenarioDefinition = {
  id: 'timer-expired',
  name: 'Timer - Expired',
  description: 'Tests timer that has reached its duration. Should signal completion.',
  wodScript: `5:00 For Time:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 300000, durationMs: 300000, isRunning: false, isComplete: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const timerPaused: ScenarioDefinition = {
  id: 'timer-paused',
  name: 'Timer - Paused',
  description: 'Tests timer in paused state. Timer should not advance when paused.',
  wodScript: `10:00 For Time:
  Run 400m`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 180000, durationMs: 600000, isRunning: false, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

export const TimerMidProgress: Story = {
  args: { initialScenario: timerMidProgress }
};

export const TimerNearComplete: Story = {
  args: { initialScenario: timerNearComplete }
};

export const TimerExpired: Story = {
  args: { initialScenario: timerExpired }
};

export const TimerPaused: Story = {
  args: { initialScenario: timerPaused }
};

// ==================== POP PHASE SCENARIOS ====================

const timerPop: ScenarioDefinition = {
  id: 'timer-pop',
  name: 'Timer - Pop',
  description: 'Tests unmount and dispose of timer block. Should release timer memory.',
  wodScript: `5:00 For Time:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

const timerWithStatePop: ScenarioDefinition = {
  id: 'timer-state-pop',
  name: 'Timer with State - Pop',
  description: 'Tests unmount after timer ran for some time. Should clean up all timer state.',
  wodScript: `10:00 For Time:
  Run 400m`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 300000, durationMs: 600000, isRunning: false, mode: 'countdown' } }
  ],
  testPhase: 'unmount'
};

export const TimerPop: Story = {
  args: { initialScenario: timerPop }
};

export const TimerWithStatePop: Story = {
  args: { initialScenario: timerWithStatePop }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `10:00 For Time:
  Run 400m
  5 Pullups
  10 Pushups`
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive scenario builder for creating custom timer block tests.'
      }
    }
  }
};
