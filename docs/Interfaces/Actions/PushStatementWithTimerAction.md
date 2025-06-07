# PushStatementWithTimerAction

**Description**: Action to push a new statement or block onto the runtime stack, potentially initializing or associating it with a timer.

**Original Location**: `src/core/runtime/actions/PushStatementWithTimerAction.ts`

## Properties

*   `statements: JitStatement[]` - The array of JIT statements to compile and push
*   `inheritedDuration?: Duration` - Optional duration inherited from parent block
*   `timerName: string` - The name of the timer (defaults to "primary")
*   `name: string` - Action name, always 'goto-with-timer'

## Methods

*   `constructor(statements: JitStatement[], inheritedDuration?: Duration, timerName: string = "primary")` - Creates a new PushStatementWithTimerAction with optional timer inheritance
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by compiling statements with optional timer context and pushing to runtime
*   `enhanceStatementWithTimer(statement: JitStatement, duration: Duration): JitStatement` (private) - Enhances a statement with inherited timer context if it doesn't have its own duration

## Relationships
*   **Implements**: `[[IRuntimeAction]]`ow 