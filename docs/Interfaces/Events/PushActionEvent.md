# PushActionEvent

**Description**: Event that encapsulates an IRuntimeAction to be processed by the runtime.

**Original Location**: `src/core/runtime/inputs/PushActionEvent.ts`

## Properties

*   `action: IRuntimeAction` - The runtime action to be executed
*   `timestamp: Date` - The timestamp when the event was created (defaults to current time)
*   `name: string` - Event name, always 'push'

## Methods

*   `constructor(action: IRuntimeAction)` - Creates a new PushActionEvent with the specified action

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`