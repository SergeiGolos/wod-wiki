# SkipEvent

**Description**: Event indicating a request to skip the current segment or task.

**Original Location**: `src/core/runtime/inputs/SkipEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'skip'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new SkipEvent with optional timestamp (defaults to current time)

## Associated Handler: SkipHandler

**Description**: Handles skip events by finishing the current rest/recovery period and moving to the next block.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'skip'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes skip events

**Actions Generated**:
*   `StopTimerAction` - Stops the current timer using a StopEvent with the skip event's timestamp
*   `PushNextAction` - Advances to the next block in the sequence

**Use Case**: Primarily used when a user wants to skip the remaining time in a rest period during workouts.

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `SkipHandler implements [[EventHandler]]`