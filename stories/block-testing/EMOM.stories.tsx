/**
 * EMOM Block Test Scenarios
 * 
 * Tests for "Every Minute On the Minute" interval workout blocks.
 * Using the new ScenarioBuilder format for interactive testing.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { BlockTestScenarioBuilder, ScenarioDefinition } from '@/runtime/testing';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/EMOM Block',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# EMOM Block Testing

The **EMOM Block** (Every Minute On the Minute) manages interval-based workouts
where work starts at regular intervals regardless of completion time.

## Key Characteristics

- **Timer + Action="EMOM"**: Timer with special interval action
- **Fixed intervals**: Work starts every X seconds/minutes
- **Rest built-in**: Faster completion = more rest before next interval
- **Combines behaviors**: \`TimerBehavior\` + \`IntervalBehavior\`

## EMOM Variations

### 1. Standard EMOM
- Same work each minute (e.g., "10:00 EMOM: 5 Pullups")
- 1-minute intervals, single movement

### 2. Alternating EMOM
- Different work on alternate minutes
- Multiple child statements cycle through

### 3. Custom Interval EMOM
- Non-standard intervals (e.g., every 90 seconds, every 2 minutes)
- Uses \`:XX\` notation for interval duration

## Strategy Matching

The \`IntervalStrategy\` matches when:
- \`Timer\` fragment IS present
- \`Action\` fragment with "EMOM" IS present

This takes precedence over \`TimerStrategy\`.

## Memory Allocations

EMOM blocks allocate:
- \`metric:timer\` - Overall timer state
- \`metric:interval\` - Current interval number and time within interval
- \`metric:interval-duration\` - Duration of each interval
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== PUSH PHASE SCENARIOS ====================

const emomBasicPush: ScenarioDefinition = {
  id: 'emom-basic-push',
  name: 'Basic EMOM - Push',
  description: 'Tests "10:00 EMOM:" block initialization. Should allocate timer and interval memory.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const emomAlternatingPush: ScenarioDefinition = {
  id: 'emom-alternating-push',
  name: 'Alternating EMOM - Push',
  description: 'Tests alternating EMOM with multiple movements cycling.',
  wodScript: `12:00 EMOM:
  10 Pushups
  10 Air Squats
  10 Situps`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

const emomLongPush: ScenarioDefinition = {
  id: 'emom-long-push',
  name: 'Long EMOM - Push',
  description: 'Tests a 30-minute EMOM for endurance testing.',
  wodScript: `30:00 EMOM:
  3 Power Cleans
  6 Pushups
  9 Air Squats`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'mount'
};

export const EmomBasicPush: Story = {
  args: { initialScenario: emomBasicPush }
};

export const EmomAlternatingPush: Story = {
  args: { initialScenario: emomAlternatingPush }
};

export const EmomLongPush: Story = {
  args: { initialScenario: emomLongPush }
};

// ==================== NEXT PHASE SCENARIOS ====================

const emomFirstInterval: ScenarioDefinition = {
  id: 'emom-first-interval',
  name: 'EMOM - First Interval (0:00)',
  description: 'Tests EMOM at the start of first interval. Timer just started.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 0, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const emomMidInterval: ScenarioDefinition = {
  id: 'emom-mid-interval',
  name: 'EMOM - Mid Interval (0:30)',
  description: 'Tests EMOM 30 seconds into first interval. Work may be complete, waiting for next interval.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 30000, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const emomIntervalTransition: ScenarioDefinition = {
  id: 'emom-interval-transition',
  name: 'EMOM - Interval Transition (1:00)',
  description: 'Tests EMOM at exactly 1:00 - should trigger next interval and restart work.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 60000, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const emomMidWorkout: ScenarioDefinition = {
  id: 'emom-mid-workout',
  name: 'EMOM - Mid Workout (5:00)',
  description: 'Tests EMOM at 5 minutes in (interval 6 of 10). Half complete.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 300000, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const emomFinalInterval: ScenarioDefinition = {
  id: 'emom-final-interval',
  name: 'EMOM - Final Interval (9:00)',
  description: 'Tests EMOM at start of last interval (minute 10 of 10).',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 540000, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const emomTimerComplete: ScenarioDefinition = {
  id: 'emom-timer-complete',
  name: 'EMOM - Timer Complete',
  description: 'Tests EMOM after all intervals complete. Should signal completion.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 600000, durationMs: 600000, isRunning: false, isComplete: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

export const EmomFirstInterval: Story = {
  args: { initialScenario: emomFirstInterval }
};

export const EmomMidInterval: Story = {
  args: { initialScenario: emomMidInterval }
};

export const EmomIntervalTransition: Story = {
  args: { initialScenario: emomIntervalTransition }
};

export const EmomMidWorkout: Story = {
  args: { initialScenario: emomMidWorkout }
};

export const EmomFinalInterval: Story = {
  args: { initialScenario: emomFinalInterval }
};

export const EmomTimerComplete: Story = {
  args: { initialScenario: emomTimerComplete }
};

// ==================== ALTERNATING EMOM SCENARIOS ====================

const alternatingMinute1: ScenarioDefinition = {
  id: 'emom-alternating-min1',
  name: 'Alternating EMOM - Minute 1 (Movement A)',
  description: 'Tests alternating EMOM on odd minute. Should execute first movement.',
  wodScript: `10:00 EMOM:
  10 Pushups
  10 Situps`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 0, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

const alternatingMinute2: ScenarioDefinition = {
  id: 'emom-alternating-min2',
  name: 'Alternating EMOM - Minute 2 (Movement B)',
  description: 'Tests alternating EMOM on even minute. Should execute second movement.',
  wodScript: `10:00 EMOM:
  10 Pushups
  10 Situps`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 60000, durationMs: 600000, isRunning: true, mode: 'countdown' } }
  ],
  testPhase: 'next'
};

export const AlternatingMinute1: Story = {
  args: { initialScenario: alternatingMinute1 }
};

export const AlternatingMinute2: Story = {
  args: { initialScenario: alternatingMinute2 }
};

// ==================== POP PHASE SCENARIOS ====================

const emomPop: ScenarioDefinition = {
  id: 'emom-pop',
  name: 'EMOM - Pop',
  description: 'Tests unmount and dispose of EMOM block. Should release timer and interval memory.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [],
  testPhase: 'unmount'
};

const emomWithStatePop: ScenarioDefinition = {
  id: 'emom-state-pop',
  name: 'EMOM with State - Pop',
  description: 'Tests unmount after completing all intervals. Should clean up properly.',
  wodScript: `10:00 EMOM:
  5 Pullups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    { type: 'setTimerState', params: { blockKey: '{{currentBlock}}', elapsedMs: 600000, durationMs: 600000, isRunning: false, isComplete: true, mode: 'countdown' } }
  ],
  testPhase: 'unmount'
};

export const EmomPop: Story = {
  args: { initialScenario: emomPop }
};

export const EmomWithStatePop: Story = {
  args: { initialScenario: emomWithStatePop }
};

// ==================== INTERACTIVE BUILDER ====================

export const InteractiveBuilder: Story = {
  args: {
    initialScript: `12:00 EMOM:
  10 Pushups
  10 Air Squats
  10 Situps`
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive scenario builder for creating custom EMOM block tests.'
      }
    }
  }
};
