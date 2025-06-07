# ITimerRuntimeIo

**Description**: Extends ITimerRuntime with RxJS observables for handling input/output operations and asynchronous events.

**Original Location**: `src/core/ITimerRuntimeIo.ts`

## Properties

*   `input$: Subject<IRuntimeEvent>` - RxJS subject for handling input events
*   `tick$: Observable<IRuntimeEvent>` - RxJS observable for timer tick events
*   `output$: Observable<OutputEvent>` - RxJS observable for output events
*   Inherits all properties from `ITimerRuntime`

## Methods

*   Inherits all methods from `ITimerRuntime`

## Relationships
*   **Extends**: `[[ITimerRuntime]]`
*   **Implemented by**: `[[TimerRuntime]]`