# StartTimerAction

**Description**: Action to start or resume a timer.

**Original Location**: `src/core/runtime/actions/StartTimerAction.ts`

## Properties

*   `name: string` - Action name, always 'start'
*   `event: IRuntimeEvent` - The triggering runtime event (private)

## Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new StartTimerAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` 
*   `applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void` - Applies the start timer action to a specific block by calling block.onStart() (protected)

## Relationships
*   **Implements**: `[[IRuntimeAction]]`

## Relationships
*   **Implements**: `[[IRuntimeAction]]`