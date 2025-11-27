# Effort Block

The **Effort Block** is the fundamental unit of work in the WOD Wiki runtime. It represents a single exercise or action to be performed, such as "5 Pullups", "Run 400m", or "Rest".

## Overview

*   **Strategy**: `EffortStrategy`
*   **Class**: `EffortBlock` (if reps specified) or `RuntimeBlock` (generic)
*   **Syntax**: Any line that describes an action but does not include a timer or round count.
*   **Type**: Leaf Node (typically has no children)

## Matching Logic

The `EffortStrategy` matches a statement if:
1.  It has NO `Timer` fragments.
2.  It has NO `Rounds` fragments.

This makes it the fallback strategy for simple instruction lines.

## Variations

The JIT compiler creates two distinct types of blocks based on the content of the statement:

### 1. Specified Reps (Specialized EffortBlock)

If the statement contains an explicit rep count (e.g., "5 Pullups") or inherits a rep count from a parent (e.g., within a "21-15-9" scheme), a specialized `EffortBlock` class is instantiated.

**Characteristics:**
*   **Class**: `EffortBlock`
*   **Behavior**:
    *   Tracks `currentReps` and `targetReps`.
    *   Validates input range [0, targetReps].
    *   Completes automatically when `currentReps >= targetReps`.
*   **Memory**: Allocates a public memory block `effort:{blockId}` containing:
    *   `exerciseName`: String
    *   `currentReps`: Number
    *   `targetReps`: Number
*   **Events**:
    *   Emits `reps:updated` on progress.
    *   Emits `reps:complete` when finished.

**Example Code:**
```
5 Pullups
```
or
```
21-15-9
  Thrusters
  Pullups
```
*(Here, "Thrusters" and "Pullups" inherit reps from the parent scheme and become EffortBlocks)*

### 2. Generic Effort (Generic RuntimeBlock)

If no reps are specified (e.g., "Run 400m", "Rest"), a generic `RuntimeBlock` is created.

**Characteristics:**
*   **Class**: `RuntimeBlock` (with "Effort" type)
*   **Behavior**:
    *   Uses `CompletionBehavior` configured to complete on manual 'next' event.
    *   Does NOT complete on periodic 'tick'.
    *   Requires user interaction to advance.
*   **Memory**: Standard block context.

**Example Code:**
```
Run 800m
```

## Lifecycle & Execution

1.  **Creation**:
    *   The strategy checks for explicit reps in the `Effort` fragment.
    *   If missing, it searches public memory (`METRIC_REPS`) for inherited values (handling cases like "21-15-9").
    *   Instantiates the appropriate block type.

2.  **Execution**:
    *   **Generic**: Waits for user to click "Next" or trigger a 'next' event.
    *   **Specialized**: Active immediately. Listens for rep updates (via API or UI). Completes when target reached.

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`EffortStrategy`)
*   **Block Source**: `src/runtime/blocks/EffortBlock.ts`
