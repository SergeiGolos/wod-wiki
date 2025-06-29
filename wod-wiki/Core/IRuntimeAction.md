Defines operations that modify runtime state or trigger side effects.

**Original Location**: `src/core/IRuntimeAction.ts`

## Properties

*   `name: string` - Unique identifier for the action

## Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Executes the action with the given runtime context, input event stream, and output event stream

## Relationships
*   **Implemented by**: `[[PopBlockAction]]`, `[[PushStatementAction]]`, `[[PushStatementWithTimerAction]]`, `[[PushEndBlockAction]]`, `[[PushIdleBlockAction]]`, `[[ResetAction]]`, `[[NotifyRuntimeAction]]`, `[[PlaySoundAction]]`, `[[IdleStatementAction]]`, `[[StartTimerAction]]`, `[[StopTimerAction]]`, `[[UpdateMetricsAction]]`, `[[PopulateMetricsAction]]`, `[[PushNextAction]]`, `[[AbstractRuntimeAction]]`, `[[OutputAction]]`

## Implementations

### EndAction

**Description**: Action to push a special "end block" marker or state onto the runtime stack, signifying the completion of a block's execution.

**Original Location**: `src/core/runtime/actions/PushEndBlockAction.ts`

#### Properties

*   `name: string` - Action name, always 'goto'

#### Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by pushing an end block to the runtime using the JIT compiler

### EventAction

**Description**: Action to send a notification or message within the runtime system, possibly for UI updates or logging.

**Original Location**: `src/core/runtime/actions/NotifyRuntimeAction.ts`

#### Properties

*   `event: IRuntimeEvent` - The runtime event to notify about
*   `name: string` - Action name, always 'notify'

#### Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new NotifyRuntimeAction with the specified event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by sending the event to the input stream

### PopBlockAction

**Description**: Action to remove the current block from the runtime stack.

**Original Location**: `src/core/runtime/actions/PopBlockAction.ts`

#### Properties

*   `name: string` - Action name, always 'pop'

#### Methods

*   `constructor()` - Creates a new PopBlockAction
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Pops the current block from the runtime stack and calls next() on the new current block

### PushBlockAction

**Description**: Action to push a new statement or block onto the runtime stack.

**Original Location**: `src/core/runtime/actions/PushStatementAction.ts`

#### Properties

*   `statements: JitStatement[]` - The array of JIT statements to compile and push
*   `name: string` - Action name, always 'goto'

#### Methods

*   `constructor(statements: JitStatement[])` - Creates a new PushStatementAction with the specified statements
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by compiling the statements into a block and pushing it to the runtime

### PushStatementAction

**Description**: Action to push a new statement or block onto the runtime stack.

**Original Location**: `src/core/runtime/actions/PushStatementAction.ts`

#### Properties

*   `statements: JitStatement[]` - The array of JIT statements to compile and push
*   `name: string` - Action name, always 'goto'

#### Methods

*   `constructor(statements: JitStatement[])` - Creates a new PushStatementAction with the specified statements
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by compiling the statements into a block and pushing it to the runtime

### ResetAction

**Description**: Action to reset the runtime state to its initial condition.

**Original Location**: `src/core/runtime/actions/ResetAction.ts`

#### Properties

*   `name: string` - Action name, always 'reset'
*   `event: IRuntimeEvent` - The triggering reset event (private)

#### Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new ResetAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Resets the runtime state by calling runtime.reset()

### StartTimerAction

**Description**: Action to start or resume a timer.

**Original Location**: `src/core/runtime/actions/StartTimerAction.ts`

#### Properties

*   `name: string` - Action name, always 'start'
*   `event: IRuntimeEvent` - The triggering runtime event (private)

#### Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new StartTimerAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` 
*   `applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void` - Applies the start timer action to a specific block by calling block.onStart() (protected)

### StopTimerAction

**Description**: Action to stop or pause a timer.

**Original Location**: `src/core/runtime/actions/StopTimerAction.ts`

#### Properties

*   `name: string` - Action name, always 'stop'
*   `event: IRuntimeEvent` - The triggering runtime event (private)

#### Methods

*   `constructor(event: IRuntimeEvent)` - Creates a new StopTimerAction with the triggering event
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` 
*   `applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void` - Applies the stop timer action to a specific block by calling block.onStop() (protected)