# DoneRuntimeBlock

**Description**: Represents the completion state of a workout or a significant workout segment.

**Original Location**: `src/core/runtime/blocks/DoneRuntimeBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `handlers: EventHandler[]` - Includes SaveHandler and ResetHandler for completion actions

## Methods

*   `constructor(sources?: JitStatement[])` - Creates a new DoneRuntimeBlock with optional sources (defaults to IdleStatementNode)
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up system buttons (reset, save) and clears runtime buttons
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No next action needed for done block (returns empty array)
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

## Behavior

*   Represents the completion state of a workout or significant workout segment
*   Provides reset and save functionality through specialized event handlers
*   Shows system buttons for reset and save actions
*   Clears runtime-specific buttons as workout is complete
*   Uses IdleStatementNode as default source if none provided

## Relationships
*   **Extends**: `[[RuntimeBlock]]`