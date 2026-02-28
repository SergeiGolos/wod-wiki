# Approach Comparison: Three Architectures

This document compares three architectural approaches for the WOD Wiki runtime: the **current Behavior Composition** system, the **proposed Fragment-Centric Processors**, and a third **Typed Block** approach where distinct block subclasses encapsulate execution patterns.

---

## Overview

| Dimension | A: Behavior Composition (Current) | B: Fragment Processors (Proposed) | C: Typed Blocks (Alternative) |
| :--- | :--- | :--- | :--- |
| **Core unit** | Behavior class (18 classes) | Stateless Processor (~5 classes) | Block subclass (~7 classes) |
| **State location** | Memory tags + behavior internals | Fragment bucket on block | Block fields + fragment bucket |
| **Composition** | `BlockBuilder.asTimer/asRepeater/asContainer` | Dialect assembles processor list | Block type selected by compiler |
| **Completion** | Multiple cooperating behaviors | Processor checks fragment state | Block subclass owns completion logic |
| **Flexibility** | Very high (any combination) | Very high (any combination) | Moderate (fixed archetypes) |
| **Complexity** | High (18 behaviors, 15 memory tags, event subscriptions) | Low (fewer concepts) | Moderate (7 classes, clear boundaries) |
| **Debuggability** | Hard (state scattered across behaviors + memory) | Good (inspect fragment bucket) | Good (inspect block state directly) |

---

## Approach A: Behavior Composition (Current)

### How It Works

Every `RuntimeBlock` is a generic container that holds a list of `IBehavior` instances. The `BlockBuilder` composes behaviors via three aspect methods:

```
BlockBuilder
  .asTimer({ direction, durationMs, ... })    → adds TimerBehavior + TimerEndingBehavior
  .asRepeater({ totalRounds, ... })           → adds ReEntryBehavior + RoundsEndBehavior
  .asContainer({ childGroups, loop, ... })    → adds ChildSelectionBehavior
  .build()                                     → RuntimeBlock with all behaviors
```

Strategies (15 classes) decide which aspects to compose. The result is the same `RuntimeBlock` class with different behavior lists.

### Strengths

- **Maximum flexibility**: Any combination of time, iteration, and children is possible.
- **Open/Closed**: New behavior = new class, no modification to existing ones.
- **Proven**: The system works and handles all current workout types.

### Weaknesses

- **State is scattered**: Timer state is in `time` memory, round state in `round` memory, child state in `children:status` memory, display state in `display` memory. To understand a block you must inspect 15 memory tags and 18 behavior classes.
- **Hidden coupling**: Behaviors communicate via events (`timer:complete`, `timer:pause`) and shared memory tags. The coupling is implicit and hard to trace.
- **Boilerplate**: Adding a new block type means writing a new Strategy that calls `asTimer` + `asRepeater` + `asContainer` with the right config, plus adding safety-net behaviors, sound cues, labeling, reporting, and history.
- **Testing surface**: Testing a single archetype requires mocking the full behavior context, event bus, memory system, and action queue.

### Behavior → Archetype Mapping

| Archetype | Behaviors Required |
| :--- | :--- |
| Gate | LeafExitBehavior, LabelingBehavior, ButtonBehavior, ReportOutputBehavior, CompletionTimestampBehavior |
| Timer Leaf | TimerBehavior, TimerEndingBehavior, LeafExitBehavior, SoundCueBehavior, LabelingBehavior, ReportOutputBehavior, CompletionTimestampBehavior |
| Effort Leaf | EffortCompletionBehavior, TimerBehavior, LabelingBehavior, CompletionTimestampBehavior |
| Sequential Container | ChildSelectionBehavior, TimerBehavior, ReEntryBehavior, RoundsEndBehavior, CompletionTimestampBehavior, ReportOutputBehavior, LabelingBehavior |
| Round-Loop Container | ChildSelectionBehavior, TimerBehavior, ReEntryBehavior, RoundsEndBehavior, FragmentPromotionBehavior, CompletionTimestampBehavior, ReportOutputBehavior, LabelingBehavior |
| AMRAP | TimerBehavior, TimerEndingBehavior, ReEntryBehavior, ChildSelectionBehavior, CompletedBlockPopBehavior, SoundCueBehavior, LabelingBehavior, ReportOutputBehavior, CompletionTimestampBehavior |
| EMOM | TimerBehavior, TimerEndingBehavior, ReEntryBehavior, RoundsEndBehavior, ChildSelectionBehavior, CompletedBlockPopBehavior, SoundCueBehavior, LabelingBehavior, ReportOutputBehavior, CompletionTimestampBehavior |

Each archetype requires 5-10 behaviors. A mistake in configuration produces subtle runtime bugs.

---

## Approach B: Fragment Processors (Proposed)

### How It Works

A `RuntimeBlock` is a "bucket of fragments." Stateless Processors iterate the bucket and update fragment state. The Dialect assembles which processors are active.

```
RuntimeBlock
  .fragments: ICodeFragment[]     → Plan, Record, and Analysis fragments
  .getPlan()                       → Defined fragments from parser
  .getRecord()                     → Recorded fragments from execution

Dialect
  .processors: IFragmentProcessor[]

Execution Loop:
  for (processor of dialect.processors) {
    processor.onTick(block, relevantFragments, context)
  }
```

### Strengths

- **Fewer concepts**: Fragments replace behaviors, memory tags, and strategies. One data model from parse to output.
- **Inspectable**: Debug a block by dumping its fragment bucket.
- **Reusable**: A `TimerProcessor` works for CrossFit, Yoga, Running — any dialect that needs a clock.
- **Reactive analytics**: Outputs are projections of fragment state, not manually emitted.

### Weaknesses (Gaps from Current Implementation)

| Gap | What's Missing | Impact |
| :--- | :--- | :--- |
| **Completion policies** | Plan describes no mechanism for "timer-terminates-block" vs "timer-resets-interval" vs "user-advances" vs "rounds-exhausted" | Cannot distinguish AMRAP from EMOM from effort blocks |
| **Child dispatch** | No equivalent of `ChildSelectionBehavior` — cursor-based iteration, loop conditions, rest injection, JIT compilation | Cannot run container blocks |
| **Action queue** | Plan assumes a simple "tick loop" but current system uses cascading actions (pop → next → compile → push) in a frozen-clock ExecutionContext | Multi-step turns break without action processing |
| **Event system** | Processors have `onTick`/`onNext` but no event subscription model (timer:pause, timer:resume, scoped bubble events) | Cannot pause/resume timers |
| **Observable state** | Fragment bucket is a flat list — no reactivity for UI binding | UI loses reactive updates |
| **Sound cues** | Not mentioned | No audio feedback |
| **History recording** | Not mentioned | Cannot persist workout records |
| **Button/controls** | Not mentioned | No Start/Next/Pause buttons |
| **Display modes** | Not mentioned | Cannot switch between clock/timer/countdown/hidden views |
| **Waiting-to-start gate** | Not mentioned | No pre-workout idle state |
| **Fragment promotion** | Partially mentioned | Round-indexed rep schemes (21-15-9) may not work |

### What Approach B Must Add

To reach parity with the current system, the Fragment Processor model needs:

1. **Completion Processor** — a processor (or fragment-based mechanism) that encodes the completion policy per block: timer-driven, user-driven, rounds-driven, or target-driven.
2. **ChildDispatchProcessor** — equivalent of ChildSelectionBehavior, including loop conditions, cursor management, and rest injection.
3. **Action system or equivalent** — a way to cascade multi-step state changes (pop child → advance parent → compile next child → push) within a single execution turn.
4. **Event-driven fragments** — a mechanism for pause/resume, user input, and external sensor events to mutate fragments.
5. **Observable fragment collections** — reactive subscriptions for UI binding.
6. **Cross-cutting processors** — Sound, History, Controls, Display, WaitingToStart.

---

## Approach C: Typed Blocks (Alternative)

### How It Works

Instead of composing behaviors dynamically OR running generic processors, define **distinct block subclasses** for each execution archetype. Each subclass encapsulates its own lifecycle, completion logic, and state management.

```
                        RuntimeBlock (abstract)
                             │
            ┌────────────────┼────────────────────┐
            │                │                    │
        LeafBlock      ContainerBlock        HybridBlock
            │                │                    │
      ┌─────┼─────┐    ┌────┼────┐          ┌────┼────┐
      │     │     │    │         │          │         │
   Gate  Timer  Effort  Seq   RoundLoop   AMRAP    EMOM
```

Each block type owns:
- **Its fragment bucket** (same as Approach B — fragments are the state)
- **Its completion policy** (hardcoded, not composed)
- **Its child dispatch logic** (if applicable)
- **Its timer management** (if applicable)

```typescript
// Example: AMRAP Block
class AmrapBlock extends HybridBlock {
  readonly completionPolicy = 'timer-terminates';
  readonly timerDirection = 'down';
  readonly roundsTotal = undefined; // unbounded

  onTimerExpired(): IRuntimeAction[] {
    this.markComplete('timer-expired');
    return [new ClearChildrenAction(this.depth)];
  }

  onChildComplete(): IRuntimeAction[] {
    this.advanceRound();
    return this.compileAndPushNextChild();
  }
}

// Example: EMOM Block
class EmomBlock extends HybridBlock {
  readonly completionPolicy = 'rounds-exhausted';
  readonly timerDirection = 'down';

  onTimerExpired(): IRuntimeAction[] {
    this.resetInterval();
    this.advanceRound();
    if (this.currentRound > this.totalRounds) {
      this.markComplete('rounds-exhausted');
      return [];
    }
    return [new ClearChildrenAction(this.depth), ...this.compileAndPushNextChild()];
  }
}
```

### Strengths

- **Explicit archetypes**: Each block type is a complete, self-contained unit. No need to reason about which behaviors are composed or which processors are active.
- **Easy to understand**: "What does an AMRAP do?" → Read `AmrapBlock.ts`. One file, one class, one answer.
- **Type safety**: TypeScript can enforce that an `AmrapBlock` always has a `durationMs` and child groups, while an `EffortBlock` always has a rep target.
- **Testable**: Test each block type in isolation with its own harness. No mock behaviors or processors.
- **Clear completion policy**: Each block type hardcodes how and when it completes. No ambiguity from cooperating behaviors.
- **Fragment bucket compatible**: Can still use fragments as the state model (Approach B's fragment bucket) while having typed blocks own the lifecycle.

### Weaknesses

- **Less flexible than composition**: Adding a new archetype requires a new subclass. Unusual combinations (e.g., "timer-driven effort with rounds") need a new class or creative inheritance.
- **Potential duplication**: Timer management, round tracking, and child dispatch may be duplicated across subclasses unless extracted into mixins or helper classes.
- **Dialect integration**: Must map dialect processors to block types, or let block types own their processing internally.
- **Migration effort**: Requires rewriting block construction from behavior composition to type selection in the compiler.

### Typed Block Inventory

| Block Type | Completion | Timer | Children | Rounds | Key Responsibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GateBlock` | User advance | None | None | None | Wait for user input |
| `TimerLeafBlock` | Timer expires | Countdown | None | None | Auto-pop after duration |
| `EffortBlock` | Target met or user advance | Count-up (secondary) | None | None | Track reps/effort |
| `SequentialContainerBlock` | All children done | Count-up (informational) | Sequential dispatch | 1 | Iterate children |
| `RoundLoopBlock` | N rounds × all children | Count-up (informational) | Reset each round | N | Loop children N times |
| `AmrapBlock` | Timer expires | Countdown (primary) | Loop while timer active | Unbounded | Max rounds in time cap |
| `EmomBlock` | Rounds exhausted | Countdown (per interval, resets) | Reset each interval | N | Fixed intervals |

### Hybrid Approach: Typed Blocks + Fragment Processors

The most practical path may combine Approaches B and C:

- **Typed blocks own lifecycle and completion** — each block subclass knows when and how it completes.
- **Fragment processors handle cross-cutting concerns** — Sound, History, Display, Analytics are processors that run against any block type's fragment bucket.
- **Fragments remain the state model** — all block types store state as fragments, enabling reactive analytics and generic rendering.

```
┌──────────────────────────────────────────────┐
│                  Dialect                      │
│  Cross-cutting Processors:                   │
│    SoundProcessor, HistoryProcessor,         │
│    DisplayProcessor, AnalyticsProjector      │
├──────────────────────────────────────────────┤
│              Typed Blocks                     │
│  AmrapBlock, EmomBlock, EffortBlock, ...     │
│  (own lifecycle, completion, child dispatch)  │
├──────────────────────────────────────────────┤
│            Fragment Bucket                    │
│  Plan fragments, Record fragments,           │
│  Analysis fragments (reactive, observable)   │
└──────────────────────────────────────────────┘
```

---

## Comparison by Concern

### Completion Policy

| Approach | How Completion Is Defined |
| :--- | :--- |
| **A: Behaviors** | Cooperation of LeafExitBehavior + TimerEndingBehavior + RoundsEndBehavior + CompletedBlockPopBehavior. Config determines which fire. Edge cases need safety nets. |
| **B: Processors** | Unclear. The plan does not specify how different completion policies are encoded. Would need a CompletionProcessor that reads fragment state. |
| **C: Typed Blocks** | Each block subclass hardcodes its completion trigger. `AmrapBlock.onTimerExpired()` marks complete. `EmomBlock.onRoundsExhausted()` marks complete. No ambiguity. |

### Child Dispatch

| Approach | How Children Are Managed |
| :--- | :--- |
| **A: Behaviors** | `ChildSelectionBehavior` — single complex behavior (~300 lines) handles cursor, loop conditions, rest injection, round advancement, JIT compilation. |
| **B: Processors** | Not specified. Would need a `ChildDispatchProcessor` with equivalent logic. |
| **C: Typed Blocks** | Container block subclasses (`SequentialContainerBlock`, `RoundLoopBlock`, `AmrapBlock`, `EmomBlock`) each implement their own child iteration. Shared logic in a `ContainerBlock` base class. |

### Timer Management

| Approach | How Timers Work |
| :--- | :--- |
| **A: Behaviors** | 5 timer behaviors handle different concerns (init, tick, pause/resume, ending policy). State in `time` memory tag. |
| **B: Processors** | Single `TimerProcessor`. Must absorb all 5 concerns or leave some unaddressed. |
| **C: Typed Blocks** | Timer-bearing block subclasses inherit timer management from a `TimerMixin` or `TimerBlock` base. Completion policy is in the subclass, not the timer logic. |

### Analytics Output

| Approach | How Outputs Are Generated |
| :--- | :--- |
| **A: Behaviors** | `ReportOutputBehavior` manually emits segment/milestone/completion outputs at lifecycle points. Complex proportional time splitting. |
| **B: Processors** | Reactive projection — outputs are snapshots of fragment state. Automatic, declarative. **This is the strongest aspect of Approach B.** |
| **C: Typed Blocks** | Can use either model. Fragment-bucket projection (Approach B) works naturally with typed blocks. |

### Adding a New Sport (e.g., Yoga)

| Approach | What's Required |
| :--- | :--- |
| **A: Behaviors** | New `PoseBehavior`, new `YogaStrategy`, configure `BlockBuilder` with right aspect composition. Add to strategy registry. |
| **B: Processors** | New `PoseProcessor`, new `PoseFragment`, register in Yoga dialect. Zero changes to core. |
| **C: Typed Blocks** | New `PoseBlock` subclass (if yoga holds are a new archetype) OR reuse `TimerLeafBlock` with a `PoseFragment`. New `YogaDialect` with cross-cutting processors. |

---

## Recommendation

The restructure documents should be updated to acknowledge all three approaches and define a clear migration strategy that accounts for:

1. **Every current behavior** — each of the 18 behaviors must have a home in the new architecture.
2. **Every execution archetype** — each of the 7 archetypes must be reproducible.
3. **A completion policy model** — the most critical gap in the current plan.
4. **Child dispatch complexity** — the second most critical gap.
5. **Cross-cutting concerns** — sound, history, display, controls, waiting-to-start.

The **Hybrid Approach (Typed Blocks + Fragment Processors)** is likely the best path:
- Typed blocks eliminate the behavior composition complexity for core execution archetypes.
- Fragment processors handle cross-cutting concerns cleanly.
- The fragment bucket remains the state model for analytics projection.
- The system stays extensible via new block types and new processors.
