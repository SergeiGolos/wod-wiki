# SetTimerStateAction

**Description**: Action to set or update the state of a timer (e.g., running, paused, stopped).

**Original Location**: `src/core/runtime/outputs/SetTimerStateAction.ts`

## Properties

*   `state: TimerState` - The timer state to set (STOPPED, RUNNING_COUNTDOWN, RUNNING_COUNTUP, PAUSED)
*   `name: string` - The name of the timer being updated
*   `eventType: string` - Inherited from OutputAction, set to 'SET_TIMER_STATE'

## Methods

*   `constructor(state: TimerState, name: string)` - Creates a new SetTimerStateAction with specified state and timer name
*   `getData(): object` - Returns an object containing name and state
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): object[]` - Writes the timer state data to output with timestamp
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

## Related Types

*   `TimerState` - Enum with values: STOPPED, RUNNING_COUNTDOWN, RUNNING_COUNTUP, PAUSED

## Relationships
*   **Extends**: `[[OutputAction]]`