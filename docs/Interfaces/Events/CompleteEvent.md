# CompleteEvent

**Description**: Event indicating the completion of a task, segment, or workout.

**Original Location**: `src/core/runtime/inputs/CompleteEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'complete'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new CompleteEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`