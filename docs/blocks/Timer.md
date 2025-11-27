# Timer Block

The **Timer Block** handles time-based execution. In its simplest form, it acts as a "For Time" stopwatch, measuring how long it takes to complete the child work.

## Overview

*   **Strategy**: `TimerStrategy`
*   **Class**: `RuntimeBlock` (configured with `TimerBehavior`)
*   **Syntax**: Lines with a time duration (e.g., "20:00") that don't match more complex strategies (like AMRAP or EMOM).
*   **Type**: Parent Block (usually contains children)

## Matching Logic

The `TimerStrategy` matches a statement if:
1.  It has a `Timer` fragment (e.g., "10:00", "For Time").
2.  It does NOT match `IntervalStrategy` (EMOM) or `TimeBoundRoundsStrategy` (AMRAP).

## Internal Logic

### Behaviors
1.  **TimerBehavior**:
    *   **Direction**: 'up' (Count Up).
    *   **Memory**: Manages `TIME_SPANS` (start/stop times) and `IS_RUNNING` state in public memory.
2.  **LoopCoordinatorBehavior** (if children exist):
    *   **Loop Type**: `LoopType.FIXED`
    *   **Total Rounds**: 1.
    *   Executes the child list exactly once.
3.  **CompletionBehavior**:
    *   Completes when the children finish execution.
    *   For pure timers without children, it may require manual stopping.

### Memory Layout
The block allocates public memory accessible by UI components (like the clock display):
*   `timer:time-spans`: Array of `{start, stop}` objects to track elapsed time.
*   `timer:is-running`: Boolean state.

## Example Scenarios

### For Time
```
For Time
  100 Burpees
```
*   **Behavior**: Timer starts at 0:00 and counts up.
*   **Completion**: When "100 Burpees" is marked complete, the Timer stops and marks the block complete.

### Simple Timer
```
10:00
```
*(If treated as a simple timer)*
*   **Behavior**: Counts up. (Note: "10:00" might be interpreted as a cap or countdown depending on context, but the basic `TimerStrategy` defaults to "For Time" logic unless specific flags are present).

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`TimerStrategy`)
*   **Behavior**: `src/runtime/behaviors/TimerBehavior.ts`
