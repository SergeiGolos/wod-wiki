# EndEvent

**Description**: Event indicating the end of an operation, segment, or workout.

**Original Location**: `src/core/runtime/inputs/EndEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'end'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new EndEvent with optional timestamp (defaults to current time)

## Associated Handler: EndHandler

**Description**: Handles end events by stopping the timer and transitioning to completion state.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'end'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes end events

**Actions Generated**:
*   `StopTimerAction` - Stops the current timer with the event timestamp

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `EndHandler implements [[EventHandler]]`