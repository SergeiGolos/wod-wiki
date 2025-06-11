# PushStatementAction
# PushStatementAction

**Description**: Action to push a new statement or block onto the runtime stack.

**Original Location**: `src/core/runtime/actions/PushStatementAction.ts`

## Properties

*   `statements: JitStatement[]` - The array of JIT statements to compile and push
*   `name: string` - Action name, always 'goto'

## Methods

*   `constructor(statements: JitStatement[])` - Creates a new PushStatementAction with the specified statements
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by compiling the statements into a block and pushing it to the runtime

## Relationships
*   **Implements**: `[[IRuntimeAction]]`