# Runtime Implementation Review & Simplification Proposal

## Executive Summary

The current runtime implementation is functional but suffers from **Semantic Coupling** and **Inconsistent Composition**. We have specific classes (`TimerBlock`, `RoundsBlock`) that hard-code combinations of behaviors, rather than a truly composable system where a generic `RuntimeBlock` is configured with the necessary behaviors.

This leads to architectural dead-ends, such as the `TimeBoundRoundsStrategy` inability to properly wrap a `RoundsBlock` inside a `TimerBlock`.

**The Solution:** Move to a **Pure Composition Model**. Eliminate specialized block classes in favor of a single `RuntimeBlock` constructed with a specific recipe of behaviors.

---

## 1. Current State Analysis

### Artifacts Reviewed
*   **Blocks**: `TimerBlock`, `RoundsBlock`, `EffortBlock`
*   **Behaviors**: `TimerBehavior`, `LoopCoordinatorBehavior`, `CompletionBehavior`, `HistoryBehavior`, `CompletionTrackingBehavior`, `ParentContextBehavior`
*   **Strategies**: `TimerStrategy`, `RoundsStrategy`, `TimeBoundRoundsStrategy`

### Identified Issues

#### A. The "Wrapper" Trap (Duplication & Rigidity)
`TimerBlock` is currently implemented as a wrapper that *contains* a `TimerBehavior` and *optionally* a `LoopCoordinatorBehavior`.
*   **Problem**: It hardcodes the `LoopCoordinator` to `LoopType.FIXED` (1 round). This makes it impossible to use `TimerBlock` for an AMRAP (which needs `LoopType.TIME_BOUND`) without creating a new class or hacking the existing one.
*   **Symptom**: `TimeBoundRoundsStrategy` explicitly bypasses `TimerBlock` because it can't compose "Timer" + "Infinite Loop".

#### B. Redundant Behaviors
*   **`CompletionTrackingBehavior`**: This is largely redundant. `LoopCoordinatorBehavior` already knows when it is complete. `CompletionBehavior` can simply query the `LoopCoordinator`.
*   **`ParentContextBehavior`**: The new memory-based inheritance system (`runtime.memory.search`) renders this behavior mostly obsolete. Context is data, not behavior.

#### C. Inconsistent Metric Generation
*   **TimerBlock**: Manages `TIMER_TIME_SPANS` manually in the block class (mostly).
*   **RoundsBlock**: Manages `METRIC_REPS` manually in `next()`.
*   **EffortBlock**: Manages `effort:{id}` manually in `mount()`.
*   **Goal**: Metrics should be managed by **Behaviors**, not Blocks. A `MetricBehavior` or the specific functional behavior (e.g., `TimerBehavior`) should own the data.

---

## 2. Proposed "Cognitively Simple" Model

In this model, we stop thinking about "Types of Blocks" and start thinking about **"Capabilities of Blocks"**.

Every block is just a `RuntimeBlock`. Its "Type" is defined solely by its **Behaviors**.

### The 4 Core Capabilities (Behaviors)

1.  **Driver (LoopCoordinator)**: "What do I execute?"
    *   *Modes*: Run Once, Run N Times, Run Forever, Run on Interval.
2.  **Clock (Timer)**: "How do I track time?"
    *   *Modes*: Count Up, Count Down, None.
3.  **Goal (Completion)**: "When am I done?"
    *   *Modes*: When Children Done, When Time Done, When Reps Done.
4.  **Data (Metrics)**: "What do I record?"
    *   *Modes*: Reps, Time, Rounds.

### Composition Recipes

Here is how we construct any workout type using strictly these 4 ingredients:

#### 1. "For Time" (e.g., "3 Rounds of...")
*   **Driver**: `LoopCoordinator(FIXED, 3 rounds)`
*   **Clock**: `TimerBehavior(UP)`
*   **Goal**: `CompletionBehavior(when Driver is complete)`
*   **Data**: `MetricBehavior(Time)`

#### 2. "AMRAP" (e.g., "20 min AMRAP")
*   **Driver**: `LoopCoordinator(TIME_BOUND, infinite)`
*   **Clock**: `TimerBehavior(DOWN, 20 mins)`
*   **Goal**: `CompletionBehavior(when Clock is complete)`
*   **Data**: `MetricBehavior(Rounds)`

#### 3. "EMOM" (e.g., "EMOM 10")
*   **Driver**: `LoopCoordinator(INTERVAL, 10 rounds, 1 min)`
*   **Clock**: `TimerBehavior(UP)` (resets per interval? or continuous?)
*   **Goal**: `CompletionBehavior(when Driver is complete)`
*   **Data**: `MetricBehavior(Completion)`

#### 4. "Effort" (e.g., "21 Thrusters")
*   **Driver**: `None` (Leaf node)
*   **Clock**: `None`
*   **Goal**: `CompletionBehavior(when Reps >= Target)`
*   **Data**: `MetricBehavior(Reps)`

---

## 3. Refactoring Plan

To achieve this model, we need to refactor the `strategies.ts` to construct `RuntimeBlock` directly with the correct behaviors, rather than instantiating `TimerBlock` or `RoundsBlock`.

### Step 1: Enhance `LoopCoordinatorBehavior`
*   Ensure it fully supports `TIME_BOUND` (AMRAP) mode.
*   Ensure it exposes a clean `isComplete()` method for the `CompletionBehavior` to check.

### Step 2: Empower `TimerBehavior`
*   Ensure it fully owns the `TIMER_TIME_SPANS` memory allocation (move logic out of `TimerBlock`).
*   Ensure it exposes `isComplete()` for Countdown timers.

### Step 3: Update Strategies
*   **`TimerStrategy`**: Create `RuntimeBlock` + `TimerBehavior(UP)` + `LoopCoordinator(FIXED, 1)`.
*   **`RoundsStrategy`**: Create `RuntimeBlock` + `LoopCoordinator(FIXED, N)`.
*   **`TimeBoundRoundsStrategy`**: Create `RuntimeBlock` + `TimerBehavior(DOWN)` + `LoopCoordinator(TIME_BOUND)`.

### Step 4: Deprecate Subclasses
*   Mark `TimerBlock` and `RoundsBlock` as deprecated.
*   Eventually remove them once all strategies use `RuntimeBlock`.

## Conclusion

By flattening the class hierarchy and relying on **Behavior Composition**, we solve the "AMRAP inside a Timer" problem naturally. An AMRAP is simply a block that *has* a Timer (for the cap) and *has* a Loop (for the rounds), configured to terminate when the Timer expires.
