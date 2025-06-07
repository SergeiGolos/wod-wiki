# StartEvent

**Description**: Event indicating a request to start an operation, timer, or workout.

**Original Location**: `src/core/runtime/inputs/StartEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'start'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new StartEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`