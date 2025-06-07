# OutputAction

**Description**: Abstract base class for actions that result in an output, such as UI updates or logging.

**Original Location**: `src/core/runtime/OutputAction.ts`

## Properties

*   `eventType: OutputEventType` - The type of output event this action produces
*   `name: string` - The action name in format `out:${eventType}`

## Methods

*   `constructor(eventType: OutputEventType)` - Creates a new OutputAction with the specified event type
*   `abstract write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Abstract method to generate output events (must be implemented by subclasses)
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by calling write() and emitting events to the output stream

## Relationships
*   **Implements**: `[[IRuntimeAction]]`
*   **Extended by**: `[[SetDurationAction]]`, `[[SetSpanAction]]`, `[[SetButtonAction]]`, `[[SetTimerStateAction]]`, `[[WriteLogAction]]`, `[[WriteResultAction]]`