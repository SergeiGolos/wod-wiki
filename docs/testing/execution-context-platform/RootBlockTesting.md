# Root Block Testing Plan

A comprehensive test plan for validating RootBlock (Workout Root) behavior, event handling, child block management, and lifecycle operations.

## Overview

The RootBlock (created by `WorkoutRootStrategy`) is the top-level execution block for workouts. It orchestrates:
- **Timer behaviors** for tracking total workout time
- **Round behaviors** for multi-round workouts
- **Child execution** via ChildRunnerBehavior
- **Display and controls** for UI integration
- **History recording** for workout analytics 

This test plan validates all aspects of RootBlock functionality with scenario-based tests.

## Test Structure

```
tests/blocks/root-block/
├── RootBlock.basics.test.ts           # Basic compilation and behavior composition
├── RootBlock.children.test.ts         # Child block execution flow
├── RootBlock.rounds.test.ts           # Multi-round behavior
├── RootBlock.events.test.ts           # Event handling and subscriptions
├── RootBlock.lifecycle.test.ts        # Mount/next/unmount/dispose
└── RootBlock.integration.test.ts      # End-to-end scenarios
```

## Test Categories

### 1. Behavior Composition Tests

**Purpose**: Verify RootBlock is composed with correct behaviors based on configuration.

#### Test: Single-Round RootBlock Behavior List

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { workoutRootStrategy } from '@/runtime/compiler/strategies/WorkoutRootStrategy';
import {
    TimerInitBehavior,
    TimerTickBehavior,
    TimerPauseBehavior,
    ChildRunnerBehavior,
    DisplayInitBehavior,
    ButtonBehavior,
    HistoryRecordBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior
} from '@/runtime/behaviors';

describe('RootBlock Behavior Composition', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should include all required behaviors for single-round workout', () => {
        // Scenario: Create root block with single round
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3]],
            totalRounds: 1
        });

        // Expectations: All core behaviors present
        expect(rootBlock.getBehavior(TimerInitBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(TimerTickBehavior)).toBeDefined();  // TODO: not needed, remove from rootblock
        expect(rootBlock.getBehavior(TimerPauseBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(ChildRunnerBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(DisplayInitBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(ButtonBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(HistoryRecordBehavior)).toBeDefined();

        // Round behaviors should NOT be present for single round  // TODO: not needed, remove from rootblock
        expect(rootBlock.getBehavior(RoundInitBehavior)).toBeUndefined();
        expect(rootBlock.getBehavior(RoundAdvanceBehavior)).toBeUndefined();
        expect(rootBlock.getBehavior(RoundCompletionBehavior)).toBeUndefined();
        expect(rootBlock.getBehavior(RoundDisplayBehavior)).toBeUndefined();
    });

    it('should include round behaviors for multi-round workout', () => {
        // Scenario: Create root block with 3 rounds
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]],
            totalRounds: 3
        });

        // Expectations: Round behaviors present
        expect(rootBlock.getBehavior(RoundInitBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(RoundAdvanceBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(RoundCompletionBehavior)).toBeDefined();
        expect(rootBlock.getBehavior(RoundDisplayBehavior)).toBeDefined();

        // Verify round configuration
        const roundInit = rootBlock.getBehavior(RoundInitBehavior)!;
        expect(roundInit).toBeDefined();
        // Note: Needs introspection of config or memory check
    });

    it('should use default totalRounds=1 when not specified', () => {
        // Scenario: No totalRounds specified
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        // Expectations: No round behaviors (default is single round)
        expect(rootBlock.getBehavior(RoundInitBehavior)).toBeUndefined();
    });

    it('should configure ChildRunnerBehavior with correct childGroups', () => {
        // Scenario: Multiple child groups
        const childGroups = [[1, 2], [3], [4, 5]];
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups
        });

        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior);
        expect(childRunner).toBeDefined();

        // Verify sourceIds include all statements
        expect(rootBlock.sourceIds).toEqual([1, 2, 3, 4, 5]);
    });

    it('should use custom execution buttons when provided', () => {
        // Scenario: Custom control buttons
        const customButtons = [
            { id: 'custom-pause', label: 'Hold', action: 'timer:pause' },
            { id: 'skip', label: 'Skip', action: 'block:skip' }
        ];

        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            executionButtons: customButtons
        });

        const controls = rootBlock.getBehavior(ButtonBehavior);
        expect(controls).toBeDefined();
        // Note: Would need to inspect controls.config or memory to verify
    });
});
```

**⚠️ Potential Issues Identified:**
1. No way to introspect behavior configuration after construction
	1. This should be ok.
2. May need to check memory after mount to verify button config
	1. should be able to access the memory of a block on the harness by looking at the stack
3. totalRounds validation might be needed (negative/zero values?)
	1. Root block should only have one round with multiple children in that single round.
	2. its goals are to Identify when the workout is started, and when the workout stops, and a section header for each next execution.  this should be composable form the xisting behaviors but if not we could create aidttional beaviors for this block.  focus on SOLID and the compostion, 

---

### 2. Child Block Execution Tests

**Purpose**: Verify ChildRunnerBehavior correctly manages child block execution flow.

#### Test: Child Execution Flow

```typescript
describe('RootBlock Child Execution', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should push first child on mount', () => {
        // Scenario: Root block with 3 children
        const childGroups = [[1], [2], [3]];
        
        // Mock JIT to return child blocks
        harness.mockJit.whenTextContains('child-1', 
            new MockBlock('child-1', []));
        harness.mockJit.whenTextContains('child-2', 
            new MockBlock('child-2', []));
        harness.mockJit.whenTextContains('child-3', 
            new MockBlock('child-3', []));

        // Create and mount root
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups
        });

        harness.stack.push(rootBlock);
        const mountActions = harness.executeAction({
            type: 'mount-root',
            do: (runtime) => rootBlock.mount(runtime)
        });

        // Expectations: First child should be pushed
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        expect(harness.mockJit.lastCompileCall?.statements[0].id).toBe(1);
        
        // Stack should have root + first child
        expect(harness.stack.depth).toBe(2);
    });

    it('should push next child when current completes', () => {
        // Scenario: Child completes, root.next() called
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2], [3]]
        });

        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 1),
            new MockBlock('child-1', [])
        );
        harness.mockJit.whenMatches(
            (stmts) => stmts.some(s => s.id === 2),
            new MockBlock('child-2', [])
        );

        // Mount root (pushes child-1)
        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Clear recordings to isolate next() behavior
        harness.clearRecordings();

        // Execute: Call next() to push second child
        const nextActions = harness.executeAction({
            type: 'root-next',
            do: (runtime) => rootBlock.next(runtime)
        });

        // Expectations: Second child compiled and pushed
        expect(harness.mockJit.compileCalls).toHaveLength(1);
        expect(harness.mockJit.lastCompileCall?.statements[0].id).toBe(2);
        expect(harness.stack.depth).toBe(3); // root + child-1 + child-2
    });

    it('should handle empty childGroups gracefully', () => {
        // Scenario: No children to execute
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: []
        });

        harness.stack.push(rootBlock);
        const mountActions = rootBlock.mount(harness.runtime);

        // Expectations: No compilation, no child pushed
        expect(harness.mockJit.compileCalls).toHaveLength(0);
        expect(harness.stack.depth).toBe(1); // Only root
    });

    it('should mark root complete when all children executed', () => {
        // Scenario: Last child completes
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // Pushes child 1
        
        // Simulate: Child 1 completes, next() pushes child 2
        rootBlock.next(harness.runtime);

        // Simulate: Child 2 completes, next() called again
        rootBlock.next(harness.runtime);

        // Expectations: Root should be complete
        const childRunner = rootBlock.getBehavior(ChildRunnerBehavior)!;
        expect(childRunner.allChildrenExecuted).toBe(true);
        
        // Note: Completion might be handled by RoundCompletionBehavior or similar
        // May need to check rootBlock.isComplete or memory state
    });
});
```

**⚠️ Potential Issues Identified:**
1. **No validation of childGroups** - What happens with invalid statement IDs?  not ins scope for now, assume avalid data.
2. **Child compilation failure** - How does root handle if JIT returns null?  assume valid data
3. **Completion signaling** - Who marks root as complete? ChildRunner or RoundCompletion? ChildRunning should be used when a next child needs to be pushed, meaning the current block is not done and has a push action, RuoundCompletion has sets the existing blocked to be poped.
4. **Stack cleanup** - What if child blocks are left on stack when root completes? once root complets it should also pop itself from the stack.

**💡 Recommendations:**
- Add validation in ChildRunnerBehavior constructor for empty childGroups
- PushChildBlockAction should handle null block compilation
- Document completion contract: should ChildRunner mark parent complete?

---

### 3. Event Handling Tests

**Purpose**: Verify RootBlock listens to and handles expected events.

#### Test: Timer Events

```typescript
describe('RootBlock Timer Events', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z')
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should initialize timer on mount', () => {
        // Scenario: Root block mounted
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Expectations: Timer started
        expect(harness.wasEventDispatched('timer:started')).toBe(true);
        
        // Check timer memory initialized
        // Note: Need to access memory to verify initial state
    });

    it('should respond to timer:pause event', () => {
        // Scenario: Pause button clicked during workout
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Dispatch pause event
        harness.dispatchEvent({
            name: 'timer:pause',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: Timer paused
        // Note: Need to check timer memory state or subsequent tick behavior
        expect(harness.wasEventDispatched('timer:pause')).toBe(true);
    });

    it('should respond to timer:start event to resume', () => {
        // Scenario: Resume after pause
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Pause then resume
        harness.dispatchEvent({
            name: 'timer:pause',
            timestamp: harness.clock.now,
            data: {}
        });

        harness.advanceClock(5000);

        harness.dispatchEvent({
            name: 'timer:start',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: Timer resumed
        expect(harness.wasEventDispatched('timer:start')).toBe(true);
    });

    it('should emit tick events while timer running', () => {
        // Scenario: Time passes during workout
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Advance time and trigger tick
        harness.advanceClock(1000);
        
        harness.dispatchEvent({
            name: 'tick',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: Timer processed tick
        // Note: May emit timer:tick or update memory
    });
});
```

**⚠️ Potential Issues Identified:**
1. **Event subscription scope** - Does root listen to ALL events or only when active?
	1. The scope is base don how the event handler is set up.
2. **Timer state visibility** - No public API to check if timer is paused/running  
	1. Add one
3. **Tick event source** - Who emits 'tick'? External clock? RuntimeClock? 
	1. this is this should have a tick prover that can be subscribed, a mock version shoudl allow external calls to execute awhile the default implemention should support having a single timer that run on a setTimeout to tick every 10ms

**💡 Recommendations:**
- TimerPauseBehavior should expose `isPaused` state or store in memory 
	- sounds good
- Document event flow: who emits tick vs timer:tick?
- Consider scoped event listeners (only process when block is current)

#### Test: Control Button Events

```typescript
describe('RootBlock Control Events', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should respond to block:next event', () => {
        // Scenario: User clicks "Next" button
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Dispatch next event
        harness.dispatchEvent({
            name: 'block:next',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: next() should be called via event handler
        // Should advance to next child
        expect(harness.wasActionExecuted('push-child-block')).toBe(true);
    });

    it('should respond to workout:stop event', () => {
        // Scenario: User clicks "Stop" button
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        harness.dispatchEvent({
            name: 'workout:stop',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: Workout should stop gracefully
        // Note: Unclear what stop should do - unmount? mark complete?
        expect(harness.wasEventDispatched('workout:stop')).toBe(true);
    });

    it('should handle block:skip event on root', () => {
        // Scenario: User tries to skip root block
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        harness.dispatchEvent({
            name: 'block:skip',
            timestamp: harness.clock.now,
            data: {}
        });

        // Expectations: Root block should NOT be skippable
        // Note: May need SkipCurrentBlockAction with rootBlockId protection
    });
});
```

**⚠️ Potential Issues Identified:**
1. **workout:stop behavior undefined** - No clear implementation of stop action
2. **Root block skip protection** - Root shouldn't be skippable, but is this enforced?
3. **Event handler registration** - Where are control events registered?

**💡 Recommendations:**
- Define workout:stop behavior (unmount all? mark complete? emit history?)  mark all as complete and unmount all  from the top of the stack down to root.
- Add root block protection to SkipCurrentBlockAction.   no, we dont' need it
- Document which behaviors register which event handlers (yes please)

---

### 4. Multi-Round Behavior Tests

**Purpose**: Verify round management for multi-round workouts.

#### Test: Round Progression

```typescript
describe('RootBlock Multi-Round Behavior', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should initialize round counter on mount', () => {
        // Scenario: 3-round workout
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            totalRounds: 3
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Expectations: Round memory initialized
        // Should have currentRound=1, totalRounds=3
        // Note: Need memory access or event emission check
        expect(rootBlock.getBehavior(RoundInitBehavior)).toBeDefined();
    });

    it('should advance to next round when all children complete', () => {
        // Scenario: Complete all children in round 1
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]],
            totalRounds: 3
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // Round 1, child 1

        // Complete round 1
        rootBlock.next(harness.runtime); // Push child 2
        rootBlock.next(harness.runtime); // Children done, should advance round

        // Expectations: Round 2 started
        // ChildRunner should reset and push child 1 again
        // Note: Need to verify round counter and child reset
    });

    it('should complete workout after final round', () => {
        // Scenario: Complete all children in final round
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            totalRounds: 2
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // Round 1

        // Complete round 1
        rootBlock.next(harness.runtime); // Advance to round 2

        // Complete round 2
        rootBlock.next(harness.runtime); // All rounds done

        // Expectations: Root marked complete
        expect(rootBlock.isComplete).toBe(true);
        // Or check event: workout:complete
    });

    it('should emit round:started and round:completed events', () => {
        // Scenario: Track round lifecycle events
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            totalRounds: 2
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Expectations: Round 1 started
        expect(harness.wasEventDispatched('round:started')).toBe(true);

        // Complete round
        rootBlock.next(harness.runtime);

        // Expectations: Round completed and next started
        expect(harness.wasEventDispatched('round:completed')).toBe(true);
    });

    it('should reset ChildRunner between rounds', () => {
        // Scenario: Child execution restarts each round
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]],
            totalRounds: 2
        });

        let compileCount = 0;
        harness.mockJit.whenMatches(() => true, () => {
            compileCount++;
            return new MockBlock(`child-${compileCount}`, []);
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // R1: Child 1

        rootBlock.next(harness.runtime); // R1: Child 2
        rootBlock.next(harness.runtime); // R2: Child 1 (should repeat)

        // Expectations: Should compile child 1 again for round 2
        expect(compileCount).toBe(3); // R1-C1, R1-C2, R2-C1
        
        // Verify second execution of statement 1
        const compiles = harness.mockJit.compileCalls;
        expect(compiles[0].statements[0].id).toBe(1);
        expect(compiles[2].statements[0].id).toBe(1); // Repeated
    });
});
```

**⚠️ Potential Issues Identified:**
1. **Round/Child coordination** - Who orchestrates round advancement?
2. **ChildRunner reset timing** - When is resetChildIndex() called?
3. **Completion detection** - How does RoundCompletionBehavior know workout is done?
4. **Round event data** - Do events include round number?

**💡 Recommendations:**
- RoundAdvanceBehavior should call childRunner.resetChildIndex()
- RoundCompletionBehavior should check allChildrenExecuted AND finalRound
- Events should include payload: { currentRound, totalRounds }
- Document coordination contract between Round and ChildRunner behaviors

---

### 5. Lifecycle Tests

**Purpose**: Verify mount/next/unmount/dispose behavior.

#### Test: Lifecycle Behavior

```typescript
describe('RootBlock Lifecycle', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness();
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should initialize all behaviors on mount', () => {
        // Scenario: Fresh root block mount
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        const actions = rootBlock.mount(harness.runtime);

        // Expectations: All behaviors called onMount
        // Timer started, controls initialized, first child pushed
        expect(actions.length).toBeGreaterThan(0);
        expect(harness.wasEventDispatched('timer:started')).toBe(true);
    });

    it('should register event handlers on mount', () => {
        // Scenario: Verify event subscriptions
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const registerSpy = vi.spyOn(harness.eventBus, 'register');

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Expectations: Multiple event handlers registered
        expect(registerSpy).toHaveBeenCalled();
        // Note: Would be good to verify specific events: timer:pause, block:next, etc.
    });

    it('should execute all behaviors on next()', () => {
        // Scenario: Child completes, next() called
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]]
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        harness.clearRecordings();

        const nextActions = rootBlock.next(harness.runtime);

        // Expectations: ChildRunner pushes next child
        expect(nextActions.length).toBeGreaterThan(0);
        expect(harness.mockJit.compileCalls.length).toBe(1);
    });

    it('should cleanup resources on unmount', () => {
        // Scenario: Workout completes, root unmounted
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        const unmountActions = rootBlock.unmount(harness.runtime);

        // Expectations: History recorded, events unregistered
        expect(unmountActions.length).toBeGreaterThan(0);
        // Note: Should emit history:record event
    });

    it('should dispose all behaviors on dispose()', () => {
        // Scenario: Root removed from stack
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);
        rootBlock.unmount(harness.runtime);

        // Dispose should clean up any remaining resources
        rootBlock.dispose(harness.runtime);

        // Expectations: No errors, clean disposal
        // Note: Behaviors don't have dispose hooks in current API
    });

    it('should capture execution timing', () => {
        // Scenario: Track start and completion time
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]]
        });

        const startTime = new Date('2024-01-01T12:00:00Z');
        harness.setClock(startTime);

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Advance time
        harness.advanceClock(300000); // 5 minutes

        const completionTime = harness.clock.now;
        rootBlock.unmount(harness.runtime, { completedAt: completionTime });

        // Expectations: Timing captured
        expect(rootBlock.executionTiming.startTime).toEqual(startTime);
        expect(rootBlock.executionTiming.completedAt).toEqual(completionTime);
    });
});
```

**⚠️ Potential Issues Identified:**
1. **Event cleanup** - Are subscriptions properly unregistered on unmount?
2. **Child cleanup** - What if children are still on stack when root unmounts?
3. **Dispose contract** - No onDispose hooks for behaviors in current API
4. **History emission** - When is history:record emitted? Unmount or dispose?

**💡 Recommendations:**
- Verify BehaviorContext.dispose() unregisters all event subscriptions
- Root unmount should pop and dispose all child blocks
- Consider adding onDispose() to IRuntimeBehavior interface
- HistoryRecordBehavior should emit on unmount, not dispose

---

## Integration Test Scenarios

### End-to-End Workout Execution

```typescript
describe('RootBlock Integration: Complete Workout', () => {
    let harness: ExecutionContextTestHarness;

    beforeEach(() => {
        harness = new ExecutionContextTestHarness({
            clockTime: new Date('2024-01-01T12:00:00Z')
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    it('should execute complete single-round workout', () => {
        // Scenario: "3x10 Push-ups, 3x10 Squats"
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]], // Two exercises
            totalRounds: 1
        });

        // Mock child blocks
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 1),
            new MockBlock('pushups', [])
        );
        harness.mockJit.whenMatches(
            (s) => s.some(stmt => stmt.id === 2),
            new MockBlock('squats', [])
        );

        // Execute workflow
        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // Timer starts, pushups pushed

        expect(harness.stack.depth).toBe(2); // root + pushups

        // Pushups complete
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // Squats pushed

        expect(harness.stack.depth).toBe(2); // root + squats

        // Squats complete
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // Workout complete

        // Expectations
        expect(rootBlock.isComplete).toBe(true);
        expect(harness.wasEventDispatched('timer:started')).toBe(true);
        expect(harness.mockJit.compileCalls).toHaveLength(2);
    });

    it('should execute complete multi-round workout', () => {
        // Scenario: "2 Rounds: 10 Push-ups, 10 Squats"
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1], [2]],
            totalRounds: 2
        });

        let blockId = 0;
        harness.mockJit.whenMatches(() => true, () => {
            blockId++;
            return new MockBlock(`block-${blockId}`, []);
        });

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime); // R1: Pushups

        // Round 1
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // R1: Squats

        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // R2: Pushups

        // Round 2
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // R2: Squats

        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // Complete

        // Expectations: 4 blocks compiled (2 rounds × 2 exercises)
        expect(harness.mockJit.compileCalls).toHaveLength(4);
        expect(rootBlock.isComplete).toBe(true);
    });

    it('should track total workout time across rounds', () => {
        // Scenario: Verify timer tracks full workout duration
        const rootBlock = workoutRootStrategy.build(harness.runtime, {
            childGroups: [[1]],
            totalRounds: 2
        });

        harness.mockJit.whenMatches(() => true, new MockBlock('child', []));

        harness.stack.push(rootBlock);
        rootBlock.mount(harness.runtime);

        // Simulate child durations
        harness.advanceClock(60000); // 1 min
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // R2

        harness.advanceClock(60000); // 1 min
        harness.stack.pop()?.dispose(harness.runtime);
        rootBlock.next(harness.runtime); // Complete

        rootBlock.unmount(harness.runtime);

        // Expectations: 2 minutes total
        const duration = 
            rootBlock.executionTiming.completedAt!.getTime() - 
            rootBlock.executionTiming.startTime!.getTime();
        
        expect(duration).toBe(120000); // 2 minutes
    });
});
```

---

## Known Issues & Recommendations Summary

### Critical Issues

1. **⚠️ No child compilation error handling**
   - **Issue**: PushChildBlockAction doesn't handle null block from JIT
   - **Impact**: Silent failure if statement IDs invalid or compilation fails
   - **Fix**: Check for null and emit error event or skip gracefully

2. **⚠️ Root block completion ambiguity**
   - **Issue**: Unclear which behavior marks root as complete
   - **Impact**: May never mark complete or mark prematurely
   - **Fix**: RoundCompletionBehavior (or ChildRunner for single-round) should call ctx.markComplete()

3. **⚠️ workout:stop undefined behavior**
   - **Issue**: Stop button dispatches event but no handler defined
   - **Impact**: Button does nothing
   - **Fix**: Add handler in ButtonBehavior or new StopBehavior

### Important Issues

4. **⚠️ Event subscription cleanup**
   - **Issue**: Not clear if BehaviorContext properly unregisters on dispose
   - **Impact**: Memory leaks, ghost event handlers
   - **Recommendation**: Verify unregistration in BehaviorContext tests

5. **⚠️ Round/Child coordination**
   - **Issue**: RoundAdvanceBehavior must call childRunner.resetChildIndex()
   - **Impact**: Children won't repeat on next round
   - **Recommendation**: Add explicit coordination or emit event

6. **⚠️ Stack cleanup on root unmount**
   - **Issue**: If children still on stack when root unmounts, orphaned
   - **Impact**: Memory leaks, incomplete disposal
   - **Recommendation**: Root unmount should pop and dispose all descendants

### Suggestions

7. **💡 Behavior introspection API**
   - **Suggestion**: Add getBehaviorConfig() or expose config publicly
   - **Benefit**: Easier testing of behavior initialization

8. **💡 Timer state visibility**
   - **Suggestion**: TimerPauseBehavior expose isPaused or store in memory
   - **Benefit**: Tests can verify pause state

9. **💡 Event payload standardization**
   - **Suggestion**: Document required payload for each event type
   - **Benefit**: Consistency across behaviors

10. **💡 Root block protection**
    - **Suggestion**: SkipCurrentBlockAction should reject root block
    - **Benefit**: Prevent invalid skip operations

---

## Test Execution Plan

### Phase 1: Basic Validation
1. Run `RootBlock.basics.test.ts` - Verify behavior composition
2. Fix any behavior registration issues
3. Document behavior initialization requirements

### Phase 2: Child Execution
1. Run `RootBlock.children.test.ts` - Verify ChildRunner flow
2. Fix child compilation error handling
3. Add validation for childGroups

### Phase 3: Event System
1. Run `RootBlock.events.test.ts` - Verify event handling
2. Implement workout:stop handler
3. Document event contracts

### Phase 4: Multi-Round
1. Run `RootBlock.rounds.test.ts` - Verify round management
2. Fix round/child coordination
3. Verify completion detection

### Phase 5: Lifecycle
1. Run `RootBlock.lifecycle.test.ts` - Verify lifecycle hooks
2. Fix event cleanup issues
3. Add stack cleanup on unmount

### Phase 6: Integration
1. Run `RootBlock.integration.test.ts` - End-to-end scenarios
2. Fix any coordination issues
3. Performance validation

---

## Running the Tests

```bash
# Run all root block tests
bun test tests/blocks/root-block --preload ./tests/unit-setup.ts

# Run specific test file
bun test tests/blocks/root-block/RootBlock.children.test.ts --preload ./tests/unit-setup.ts

# Watch mode
bun test tests/blocks/root-block --watch --preload ./tests/unit-setup.ts

# With coverage
bun test tests/blocks/root-block --coverage --preload ./tests/unit-setup.ts
```

---

## Related Documentation

- [ExecutionContext Testing Platform](./phase-2-execution-context-test-harness.md)
- [Testing Skill Guide](./skill.md)
- [WorkoutRootStrategy Source](../../../src/runtime/compiler/strategies/WorkoutRootStrategy.ts)
- [ChildRunnerBehavior Source](../../../src/runtime/behaviors/ChildRunnerBehavior.ts)

---

**Last Updated**: February 1, 2026
