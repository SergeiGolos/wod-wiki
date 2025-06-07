# StartEvent

**Description**: Event indicating a request to start an operation, timer, or workout.

**Original Location**: `src/core/runtime/inputs/StartEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'start'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new StartEvent with optional timestamp (defaults to current time)

## Associated Handler: StartHandler

**Description**: Handles start events by initiating timer operations and updating UI state.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'start'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes start events

**Actions Generated**:
*   `StartTimerAction` - Initiates timer with the event
*   `SetButtonAction` - Updates UI buttons to show "end" and "pause" options

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `StartHandler implements [[EventHandler]]`