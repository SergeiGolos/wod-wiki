# PopBlockAction

**Description**: Action to remove the current block from the runtime stack.

**Original Location**: `src/core/runtime/actions/PopBlockAction.ts`

## Properties

*   `name: string` - Action name, always 'pop'

## Methods

*   `constructor()` - Creates a new PopBlockAction
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Pops the current block from the runtime stack and calls next() on the new current block

## Relationships
*   **Implements**: `[[IRuntimeAction]]`