# NextStatementEvent

**Description**: Event indicating a request to proceed to the next statement or instruction.

**Original Location**: `src/core/runtime/inputs/NextStatementEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `blockId?: number` - Optional block identifier associated with the event
*   `name: string` - Event name, always 'next'

## Methods

*   `constructor(timestamp?: Date, blockId?: number)` - Creates a new NextStatementEvent with optional timestamp and block ID

## Associated Handler: NextStatementHandler

**Description**: Handles requests to advance the workout to the next statement or instruction.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'next'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes next statement events

**Behavior**:
*   Processes user or system requests to advance workout progression
*   Creates navigation actions to move to the next logical step
*   Core mechanism for sequential workout progression

**Generated Actions**:
*   `PushNextAction` - Advances the runtime to the next statement or block

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `NextStatementHandler implements [[EventHandler]]`