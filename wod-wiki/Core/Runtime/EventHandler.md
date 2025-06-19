Defines the contract for objects that can process specific runtime events and produce corresponding runtime actions. These are used by `IRuntimeBlock` to react to `IRuntimeEvent`s.

**Original Location**: `src/core/runtime/EventHandler.ts`

## Properties

*   `readonly eventType: string`: The specific type of `IRuntimeEvent` (by its `name` property) that this handler is responsible for (e.g., "tick", "start", "stop").

## Methods

*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]`
    *   Processes the given `event`.
    *   Can interact with the `runtime` and the current `block`.
    *   Returns an array of `IRuntimeAction`s to be executed by the runtime system.

## Relationships
*   **Used by**: `[[IRuntimeBlock]]` (in its `handle` method), `[[RuntimeJit]]` (maintains a list of system handlers)
*   **Consumes**: `[[IRuntimeEvent]]`
*   **Produces**: `[[IRuntimeAction]]`
*   **Known Implementations**: `TickHandler`, `StartHandler`, `StopHandler`, `ResetHandler`, `EndHandler`, `RunHandler`, `NextStatementHandler`, `PushActionHandler`, `SoundHandler`, `SkipHandler`, `CompleteHandler`, `SaveHandler`, `RestRemainderHandler`