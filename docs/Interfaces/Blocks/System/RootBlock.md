# RootBlock

**Description**: Represents the top-level container block for an entire workout structure.

**Original Location**: `src/core/runtime/blocks/RootBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `children: JitStatement[]` - Child statements to execute (private)
*   `_sourceIndex: number` - Current index within child statements (private, starts at -1)
*   `handlers: EventHandler[]` - Includes RunHandler, EndHandler, and ResetHandler for root-level events

## Methods

*   `constructor(children: JitStatement[])` - Creates a new RootBlock with child statements and sets up event handlers
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up start button and pushes idle block to begin execution
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages progression through child statements, handles completion
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

## Behavior

*   Serves as the top-level container for an entire workout structure
*   Often wraps a single main block (like CompoundBlock or RepeatingBlock)
*   Manages overall workout progression and state transitions
*   Starts execution by pushing an idle block to allow user to begin
*   Tracks progress through child statements using internal source index
*   Handles root-level events like run, end, and reset through specialized handlers
*   Creates span builder for tracking overall workout metrics
*   Pushes end block when all child statements are completed
*   Uses consecutive child statement grouping for execution phases

## Relationships
*   **Extends**: `[[RuntimeBlock]]`