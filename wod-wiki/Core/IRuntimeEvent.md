
**Description**: Represents events in the runtime system (user interactions, timer events, etc.).

**Original Location**: `src/core/IRuntimeEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event occurred
*   `name: string` - The name/type of the event
*   `blockKey?: string` - Optional block key identifying which block the event relates to

## Methods

*   None - This is a data interface with no methods

## Implementations

### CompleteEvent

**Description**: Event indicating the completion of a task, segment, or workout.

**Original Location**: `src/core/runtime/inputs/CompleteEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'complete'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new CompleteEvent with optional timestamp (defaults to current time)

#### Associated Handler: CompleteHandler

**Description**: Handles completion events for standard completion behavior.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'complete'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes complete events

##### Actions Generated
*   `PushNextAction` - Advances to the next block in the sequence

**Note**: The rest/recovery logic for handling remaining time has been moved to `RestRemainderHandler`. This handler focuses on standard completion flow.

#### Related Handlers

**RestRemainderHandler**: Also listens for 'complete' events but specifically handles cases where there's remaining time to be converted into a rest period.

### EndEvent

**Description**: Event indicating the end of an operation, segment, or workout.

**Original Location**: `src/core/runtime/inputs/EndEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'end'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new EndEvent with optional timestamp (defaults to current time)

#### Associated Handler: EndHandler

**Description**: Handles end events by stopping the timer and transitioning to completion state.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'end'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes end events

##### Actions Generated
*   `StopTimerAction` - Stops the current timer with the event timestamp

### NextStatementEvent

**Description**: Event indicating a request to proceed to the next statement or instruction.

**Original Location**: `src/core/runtime/inputs/NextStatementEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `blockId?: number` - Optional block identifier associated with the event
*   `name: string` - Event name, always 'next'

#### Methods

*   `constructor(timestamp?: Date, blockId?: number)` - Creates a new NextStatementEvent with optional timestamp and block ID

#### Associated Handler: NextStatementHandler

**Description**: Handles requests to advance the workout to the next statement or instruction.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'next'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes next statement events

##### Behavior
*   Processes user or system requests to advance workout progression
*   Creates navigation actions to move to the next logical step
*   Core mechanism for sequential workout progression

##### Generated Actions
*   `PushNextAction` - Advances the runtime to the next statement or block

### ResetEvent

**Description**: Event indicating a request to reset the runtime or a component to its initial state.

**Original Location**: `src/core/runtime/inputs/ResetEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'reset'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new ResetEvent with optional timestamp (defaults to current time)

#### Associated Handler: ResetHandler

**Description**: Handles reset events by triggering a reset action to restore initial state.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'reset'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes reset events

##### Actions Generated
*   `ResetAction` - Resets the runtime state using the provided event

**Use Case**: Used to restart workouts or reset runtime state to beginning conditions.

### RunEvent

**Description**: Event indicating a request to run or execute a workout or process.

**Original Location**: `src/core/runtime/inputs/RunEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'run'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new RunEvent with optional timestamp (defaults to current time)

#### Associated Handler: RunHandler

**Description**: Handles run events by initiating execution flow.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'run'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes run events

##### Actions Generated
*   `PushNextAction` - Pushes the next action in the execution sequence

**Use Case**: Used to start or continue execution of workout sequences.

### SkipEvent

**Description**: Event indicating a request to skip the current segment or task.

**Original Location**: `src/core/runtime/inputs/SkipEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'skip'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new SkipEvent with optional timestamp (defaults to current time)

#### Associated Handler: SkipHandler

**Description**: Handles skip events by finishing the current rest/recovery period and moving to the next block.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'skip'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes skip events

##### Actions Generated
*   `StopTimerAction` - Stops the current timer using a StopEvent with the skip event\'s timestamp
*   `PushNextAction` - Advances to the next block in the sequence

**Use Case**: Primarily used when a user wants to skip the remaining time in a rest period during workouts.

### StartEvent

**Description**: Event indicating a request to start an operation, timer, or workout.

**Original Location**: `src/core/runtime/inputs/StartEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'start'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new StartEvent with optional timestamp (defaults to current time)

#### Associated Handler: StartHandler

**Description**: Handles start events by initiating timer operations and updating UI state.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'start'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes start events

##### Actions Generated
*   `StartTimerAction` - Initiates timer with the event
*   `SetButtonAction` - Updates UI buttons to show \"end\" and \"pause\" options

### StopEvent

**Description**: Event indicating a request to stop the current operation or timer.

**Original Location**: `src/core/runtime/inputs/StopEvent.ts`

#### Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'stop'

#### Methods

*   `constructor(timestamp?: Date)` - Creates a new StopEvent with optional timestamp (defaults to current time)

#### Associated Handler: StopHandler

**Description**: Handles stop events by pausing timer operations and updating UI state.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'stop'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes stop events

##### Actions Generated
*   `StopTimerAction` - Stops/pauses the timer with the event
*   `SetButtonAction` - Updates UI buttons to show \"end\" and \"resume\" options

### TickEvent

**Description**: Event representing a timer tick, typically occurring at regular intervals.

**Original Location**: `src/core/runtime/inputs/TickHandler.ts` (Note: File name suggests handler, class is TickEvent)

#### Properties

*   `timestamp: Date` - The timestamp when the tick event was created (defaults to current time)
*   `name: string` - Event name, always 'tick'

#### Methods

*   `constructor()` - Creates a new TickEvent with current timestamp

#### Associated Handler: TickHandler

**Description**: Handles timer tick events to manage duration-based completion logic.

**Implementation**: `implements EventHandler`

##### Properties
*   `eventType: string` - Always 'tick'

##### Methods
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes tick events

##### Behavior
*   Checks if the current block has a defined duration
*   If no duration is set, the handler does nothing (returns empty array)
*   If duration exists, calculates elapsed time and triggers completion when duration is reached
*   Generates `CompleteEvent` through `NotifyRuntimeAction` when duration expires

##### Special Handling
*   Tick events are not logged to reduce console noise
*   Only processes blocks with explicitly defined durations

## Relationships
*   **Implemented by**: `[[CompleteEvent]]`, `[[SkipEvent]]`, `[[TickEvent]]`, `[[StopEvent]]`, `[[StartEvent]]`, `[[SoundEvent]]`, `[[SaveEvent]]`, `[[RunEvent]]`, `[[ResetEvent]]`, `[[PushActionEvent]]`, `[[NextStatementEvent]]`, `[[EndEvent]]`, `[[DisplayEvent]]`
*   **Extended by**: `[[IRuntimeLog]]`