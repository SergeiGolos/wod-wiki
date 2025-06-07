# SetButtonAction

**Description**: Action to configure or update the state/properties of a UI button.

**Original Location**: `src/core/runtime/outputs/SetButtonAction.ts`

## Properties

*   `eventType: OutputEventType` - The type of output event (inherited from OutputAction)
*   `name: string` - The action name in format `out:${eventType}` (inherited from OutputAction)
*   `target: string` - The target identifier for the button group (private)
*   `buttons: IActionButton[]` - Array of action buttons to display (private)

## Methods

*   `constructor(target: string, buttons: IActionButton[])` - Creates a new SetButtonAction with specified target and buttons
*   `write(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>): OutputEvent[]` - Generates output events to update button state
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Applies the action by writing events to output (inherited from OutputAction)

## Relationships
*   **Extends**: `[[OutputAction]]`