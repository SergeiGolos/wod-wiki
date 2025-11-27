# Group Block

The **Group Block** acts as a structural container for nested exercises that do not fit into specific Timer or Round patterns. It is primarily used to organize hierarchy.

## Overview

*   **Strategy**: `GroupStrategy`
*   **Class**: `RuntimeBlock` (type "Group")
*   **Syntax**: Nested items without explicit looping or timing instructions on the parent.
*   **Type**: Parent Block

## Matching Logic

The `GroupStrategy` matches a statement if:
1.  It has child statements (nested content).
2.  It does NOT match higher-priority strategies (Timer, Rounds, Interval, TimeBoundRounds).

**Example:**
```
Warmup
  Stretch
  Jog
```
*(Assuming "Warmup" doesn't trigger other strategies)*

## Internal Logic

### Current Implementation Status
*   **Strategy**: `src/runtime/strategies.ts`
*   **Status**: Placeholder. The matching logic identifies nested structures, but the compilation logic currently creates a simple pass-through block.
*   **Intent**: Future implementation will use `LoopCoordinatorBehavior` with `LoopType.FIXED` (1 round) to simply execute the children in sequence once.

### Intended Behavior
1.  **LoopCoordinatorBehavior**:
    *   **Loop Type**: `LoopType.FIXED`
    *   **Total Rounds**: 1.
    *   Executes child blocks in order, once.
2.  **CompletionBehavior**:
    *   Completes when all children have finished.

## Use Cases
*   **Structural Organization**: Grouping exercises under a label (e.g., "Part A", "Mobility").
*   **Complex Nesting**: Creating custom sequences inside other blocks.

## Implementation Details

*   **Strategy Source**: `src/runtime/strategies.ts` (`GroupStrategy`)
