# PushIdleBlockAction

**Description**: Action to push an idle block or state onto the runtime stack.

**Original Location**: `src/core/runtime/actions/PushIdleBlockAction.ts`

## Properties

*   `name: string` - Action name, always 'goto'

## Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by pushing an idle block to the runtime using the JIT compiler

## Relationships
*   **Implements**: `[[IRuntimeAction]]`