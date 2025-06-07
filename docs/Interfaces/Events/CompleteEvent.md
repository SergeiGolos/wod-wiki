# CompleteEvent

**Description**: Event indicating the completion of a task, segment, or workout.

**Original Location**: `src/core/runtime/inputs/CompleteEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'complete'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new CompleteEvent with optional timestamp (defaults to current time)

## Associated Handler: CompleteHandler

**Description**: Handles completion events for standard completion behavior.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'complete'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes complete events

**Actions Generated**:
*   `PushNextAction` - Advances to the next block in the sequence

**Note**: The rest/recovery logic for handling remaining time has been moved to `RestRemainderHandler`. This handler focuses on standard completion flow.

## Related Handlers

**RestRemainderHandler**: Also listens for 'complete' events but specifically handles cases where there's remaining time to be converted into a rest period.

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `CompleteHandler implements [[EventHandler]]`
*   **Related**: `RestRemainderHandler` also processes complete events