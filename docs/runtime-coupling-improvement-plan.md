# Runtime Coupling Improvement Plan

## Objectives
- Reduce tight coupling between event routing, stack position, and memory lookups.
- Improve cohesion of lifecycle management and loop execution orchestration.
- Finish incomplete group container support and reduce duplicated timer wiring.
- Limit memory growth and make handler/metric lookups predictable and fast.
- Explicitly **no backward-compatibility shims**; prefer clean break over adapters.

## Scope (must/should)
- Must: event bus redesign; lifecycle/cleanup consolidation; complete GroupStrategy; shared timer factory; loop compiler split; memory indexing + release helpers; UI subscription model for memory updates; add regression tests around timing and leaks.
- Should: telemetry/debug metadata remain intact; minimal API surface but no backward-compatibility layer.

## Current Pain Points
- Event dispatch tied to `runtime.stack.current`; parent timers miss `timer:complete` while a child runs.
- Handlers stored in `RuntimeMemory` with global scans and no scoping or ordering.
- Lifecycle scattered: stack ends spans, caller must dispose blocks, caller must release contexts; easy to leak handlers/metrics/spans.
- GroupStrategy is a placeholder; grouped statements don’t orchestrate children.
- Timer behaviors duplicated across Timer/Interval/TimeBoundRounds; countdown cues copy-pasted.
- LoopCoordinator mixes JIT, UI updates, interval waiting, and loop state.
- Memory is unindexed; spans never released, so long sessions grow.

## Proposed Architecture Changes
1) Event Bus
- Add an event bus service (per-runtime) with:
  - Handler registration by blockId + event name + priority.
  - Dispatch that does not depend on stack.current; supports parent listeners.
  - Optional scoped dispatch (target blockId) plus broadcast.
- Move handler storage out of `RuntimeMemory`; let `RuntimeBlock` register/unregister via the bus.

2) UI Subscriptions on Memory
- Provide a first-class UI subscription model that listens to indexed memory updates (spans, metrics, handlers where applicable).
- Expose subscription APIs instead of polling: subscribe by type/owner/visibility and receive change payloads.
- Ensure ExecutionTracker updates trigger UI notifications without relying on legacy global scans.

3) Lifecycle Unification
- In `MemoryAwareRuntimeStack.pop` (or a new wrapper), call in order: `block.unmount`, end span, `block.dispose`, `block.context.release` (or a new `disposeAll`).
- Keep error guards so cleanup is best-effort but never skipped.
- Provide a single `popAndCleanup()` entrypoint; deprecate scattered helpers.

4) Complete GroupStrategy
- Implement compile with a container block using `LoopCoordinatorBehavior` (FIXED, totalRounds=1, childGroups from children ids).
- Add HistoryBehavior/debug metadata for grouping.
- Ensure child compilation uses JIT with inherited metrics intact.

5) Timer Factory
- Create a `TimerBlockFactory` (or helper) that returns TimerBehavior + SoundBehavior + HistoryBehavior + labels based on direction/duration.
- Reuse in TimerStrategy, IntervalStrategy, TimeBoundRoundsStrategy to eliminate duplicate cue logic and ensure consistent metadata.

6) LoopCoordinator Separation of Concerns
- Extract child compilation into a collaborator (e.g., `ChildCompiler` service) so LoopCoordinator stops reaching into runtime directly.
- Extract display/round UI side-effects into a small interface so LoopCoordinator focuses on loop state and advancement.
- Keep interval waiting logic but add explicit tests.

7) Memory Indexing and Release
- Add indexed lookup inside `RuntimeMemory` (map by type, ownerId, visibility) to avoid linear scans.
- Add `releaseByOwner(ownerId)` and call it from unified cleanup.
- Have `ExecutionTracker` release span refs on `endSpan` to cap growth.

8) Tests/Validation
- Add regression tests:
  - Interval: timer completes while child still running; parent still advances correctly.
  - AMRAP countdown: parent receives `timer:complete` even when children are active.
  - Lifecycle: after pop/cleanup no handlers/metrics/spans remain for the block.
  - GroupStrategy: children execute once and complete; metrics flow to tracker.
  - UI subscriptions: subscribing to spans/metrics via the new model receives updates on change.
- Re-run existing unit tests; accept known baseline failures per project guidance.

## Phased Delivery
- Phase 1: Event bus + lifecycle unification (no BC shims). Add minimal tests.
- Phase 2: Timer factory refactor + GroupStrategy completion. Update strategies to use the factory. Add strategy tests.
- Phase 3: LoopCoordinator split + memory indexing/release improvements + UI subscription layer hooked to memory indices.
- Phase 4: Hardening/tests: interval/AMRAP timing, leak tests, group execution tests, UI subscription coverage.

## Risks/Mitigations
- Risk: Breaking existing behavior timing. Mitigate with targeted interval/AMRAP tests; accept that BC adapters will not be added.
- Risk: Performance regressions from new indirection. Mitigate with indexed memory and micro-benchmarks around handler dispatch and UI subscription fan-out.
- Risk: API churn for behaviors. Keep signatures stable where feasible but do not add compatibility shims; communicate breaking changes in release notes.

## Success Criteria
- Parent timers receive completion/tick events regardless of current stack frame.
- Popping a block leaves no handlers/metrics/spans/anchors for that owner.
- Grouped statements execute children via LoopCoordinator with history/metrics recorded.
- Timer-based strategies share one factory with consistent cues and metadata.
- Memory lookups are indexed; span refs released on completion; long sessions do not grow unbounded.
