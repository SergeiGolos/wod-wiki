# IRuntimeAction

**Description**: Defines operations that modify runtime state or trigger side effects.

**Original Location**: `src/core/IRuntimeAction.ts`

## Properties

*   `name: string` - Unique identifier for the action

## Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Executes the action with the given runtime context, input event stream, and output event stream

## Relationships
*   **Implemented by**: `[[PopBlockAction]]`, `[[PushStatementAction]]`, `[[PushStatementWithTimerAction]]`, `[[PushEndBlockAction]]`, `[[PushIdleBlockAction]]`, `[[ResetAction]]`, `[[NotifyRuntimeAction]]`, `[[PlaySoundAction]]`, `[[IdleStatementAction]]`, `[[StartTimerAction]]`, `[[StopTimerAction]]`, `[[UpdateMetricsAction]]`, `[[PopulateMetricsAction]]`, `[[PushNextAction]]`, `[[AbstractRuntimeAction]]`, `[[OutputAction]]`