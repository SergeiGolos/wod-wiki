# WriteResultAction

**Description**: Action to write or record a result from a workout segment.

**Original Location**: `src/core/runtime/outputs/WriteResultAction.ts`

## Properties

*   `results: RuntimeSpan[]` - Array of runtime spans to write as results (private)
*   `eventType: string` - Inherited from OutputAction, set to 'WRITE_RESULT'
*   `name: string` - Inherited from OutputAction

## Methods

*   `constructor(result: RuntimeSpan | RuntimeSpan[])` - Creates a new WriteResultAction with single result or array of results
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Writes result data to output, creating one output event per result span
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

## Relationships
*   **Extends**: `[[OutputAction]]`