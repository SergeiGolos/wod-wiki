# Runtime Loop Coordination Capability

**Capability ID**: `runtime-loop-coordination`  
**Type**: New Capability  
**Status**: Draft

## Overview

Unified loop state management system that coordinates child cycling, round tracking, and completion detection across all loop-based workout blocks. Replaces fragmented behavior coordination with a single source of truth for loop execution state.

## ADDED Requirements

### Requirement: Loop State Tracking

The runtime MUST maintain accurate loop state across all advancement operations using index-based calculations.

#### Scenario: Track loop state during multi-round workout

```
GIVEN a workout with 3 rounds and 2 child exercises
WHEN the runtime advances through each child and round
THEN the loop state correctly reflects:
  - index: 0, 1, 2, 3, 4, 5 (total advancements)
  - position: 0, 1, 0, 1, 0, 1 (child group cycling via modulo)
  - rounds: 0, 0, 1, 1, 2, 2 (completed rounds via floor division)
```

#### Scenario: Calculate position using modulo arithmetic

```
GIVEN a workout with 3 child groups
  AND current index is 7
WHEN calculating the current position
THEN position = 7 % 3 = 1 (second child group)
```

#### Scenario: Calculate rounds using floor division

```
GIVEN a workout with 2 child groups
  AND current index is 5
WHEN calculating completed rounds
THEN rounds = floor(5 / 2) = 2 (third round, 0-indexed)
```

### Requirement: Child Group Cycling

The runtime MUST cycle through child groups indefinitely until loop completion conditions are met.

#### Scenario: Loop children across multiple rounds

```
GIVEN a workout "(3) Pullups, Pushups" with 2 child groups
WHEN advancing through the workout
THEN children compile in sequence:
  - Round 1: Pullups (position 0) → Pushups (position 1)
  - Round 2: Pullups (position 0) → Pushups (position 1)
  - Round 3: Pullups (position 0) → Pushups (position 1)
  - Complete after 6 total advancements
```

#### Scenario: Handle single child group looping

```
GIVEN a workout "(5) Pushups" with 1 child group
WHEN advancing through the workout
THEN the same child compiles 5 times (position always 0)
  AND rounds increment on each advancement (0, 1, 2, 3, 4)
```

#### Scenario: Handle compose child groups

```
GIVEN a workout "(3) + Pullups, + Pushups, Squats" with groups [[1,2], [3]]
WHEN position is 0
THEN group [1,2] compiles together (both exercises in one block)
WHEN position is 1  
THEN group [3] compiles alone
```

### Requirement: Round Boundary Detection

The runtime MUST detect when position wraps back to zero, indicating a round transition.

#### Scenario: Detect round boundary on position wrap

```
GIVEN a workout with 3 child groups
  AND current index is 2 (position 2, rounds 0)
WHEN calling next() to increment index to 3
THEN position wraps to 0 (3 % 3 = 0)
  AND rounds increment to 1 (floor(3 / 3) = 1)
  AND a 'rounds:changed' event is emitted
```

#### Scenario: No round boundary mid-round

```
GIVEN a workout with 3 child groups
  AND current index is 1 (position 1, rounds 0)
WHEN calling next() to increment index to 2
THEN position advances to 2 (2 % 3 = 2)
  AND rounds remain 0 (floor(2 / 3) = 0)
  AND no 'rounds:changed' event is emitted
```

### Requirement: Loop Type Support

The runtime MUST support multiple loop types with different completion and behavior logic.

#### Scenario: Fixed rounds loop completion

```
GIVEN a workout "(3) Exercise" with loop type 'fixed' and totalRounds = 3
WHEN rounds reaches 3 (index = 3 for single child)
THEN isComplete() returns true
  AND no more children are compiled
```

#### Scenario: Rep scheme loop completion

```
GIVEN a workout "(21-15-9) Exercise" with loop type 'repScheme'
  AND repScheme = [21, 15, 9]
WHEN rounds reaches 3 (repScheme.length)
THEN isComplete() returns true
  AND no more children are compiled
```

#### Scenario: Time-bound loop (AMRAP) completion

```
GIVEN a workout "20:00 AMRAP Exercise" with loop type 'timeBound'
WHEN the timer expires (regardless of rounds completed)
THEN isComplete() returns true
  AND rounds may be any value (infinite looping until timer expires)
```

#### Scenario: Interval loop (EMOM) completion

```
GIVEN a workout "(30) :60 EMOM Exercise" with loop type 'interval'
  AND totalRounds = 30
WHEN rounds reaches 30
THEN isComplete() returns true
  AND interval timer resets have occurred 30 times
```

### Requirement: Initial Child Push on Mount

The runtime MUST automatically compile and push the first child when a loop block is mounted.

#### Scenario: Auto-push first child on block mount

```
GIVEN a RoundsBlock with children [Exercise1, Exercise2]
WHEN the block is pushed onto the runtime stack
THEN onPush() automatically calls onNext() internally
  AND returns a PushBlockAction for Exercise1
  AND the user does not need to call next() to start
```

#### Scenario: Initialize index to pre-first state

```
GIVEN a new LoopCoordinatorBehavior
WHEN onPush() is called
THEN index is initialized to -1 (or 0 and incremented immediately)
  AND the first onNext() advances to index 0 (first child)
```

### Requirement: Compilation Context Passing

The runtime MUST pass compilation context from parent loops to child blocks during compilation.

#### Scenario: Pass round context to child

```
GIVEN a RoundsBlock on round 2 compiling a child
WHEN calling JitCompiler.compile(child, context)
THEN context includes { round: 2, position: 1, totalRounds: 3 }
  AND child block can access this context
```

#### Scenario: Pass rep scheme context to child

```
GIVEN a RoundsBlock with repScheme [21, 15, 9] on round 1 (0-indexed round 0)
WHEN compiling a child exercise
THEN context includes { reps: 21, round: 1 }
  AND child EffortBlock receives reps = 21
```

#### Scenario: Pass interval context to child (EMOM)

```
GIVEN an IntervalBlock with 60-second intervals
WHEN compiling a child during interval 5
THEN context includes { interval: 5, intervalDurationMs: 60000 }
  AND child knows the interval constraints
```

### Requirement: Loop Coordinator Behavior Implementation

The runtime MUST provide a LoopCoordinatorBehavior class that implements IRuntimeBehavior and manages all loop operations.

#### Scenario: Coordinator handles onNext() calls

```
GIVEN a LoopCoordinatorBehavior configured with 2 child groups and 3 rounds
WHEN onNext() is called
THEN the behavior:
  - Calculates current position and rounds from index
  - Checks completion condition based on loop type
  - Builds compilation context with current state
  - Compiles the child group at current position
  - Increments index
  - Returns PushBlockAction for compiled child
```

#### Scenario: Coordinator exposes loop state

```
GIVEN a LoopCoordinatorBehavior with internal index = 5
WHEN getState() is called
THEN it returns { index: 5, position: calculated, rounds: calculated }
  AND callers can inspect current loop state
```

#### Scenario: Coordinator provides reps for current round

```
GIVEN a LoopCoordinatorBehavior with repScheme [21, 15, 9]
  AND current rounds = 1 (0-indexed)
WHEN getRepsForCurrentRound() is called
THEN it returns 15 (repScheme[1])
```

### Requirement: Event Emission on Transitions

The runtime MUST emit events when rounds change and when loops complete.

#### Scenario: Emit rounds:changed on round transition

```
GIVEN a LoopCoordinatorBehavior crossing from rounds 0 to 1
WHEN onNext() detects position wrap and round increment
THEN runtime.emit() is called with:
  - name: 'rounds:changed'
  - round: 2 (1-indexed for display)
  - totalRounds: 3
```

#### Scenario: Emit rounds:complete on loop finish

```
GIVEN a LoopCoordinatorBehavior reaching completion (rounds >= totalRounds)
WHEN onNext() detects completion
THEN runtime.emit() is called with:
  - name: 'rounds:complete'
  - totalRounds: final round count
  - completedAt: timestamp
```

#### Scenario: No event emission mid-round

```
GIVEN a LoopCoordinatorBehavior advancing within a round (position 0 to 1)
WHEN onNext() is called
THEN no events are emitted (only on round boundaries and completion)
```

### Requirement: Performance Optimization

Loop state calculations MUST meet strict performance targets to avoid blocking workout execution.

#### Scenario: State calculation under 0.1ms

```
GIVEN a LoopCoordinatorBehavior with index = 1000
WHEN calculating position = index % childGroups.length
  AND calculating rounds = floor(index / childGroups.length)
THEN both calculations complete in < 0.1ms total
```

#### Scenario: No performance degradation with high round counts

```
GIVEN a stress test with 1000 rounds
WHEN advancing through all rounds
THEN each onNext() call maintains < 1ms execution time
  AND no memory leaks occur
```

### Requirement: Backward Compatibility During Migration

The new loop coordinator MUST coexist with existing behaviors during migration phase.

#### Scenario: Feature flag enables new behavior

```
GIVEN a RoundsBlock with configuration { useNewLoopBehavior: true }
WHEN the block is constructed
THEN it uses LoopCoordinatorBehavior instead of RoundsBehavior + ChildAdvancementBehavior
```

#### Scenario: Legacy behavior still works

```
GIVEN a RoundsBlock with configuration { useNewLoopBehavior: false }
WHEN the block is constructed
THEN it uses the original RoundsBehavior + ChildAdvancementBehavior composition
  AND existing workouts continue functioning (even if buggy)
```
