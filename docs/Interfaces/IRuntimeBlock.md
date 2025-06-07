# IRuntimeBlock

**Description**: Defines the contract for executable workout segments in the runtime system.

**Original Location**: `src/core/IRuntimeBlock.ts`

## Properties

*   `blockKey: BlockKey` - Block identity.
*   `blockId: string` - Block identity.
*   `parent?: IRuntimeBlock | undefined` - Optional parent block.
*   `duration?: number | undefined` - Optional duration of the block.
*   `leaf?: boolean` - True if this block represents a leaf-level (effort) block.
*   `readonly compiledMetrics: RuntimeMetric[]` - Pre-compiled metrics instead of raw statements.

## Methods

*   `getSpanBuilder(): ResultSpanBuilder`
*   `selectMany<T>(fn: (node: JitStatement) => T[]): T[]`
*   `handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[]` - Event handling.
*   `enter(runtime: ITimerRuntime): IRuntimeAction[]` - Block implementation.
*   `next(runtime: ITimerRuntime): IRuntimeAction[]` - Block implementation.
*   `leave(runtime: ITimerRuntime): IRuntimeAction[]` - Block implementation.
*   `onStart(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method.
*   `onStop(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method.
*   `metrics(runtime: ITimerRuntime): RuntimeMetric[]` - Generates a complete set of metrics for the runtime block.

## Relationships
*   **Implemented by**: `[[RuntimeBlock]]`