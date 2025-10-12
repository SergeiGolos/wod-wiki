# IRuntimeBehavior Definition Template

This document provides a template for defining `IRuntimeBehavior` implementations based on a minimal rubric.

---
## TimerBehavior

### Constructor Requires
- `direction: 'up' | 'down'`
- `durationMs?: number`
- `timeSpansRef?: TypedMemoryReference<TimeSpan[]>` (Optional, fallback allocation is used if not provided)
- `isRunningRef?: TypedMemoryReference<boolean>` (Optional, fallback allocation is used if not provided)

### onPush
- **Validations**: None.
- **Actions Created**:
    - Initializes memory references for `timeSpansRef` and `isRunningRef` if they were not provided in the constructor.
    - Starts a `setInterval` to emit tick events.
    - Emits a `timer:started` event.
    - Returns `[]`.

### onNext
- *Not implemented by this behavior.*

### onPop
- **Validations**: None.
- **Actions Created**:
    - Clears the `setInterval`.
    - Updates the current `TimeSpan` in `timeSpansRef` to set a `stop` timestamp.
    - Sets `isRunningRef` to `false`.
    - Returns `[]`.

### Additional Functions
- None.

---
## RoundsBehavior

### Constructor Requires
- `totalRounds: number`
- `repScheme?: any[]`
- `roundsStateRef?: TypedMemoryReference<RoundsState>` (Optional, fallback allocation is used if not provided)

### onPush
- **Validations**: None.
- **Actions Created**:
    - Initializes `roundsStateRef` with `{ currentRound: 1, totalRounds, completedRounds: 0 }`.
    - Returns `[]`.

### onNext
- **Validations**: Checks if `currentRound > totalRounds`.
- **Actions Created**:
    - Increments `currentRound`.
    - Updates the `roundsStateRef` with the new state.
    - If all rounds are complete, emits a `rounds:complete` event.
    - Otherwise, emits a `rounds:changed` event.
    - Returns `[]`.

### onPop
- *Not implemented by this behavior.*

### Additional Functions
- `onDispose`: (Legacy) Placeholder for memory cleanup, which is now handled by `BlockContext.release()`.

---
## LazyCompilationBehavior

### Constructor Requires
- `children: ICodeStatement[]`
- `enableCaching: boolean`
- **Implicit Dependency**: `ChildAdvancementBehavior`. The analysis recommends making this an explicit constructor requirement.

### onPush
- *Not implemented by this behavior.*

### onNext
- **Validations**:
    - Checks if its sibling `ChildAdvancementBehavior` exists and has a child statement to process.
- **Actions Created**:
    - Compiles the current child statement via `runtime.jit.compile()`.
    - On success, returns a `[new PushBlockAction(compiledBlock)]`.
    - On failure, it logs an error and returns `[]`.

### onPop
- *Not implemented by this behavior.*

### Additional Functions
- `onDispose`: Clears the internal compilation cache if caching is enabled.

---
## Addendum: Special Definitions

### Memory Management Pattern
- **Constructor Injection**: The preferred pattern where `TypedMemoryReference` objects are created by a `BlockContext` and passed into the behavior's constructor.
- **Fallback Allocation**: A legacy pattern where the behavior allocates its own memory inside `onPush` if a reference was not provided via the constructor. This is being phased out.

### Type Definitions
- **`TimeSpan`**: An object `{ start: Date, stop: Date | undefined }` used to track periods of active time.
- **`RoundsState`**: An object `{ currentRound: number, totalRounds: number, completedRounds: number }` used to track progress through a set of rounds.
- **`PushBlockAction`**: An `IRuntimeAction` that instructs the `IScriptRuntime` to push a new `IRuntimeBlock` onto the execution stack.
