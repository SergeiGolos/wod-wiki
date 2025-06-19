Extends ITimerRuntime with RxJS observables for handling input/output operations and asynchronous events.

**Original Location**: `src/core/ITimerRuntimeIo.ts`

## Properties

*   `input$: Subject<IInputEvent>` - RxJS subject for handling input events
*   `tick$: Observable<IInputEvent>` - RxJS observable for timer tick events
*   `output$: Observable<IOutputEvent>` - RxJS observable for output events
