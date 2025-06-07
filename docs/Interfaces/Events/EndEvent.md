# EndEvent

**Description**: Event indicating the end of an operation, segment, or workout.

**Original Location**: `src/core/runtime/inputs/EndEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'end'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new EndEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`