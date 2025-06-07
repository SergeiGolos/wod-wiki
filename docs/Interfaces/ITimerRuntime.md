# ITimerRuntime

**Description**: Core runtime interface for workout execution, managing state and block transitions.

**Original Location**: `src/core/ITimerRuntime.ts`

## Properties

*   `code: string` - The workout code/script being executed
*   `jit: RuntimeJit` - Just-in-time compiler for workout blocks
*   `trace: RuntimeStack` - Stack of currently executing blocks
*   `history: Array<IRuntimeLog>` - History of runtime events and logs
*   `script: RuntimeScript` - The compiled runtime script
*   `registry?: ResultSpanBuilder` - Optional registry for result spans

## Methods

*   `apply(actions: IRuntimeAction[], source: IRuntimeBlock): void` - Applies a set of runtime actions from a source block
*   `push(block: IRuntimeBlock | undefined): IRuntimeBlock` - Pushes a block onto the runtime stack
*   `pop(): IRuntimeBlock | undefined` - Pops a block from the runtime stack
*   `reset(): void` - Resets the runtime to initial state

## Relationships
*   **Extended by**: `[[ITimerRuntimeIo]]`
*   **Implemented by**: (Indirectly via `[[ITimerRuntimeIo]]` by `[[TimerRuntime]]`)