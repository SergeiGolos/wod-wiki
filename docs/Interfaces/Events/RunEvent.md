# RunEvent

**Description**: Event indicating a request to run or execute a workout or process.

**Original Location**: `src/core/runtime/inputs/RunEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'run'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new RunEvent with optional timestamp (defaults to current time)

## Related Classes

*   `RunHandler` - Event handler that processes RunEvent by pushing the next action

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`