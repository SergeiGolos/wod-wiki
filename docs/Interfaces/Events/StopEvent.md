# StopEvent

**Description**: Event indicating a request to stop the current operation or timer.

**Original Location**: `src/core/runtime/inputs/StopEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'stop'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new StopEvent with optional timestamp (defaults to current time)

## Associated Handler: StopHandler

**Description**: Handles stop events by pausing timer operations and updating UI state.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'stop'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes stop events

**Actions Generated**:
*   `StopTimerAction` - Stops/pauses the timer with the event
*   `SetButtonAction` - Updates UI buttons to show "end" and "resume" options

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `StopHandler implements [[EventHandler]]`