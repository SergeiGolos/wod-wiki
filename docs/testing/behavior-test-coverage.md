# Behavior Test Coverage

This document highlights behaviors that have strong automated test coverage, summarizing the kinds of tests, common setup, and asserted expectations.

## TimerInitBehavior
- **Test types:** Unit ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for countdown/countup timers, sound cues, and hybrid patterns ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts)); performance mounts and bulk scenarios ([src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** `createMockRuntime` + `createMockBlock`, mounted via `mountBehaviors` with timer direction/duration plus display/output companions.
- **Expectations:** Initializes `timer` memory (direction, duration, label), emits `timer:started`, opens initial span, supports countdown caps and countup tracking, and remains performant under heavy mounts.

## TimerTickBehavior
- **Test types:** Integration and performance for timer-driven flows ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with timer init/completion (and often pause/output) and driven via `simulateTicks` to advance the mock clock.
- **Expectations:** Propagates tick events to subscribers, supports expiry checks, handles long/rapid tick series without excessive events or memory growth, and keeps average tick processing under 1ms in performance checks.

## TimerCompletionBehavior
- **Test types:** Unit subscription coverage ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for expiry in timer/countdown flows, AMRAP/EMOM patterns, and edge cases including zero-duration timers ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with timer init/tick and sometimes round behaviors; driven by tick simulation until duration is reached.
- **Expectations:** Subscribes to `tick`, marks completion on expiry (`timer-expired`), emits `timer:complete`, and coordinates correctly when both timer- and round-based completions exist (timer wins when it fires first).

## TimerPauseBehavior
- **Test types:** Unit subscription coverage ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for pause/resume semantics and spam resistance, plus performance/stability checks ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with timer init/tick, driven by `dispatchEvent` for `timer:pause`/`timer:resume` while the mock clock advances.
- **Expectations:** Subscribes to pause/resume, records spans correctly (pause time excluded from elapsed), emits `timer:paused`/`timer:resumed`, and tolerates rapid pause/resume cycles without state corruption.

## TimerOutputBehavior
- **Test types:** Integration for countdown/countup completion outputs and performance (mount/unmount and memory stability) ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Paired with timer init/tick/completion (and sometimes display), mounted via `mountBehaviors`, unmounted after simulated time.
- **Expectations:** Emits completion outputs containing elapsed timing data when timers finish or are unmounted; remains efficient during unmount after long simulations.

## RoundInitBehavior
- **Test types:** Unit initialization defaults/overrides ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for loop blocks, AMRAP/EMOM, edge cases (start values, very high counts, remounting), and performance ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with round advance/completion/display/output behaviors; memory inspected via `expectMemoryState` or direct `block.memory` reads.
- **Expectations:** Seeds `round` memory with `current` and optional `total`, honors custom `startRound`, handles zero/negative starts defensively, supports very large totals, and can be remounted to reset state.

## RoundAdvanceBehavior
- **Test types:** Unit increment and event emission ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for loop/AMRAP/EMOM progress, rapid-advance stress, and performance ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with round init and often completion/display/output; advanced via `advanceBehaviors` loops.
- **Expectations:** Increments `round.current`, emits `round:advance`, tolerates rapid or post-completion advances, and scales to thousands of advances without event/memory bloat.

## RoundCompletionBehavior
- **Test types:** Unit completion guardrails ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for loop completion, interaction with timers, and edge cases like startRound exceeding total ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with round init/advance (and sometimes timer behaviors) then driven by `advanceBehaviors`.
- **Expectations:** Marks completion when `current` exceeds `total`, skips completion when unbounded, and correctly arbitrates when both timer and round completions are present.

## RoundDisplayBehavior
- **Test types:** Integration for loop/AMRAP/EMOM displays and performance ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Paired with `DisplayInitBehavior` and round init/advance; inspected via `block.memory.get('display')`.
- **Expectations:** Formats `roundDisplay` for bounded and unbounded rounds, updates on each advance, and retains mode/label from display init.

## RoundOutputBehavior
- **Test types:** Integration for milestone/completion outputs in loop/AMRAP/EMOM flows and performance stress ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with round init/advance/completion; outputs collected from mock runtime.
- **Expectations:** Emits milestone outputs on each advance, emits completion outputs on unmount when rounds finish, records history-compatible fragments, and scales to thousands of advances with controlled output counts.

## DisplayInitBehavior
- **Test types:** Unit initialization defaults and label fallback ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration across loop/timer/AMRAP/EMOM and edge cases (display-only blocks) plus performance ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts](src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted early in behavior stacks; memory read via `block.memory.get('display')` or `expectMemoryState`.
- **Expectations:** Seeds `display` memory with mode/label, uses block label by default, supports countdown/clock modes, and mounts quickly (<5ms for simple cases).

## PopOnEventBehavior
- **Test types:** Unit subscription coverage ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for multi-source completion and event-first completion paths ([src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts)).
- **Setup:** Mounted with optional `PopOnNextBehavior`; events dispatched via `dispatchEvent`.
- **Expectations:** Subscribes to configured event types, marks completion on first matching event, and coexists with other completion mechanisms without double-completing.

## PopOnNextBehavior
- **Test types:** Integration for user-advance-only blocks, completion precedence, and countup timers ([src/runtime/behaviors/__tests__/integration/edge-cases.test.ts](src/runtime/behaviors/__tests__/integration/edge-cases.test.ts), [src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts)).
- **Setup:** Mounted alone or with timer behaviors; driven by `advanceBehaviors`.
- **Expectations:** Marks completion with `user-advance` on first `next`, works as sole behavior, and wins precedence when fired before event-based completions.

## ControlsInitBehavior
- **Test types:** Unit emissions on mount/unmount ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)).
- **Setup:** Mounted with button config in mock context; unmounted directly.
- **Expectations:** Emits `controls:init` carrying button metadata on mount and `controls:cleanup` on unmount.

## HistoryRecordBehavior
- **Test types:** Unit event emission on unmount ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for history capture in loop/AMRAP flows and performance unmount timing ([src/runtime/behaviors/__tests__/integration/loop-block.test.ts](src/runtime/behaviors/__tests__/integration/loop-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted alongside output behaviors; unmounted after simulated work.
- **Expectations:** Emits `history:record` with block key and round/timer context on unmount, including final round counts for AMRAP and loop scenarios.

## SoundCueBehavior
- **Test types:** Unit cue handling and subscriptions ([src/runtime/behaviors/__tests__/AspectBehaviors.test.ts](src/runtime/behaviors/__tests__/AspectBehaviors.test.ts)); integration for timer countdown cues and AMRAP start/complete cues, plus inclusion in performance mount suites ([src/runtime/behaviors/__tests__/integration/timer-block.test.ts](src/runtime/behaviors/__tests__/integration/timer-block.test.ts), [src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts](src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts), [src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Mounted with cue arrays specifying triggers (mount, countdown at seconds, complete); countdown timing driven by `simulateTicks`.
- **Expectations:** Emits `sound:play` for mount triggers immediately, subscribes to `tick` for countdown triggers, and emits completion cues on unmount.

## TimerOutput/Display/History Combined Performance
- **Test types:** Performance suite stresses combined timer/round/display/output behaviors under mass mounts, ticks, advances, unmounts, and concurrent blocks ([src/runtime/behaviors/__tests__/integration/performance.test.ts](src/runtime/behaviors/__tests__/integration/performance.test.ts)).
- **Setup:** Uses `measureTime` helper over `mountBehaviors`, `simulateTicks`, and `advanceBehaviors` across multiple mock blocks/runtimes.
- **Expectations:** Meets timing budgets (<10ms for full AMRAP mounts, <50ms for 1000 ticks, <100ms for 1000 advances), maintains bounded event/output counts, and keeps memory map size stable during long simulations.

## Testing Utilities
- **Behavior harness:** [tests/harness/__tests__/BehaviorTestHarness.test.ts](tests/harness/__tests__/BehaviorTestHarness.test.ts) validates the BehaviorTestHarness stack operations, time controls, event capture, memory helpers, and assertion APIs used by behavior tests.
- **Integration helpers:** [src/runtime/behaviors/__tests__/integration/test-helpers.ts](src/runtime/behaviors/__tests__/integration/test-helpers.ts) supplies the mock clock/runtime, block creation, behavior mounting/advancing, tick simulation, event dispatch, and memory assertions referenced above.
