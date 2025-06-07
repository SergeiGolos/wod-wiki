# StopTimerAction

**Description**: Action to stop or pause a timer.

**Original Location**: `src/core/runtime/actions/StopTimerAction.ts`

## Properties

*   `name: string` - Action name, always 'stop'
*   `event: IRuntimeEvent` - The triggering runtime event (private)

## Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new StopTimerAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` 
*   `applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void` - Applies the stop timer action to a specific block by calling block.onStop() (protected)

## Relationships
*   **Implements**: `[[IRuntimeAction]]`