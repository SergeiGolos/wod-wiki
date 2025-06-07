# IdleStatementAction

**Description**: Action related to processing or transitioning to an idle statement or state.

**Original Location**: `src/core/runtime/actions/IdleStatementAction.ts`

## Properties

*   `name: string` - Action name, always 'set-idle'

## Methods

*   `constructor()` - Creates a new IdleStatementAction
*   `apply(runtime: ITimerRuntime): IRuntimeEvent[]` - Applies the action by pushing an idle block to the runtime and returns empty event array

## Relationships
*   **Implements**: `[[IRuntimeAction]]`