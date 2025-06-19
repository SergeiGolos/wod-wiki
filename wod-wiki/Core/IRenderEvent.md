Defines operations that modify runtime state or trigger side effects.

**Original Location**: `src/core/IOutputAction.ts`

## Properties

*   `name: string` - Unique identifier for the action

## Methods

*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Executes the action with the given runtime context, input event stream, and output event stream

## Relationships
*   **Implemented by**: `[[PlaySoundAction]]`, `[[OutputAction]]`

## Implementations

### PlaySoundAction

**Description**: Action to trigger playing a sound effect.

**Original Location**: `src/core/runtime/actions/PlaySoundAction.ts`

#### Properties

*   `name: string` - Action name, always 'play-sound'
*   `soundType: string` - The type of sound to play (private)

#### Methods

*   `constructor(soundType: string)` - Creates a new PlaySoundAction with the specified sound type
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Plays the sound using SoundService if sound is enabled

### SetButtonAction

**Description**: Action to configure or update the state/properties of a UI button.

**Original Location**: `src/core/runtime/outputs/SetButtonAction.ts`

#### Properties

*   `eventType: OutputEventType` - The type of output event (inherited from OutputAction)
*   `name: string` - The action name in format `out:${eventType}` (inherited from OutputAction)
*   `target: string` - The target identifier for the button group (private)
*   `buttons: IActionButton[]` - Array of action buttons to display (private)

#### Methods

*   `constructor(target: string, buttons: IActionButton[])` - Creates a new SetButtonAction with specified target and buttons
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Generates output events to update button state
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by writing events to output (inherited from OutputAction)

### SetSpanAction

**Description**: Action to set or update a time span, possibly for display or metric calculation.

**Original Location**: `src/core/runtime/outputs/SetSpanAction.ts`

#### Properties

*   `target: string` - The target identifier for where to set the span (private)
*   `span: RuntimeSpan` - The runtime span data to set (private)
*   `eventType: string` - Inherited from OutputAction, set to 'SET_SPAN'
*   `name: string` - Inherited from OutputAction

#### Methods

*   `constructor(target: string, span: RuntimeSpan)` - Creates a new SetSpanAction with target and span data
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Writes the span data to output with target and duration information
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

### WriteLogAction

**Description**: Action to write an entry to a log.

**Original Location**: `src/core/runtime/outputs/WriteLogAction.ts`

#### Properties

*   `eventType: OutputEventType` - The type of output event, always 'WRITE_LOG' (inherited from OutputAction)
*   `name: string` - The action name in format `out:${eventType}` (inherited from OutputAction)
*   `log: IRuntimeLog` - The log entry to write (private)

#### Methods

*   `constructor(log: IRuntimeLog)` - Creates a new WriteLogAction with the specified log entry
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Generates output events containing the log data
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by writing events to output (inherited from OutputAction)

### WriteResultAction

**Description**: Action to write or record a result from a workout segment.

**Original Location**: `src/core/runtime/outputs/WriteResultAction.ts`

#### Properties

*   `results: RuntimeSpan[]` - Array of runtime spans to write as results (private)
*   `eventType: string` - Inherited from OutputAction, set to 'WRITE_RESULT'
*   `name: string` - Inherited from OutputAction

#### Methods

*   `constructor(result: RuntimeSpan | RuntimeSpan[])` - Creates a new WriteResultAction with single result or array of results
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Writes result data to output, creating one output event per result span
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Inherited from OutputAction

### OutputAction

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\OutputAction.md -->
**Description**: Abstract base class for actions that result in an output, such as UI updates or logging.

**Original Location**: `src/core/runtime/OutputAction.ts`

#### Properties

*   `eventType: OutputEventType` - The type of output event this action produces
*   `name: string` - The action name in format `out:${eventType}`

#### Methods

*   `constructor(eventType: OutputEventType)` - Creates a new OutputAction with the specified event type
*   `abstract write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Abstract method to generate output events (must be implemented by subclasses)
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by calling write() and emitting events to the output stream

#### Relationships
*   **Implements**: `[[IOutputAction]]`
*   **Extended by**: `[[SetDurationAction]]`, `[[SetSpanAction]]`, `[[SetButtonAction]]`, `[[SetTimerStateAction]]`, `[[WriteLogAction]]`, `[[WriteResultAction]]`