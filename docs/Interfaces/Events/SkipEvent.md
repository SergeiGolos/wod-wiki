# SkipEvent

**Description**: Event indicating a request to skip the current segment or task.

**Original Location**: `src/core/runtime/inputs/SkipEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'skip'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new SkipEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`