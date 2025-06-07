# PushEndBlockAction

**Description**: Action to push a special "end block" marker or state onto the runtime stack, signifying the completion of a block's execution.

**Original Location**: `src/core/runtime/actions/PushEndBlockAction.ts`

## Properties

*   `name: string` - Action name, always 'goto'

## Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by pushing an end block to the runtime using the JIT compiler

## Relationships
*   **Implements**: `[[IRuntimeAction]]`