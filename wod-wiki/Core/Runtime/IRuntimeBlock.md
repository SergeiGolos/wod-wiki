# IRuntimeBlock Interface

The `IRuntimeBlock` interface defines the contract for all executable blocks in the wod-wiki runtime system. It outlines the properties and methods necessary for a block to be managed by the `TimerRuntime`, handle events, and participate in the execution flow.

## Properties

### key: BlockKey
A unique identifier for the block instance, which includes its position in the execution tree.

### spans: ResultSpanBuilder
A builder instance for creating and managing `RuntimeSpan` objects, which record the block's execution time and associated metrics.

### metrics: RuntimeMetric[]
An array of `RuntimeMetric` objects that store the compiled metrics for the block, such as repetitions, weight, and distance.

## Methods

### handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[]
Processes a runtime event and returns an array of `IRuntimeAction` objects to be executed by the runtime.

**Parameters:**
- `runtime`: The `ITimerRuntime` instance, providing access to the overall runtime state.
- `event`: The `IRuntimeEvent` to be handled.
- `system`: An array of system-level `EventHandler` objects.

**Returns:** An array of `IRuntimeAction` objects to be executed.

### next(runtime: ITimerRuntime): IRuntimeAction[]
Advances the block to its next state or child block, returning an array of actions to be executed.

**Parameters:**
- `runtime`: The `ITimerRuntime` instance.

**Returns:** An array of `IRuntimeAction` objects to be executed.