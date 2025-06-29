
Core runtime interface for workout execution, managing state and block transitions.


# Original Location
- src/core/ITimerRuntime.ts`
## Properties

* `script: RuntimeScript` - The compiled runtime script
* `stack: RuntimeStack` - Stack of currently executing blocks
* `jit: RuntimeJit` - Just-in-time compiler for workout blocks

## Methods

*   `apply(actions: IRuntimeAction[], source: IRuntimeBlock): void` - Applies a set of runtime actions from a source block 
## Relationships
*   **Extended by**: `[[ITimerRuntimeIo]]`
*   **Implemented by**: (Indirectly via `[[ITimerRuntimeIo]]` by `[[TimerRuntime]]`)

## Implementations

### TimedScriptRuntime

**Description**: Concrete implementation of the timer runtime system, managing workout execution and I/O via RxJS observables.

**Original Location**: `src/core/runtime/TimerRuntime.ts`

### VirtualScriptRuntime

**Description:** Creates a virtual run of the existing runtime and generates estimated metrics with out running the timers (assuming enough information is given)  allow for additional metrics to be populated at the system level allowing overrides when needed.