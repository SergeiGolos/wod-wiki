
**Description**: Action to send a notification or message within the runtime system, possibly for UI updates or logging.

**Original Location**: `src/core/runtime/actions/NotifyRuntimeAction.ts`

## Properties

*   `event: IRuntimeEvent` - The runtime event to notify about
*   `name: string` - Action name, always 'notify'

## Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new NotifyRuntimeAction with the specified event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by sending the event to the input stream

## Relationships
*   **Implements**: `[[IRuntimeAction]]`