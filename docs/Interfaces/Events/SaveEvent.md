# SaveEvent

**Description**: Event indicating a request to save the current state or data.

**Original Location**: `src/core/runtime/inputs/SaveEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'save'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new SaveEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`