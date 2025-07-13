Defines the contract for executable workout segments in the runtime system.

**Original Location**: `src/core/IRuntimeBlock.ts`

## Properties

* `blockKey: BlockKey` - Block identity.* 
* `parent?: IRuntimeBlock | undefined` - Optional parent block.** 
* `spans: SpanComposer` - the blocks current span builder.  Allowing different to be collected at individual block levels.
* `metrics: RuntimeMetric[]` - Pre-compiled metrics instead of raw statements.
* `handlers: EventHandler[]` - the configured handlers on the block.
## Methods

*   `next(runtime: ITimerRuntime): IRuntimeAction[]` - Block implementation.




## Implementations

### EffortBlock

**Description**: Represents a block of effort in a workout, typically a leaf-level executable segment.

**Original Location**: `src/core/runtime/blocks/EffortBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `leaf: boolean` - Always true for EffortBlock (set in constructor)
*   `handlers: EventHandler[]` - Includes CompleteHandler for handling completion events

#### Methods

*   `constructor(compiledMetrics: RuntimeMetric[], sources?: JitStatement[])` - Creates a new EffortBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, buttons, and span display for effort execution
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when index >= 1
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer and clears buttons when leaving
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No specific start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No specific stop actions (returns empty array)

#### Behavior

*   Displays effort text with metric values (repetitions, resistance, distance) in parentheses
*   Shows a "Complete" button during execution
*   Starts and stops timer automatically on enter/leave
*   Updates span display to show current effort progress

### TimerBlock

**Description**: Represents a block that primarily manages a timer within a workout segment.

**Original Location**: `src/core/runtime/blocks/TimerBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `leaf: boolean` - Always true for TimerBlock (set in constructor)
*   `handlers: EventHandler[]` - Includes CompleteHandler for handling completion events

#### Methods

*   `constructor(compiledMetrics: RuntimeMetric[], sources?: JitStatement[])` - Creates a new TimerBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, system buttons (end, pause), runtime buttons (complete), and duration reporting
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when completed
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops the timer when leaving
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No additional start setup (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No additional stop cleanup (returns empty array)

#### Behavior

*   Designed for standalone timer statements (duration only, no metrics)
*   Handles scenarios like "30s", "2m", "1m30s"
*   Automatically starts timer on entry and stops on exit
*   Provides system controls (end, pause) and user completion button
*   Reports duration for countdown display if duration is specified

### RepeatingBlock

**Description**: Represents a block of workout segments that repeats a specified number of times.

**Original Location**: `src/core/runtime/blocks/RepeatingBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `childIndex: number` - Current index within child statements (private, starts at 0)
*   `roundIndex: number` - Current round/repetition index (private, starts at 0)
*   `lastLap: string` - Last lap indicator value (private)
*   `handlers: EventHandler[]` - Includes CompleteHandler and LapHandler for user interactions

#### Methods

*   `constructor(compiledMetrics: RuntimeMetric[], source?: JitStatement[])` - Creates a new RepeatingBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up system buttons (end, pause) and runtime buttons (complete), then calls next
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages repetition logic, advancing through child statements and rounds
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer when leaving the block
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up block-level timer state if duration is specified
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

#### Behavior

*   Manages repetition of child workout segments for a specified number of rounds
*   Tracks current position within child statements and current round
*   Supports timer inheritance - if the repeating block has a duration, it passes that to child statements
*   Uses PushStatementWithTimerAction for timer inheritance, PushStatementAction otherwise
*   Handles user completion and lap events through specialized handlers
*   Automatically advances through child statements and rounds based on lap indicators
*   Pops itself when all rounds are completed or end event is detected

### TimedGroupBlock

**Description**: Represents a group of workout segments that are collectively timed.

**Original Location**: `src/core/runtime/blocks/TimedGroupBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `childIndex: number` - Current index within child statements (private, starts at 0)
*   `timerId?: string` - Unique identifier for the timer if this block starts one (private)
*   `duration?: number` - Duration extracted from source statements during construction

#### Methods

*   `constructor(compiledMetrics: RuntimeMetric[], source?: JitStatement[])` - Creates a new TimedGroupBlock and extracts duration from source
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, duration, and buttons if duration exists, then calls next
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages progression through child statements with optional timer inheritance
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer if one was started
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer and buttons if not already done during enter
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

#### Behavior

*   Represents a group of workout segments that are collectively timed
*   Extracts duration from first source statement during construction
*   Generates unique timer IDs for tracking multiple timers
*   Uses PushStatementWithTimerAction when duration exists to inherit timing to children
*   Uses PushStatementAction when no duration for normal execution
*   Sets up duration reporting and appropriate buttons (end, pause, complete) when timed
*   Handles end events to allow early termination
*   Automatically progresses through child statements using consecutive grouping

### DoneRuntimeBlock

**Description**: Represents the completion state of a workout or a significant workout segment.

**Original Location**: `src/core/runtime/blocks/DoneRuntimeBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `handlers: EventHandler[]` - Includes SaveHandler and ResetHandler for completion actions

#### Methods

*   `constructor(sources?: JitStatement[])` - Creates a new DoneRuntimeBlock with optional sources (defaults to IdleStatementNode)
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up system buttons (reset, save) and clears runtime buttons
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No next action needed for done block (returns empty array)
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

#### Behavior

*   Represents the completion state of a workout or significant workout segment
*   Provides reset and save functionality through specialized event handlers
*   Shows system buttons for reset and save actions
*   Clears runtime-specific buttons as workout is complete
*   Uses IdleStatementNode as default source if none provided

### IdleRuntimeBlock

**Description**: Represents an idle state or a pause within the workout execution flow.

**Original Location**: `src/core/runtime/blocks/IdleRuntimeBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   Uses an `IdleStatementNode` as its compiled metrics base

#### Methods

*   `constructor()` - Creates a new IdleRuntimeBlock with an IdleStatementNode containing default metadata
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up start button and clears runtime buttons, updates span display
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when advancing
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

#### Behavior

*   Represents an idle state or pause in workout execution
*   Shows only a start button to allow user to resume
*   Clears runtime-specific buttons while in idle state
*   Updates span display to show current idle status

### RootBlock

**Description**: Represents the top-level container block for an entire workout structure.

**Original Location**: `src/core/runtime/blocks/RootBlock.ts`

#### Properties

*   Inherits all properties from `RuntimeBlock`
*   `children: JitStatement[]` - Child statements to execute (private)
*   `_sourceIndex: number` - Current index within child statements (private, starts at -1)
*   `handlers: EventHandler[]` - Includes RunHandler, EndHandler, and ResetHandler for root-level events

#### Methods

*   `constructor(children: JitStatement[])` - Creates a new RootBlock with child statements and sets up event handlers
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up start button and pushes idle block to begin execution
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages progression through child statements, handles completion
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No cleanup actions (returns empty array)
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

#### Behavior

*   Serves as the top-level container for an entire workout structure
*   Often wraps a single main block (like CompoundBlock or RepeatingBlock)
*   Manages overall workout progression and state transitions
*   Starts execution by pushing an idle block to allow user to begin
*   Tracks progress through child statements using internal source index
*   Handles root-level events like run, end, and reset through specialized handlers
*   Creates span builder for tracking overall workout metrics
*   Pushes end block when all child statements are completed
*   Uses consecutive child statement grouping for execution phases

### RuntimeBlock

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\RuntimeBlock.md -->
# RuntimeBlock

**Description**: Abstract base class for executable workout segments in the runtime system.

**Original Location**: `src/core/runtime/blocks/RuntimeBlock.ts`

## Properties

*   `compiledMetrics: RuntimeMetric[]` - Pre-compiled metrics from JIT compilation (readonly)
*   `duration?: number` - Duration of the block in milliseconds (optional)
*   `blockId: string` - Unique identifier for the block
*   `blockKey: BlockKey` - Hierarchical key for block identification
*   `parent?: IRuntimeBlock` - Optional parent block reference
*   `leaf: boolean` - Indicates if this is a leaf-level (effort) block
*   `handlers: EventHandler[]` - Event handlers specific to this block
*   `_legacySources?: JitStatement[]` - Temporary legacy sources for backward compatibility (protected)

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], legacySources?: JitStatement[])` - Creates a new RuntimeBlock with compiled metrics
*   `getSpanBuilder(): ResultSpanBuilder` - Gets the ResultSpanBuilder for managing spans
*   `spans(): RuntimeSpan[]` - Gets current spans without auto-closing (for testing)
*   `selectMany<T>(fn: (node: JitStatement) => T[]): T[]` - Applies function to legacy sources and flattens results
*   `enter(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block entry logic
*   `leave(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block exit logic
*   `next(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block progression logic
*   `handleEvent(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): HandlerResponse` - Handles runtime events and returns a HandlerResponse object
*   `nextChildStatements(runtime: ITimerRuntime, startIndex: number): JitStatement[]` - Gets consecutive child statements in compose group
*   `onStart(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method for block start
*   `onStop(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method for block stop
*   `metrics(runtime: ITimerRuntime): RuntimeMetric[]` - Returns pre-compiled metrics

## Abstract Methods

*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific entry logic
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific exit logic
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific progression logic
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific start logic
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific stop logic

## Relationships
*   **Implements**: `[[IRuntimeBlock]]`
*   **Extended by**: `[[EffortBlock]]`, `[[TimerBlock]]`, `[[TimedGroupBlock]]`, `[[RepeatingBlock]]`, `[[RootBlock]]`, `[[IdleRuntimeBlock]]`, `[[DoneRuntimeBlock]]`