# ResetEvent

**Description**: Event indicating a request to reset the runtime or a component to its initial state.

**Original Location**: `src/core/runtime/inputs/ResetEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'reset'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new ResetEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`