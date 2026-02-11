# Birds-Eye View: Fragment-Based Memory Architecture

## Executive Summary
This document outlines a high-level architectural shift from the current "Typed Memory Slot" model to a "Fragment-First" memory model.

Currently, `RuntimeBlock` uses a rigid `MemoryType` system (e.g., `timer`, `round`, `completion`) with specific classes (`TimerMemory`, `RoundMemory`) to manage state. This creates a disconnect between the **Instruction** (CodeFragment from compiler) and the **Execution State** (Memory entry).

The proposed change consolidates these concepts: **The State IS the Fragment.**
The block memory becomes a queryable collection of `ICodeFragment`s. Runtime execution is simply the process of resolving, refining, and generating new fragments (marked with `runtime` origin) based on the original compiler fragments.

---

## 1. Core Concept: Memory as Fragment Resolution

### Current State (To Be Removed)
- **Structure**: `Map<MemoryType, IMemoryEntry>`
- **Access**: `block.getMemory('timer')` returns a `TimerMemory` instance.
- **Data Shape**: `TimerState` (custom interface, distinct from Fragment).
- **Output**: Requires transformation/crosswalk to convert Memory State back into Output Formats.

### New State (The Target)
- **Structure**: A collection of `ICodeFragment`s (e.g., `FragmentCollection`).
- **Access**: `block.resolve(FragmentType.Timer)` returns the *active* `ICodeFragment` for that type.
- **Data Shape**: `ICodeFragment<T>` where `T` is the value (e.g., `TimerValue`).
- **Output**: The "Runtime Output" is simply the subset of fragments with `origin: 'runtime'` or `origin: 'user'`.

---

## 2. Architectural Changes

### A. Elimination of "Memory Types"
**Goal**: Remove the rigid `MemoryType` enum and specific memory classes.

1.  **Delete**: `TimerMemory`, `RoundMemory`, `DisplayFragmentMemory`.
2.  **Delete**: `MemoryType` enum and `MemoryTypeMap`.
3.  **Update**: `RuntimeBlock` loses its `_memoryEntries` map. It gains a `FragmentRegistry` or similar structure.
    *   *Note*: Some "control" memory (like buttons/display mode) might still need a lightweight ephemeral state mechanism, but the core "workout data" must be fragments.

### B. Fragment Resolver Pattern
Memory is no longer a static slot; it is a **Query**.

When a behavior (e.g., `TimerBehavior`) needs to know the state of the timer:
1.  It calls `context.resolve(FragmentType.Timer)`.
2.  The **Resolver** looks at all fragments in the block.
3.  **Precedence Logic**: It returns the *most specific* fragment available, following the origin hierarchy:
    *   **Runtime** (Active execution state)
    *   **User** (User overrides/inputs)
    *   **Compiler** (Static instruction from plan)
    *   **Parser** (Default values)

*Example*:
> If the `Compiler` provided a 5-minute timer, but the `Runtime` has tracked 2 minutes of elapsed time, the Resolver returns the **Runtime** fragment (showing 2 mins).

### C. Runtime Lifecycle & Output
The "Memory" is just a staging ground for the Output.

1.  **Initialization**: Block is initialized with `Compiler` fragments.
2.  **Execution**: Behaviors generate/update fragments with `origin: 'runtime'`.
    *   *Example*: `TimerBehavior` ticks -> updates a `runtime` TimerFragment with new spans.
3.  **Completion**: When the block finishes, we don't need a complex export process. We simply **collect all fragments** marked `runtime` or `user`.
    *   This collection *is* the Block Output.

---

## 3. Dynamic Values & Types

To support this, `ICodeFragment` must be the canonical carrier of complex data.

*   **Timer Fragment**: Value contains `spans[]`, `duration`, `direction`.
*   **Round Fragment**: Value contains `current`, `total`.
*   **Text/Instruction Fragment**: Value contains string content.

This allows us to treat "3 Rounds" (instruction) and "Round 2 of 3" (state) as the **same data type** (RoundFragment), just with different `origin` and `value` snapshots.

## 4. Migration Strategy

1.  **Standardize Values**: Ensure `ICodeFragment.value` definitions match the richness of current `MemoryState` interfaces (e.g., `TimerState` becomes `TimerFragmentValue`).
2.  **Refactor RuntimeBlock**: Replace `IMemoryEntry` system with a `FragmentStore`.
3.  **Update Behaviors**: Rewrite behaviors to read/write Fragments instead of Memory Definitions.
    *   *Old*: `timerMemory.start()`
    *   *New*: `store.upsert({ type: 'timer', origin: 'runtime', value: { ...newSpans } })`
4.  **Simplify Output**: Remove `RuntimeMetric` conversion layers; pass Runtime Fragments directly to output/analytics.

## 5. Summary of Benefits

*   **Unified Model**: One shape (`ICodeFragment`) for Plan, Execution, and History.
*   **Zero-Loss fidelity**: exact state of the block is preserved in output.
*   **Extensibility**: New metrics (e.g., "Heart Rate") can be added just by defining a new Fragment Value, without modifying `RuntimeBlock` structure or Memory Enums.
