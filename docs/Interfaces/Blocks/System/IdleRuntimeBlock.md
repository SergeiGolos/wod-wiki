# IdleRuntimeBlock

**Description**: Represents an idle state or a pause within the workout execution flow.

**Original Location**: `src/core/runtime/blocks/IdleRuntimeBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   Uses an `IdleStatementNode` as its compiled metrics base

## Methods

*   `constructor()` - Creates a new IdleRuntimeBlock with an IdleStatementNode containing default metadata
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up start button and clears runtime buttons, updates span display
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when advancing
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

## Behavior

*   Represents an idle state or pause in workout execution
*   Shows only a start button to allow user to resume
*   Clears runtime-specific buttons while in idle state
*   Updates span display to show current idle status

## Relationships
*   **Extends**: `[[RuntimeBlock]]`