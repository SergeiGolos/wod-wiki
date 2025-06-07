# ResetAction

**Description**: Action to reset the runtime state to its initial condition.

**Original Location**: `src/core/runtime/actions/ResetAction.ts`

## Properties

*   `name: string` - Action name, always 'reset'
*   `event: IRuntimeEvent` - The triggering reset event (private)

## Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new ResetAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Resets the runtime state by calling runtime.reset()

## Relationships
*   **Implements**: `[[IRuntimeAction]]`