# NextStatementEvent

**Description**: Event indicating a request to proceed to the next statement or instruction.

**Original Location**: `src/core/runtime/inputs/NextStatementEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `blockId?: number` - Optional block identifier associated with the event
*   `name: string` - Event name, always 'next'

## Methods

*   `constructor(timestamp?: Date, blockId?: number)` - Creates a new NextStatementEvent with optional timestamp and block ID

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`