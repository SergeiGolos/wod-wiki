# Consistent Times in WodScript Runtime

## The Problem
Currently, when a runtime block is executed (pushed onto the stack), its "start time" is determined implicitly at the moment of execution, often using `Date.now()` or `performance.now()` within the `mount` or `onPush` methods.

This leads to several issues:
1.  **Inaccuracy**: There is a delay between the *intent* to start a block (e.g., when the previous block finishes) and the actual *execution* start time.
2.  **Inconsistency**: Different behaviors (Timer, events, visualizers) might capture slightly different timestamps for the "same" event.
3.  **Testing Difficulty**: It is hard to deterministically test time-dependent logic when timestamps are generated internally based on real-time execution.
4.  **Synchronization**: When multiple blocks or events need to be synchronized (e.g., an interval timer triggering a new block), they may drift if each calculates its own start time.

## Current Architecture

### RuntimeClock
The `RuntimeClock` class provides a central time source using `performance.now()`.
```typescript
public get now(): number {
    return performance.now();
}
```

### TimerBehavior
`TimerBehavior` captures start time in `onPush`:
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this.startTime = runtime.clock.now; // Uses performance.now()
    // ...
    return this.stateManager.initialize(..., Date.now(), ...); // Uses Date.now() for memory state!
}
```
**Issue**: Mixing `performance.now()` (monotonic, high-res) and `Date.now()` (wall-clock) can cause discrepancies.

### Stack Operations
`RuntimeStack.push(block)` does not currently accept a "timestamp" argument. It simply adds the block to the array and calls `block.mount()`.

## Proposed Solution: Explicit Timestamp Propagation

To achieve consistent timing, the "start time" of a block should be an explicit input rather than an internal side effect.

### 1. Update `IRuntimeBlock` Interface
Add an optional `startTime` property or argument to the `mount` lifecycle method.

```typescript
// Proposed Change
interface IRuntimeBlock {
    // ...
    mount(runtime: IScriptRuntime, options?: { startTime?: number }): IRuntimeAction[];
}
```

### 2. Update `RuntimeStack.push`
Allow pushing a block with a predefined timestamp.

```typescript
// Proposed Change
class RuntimeStack {
    push(block: IRuntimeBlock, options?: { startTime?: number }): void {
        const timestamp = options?.startTime ?? this.runtime.clock.now;
        // ...
        block.mount(this.runtime, { startTime: timestamp });
    }
}
```

### 3. Chainable Timestamps
When a block finishes and triggers the next block (via `next()`), it can pass its own expected finish time as the start time for the next block.

*Example (Interval Timer):*
1.  Block A (EMOM 1) starts at `T0`.
2.  Block A runs for 60s.
3.  Block A finishes at `T0 + 60s`.
4.  Block A calls `next()` and requests to push Block B (EMOM 2).
5.  Block A passes `T0 + 60s` as the `startTime` for Block B.

This ensures that even if the JS runtime execution is delayed by 5-10ms, Block B is *recorded* as starting exactly at `T0 + 60s`, preventing drift over many intervals.

### 4. Standardizing on one Time Source
We must strictly define which "time" to pass.
- **Wall Clock (`Date.now()`)**: Good for UI display and absolute time recording.
- **Monotonic Clock (`performance.now()`)**: Good for measuring duration and intervals accurately.

**Recommendation**: Use **Wall Clock (`Date.now()`)** for the "Master Timestamp" passed between blocks, as this enables features like "Resume workout at 5:00 PM" and persists across page reloads. `RuntimeClock` should potentially synchronize monotonic ticks to this wall clock base.

## Implementation Steps

1.  **Refactor `RuntimeStack.push`**: Accept an options object with `startTime`.
2.  **Update `RuntimeBlock` base class**: Store `startTime` in `mount`.
3.  **Update `TimerBehavior`**: Accept `startTime` from the block's context/options instead of capturing `Date.now()`.
4.  **Audit Event Generation**: Ensure all `started` events use this explicit `startTime`.
