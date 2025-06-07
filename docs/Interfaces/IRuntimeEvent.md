# IRuntimeEvent

**Description**: Represents events in the runtime system (user interactions, timer events, etc.).

**Original Location**: `src/core/IRuntimeEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event occurred
*   `name: string` - The name/type of the event
*   `blockKey?: string` - Optional block key identifying which block the event relates to

## Methods

*   None - This is a data interface with no methods

## Relationships
*   **Implemented by**: `[[CompleteEvent]]`, `[[SkipEvent]]`, `[[TickEvent]]`, `[[StopEvent]]`, `[[StartEvent]]`, `[[SoundEvent]]`, `[[SaveEvent]]`, `[[RunEvent]]`, `[[ResetEvent]]`, `[[PushActionEvent]]`, `[[NextStatementEvent]]`, `[[EndEvent]]`, `[[DisplayEvent]]`
*   **Extended by**: `[[IRuntimeLog]]`