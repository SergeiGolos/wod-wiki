# RunEvent

**Description**: Event indicating a request to run or execute a workout or process.

**Original Location**: `src/core/runtime/inputs/RunEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'run'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new RunEvent with optional timestamp (defaults to current time)

## Associated Handler: RunHandler

**Description**: Handles run events by initiating execution flow.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'run'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes run events

**Actions Generated**:
*   `PushNextAction` - Pushes the next action in the execution sequence

**Use Case**: Used to start or continue execution of workout sequences.

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `RunHandler implements [[EventHandler]]`