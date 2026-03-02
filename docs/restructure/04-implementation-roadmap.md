# Implementation Roadmap: The Transition

This plan outlines a phased migration from the current **Behavior-Based** system to a **Fragment-Centric** architecture using **Typed Blocks + Fragment Processors** (the hybrid approach described in [07-approach-comparison.md](07-approach-comparison.md)).

> **Prerequisites**: Read [06-current-implementation-analysis.md](06-current-implementation-analysis.md) for the full inventory of 18 behaviors, 7 execution archetypes, and 12 gaps this roadmap must address. Read [07-approach-comparison.md](07-approach-comparison.md) for the rationale behind choosing the hybrid approach.

## Refinement of Mental Model

Throughout this transition, we must adhere to the principle that **simpler is better**. Each phase should result in a net **reduction** of code.

- **Fewer Concepts**: Replace "Behaviors," "Strategies," "MemoryLocations," and "Aspect Composers" with **Fragments**, **Typed Blocks**, and **Processors**.
- **Better Re-use**: Processors handle cross-cutting concerns (sound, history, analytics). Typed blocks handle lifecycle and completion. Fragments are the universal state model.
- **Preserve All Archetypes**: The 7 execution archetypes (Gate, Timer Leaf, Effort Leaf, Sequential Container, Round-Loop Container, AMRAP, EMOM) must all be reproducible in the new architecture.

---

## Behavior Migration Map

Every current behavior must have a clear destination in the new architecture. This table tracks where each of the 18 behaviors migrates to.

### Core Execution → Typed Block Methods

| Current Behavior | Destination | Notes |
| :--- | :--- | :--- |
| `TimerBehavior` | `TimerMixin` on typed blocks | Manages `SpansFragment` (start/stop timestamps). Pause/resume via event subscriptions. Shared by all timer-bearing blocks. |
| `TimerEndingBehavior` | Typed block completion methods | `AmrapBlock.onTimerExpired()` (complete-block mode). `EmomBlock.onTimerExpired()` (reset-interval mode). No longer a separate behavior — completion policy lives in the block type. |
| `TimerInitBehavior` | Absorbed into `TimerMixin` | Lightweight timer init is a subset of `TimerMixin`. |
| `TimerPauseBehavior` | Absorbed into `TimerMixin` | Pause/resume span management is part of timer state. |
| `TimerTickBehavior` | Absorbed into `TimerMixin` | Tick subscription + span closure on unmount. |
| `ChildSelectionBehavior` | `ContainerBlock` base class | Sequential dispatch, loop conditions, cursor, rest injection, round advancement. Shared by `SequentialContainerBlock`, `RoundLoopBlock`, `AmrapBlock`, `EmomBlock`. |
| `ReEntryBehavior` | `ContainerBlock` constructor | Round initialization is a constructor concern — set `currentRound` and `totalRounds` from plan fragments. |
| `RoundsEndBehavior` | Typed block completion check | `RoundLoopBlock` and `EmomBlock` check `currentRound > totalRounds` in their `onChildComplete()`. No separate safety-net behavior needed. |
| `LeafExitBehavior` | `LeafBlock` base class | `onNext()` → marks complete → returns `PopBlockAction`. Event-driven exit for `TimerLeafBlock` via `onTimerExpired()`. |
| `CompletedBlockPopBehavior` | Typed block `onNext()` guard | All blocks check `isComplete` at the top of `onNext()`. One line of code, not a behavior. |
| `CompletionTimestampBehavior` | `RuntimeBlock` base class | Auto-record timestamp when `markComplete()` is called. Universal — stays in the base class. |

### Output & Analytics → Fragment Processors

| Current Behavior | Destination | Notes |
| :--- | :--- | :--- |
| `ReportOutputBehavior` | `AnalyticsProjector` (processor) | Subscribes to stack events. Projects fragment bucket → OutputStatements at push (load), change (milestone), pop (segment). Generic — works for any block type. |
| `HistoryRecordBehavior` | `HistoryProcessor` (processor) | Subscribes to block pop. Emits `history:record` event from fragment bucket. Generic — works for any block type. |
| `SoundCueBehavior` | `SoundProcessor` (processor) | Emits `SoundFragment` at lifecycle points (mount, unmount, countdown). Configured per dialect. |

### UI & Display → Fragment Processors

| Current Behavior | Destination | Notes |
| :--- | :--- | :--- |
| `LabelingBehavior` | `DisplayProcessor` (processor) | Reads plan fragments, writes display fragments (label, subtitle, round display). Mode logic (clock/timer/countdown/hidden) driven by block type and timer direction. |
| `ButtonBehavior` | `ControlsProcessor` (processor) | Reads block type, writes `ActionFragment`s for UI buttons. |
| `FragmentPromotionBehavior` | `JitCompiler` enhancement | Fragment promotion is a compile-time concern. Move round-indexed rep scheme logic (21-15-9) into the compiler's child compilation step. |
| `WaitingToStartInjectorBehavior` | `SessionRootBlock.onMount()` | Gate injection is specific to the session root block type. One line: `return [new PushBlockAction(new GateBlock(...))]`. |

---

## Phase 1: Fragment Unification (Foundation)

- **Goal**: Consolidate state into a single fragment bucket without changing execution behavior.
- **Tasks**:
    1. Add `fragments: ICodeFragment[]` collection to `RuntimeBlock` with `getFragments()`, `getPlan()`, `getRecord()` APIs.
    2. Update `TimerBehavior` to write `SpansFragment` to the fragment bucket (in addition to `time` memory, for backward compat).
    3. Update `ReEntryBehavior` to write `CurrentRoundFragment` to the fragment bucket (in addition to `round` memory).
    4. Update `ChildSelectionBehavior` to read/write child status via fragment bucket.
    5. Add `CompletionTimestampBehavior` write to fragment bucket.
    6. Ensure all existing tests pass — fragment bucket is additive, not replacing memory yet.

### Behavior Status After Phase 1

| Behavior | Status | Change |
| :--- | :--- | :--- |
| All 18 behaviors | **Unchanged** | Each writes to fragment bucket *in addition to* memory tags |
| `RuntimeBlock` | **Extended** | New `fragments` collection + query APIs |

---

## Phase 2: Analytics Projector (Reactive Output)

- **Goal**: Replace manual emit logic with reactive projection from fragment state.
- **Tasks**:
    1. Build `AnalyticsProjector` that subscribes to stack push/pop events.
    2. Implement projection rules: push → `load` output, pop → `segment` output with all fragments.
    3. Implement milestone projection: round change events → `milestone` output.
    4. Build `SoundProcessor` that reads timer fragments and emits sound outputs at lifecycle points.
    5. Build `HistoryProcessor` that reads fragment bucket on pop and emits `history:record`.
    6. Verify output parity: existing scripts produce identical `OutputStatement` streams.
    7. Remove `ReportOutputBehavior` from all blocks.
    8. Remove `HistoryRecordBehavior` from all blocks.
    9. Remove `SoundCueBehavior` from all blocks.

### Behavior Status After Phase 2

| Behavior | Status | Change |
| :--- | :--- | :--- |
| `ReportOutputBehavior` | **Removed** | Replaced by `AnalyticsProjector` |
| `HistoryRecordBehavior` | **Removed** | Replaced by `HistoryProcessor` |
| `SoundCueBehavior` | **Removed** | Replaced by `SoundProcessor` |
| Remaining 15 behaviors | **Unchanged** | Still active |

---

## Phase 3: Typed Block Introduction (Core Execution)

- **Goal**: Replace behavior composition with typed block subclasses for each execution archetype.
- **Tasks**:

### 3a: Block Type Hierarchy

```
RuntimeBlock (abstract base)
├── fragments: ICodeFragment[]
├── markComplete(reason)           // records timestamp
├── abstract onMount(): Action[]
├── abstract onNext(): Action[]
├── abstract onUnmount(): Action[]
│
├── LeafBlock (abstract)
│   ├── GateBlock                  // waits for user advance
│   ├── TimerLeafBlock             // auto-pops on timer expiry
│   └── EffortBlock                // tracks reps, user-advance or target-met
│
└── ContainerBlock (abstract)
    ├── childGroups, childIndex, loopCondition
    ├── compileAndPushNextChild()
    ├── shouldLoop(): boolean
    ├── injectRest(): Action[]
    │
    ├── SequentialContainerBlock   // children once, done
    ├── RoundLoopBlock             // N rounds × children
    ├── AmrapBlock                 // timer-terminated unbounded loop
    └── EmomBlock                  // interval-reset fixed rounds
```

### 3b: TimerMixin

Extract timer state management into a mixin/trait usable by any block type:

```typescript
interface ITimerCapable {
  spans: TimeSpan[];
  direction: 'up' | 'down';
  durationMs?: number;
  openSpan(now: Date): void;
  closeSpan(now: Date): void;
  pause(now: Date): void;
  resume(now: Date): void;
  getElapsedMs(now: Date): number;
  isExpired(now: Date): boolean;
}
```

Used by: `TimerLeafBlock`, `SequentialContainerBlock`, `RoundLoopBlock`, `AmrapBlock`, `EmomBlock`.

### 3c: Implement Each Block Type

| Block Type | Replaces | Completion | Key Methods |
| :--- | :--- | :--- | :--- |
| `GateBlock` | `WaitingToStartBlock` + `LeafExitBehavior` + `ButtonBehavior` | `onNext()` → markComplete | `onMount()` → push button fragments |
| `TimerLeafBlock` | `RestBlock` + `TimerBehavior` + `TimerEndingBehavior` + `LeafExitBehavior` | Timer expiry → markComplete | `onTick()` → check elapsed vs duration |
| `EffortBlock` | Current `EffortBlock` + `EffortCompletionBehavior` | Target met or user-advance | `onNext()` → check target or force |
| `SequentialContainerBlock` | `GenericGroupStrategy` composition | All children done | `onChildComplete()` → push next or markComplete |
| `RoundLoopBlock` | `GenericLoopStrategy` composition | N rounds exhausted | `onChildComplete()` → next child or next round |
| `AmrapBlock` | `AmrapLogicStrategy` composition | Timer expiry | `onTick()` → check timer; `onChildComplete()` → advance round + loop |
| `EmomBlock` | `IntervalLogicStrategy` composition | Rounds exhausted | `onTick()` → check interval; reset timer + advance round |

### 3d: Update Compiler

Replace strategy-based composition with direct block type selection:

```typescript
// Before: Strategy calls builder.asTimer().asRepeater().asContainer()
// After: Compiler selects block type directly

if (hasTimer && hasRounds && isAmrap) return new AmrapBlock(fragments, children);
if (hasTimer && hasRounds && isEmom)  return new EmomBlock(fragments, children);
if (hasTimer && hasRounds)            return new RoundLoopBlock(fragments, children);
if (hasChildren)                      return new SequentialContainerBlock(fragments, children);
if (hasTimer)                         return new TimerLeafBlock(fragments);
if (hasEffort)                        return new EffortBlock(fragments);
return new GateBlock(fragments);
```

### Behavior Status After Phase 3

| Behavior | Status | Change |
| :--- | :--- | :--- |
| `TimerBehavior` | **Removed** | Absorbed into `TimerMixin` |
| `TimerEndingBehavior` | **Removed** | Absorbed into typed block completion methods |
| `TimerInitBehavior` | **Removed** | Absorbed into `TimerMixin` |
| `TimerPauseBehavior` | **Removed** | Absorbed into `TimerMixin` |
| `TimerTickBehavior` | **Removed** | Absorbed into `TimerMixin` |
| `ChildSelectionBehavior` | **Removed** | Absorbed into `ContainerBlock` base |
| `ReEntryBehavior` | **Removed** | Absorbed into `ContainerBlock` constructor |
| `RoundsEndBehavior` | **Removed** | Absorbed into typed block completion checks |
| `LeafExitBehavior` | **Removed** | Absorbed into `LeafBlock` base |
| `CompletedBlockPopBehavior` | **Removed** | One-line guard in `onNext()` |
| `CompletionTimestampBehavior` | **Removed** | Built into `RuntimeBlock.markComplete()` |
| `FragmentPromotionBehavior` | **Removed** | Moved to JitCompiler child compilation |
| `WaitingToStartInjectorBehavior` | **Removed** | `SessionRootBlock.onMount()` |
| `LabelingBehavior` | **Removed** (Phase 2) | `DisplayProcessor` |
| `ButtonBehavior` | **Removed** (Phase 2) | `ControlsProcessor` |
| `ReportOutputBehavior` | **Removed** (Phase 2) | `AnalyticsProjector` |
| `HistoryRecordBehavior` | **Removed** (Phase 2) | `HistoryProcessor` |
| `SoundCueBehavior` | **Removed** (Phase 2) | `SoundProcessor` |

**All 18 behaviors eliminated.**

---

## Phase 4: Cross-Cutting Processors & Display

- **Goal**: Finalize the processor layer for concerns that span all block types.
- **Tasks**:
    1. Build `DisplayProcessor` — reads block type + plan fragments → writes display fragments (label, subtitle, mode).
    2. Build `ControlsProcessor` — reads block type → writes `ActionFragment`s for buttons.
    3. Wire processors into `Dialect` configuration.
    4. Implement observable fragment collections for reactive UI binding.
    5. Ensure UI components render from fragment bucket, not memory tags.

### Processors After Phase 4

| Processor | Replaces | Scope |
| :--- | :--- | :--- |
| `AnalyticsProjector` | `ReportOutputBehavior` | Subscribes to stack events, projects fragment bucket → OutputStatements |
| `HistoryProcessor` | `HistoryRecordBehavior` | Emits history records on block pop |
| `SoundProcessor` | `SoundCueBehavior` | Emits sound fragments at lifecycle points |
| `DisplayProcessor` | `LabelingBehavior` | Writes display/label fragments from plan |
| `ControlsProcessor` | `ButtonBehavior` | Writes action button fragments from block type |

---

## Phase 5: Strategy & Builder Cleanup

- **Goal**: Remove the strategy/builder layer entirely.
- **Tasks**:
    1. Replace `GenericTimerStrategy`, `GenericGroupStrategy`, `GenericLoopStrategy` with direct block type selection in compiler.
    2. Replace `AmrapLogicStrategy`, `IntervalLogicStrategy` with direct `AmrapBlock`/`EmomBlock` construction.
    3. Remove `ChildrenStrategy`, `HistoryStrategy`, `ReportOutputStrategy`, `SoundStrategy` (now handled by processors).
    4. Remove `BlockBuilder` and its `asTimer`/`asRepeater`/`asContainer` methods.
    5. Remove all 18 behavior class files from `src/runtime/behaviors/`.
    6. Remove `BehaviorContext` and event-based behavior invocation.
    7. Purge unused memory tag infrastructure.
    8. Update `ExecutionContext` to work with typed blocks (action queue preserved).

---

## Phase 6: Dialect Integration & Extensibility

- **Goal**: Validate the architecture by adding a new sport dialect.
- **Tasks**:
    1. Define a `YogaDialect` with custom processors (`PoseProcessor`, `BreathProcessor`).
    2. Create `PoseBlock` (new typed block for timed holds).
    3. Create `PoseFragment` and `BreathFragment`.
    4. Verify zero changes to core runtime, analytics projector, or UI fragment renderer.

---

## Action Queue Preservation

The current action queue system (`ExecutionContext` with frozen clock + work list of `IRuntimeAction`) is **preserved** throughout the migration. This ensures:

- Multi-step cascading (pop child → next parent → compile next child → push) continues to work.
- Time-frozen turns prevent race conditions.
- Typed blocks return `IRuntimeAction[]` from their lifecycle methods, same as behaviors do today.

---

## Success Criteria

1. **Behavior Elimination**: All 18 behavior classes removed from `src/runtime/behaviors/`.
2. **Strategy Elimination**: All 15 strategy classes removed or replaced with direct block construction.
3. **Archetype Parity**: All 7 execution archetypes (Gate, Timer Leaf, Effort Leaf, Sequential Container, Round-Loop, AMRAP, EMOM) work identically.
4. **Output Parity**: Existing scripts produce identical `OutputStatement` streams.
5. **Code Reduction**: Net decrease in classes and lines of code.
6. **Extensibility**: Adding a new dialect requires only new block types (if new archetypes needed) and new processors — zero changes to core runtime.
7. **Testability**: Each typed block testable in isolation with fragment-based assertions. Each processor testable with mock fragment buckets.
