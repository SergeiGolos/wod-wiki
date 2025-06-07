# TickEvent

**Description**: Event representing a timer tick, typically occurring at regular intervals.

**Original Location**: `src/core/runtime/inputs/TickHandler.ts` (Note: File name suggests handler, class is TickEvent)

## Properties

*   `timestamp: Date` - The timestamp when the tick event was created (defaults to current time)
*   `name: string` - Event name, always 'tick'

## Methods

*   `constructor()` - Creates a new TickEvent with current timestamp

## Associated Handler: TickHandler

**Description**: Handles timer tick events to manage duration-based completion logic.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'tick'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes tick events

**Behavior**:
*   Checks if the current block has a defined duration
*   If no duration is set, the handler does nothing (returns empty array)
*   If duration exists, calculates elapsed time and triggers completion when duration is reached
*   Generates `CompleteEvent` through `NotifyRuntimeAction` when duration expires

**Special Handling**:
*   Tick events are not logged to reduce console noise
*   Only processes blocks with explicitly defined durations

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `TickHandler implements [[EventHandler]]`