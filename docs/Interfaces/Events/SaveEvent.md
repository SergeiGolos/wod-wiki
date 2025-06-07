# SaveEvent

**Description**: Event indicating a request to save the current state or data.

**Original Location**: `src/core/runtime/inputs/SaveEvent.ts`

## Properties

*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'save'

## Methods

*   `constructor(timestamp?: Date)` - Creates a new SaveEvent with optional timestamp (defaults to current time)

## Associated Handler: SaveHandler

**Description**: Handles 'save' events by generating a Markdown (.md) file from the current workout script and triggering a browser download.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'save'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes save events

**Behavior**:
*   Retrieves the current workout script from the runtime
*   Generates a timestamped filename with ISO format
*   Triggers a browser download of the workout script as a Markdown file
*   Returns empty array (no runtime actions generated)

**Generated Actions**:
*   None - file download is handled as a side effect

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `SaveHandler implements [[EventHandler]]`