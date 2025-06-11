# SetSpanAction

**Description**: Action to set or update a time span, possibly for display or metric calculation.

**Original Location**: `src/core/runtime/outputs/SetSpanAction.ts`

## Properties

*   `target: string` - The target identifier for where to set the span (private)
*   `span: RuntimeSpan` - The runtime span data to set (private)
*   `eventType: string` - Inherited from OutputAction, set to 'SET_SPAN'
*   `name: string` - Inherited from OutputAction

## Methods

*   `constructor(target: string, span: RuntimeSpan)` - Creates a new SetSpanAction with target and span data
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Writes the span data to output with target and duration information
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

## Relationships
*   **Extends**: `[[OutputAction]]`