# StopEvent

**Description**: Event indicating a request to stop the current operation or timer.

**Original Location**: `src/core/runtime/inputs/StopEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'stop'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new StopEvent with optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`