# Rounds Block

The **Rounds Block** is a structural container that executes its child blocks multiple times. It handles standard multi-round workouts and variable repetition schemes.

## Overview

*   **Strategy**: `RoundsStrategy`
*   **Class**: `RuntimeBlock` (configured with `LoopCoordinatorBehavior`)
*   **Syntax**: Lines specifying a round count or rep scheme, without a time limit.
*   **Type**: Parent Block (contains children)

## Matching Logic

The `RoundsStrategy` matches a statement if:
1.  It has a `Rounds` fragment (e.g., "3 rounds", "21-15-9").
2.  It has NO `Timer` fragment (Timer takes precedence).

## Variations

The block behaves differently based on the syntax used:

### 1. Fixed Rounds

Standard looping behavior where the block repeats its children a set number of times.

**Syntax Example:**
```
3 Rounds
  5 Pullups
  10 Pushups
```

**Internal Logic:**
*   **Loop Type**: `LoopType.FIXED`
*   **Total Rounds**: Extracted from syntax (e.g., 3).
*   **Execution**: Cycles through child groups 3 times.

### 2. Rep Schemes

Variable looping where the "reps" count changes for each round. This allows child blocks to inherit different values dynamically.

**Syntax Example:**
```
21-15-9
  Thrusters
  Pullups
```

**Internal Logic:**
*   **Loop Type**: `LoopType.REP_SCHEME`
*   **Rep Scheme**: Array of numbers `[21, 15, 9]`.
*   **Total Rounds**: Length of the scheme (3).
*   **Metric Inheritance**:
    *   The block allocates a `METRIC_REPS` value in public memory.
    *   On each round transition, it updates this value to the current round's rep count (e.g., 21, then 15, then 9).
    *   Child `EffortBlock`s look up this value to set their `targetReps`.

## Lifecycle & Execution

1.  **Creation**:
    *   Extracts total rounds or rep scheme from the `Rounds` fragment.
    *   Collects child statement IDs.
    *   Creates a `LoopCoordinatorBehavior` to manage the iteration.

2.  **Execution**:
    *   Push: Initializes the first round.
    *   Update: If using a rep scheme, publishes the current rep count to memory.
    *   Next: When children complete, the `LoopCoordinator` advances to the next round.
    *   Complete: Emits `rounds:complete` when all rounds are finished.

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`RoundsStrategy`)
*   **Behavior**: `src/runtime/behaviors/LoopCoordinatorBehavior.ts`
*   **Memory**: Uses `METRIC_REPS` (MemoryTypeEnum) for context passing.
