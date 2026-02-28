# Behavioral Architecture

## Overview

The WOD Wiki runtime uses a **behavior-driven architecture** where blocks are composed of lifecycle-based behaviors attached via strategies. Each behavior implements `IRuntimeBehavior` with four hooks: `onMount`, `onNext`, `onUnmount`, and `onDispose`.

Strategies (`IRuntimeBlockStrategy`) match incoming code statements and compose blocks by attaching appropriate behaviors based on fragment patterns and fragment origins.

---

## Behavior Contract: `IRuntimeBehavior`

All behaviors implement four lifecycle hooks:

| Hook | Called When |
|------|------------|
| `onMount(ctx)` | Block is mounted to the stack |
| `onNext(ctx)` | Block advances to next lifecycle state |
| `onUnmount(ctx)` | Block is being unmounted from stack |
| `onDispose(ctx)` | Final cleanup before garbage collection |

All hooks receive `IBehaviorContext` and return `IRuntimeAction[]` (except `onDispose` which returns `void`).

---

## Strategy Contract: `IRuntimeBlockStrategy`

All strategies implement three members:

| Member                                      | Purpose                                 |
| ------------------------------------------- | --------------------------------------- |
| `priority: number`                          | Execution order. Higher = runs first.   |
| `match(statements, runtime): boolean`       | Whether this strategy applies           |
| `apply(builder, statements, runtime): void` | Attaches behaviors and configures block |

### Priority Tiers

- **p100**: Root/Direct-build blocks (not matched from parser)
- **p90**: Logic drivers (AMRAP, EMOM) — establish block identity
- **p50**: Components (Timer, Loop, Group, Children)
- **p20**: Enhancements (Sound, History)
- **p15**: Enhancement final pass (ReportOutput)
- **p0**: Fallback (Effort default)

---

## Behavior Groups & Fragment Mappings

### 1. Universal Invariants

#### `CompletionTimestampBehavior`
- **Lifecycle**: `onNext`
- **Core Function**: Auto-added to ALL blocks. Detects when block transitions to `isComplete = true` and stamps a `SystemTime` completion timestamp into `completion` memory.
- **Strategies**: None (injected by block builder infrastructure)

---

### 2. Time (Timer Lifecycle)

#### `TimerInitBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: Initializes timer state in block memory on mount: creates `Time` fragment with direction, duration, label, role, and opens the first `TimeSpan` at current clock time.
- **Memory Created**: `time` → `TimeFragment`

#### `TimerTickBehavior`
- **Lifecycle**: `onMount`, `onUnmount`, `onDispose`
- **Core Function**: Subscribes to `tick` events (with bubble scope for parent timer tracking) and closes the current time span on unmount to finalize elapsed time.
- **Memory Updated**: `time.spans`

#### `TimerEndingBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: Monitors countdown timers via `tick` subscription; fires `timer:complete` event when elapsed >= duration. Two modes: 
  - `complete-block`: marks block complete and clears children
  - `reset-interval`: resets interval state for next round
- **Events Emitted**: `timer:complete`
- **Memory Updated**: `intervals` (EMOM mode)

#### `TimerPauseBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: Handles `timer:pause` and `timer:resume` events, closing current `TimeSpan` on pause and opening new span on resume to exclude paused time from elapsed calculations.
- **Events Subscribed**: `timer:pause`, `timer:resume`
- **Memory Updated**: `time.spans`

#### `TimerBehavior` (Legacy Aggregate)
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Combines timer initialization, resets on next, closes span on unmount, and subscribes to pause/resume events.
- **Note**: Being superseded by more granular behaviors

#### Applied via `builder.asTimer(config)` with parameters:
- `direction`: `'up'` (countup) or `'down'` (countdown)
- `duration`: milliseconds (for countdown)
- `label`: display text
- `role`: `'primary'` or `'secondary'`
- `completionMode`: `'complete-block'` (AMRAP) or `'reset-interval'` (EMOM)

### Which Strategies Apply Timer Behaviors

| Strategy | Priority | Fragment Match | Timer Config |
|----------|----------|---------------|--------------|
| **GenericTimerStrategy** | p50 | `Duration` fragment (non-runtime) | Countdown primary + `TimerPauseBehavior` |
| **AmrapLogicStrategy** | p90 | `Duration` + (`Rounds` \| action="amrap") | Countdown primary, `complete-block` mode |
| **IntervalLogicStrategy** | p90 | `Duration` + (hint \| action="emom") | Countdown primary, `reset-interval` mode |
| **WorkoutRootStrategy** | p100 | Root block (direct-build) | Countup primary |
| **IdleBlockStrategy** | p100 | Idle block (direct-build) | Optional countup secondary |
| **EffortFallbackStrategy** | p0 | No Duration/Rounds/children | Countup secondary, no completion |
| **RestBlockStrategy** | p50 | Rest block (direct-build) | Internal timer composition |

---

### 3. Iteration (Round/Loop Management)

#### `ReEntryBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: Initializes round state in block memory on mount by writing `CurrentRoundFragment` with starting round number and optional total.
- **Memory Created**: `round` → `CurrentRoundFragment`
- **Note**: Round advancement delegated to `ChildSelectionBehavior`

#### `RoundsEndBehavior`
- **Lifecycle**: `onNext`, `onDispose`
- **Core Function**: Safety net that checks on `next()` whether round counter exceeded total; if so, marks block complete with reason `rounds-exhausted` and returns `PopBlockAction`.
- **Completion Trigger**: `round >= total`

#### `FragmentPromotionBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Promotes (inherits) fragment values from parent block memory into child blocks. Supports rep-scheme cycling (e.g., 21-15-9) based on current round and generic promotion rules for arbitrary fragments.
- **Implements**: `IRepSource`, `IFragmentPromoter`
- **Memory Accessed**: Parent `memory[owner]`, child `memory[owner]`
- **Memory Created**: Child fragments (promoted or cycled values)

#### Applied via `builder.asRepeater(config)` with parameters:
- `totalRounds`: number of rounds (or `Infinity` for unbounded AMRAP)
- `repScheme`: optional cycling scheme (e.g., `[21, 15, 9]`)
- `promotionRules`: fragment types to inherit from parent

### Which Strategies Apply Iteration Behaviors

| Strategy | Priority | Fragment Match | Iteration Config |
|----------|----------|---------------|-----------------|
| **GenericLoopStrategy** | p50 | `Rounds` fragment | Fixed rounds + `RoundsEnd` + rep-scheme promotion |
| **AmrapLogicStrategy** | p90 | `Duration` + (Rounds \| amrap action) | Unbounded rounds (timer ends, not rounds) |
| **IntervalLogicStrategy** | p90 | `Duration` + EMOM pattern | Fixed rounds with completion |
| **ChildrenStrategy** | p50 | Has children | Conditional: unbounded if countdown, single-pass else |
| **WorkoutRootStrategy** | p100 | Root block | Optional repeater if `totalRounds > 1` |

---

### 4. Completion (Block Exit/Pop)

#### `LeafExitBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Provides leaf-block exit logic — marks block complete and returns `PopBlockAction` either on `next()` call (if `onNext: true`) or when subscribed events fire.
- **Configuration**: 
  - `onNext: boolean` — pop on next call
  - `onEvents: string[]` — pop when these events fire
- **Typical Event**: `timer:complete`
- **Used By**: Leaf blocks (timers, efforts) with no children

#### `CompletedBlockPopBehavior`
- **Lifecycle**: `onNext`, `onDispose`
- **Core Function**: Deferred pop pattern — on `next()`, checks if block is already marked complete (e.g., by `TimerEndingBehavior`) and returns `PopBlockAction`. Allows upstream behaviors to control timing.
- **Used By**: Loop blocks (AMRAP/EMOM) where timer marks completion but child dispatch triggers pop

#### Applied via builder configuration

### Which Strategies Apply Completion Behaviors

| Strategy | Priority | Fragment Match | Completion Config |
|----------|----------|---------------|------------------|
| **GenericTimerStrategy** | p50 | `Duration` fragment | `LeafExitBehavior` (exit on `timer:complete`) |
| **EffortFallbackStrategy** | p0 | No Duration/Rounds/children | `LeafExitBehavior` (pop on next) |
| **IdleBlockStrategy** | p100 | Idle block | `LeafExitBehavior` (if configured) |
| **ChildrenStrategy** | p50 | Has children | `CompletedBlockPopBehavior` + **removes** `LeafExitBehavior` |

---

### 5. Children (Child Block Dispatching)

#### `ChildSelectionBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Manages sequential dispatch of child blocks from configured `childGroups`. Tracks child index and round state, supports looping (with conditions: `always`, `timer-active`, `rounds-remaining`), and injects rest blocks between iterations when countdown timer has remaining time.
- **Configuration**:
  - `childGroups: IRuntimeBlock[][]` — nested child blocks
  - `loopCondition`: `'always'` (always re-enter), `'timer-active'` (while countdown running), `'rounds-remaining'` (while rounds < total)
  - `canInjectRest: boolean` — inject rest blocks between rounds
- **Memory Created/Updated**: Child indices, round tracking
- **Methods**: `advanceRound()` — increments round counter and resets child index

#### Applied via `builder.asContainer(config)` with parameters:
- `loop: boolean` — whether to loop children
- `restBetweenRounds: boolean` — inject rest blocks
- `loopCondition`: loop behavior type

### Which Strategies Apply Children Behaviors

| Strategy | Priority | Fragment Match | Container Config |
|----------|----------|---------------|-----------------|
| **ChildrenStrategy** | p50 | First statement has `children.length > 0` | Loop if countdown/rounds; rest injection if countdown |
| **WorkoutRootStrategy** | p100 | Root block | No-loop container (sequential children once) |

---

### 6. Display (Visual Labeling)

#### `LabelingBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Creates display text fragments (label, subtitle, action, round display) in block memory on mount; dynamically updates round label on `next()` when round state changes.
- **Memory Created**: Display fragments in `display` memory
- **Fragment Types**: `Label`, `Subtitle`, `Action`, `RoundDisplay`

### Which Strategies Apply Labeling

| Strategy | Priority | Fragment Match |
|----------|----------|---------------|
| **GenericTimerStrategy** | p50 | `Duration` fragment |
| **GenericGroupStrategy** | p50 | Has children, no Duration/Rounds |
| **GenericLoopStrategy** | p50 | `Rounds` fragment |
| **AmrapLogicStrategy** | p90 | AMRAP pattern |
| **IntervalLogicStrategy** | p90 | EMOM pattern |
| **WorkoutRootStrategy** | p100 | Root block |
| **IdleBlockStrategy** | p100 | Idle block |

---

### 7. Output (Events, History, Sound)

#### `ReportOutputBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Emits structured output events at different lifecycle points:
  - `segment`: on mount (if configured)
  - `milestone`: on round changes (mount and next)
  - `completion`: on unmount with computed time results
- **Output Data**: Elapsed time, total time, time spans, system timestamps
- **Split Display**: Supports splitting results across multiple fragment groups
- **Events Emitted**: `output:segment`, `output:milestone`, `output:completion`

#### `HistoryRecordBehavior`
- **Lifecycle**: `onUnmount`, `onDispose`
- **Core Function**: On unmount, gathers execution data (elapsed time, timer direction/duration, completed rounds) and emits `history:record` event for workout history persistence.
- **Events Emitted**: `history:record`
- **Data Collected**: Timing, rounds, direction, outcome

#### `SoundCueBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Emits sound cue system outputs at lifecycle points (`mount`, `unmount`/`complete` triggers) and subscribes to `tick` events with bubble scope for countdown triggers at specified second thresholds (e.g., 3-2-1 beeps).
- **Cue Types**: `start-beep`, `countdown-beep`, `timer-complete`, `interval-complete`, `interval-start`
- **Events Subscribed**: `tick` (for second thresholds)
- **Configuration**: Threshold seconds for countdown warnings

### Which Strategies Apply Output Behaviors

| Strategy | Priority | Fragment Match | Outputs Applied |
|----------|----------|---------------|-----------------|
| **ReportOutputStrategy** | p15 | Universal (any non-empty statements) | `ReportOutputBehavior` (default config) |
| **HistoryStrategy** | p20 | Universal (any non-empty statements) | `HistoryRecordBehavior` |
| **SoundStrategy** | p20 | Universal (any non-empty statements) | `SoundCueBehavior` (countdown or start beeps) |
| **AmrapLogicStrategy** | p90 | AMRAP pattern | `SoundCueBehavior` (start + countdown + complete) |
| **IntervalLogicStrategy** | p90 | EMOM pattern | `SoundCueBehavior` (start + countdown + interval-complete) |
| **WorkoutRootStrategy** | p100 | Root block | `HistoryRecordBehavior` |

---

### 8. Controls (UI Interaction)

#### `ButtonBehavior`
- **Lifecycle**: `onMount`, `onUnmount`, `onDispose`
- **Core Function**: Pushes `Action`-type fragments to `controls` memory on mount (representing UI buttons with id, label, variant, visibility, enabled state, and event name) and clears them on unmount.
- **Memory Created**: Control fragments in `controls` memory
- **Button Properties**: `id`, `label`, `variant`, `visible`, `enabled`, `eventName`
- **Static Method**: `updateButton(block, id, updates)` — dynamically change button state

### Which Strategies Apply Controls

| Strategy | Priority | Fragment Match | Buttons |
|----------|----------|---------------|---------|
| **WorkoutRootStrategy** | p100 | Root block | Pause / Next / Stop buttons |
| **IdleBlockStrategy** | p100 | Idle block | Optional button config |

---

### 9. Lifecycle (Startup Gating)

#### `WaitingToStartInjectorBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: On mount, returns `PushBlockAction` with a `WaitingToStartBlock` to act as an idle gate before workout begins.
- **Intended Position**: Before `ChildSelectionBehavior` (which should use `skipOnMount: true`)
- **Effect**: Delays execution until user interaction

### Which Strategies Apply Lifecycle

| Strategy | Priority | Fragment Match |
|----------|----------|---------------|
| **WaitingToStartStrategy** | p100 | Direct-build only (creates the `WaitingToStartBlock` itself) |

---

## Strategy Application Pipeline

### Execution Order

Strategies execute in **descending priority order**. Higher-priority strategies establish block identity and core behaviors; lower-priority strategies enrich with additional capabilities.

```
Priority p100  Root/Direct-build
  ├─ WorkoutRootStrategy (root block template)
  ├─ SessionRootStrategy (session root template)
  ├─ WaitingToStartStrategy (idle gate template)
  └─ IdleBlockStrategy (idle block template)

Priority p90   Logic Drivers (establish block type identity)
  ├─ AmrapLogicStrategy (AMRAP: countdown + unbounded rounds)
  └─ IntervalLogicStrategy (EMOM: countdown + fixed rounds, reset on interval)

Priority p50   Components (fill in timer/group/loop if not set)
  ├─ GenericTimerStrategy (any Duration fragment)
  ├─ GenericGroupStrategy (children without Duration/Rounds)
  ├─ GenericLoopStrategy (any Rounds fragment)
  ├─ ChildrenStrategy (first statement has children)
  └─ RestBlockStrategy (direct-build only)

Priority p20   Enhancements (add cross-cutting concerns)
  ├─ SoundStrategy (universal: add sound cues)
  └─ HistoryStrategy (universal: add history recording)

Priority p15   Enhancement Final Pass
  └─ ReportOutputStrategy (universal: add output reporting)

Priority p0    Fallback (catch-all for simple efforts)
  └─ EffortFallbackStrategy (no Duration/Rounds/children)
```

### Behavior Deduplication

All strategies check for behavior presence before attaching. If a behavior is already present, the strategy skips it:

- `TimerBehavior` prevents re-attachment in lower-priority strategies
- `ReEntryBehavior` prevents duplicate round state initialization
- `SoundCueBehavior` prevents duplicate sound cue handlers
- etc.

This ensures composability without duplication.

---

## Common Composition Patterns

### Pattern 1: Simple Timed Block (e.g., "10:00 Run")

**Input**: Statement with `Duration` fragment (10 minutes)

**Matching Strategies** (in order):
1. ✓ GenericTimerStrategy (p50) matches `Duration` fragment
   - Sets blockType: `"Timer"`
   - Attaches: `TimerInitBehavior`, `TimerTickBehavior`, `TimerEndingBehavior` (countdown), `TimerPauseBehavior`, `LeafExitBehavior`, `LabelingBehavior`, `SoundCueBehavior`

2. ✓ SoundStrategy (p20) — already has `SoundCueBehavior`, skips
3. ✓ HistoryStrategy (p20) — attaches `HistoryRecordBehavior`
4. ✓ ReportOutputStrategy (p15) — attaches `ReportOutputBehavior`

**Result**: Block with timer, sound cues, history tracking, and output reporting.

---

### Pattern 2: AMRAP Block (e.g., "10:00 AMRAP 5 reps KB Swing")

**Input**: Statement with `Duration` (10 min) + children (reps) + `Effort` action="amrap"

**Matching Strategies** (in order):
1. ✓ AmrapLogicStrategy (p90) matches `Duration` + amrap action
   - Sets blockType: `"AMRAP"`
   - Attaches: `TimerInitBehavior`, `TimerTickBehavior` (countdown, no reset — completes block), `TimerPauseBehavior`, `ReEntryBehavior` (unbounded), `LabelingBehavior`, `SoundCueBehavior` (start + countdown beeps)

2. ✗ GenericTimerStrategy (p50) skipped — blockType already set
3. ✓ ChildrenStrategy (p50)
   - Attaches: `ChildSelectionBehavior` (loop while `timer-active`), `CompletedBlockPopBehavior` (deferred pop when timer completes)
   - Removes: `LeafExitBehavior` (children manage advancement)
   - Attaches: `FragmentPromotionBehavior` (promote reps from parent to each child)

4. ✓ SoundStrategy (p20) — already has `SoundCueBehavior`, skips
5. ✓ HistoryStrategy (p20) — attaches `HistoryRecordBehavior`
6. ✓ ReportOutputStrategy (p15) — attaches `ReportOutputBehavior`

**Result**: Block with countdown timer that loops children until time expires, with sound cues and history tracking.

---

### Pattern 3: Rounds Block (e.g., "3 rounds: 5 KB Swings, 10 Box Jumps")

**Input**: Statement with `Rounds` fragment (3 rounds) + children

**Matching Strategies** (in order):
1. ✓ GenericLoopStrategy (p50) matches `Rounds` fragment
   - Sets blockType: `"Rounds"`
   - Attaches: `ReEntryBehavior`, `RoundsEndBehavior`, `LabelingBehavior`, `FragmentPromotionBehavior` (cycle reps by round)

2. ✓ ChildrenStrategy (p50)
   - Attaches: `ChildSelectionBehavior` (loop while `rounds-remaining`), `CompletedBlockPopBehavior`
   - Attaches: `FragmentPromotionBehavior` (already present, skipped)

3. ✓ SoundStrategy (p20) — no countdown timer, skips
4. ✓ HistoryStrategy (p20) — attaches `HistoryRecordBehavior`
5. ✓ ReportOutputStrategy (p15) — attaches `ReportOutputBehavior`

**Result**: Block that loops children 3 times, with round counter and history tracking.

---

### Pattern 4: Simple Group (e.g., "Warm up: 5 Minutes Row, 10 Push-ups")

**Input**: Statement with children, NO `Duration`, NO `Rounds`

**Matching Strategies** (in order):
1. ✗ AmrapLogicStrategy (p90) no AMRAP markers, skips
2. ✗ IntervalLogicStrategy (p90) no EMOM markers, skips
3. ✓ GenericGroupStrategy (p50) matches children without Duration/Rounds
   - Sets blockType: `"Group"`
   - Attaches: `LabelingBehavior`

4. ✓ ChildrenStrategy (p50)
   - Attaches: `ChildSelectionBehavior` (loop while `always`), `CompletedBlockPopBehavior`
   - Attaches: `UniqueFragmentPromoter` (no rep cycling)

5. ✓ SoundStrategy (p20) — no countdown, skips
6. ✓ HistoryStrategy (p20) — attaches `HistoryRecordBehavior`
7. ✓ ReportOutputStrategy (p15) — attaches `ReportOutputBehavior`

**Result**: Block that sequentially executes children, with history.

---

### Pattern 5: Simple Effort (e.g., "Push-ups")

**Input**: Statement with no `Duration`, NO `Rounds`, NO children

**Matching Strategies** (in order):
1. ✗ All logic/component strategies skip (no matching fragments)
2. ✓ EffortFallbackStrategy (p0) catches everything else
   - Sets blockType: `"effort"`
   - Attaches: `TimerInitBehavior`, `TimerTickBehavior` (countup), `LeafExitBehavior` (pop on next)

3. ✓ SoundStrategy (p20) — countup timer, attaches `SoundCueBehavior` (start beep)
4. ✓ HistoryStrategy (p20) — attaches `HistoryRecordBehavior`
5. ✓ ReportOutputStrategy (p15) — attaches `ReportOutputBehavior`

**Result**: Simple leaf block with countup timer and exit on next.

---

## Memory Layout by Behavior

Each block has named memory regions owned by behaviors:

| Memory Owner | Behaviors | Contents |
|--------------|-----------|----------|
| `time` | `TimerInitBehavior`, `TimerTickBehavior`, `TimerEndingBehavior` | `Time` fragment with direction, duration, spans |
| `round` | `ReEntryBehavior`, `ChildSelectionBehavior` | `CurrentRoundFragment` with round number and total |
| `display` | `LabelingBehavior` | `Label`, `Subtitle`, `Action`, `RoundDisplay` fragments |
| `controls` | `ButtonBehavior` | `Action`-type fragments representing UI buttons |
| `promotion` | `FragmentPromotionBehavior` | Promoted fragments from parent to child |
| `intervals` | `TimerEndingBehavior` (EMOM) | Interval state for reset-interval pattern |
| `completion` | `CompletionTimestampBehavior` | `SystemTime` timestamp when block marked complete |
| `children` | `ChildSelectionBehavior` | Child block indices and state |

---

## Event Flow

### Standard Lifecycle Events (Emitted by Runtime)

| Event | Emitted By | Listeners |
|-------|-----------|-----------|
| `mount` | Runtime | (behaviors onMount hooks) |
| `next` | Runtime | (behaviors onNext hooks) |
| `unmount` | Runtime | (behaviors onUnmount hooks) |
| `tick` | Clock system | `TimerTickBehavior`, `TimerEndingBehavior`, `SoundCueBehavior` |

### Behavior-Emitted Events

| Event | Emitted By | Listeners |
|-------|-----------|-----------|
| `timer:pause` | (User UI) | `TimerBehavior`, `TimerPauseBehavior` |
| `timer:resume` | (User UI) | `TimerBehavior`, `TimerPauseBehavior` |
| `timer:complete` | `TimerEndingBehavior` | `LeafExitBehavior` (subscriber), rest of system |
| `history:record` | `HistoryRecordBehavior` | History storage service |
| `output:segment` | `ReportOutputBehavior` | Output subscribers |
| `output:milestone` | `ReportOutputBehavior` | Output subscribers |
| `output:completion` | `ReportOutputBehavior` | Output subscribers |

---

## Key Invariants

1. **CompletionTimestampBehavior is universal**: Added to every block, records completion time.
2. **Deferred completion**: `TimerEndingBehavior` marks block complete; `CompletedBlockPopBehavior` pops on next (allows state inspection).
3. **Fragment promotion**: Inherits from parent memory after parent's `onMount`, before child's `onMount`.
4. **Bubble scope tick events**: Parent timers track even when child blocks are active.
5. **Rest injection**: Injected only if countdown timer has remaining time and `ChildSelectionBehavior` configured for it.
6. **No behavior duplication**: All strategies check presence before attaching; lower-priority strategies skip if already present.

---

## Lifecycle Execution Sequence Example: AMRAP Block

```
1. Block constructed with behaviors attached
2. block.mount()
   ├─ CompletionTimestampBehavior.onMount()     (no-op)
   ├─ TimerInitBehavior.onMount()               (create time fragment, open TimeSpan)
   ├─ TimerTickBehavior.onMount()               (subscribe to tick)
   ├─ TimerEndingBehavior.onMount()             (subscribe to tick, set completion mode)
   ├─ TimerPauseBehavior.onMount()              (subscribe to pause/resume)
   ├─ ReEntryBehavior.onMount()                 (create round fragment, round=1)
   ├─ LabelingBehavior.onMount()                (create label/subtitle displays)
   ├─ SoundCueBehavior.onMount()                (emit start-beep)
   ├─ WaitingToStartInjectorBehavior.onMount()  (if present: push waiting gate)
   ├─ ChildSelectionBehavior.onMount()          (if skipOnMount: false, dispatch first child)
   │   └─ Child block.mount() [recursive]
   ├─ FragmentPromotionBehavior.onMount()       (promote parent fragments to children, cycle reps)
   ├─ CompletedBlockPopBehavior.onMount()       (no-op)
   ├─ HistoryRecordBehavior.onMount()           (no-op)
   ├─ ReportOutputBehavior.onMount()            (emit segment output if configured)
   └─ ButtonBehavior.onMount()                  (create control buttons)

3. [clock ticks, user interacts]

4. block.next()
   ├─ CompletionTimestampBehavior.onNext()      (check for completion, maybe stamp)
   ├─ LeafExitBehavior.onNext()                 (if configured: pop block)
   ├─ CompletedBlockPopBehavior.onNext()        (if timer marked complete: pop)
   ├─ RoundsEndBehavior.onNext()                (check if rounds exhausted)
   ├─ ChildSelectionBehavior.onNext()           (dispatch next child or rewind to first)
   │   ├─ Current child.unmount() [recursive]
   │   └─ Next child.mount() [recursive]
   ├─ LabelingBehavior.onNext()                 (update round display)
   ├─ ReportOutputBehavior.onNext()             (emit milestone if round changed)
   └─ ...other behaviors (most no-op on next)

5. [when timer completes]
   ├─ TimerEndingBehavior detects elapsed >= duration
   ├─ TimerEndingBehavior marks block.isComplete = true
   ├─ TimerEndingBehavior emits timer:complete event
   ├─ ChildSelectionBehavior receives timer:complete, stops looping

6. block.next() [final]
   ├─ CompletedBlockPopBehavior.onNext()        (block.isComplete = true, so return PopBlockAction)
   └─ Runtime pops block

7. block.unmount()
   ├─ CompletionTimestampBehavior.onUnmount()   (no-op)
   ├─ TimerTickBehavior.onUnmount()             (close current TimeSpan)
   ├─ TimerEndingBehavior.onUnmount()           (no-op)
   ├─ TimerPauseBehavior.onUnmount()            (no-op)
   ├─ ReEntryBehavior.onUnmount()               (no-op)
   ├─ LabelingBehavior.onUnmount()              (no-op)
   ├─ SoundCueBehavior.onUnmount()              (emit complete-beep if configured)
   ├─ ChildSelectionBehavior.onUnmount()        (no-op)
   ├─ HistoryRecordBehavior.onUnmount()         (gather elapsed, rounds, emit history:record)
   ├─ ReportOutputBehavior.onUnmount()          (emit completion output with results)
   └─ ButtonBehavior.onUnmount()                (clear control buttons)

8. block.dispose()
   └─ [resource cleanup: close listeners, clear memory, etc.]
```

---

## Testing Behaviors

Use the test harness (`tests/harness/BehaviorTestHarness`) for unit testing individual behaviors in isolation:

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01T12:00:00Z'));

const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
harness.push(block);
harness.mount();
expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
```

For integration testing strategies and full block composition, use `RuntimeTestBuilder`.

---

## References

- [IRuntimeBehavior](src/runtime/contracts/IRuntimeBehavior.ts)
- [IRuntimeBlockStrategy](src/runtime/contracts/IRuntimeBlockStrategy.ts)
- [Behavior Index](src/runtime/behaviors/index.ts)
- [Strategy Priority Tiers](src/runtime/compiler/strategies/)
