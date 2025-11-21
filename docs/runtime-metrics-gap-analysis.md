# Runtime Metrics Gap Analysis

## 1. Current State

The current runtime metrics implementation relies on real-time memory queries to visualize execution progress. The `RuntimeLayout` component specifically queries for `MemoryTypeEnum.TIMER_TIME_SPANS` to construct the `GitTreeSidebar` visualization.

### Data Flow
1.  **Allocation**: `TimerBlock` (via `TimerBehavior`) allocates a public memory reference for `TIMER_TIME_SPANS`.
2.  **Tracking**: `TimerBehavior` updates this memory with `TimeSpan` objects (start/stop timestamps) as the timer runs.
3.  **Visualization**: `RuntimeLayout` queries the memory system for all references of type `TIMER_TIME_SPANS` and maps them to `Segment` objects for the timeline.
4.  **Cleanup**: When a block completes, it is popped from the stack. The consumer (usually the parent block or the runtime loop) is responsible for calling `dispose()`, which releases all memory references associated with that block.

## 2. Missing Capabilities

### A. Data Persistence (The "Disappearing History" Problem)
**Issue**: The runtime memory is designed for *active execution state*, not *historical reporting*.
*   When a block finishes (e.g., a round is completed), it is popped from the stack.
*   The `dispose()` method is called to prevent memory leaks.
*   `RuntimeMemory.release()` **deletes** the data from the `_references` array.
*   **Result**: As soon as a block finishes, it vanishes from the timeline. The user cannot see what they have already completed.

### B. Universal Time Tracking
**Issue**: Only `TimerBlock` tracks time.
*   `TimerBehavior` is the only component that writes to `TIMER_TIME_SPANS`.
*   `RoundsBlock` (used for "3 rounds of...") and `EffortBlock` (used for "10 push-ups") do not use `TimerBehavior`.
*   These blocks track their own specific state (reps, rounds) but do not record *when* they started or stopped.
*   **Result**: The timeline only shows timer-based segments. A workout like "3 Rounds of 10 Push-ups" might show nothing or only the top-level timer, missing the internal structure.

### C. Hierarchy Reconstruction
**Issue**: The parent-child relationship is implicit in the runtime stack but not explicitly stored in memory.
*   Memory references have an `ownerId` (the block ID).
*   They do not store a `parentId`.
*   **Result**: Even if we persisted the data, we would have a flat list of segments without knowing which round belonged to which timer. The `GitTreeSidebar` requires a tree structure to display nested segments correctly.

## 3. Proposed Solution

To fix these issues, we need to introduce a persistent **Execution History** system that sits alongside the transient Runtime Memory.

### Core Components

1.  **`ExecutionLog` in `ScriptRuntime`**
    *   A persistent array that stores completed block metrics.
    *   Survives block disposal.
    *   Accessible to the UI for rendering history.

2.  **`HistoryBehavior`**
    *   A new behavior attached to *all* blocks (Timer, Rounds, Effort).
    *   **On Mount**: Records `startTime` and `parentId` (from the current stack).
    *   **On Dispose**: Records `endTime` and flushes the record to the `ExecutionLog`.

3.  **Unified `ExecutionRecord` Interface**
    ```typescript
    interface ExecutionRecord {
        blockId: string;
        parentId: string | null;
        type: 'timer' | 'rounds' | 'effort';
        label: string; // e.g., "Round 1", "Push-ups"
        startTime: number;
        endTime: number;
        metrics: {
            reps?: number;
            weight?: number;
            // ... other specific metrics
        };
    }
    ```

## 4. Implementation Plan

### Phase 1: The Execution Log
1.  Define the `ExecutionRecord` interface in `src/runtime/models/ExecutionRecord.ts`.
2.  Add `executionLog: ExecutionRecord[]` to `ScriptRuntime`.
3.  Add a method `logExecution(record: ExecutionRecord)` to `ScriptRuntime`.

### Phase 2: Universal History Behavior
1.  Create `src/runtime/behaviors/HistoryBehavior.ts`.
2.  Implement `onPush`:
    *   Capture `startTime = Date.now()`.
    *   Capture `parentId` by peeking at the `runtime.stack` (the block below the current one is the parent).
3.  Implement `dispose` (or a new `onDispose` hook in `IRuntimeBehavior`):
    *   Capture `endTime = Date.now()`.
    *   Construct `ExecutionRecord`.
    *   Call `runtime.logExecution()`.

### Phase 3: Integrate with Blocks
1.  Update `JitCompiler` or specific strategies (`TimerStrategy`, `RoundsStrategy`, `EffortStrategy`) to attach `HistoryBehavior` to every block.
2.  Ensure `RuntimeBlock.dispose()` iterates behaviors and calls the new disposal hook.

### Phase 4: Update Visualization
1.  Modify `RuntimeLayout.tsx` to merge data from two sources:
    *   **History**: `runtime.executionLog` (for completed blocks).
    *   **Active**: `runtime.memory` (for the currently running block).
2.  Map both sources to the `Segment` format required by `GitTreeSidebar`.
3.  Use `parentId` to reconstruct the tree structure.

## 5. Immediate Next Steps
1.  Create the `ExecutionRecord` interface.
2.  Implement `HistoryBehavior`.
3.  Attach it to `TimerBlock` as a proof of concept.
