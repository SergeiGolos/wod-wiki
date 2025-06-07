# SetDurationAction

**Description**: Action to set or update the duration of a workout segment or timer.

**Original Location**: `src/core/runtime/outputs/SetDurationAction.ts`

## Properties

*   `duration: number` - The duration value to set
*   `timerName: string` - The name of the timer being updated
*   `eventType: string` - Inherited from OutputAction, set to 'SET_DURATION'
*   `name: string` - Inherited from OutputAction

## Methods

*   `constructor(duration: number, timerName: string)` - Creates a new SetDurationAction with specified duration and timer name
*   `getData(): object` - Returns an object containing timerName and duration
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): object[]` - Writes the duration data to output with timestamp
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

## Relationships
*   **Extends**: `[[OutputAction]]`