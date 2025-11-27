# Interval Block (EMOM)

The **Interval Block** manages "Every Minute On the Minute" (EMOM) style workouts. It repeats work at fixed time intervals.

## Overview

*   **Strategy**: `IntervalStrategy`
*   **Class**: `RuntimeBlock` (configured with `LoopCoordinatorBehavior`)
*   **Syntax**: Timer combined with "EMOM" keyword.
*   **Type**: Parent Block

## Matching Logic

The `IntervalStrategy` matches a statement if:
1.  It has a `Timer` fragment.
2.  It has an `Action` or `Effort` fragment containing "EMOM".

**Example:**
```
EMOM 10
  5 Pullups
```

## Internal Logic

### Behaviors
1.  **LoopCoordinatorBehavior**:
    *   **Loop Type**: `LoopType.INTERVAL`
    *   **Interval Duration**: Derived from the timer fragment (e.g., "1:00" = 60000ms).
    *   **Total Rounds**: Derived from the syntax (e.g., "10" minutes / 1 minute = 10 rounds).
    *   **Execution**:
        *   Starts the children.
        *   When children complete, waits for the remainder of the interval.
        *   Restart children at the next interval boundary.

2.  **HistoryBehavior**: Records "EMOM" history.

3.  **CompletionBehavior**: Completes when all intervals are finished.

### Current Implementation Status
*   **Strategy**: `src/runtime/strategies.ts`
*   **Status**: The matching logic is complete. The compilation logic currently uses placeholder values (`60000ms`, `10 rounds`) while the full parsing logic is being finalized.
*   **Memory**: Standard block context.

## Example Scenario

```
EMOM 10
  3 Cleans
```
*   **Goal**: Perform 3 Cleans every minute for 10 minutes.
*   **Runtime**:
    *   Block starts.
    *   Minute 0: "3 Cleans" block pushed.
    *   User completes cleans at 0:20.
    *   System waits until 1:00.
    *   Minute 1: "3 Cleans" block pushed again.
    *   Repeats until Minute 10.

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`IntervalStrategy`)
*   **Behavior**: `src/runtime/behaviors/LoopCoordinatorBehavior.ts`
