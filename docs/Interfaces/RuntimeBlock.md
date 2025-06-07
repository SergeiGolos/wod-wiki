# RuntimeBlock

**Description**: Abstract base class for executable workout segments in the runtime system.

**Original Location**: `src/core/runtime/blocks/RuntimeBlock.ts`

## Properties

*   `compiledMetrics: RuntimeMetric[]` - Pre-compiled metrics from JIT compilation (readonly)
*   `duration?: number` - Duration of the block in milliseconds (optional)
*   `blockId: string` - Unique identifier for the block
*   `blockKey: BlockKey` - Hierarchical key for block identification
*   `parent?: IRuntimeBlock` - Optional parent block reference
*   `leaf: boolean` - Indicates if this is a leaf-level (effort) block
*   `handlers: EventHandler[]` - Event handlers specific to this block
*   `_legacySources?: JitStatement[]` - Temporary legacy sources for backward compatibility (protected)

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], legacySources?: JitStatement[])` - Creates a new RuntimeBlock with compiled metrics
*   `getSpanBuilder(): ResultSpanBuilder` - Gets the ResultSpanBuilder for managing spans
*   `spans(): RuntimeSpan[]` - Gets current spans without auto-closing (for testing)
*   `selectMany<T>(fn: (node: JitStatement) => T[]): T[]` - Applies function to legacy sources and flattens results
*   `enter(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block entry logic
*   `leave(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block exit logic  
*   `next(runtime: ITimerRuntime): IRuntimeAction[]` - Public wrapper for block progression logic
*   `handle(runtime: ITimerRuntime, event: IRuntimeEvent, system: EventHandler[]): IRuntimeAction[]` - Handles runtime events
*   `nextChildStatements(runtime: ITimerRuntime, startIndex: number): JitStatement[]` - Gets consecutive child statements in compose group
*   `onStart(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method for block start
*   `onStop(runtime: ITimerRuntime): IRuntimeAction[]` - Lifecycle method for block stop
*   `metrics(runtime: ITimerRuntime): RuntimeMetric[]` - Returns pre-compiled metrics

## Abstract Methods

*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific entry logic
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific exit logic
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific progression logic
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific start logic
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Block-specific stop logic

## Relationships
*   **Implements**: `[[IRuntimeBlock]]`
*   **Extended by**: `[[EffortBlock]]`, `[[TimerBlock]]`, `[[TimedGroupBlock]]`, `[[RepeatingBlock]]`, `[[RootBlock]]`, `[[IdleRuntimeBlock]]`, `[[DoneRuntimeBlock]]`