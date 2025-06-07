# WriteLogAction

**Description**: Action to write an entry to a log.

**Original Location**: `src/core/runtime/outputs/WriteLogAction.ts`

## Properties

*   `eventType: OutputEventType` - The type of output event, always 'WRITE_LOG' (inherited from OutputAction)
*   `name: string` - The action name in format `out:${eventType}` (inherited from OutputAction)
*   `log: IRuntimeLog` - The log entry to write (private)

## Methods

*   `constructor(log: IRuntimeLog)` - Creates a new WriteLogAction with the specified log entry
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Generates output events containing the log data
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by writing events to output (inherited from OutputAction)

## Relationships
*   **Extends**: `[[OutputAction]]`