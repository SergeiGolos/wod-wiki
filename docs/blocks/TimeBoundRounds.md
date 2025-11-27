# Time Bound Rounds Block (AMRAP)

The **Time Bound Rounds Block** implements "As Many Rounds As Possible" (AMRAP) workouts. It combines a countdown timer with an infinite loop of exercises.

## Overview

*   **Strategy**: `TimeBoundRoundsStrategy`
*   **Class**: `RuntimeBlock` (configured with `TimerBehavior` and `LoopCoordinatorBehavior`)
*   **Syntax**: Timer combined with "AMRAP" keyword or implicit time-priority structure.
*   **Type**: Parent Block

## Matching Logic

The `TimeBoundRoundsStrategy` matches a statement if:
1.  It has a `Timer` fragment.
2.  It has either:
    *   A `Rounds` fragment.
    *   An `Action` or `Effort` fragment containing "AMRAP".

**Example:**
```
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats
```

## Internal Logic

### Behaviors
1.  **TimerBehavior**:
    *   **Direction**: 'down' (Countdown).
    *   **Duration**: Derived from the timer fragment (e.g., "20:00" = 1200000ms).
    *   **Memory**: Manages `TIME_SPANS` and `IS_RUNNING` in public memory.

2.  **LoopCoordinatorBehavior**:
    *   **Loop Type**: `LoopType.TIME_BOUND`
    *   **Total Rounds**: `Infinity` (Unlimited).
    *   **Execution**:
        *   Cycles through child groups repeatedly.
        *   Does not enforce a round limit.
        *   Stops only when the timer expires.

3.  **CompletionBehavior**:
    *   Checks if the Timer has expired (`elapsed >= duration`).
    *   Marks the block as complete when time runs out.

### Memory Layout
*   `timer:time-spans`: Countdown state.
*   `timer:is-running`: Boolean state.

## Example Scenario

```
7:00 AMRAP
  7 Burpees
```
*   **Runtime**:
    *   Timer starts at 7:00 and counts down.
    *   "7 Burpees" block is pushed.
    *   User completes burpees.
    *   "7 Burpees" block is pushed again immediately (Round 2).
    *   Repeats until Timer hits 0:00.
    *   Block completes.

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`TimeBoundRoundsStrategy`)
*   **Behavior**: `src/runtime/behaviors/TimerBehavior.ts`, `src/runtime/behaviors/LoopCoordinatorBehavior.ts`
