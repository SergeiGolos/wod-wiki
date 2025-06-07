# TickEvent

**Description**: Event representing a timer tick, typically occurring at regular intervals.

**Original Location**: `src/core/runtime/inputs/TickHandler.ts` (Note: File name suggests handler, class is TickEvent)

## Properties

*   `timestamp: Date` - The timestamp when the tick event was created (defaults to current time)
*   `name: string` - Event name, always 'tick'

## Methods

*   `constructor()` - Creates a new TickEvent with current timestamp

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`