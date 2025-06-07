# ResetEvent

**Description**: Event indicating a request to reset the runtime or a component to its initial state.

**Original Location**: `src/core/runtime/inputs/ResetEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'reset'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new ResetEvent with optional timestamp (defaults to current time)

## Associated Handler: ResetHandler

**Description**: Handles reset events by triggering a reset action to restore initial state.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'reset'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes reset events

**Actions Generated**:
*   `ResetAction` - Resets the runtime state using the provided event

**Use Case**: Used to restart workouts or reset runtime state to beginning conditions.

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `ResetHandler implements [[EventHandler]]`