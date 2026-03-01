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

| Member | Purpose |
|--------|---------|
| `priority: number` | Execution order. Higher = runs first. |
| `match(statements, runtime): boolean` | Whether this strategy applies |
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
- **Strategies**: None (injected by `BlockBuilder` infrastructure)

---

### 2. Time Aspect

The timer aspect is covered by **three single-responsibility behaviors**. Strategies assign exactly one rather than composing the old four-piece quartet (`TimerInitBehavior`, `TimerTickBehavior`, `TimerEndingBehavior`, `TimerPauseBehavior`).

#### `SpanTrackingBehavior`
- **Lifecycle**: `onMount`, `onUnmount`
- **Core Function**: Records wall-clock time a block was active. Opens a `TimeSpan` on mount and closes it on unmount. No tick subscription, no pause/resume, no completion signal. Used when elapsed time is needed only for history/reporting, not for a displayed running timer.
- **Memory Created**: `time` → `TimerState` with `role: 'hidden'`

#### `CountupTimerBehavior`
- **Lifecycle**: `onMount`, `onUnmount`, `onDispose`
- **Core Function**: Full lifecycle for count-up (open-ended) timers. Opens a `TimeSpan` on mount. Handles `timer:pause` / `timer:resume` events by closing and reopening spans. Closes the current span on unmount to finalise elapsed time. No completion signal — the block advances only when the user calls `next()`.
- **Memory Created**: `time` → `TimerState` with `direction: 'up'`
- **Events Subscribed**: `timer:pause`, `timer:resume`
- **Configuration**: `CountupTimerConfig` — `label?`, `role?`

#### `CountdownTimerBehavior`
- **Lifecycle**: `onMount`, `onUnmount`, `onDispose`
- **Core Function**: Full lifecycle for count-down timers. Opens a `TimeSpan` on mount and checks for immediate expiry. Subscribes to `tick` events to monitor elapsed time; fires `timer:complete` and handles expiry when `elapsed >= durationMs`. Handles pause/resume. Closes the span on unmount.
- **Memory Created**: `time` → `TimerState` with `direction: 'down'`
- **Events Subscribed**: `tick`, `timer:pause`, `timer:resume`
- **Events Emitted**: `timer:complete` (on expiry)
- **Configuration**: `CountdownTimerConfig`:
  - `durationMs: number` — required countdown duration
  - `mode?: CountdownMode` — `'complete-block'` (default, AMRAP) or `'reset-interval'` (EMOM)
  - `label?`, `role?`, `restBlockFactory?`

> **`CountdownMode`**
> - `complete-block` — marks the block `isComplete` and clears children. Use when the timer owns the block's lifecycle (AMRAP cap, timed effort).
> - `reset-interval` — resets spans and children state for the next round. Use for repeating-interval timers where the block lives across many rounds (EMOM).

#### Applied via `builder.asTimer(config)` with parameters:
- `direction`: `'up'` or `'down'`
- `durationMs`: milliseconds (required for countdown)
- `label`, `role`
- `addCompletion: boolean` — whether to include `TimerEndingBehavior` (legacy path; now mode-specific)
- `completionConfig?: { completesBlock: boolean }`

### Which Strategies Apply Timer Behaviors

| Strategy                   | Priority | Fragment Match                            | Timer Behavior                                       |     |
| -------------------------- | -------- | ----------------------------------------- | ---------------------------------------------------- | --- |
| **GenericTimerStrategy**   | p50      | `Duration` fragment                       | `CountdownTimerBehavior({ mode: 'complete-block' })` |     |
| **AmrapLogicStrategy**     | p90      | `Duration` + (`Rounds` \| action="amrap") | `CountdownTimerBehavior({ mode: 'complete-block' })` |     |
| **IntervalLogicStrategy**  | p90      | `Duration` + EMOM pattern                 | `CountdownTimerBehavior({ mode: 'reset-interval' })` |     |
| **WorkoutRootStrategy**    | p100     | Root block (direct-build)                 | `CountupTimerBehavior`                               |     |
| **SessionRootBlock**       | p100     | Session root (direct-build)               | `CountupTimerBehavior`                               |     |
| **EffortFallbackStrategy** | p0       | No Duration/Rounds/children               | `CountupTimerBehavior` (no completion)               |     |
| **RestBlock**              | p100     | Rest block (direct-build)                 | `CountdownTimerBehavior` internally                  |     |

---

### 3. Iteration Aspect

Round tracking and loop management live inside `ChildSelectionBehavior`. The old two-behavior pair (`ReEntryBehavior` + `RoundsEndBehavior`) is deprecated and their responsibilities are now absorbed.

#### `ChildSelectionBehavior` (round init + dispatch)
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Manages sequential dispatch of child blocks from `childGroups`. Optionally initializes round state on mount (replacing `ReEntryBehavior`) and checks for round overflow on next (replacing `RoundsEndBehavior`). Supports loop conditions and rest injection between iterations.
- **Configuration** (`ChildSelectionConfig`):
  - `childGroups: number[][]` — groups of statement IDs to compile and dispatch
  - `loop?: boolean | { condition?: ChildSelectionLoopCondition }` — loop condition: `'always'`, `'timer-active'`, or `'rounds-remaining'`
  - `injectRest?: boolean` — inject rest blocks between iterations when countdown time remains
  - `skipOnMount?: boolean` — defer first child dispatch (e.g. for waiting-to-start gates)
  - `startRound?: number` — if set, writes `CurrentRoundFragment` on mount *(absorbs ReEntryBehavior)*
  - `totalRounds?: number` — if set alongside `startRound`, overflow-guards on next *(absorbs RoundsEndBehavior)*
- **Memory Created**: `round` → `CurrentRoundFragment` (when `startRound` is configured), `children:status`
- **Round advancement**: `advanceRound()` increments the round counter and resets the child index on loop wrap

#### `FragmentPromotionBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Promotes (inherits) fragment values from parent block memory into child statements before they are compiled. Supports rep-scheme cycling (e.g., 21-15-9) keyed on current round.
- **Implements**: `IRepSource`, `IFragmentPromoter`
- **Memory Accessed**: Parent `round` memory; child fragment targets

#### ~~`ReEntryBehavior`~~ *(deprecated)*
Round state initialization is now handled by `ChildSelectionBehavior` via `startRound`/`totalRounds` config fields. `ReEntryBehavior` still exists for backward compatibility but should not be used in new code.

#### ~~`RoundsEndBehavior`~~ *(deprecated)*
The overflow safety net is now built into `ChildSelectionBehavior.onNext()`. `RoundsEndBehavior` still exists for backward compatibility.

#### Applied via `builder.asRepeater(config)` + `builder.asContainer(config)`:

`asRepeater()` stores the round config as `pendingRoundConfig` on the builder — it does **not** add any behaviors directly. `asContainer()` then reads `pendingRoundConfig` and injects `startRound` / `totalRounds` into `ChildSelectionBehavior`. Therefore **`asRepeater()` must always be called before `asContainer()`** in strategy code.

### Which Strategies Apply Iteration Behaviors

| Strategy | Priority | Fragment Match | Round Config on ChildSelectionBehavior |
|----------|----------|---------------|---------------------------------------|
| **GenericLoopStrategy** | p50 | `Rounds` fragment | `startRound: 1, totalRounds: N` |
| **AmrapLogicStrategy** | p90 | `Duration` + (Rounds \| amrap action) | `startRound: 1, totalRounds: undefined` (unbounded) |
| **IntervalLogicStrategy** | p90 | `Duration` + EMOM pattern | `startRound: 1, totalRounds: N` |
| **ChildrenStrategy** | p50 | Statement has children | Reads `hasRoundConfig()` to set loop condition |
| **WorkoutRootStrategy** | p100 | Root block | `startRound: 1, totalRounds: N` when `totalRounds > 1` |
| **SessionRootBlock** | p100 | Session root (direct-build) | `startRound: 1, totalRounds` always set |

---

### 4. Completion Aspect

Block exit and pop are handled by **one unified behavior** replacing the old two-behavior pair.

#### `ExitBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Unified block-exit behavior supporting two modes:
  - **`mode: 'immediate'`** — pops as soon as a trigger fires. Replaces `LeafExitBehavior`. Used for leaf blocks (timers, efforts) that exit as soon as their trigger fires.
    - `onNext?: boolean` (default `true`) — pop when `next()` is called
    - `onEvents?: string[]` (default `[]`) — pop when any listed event fires (e.g. `'timer:complete'`)
  - **`mode: 'deferred'`** — pops only when `block.isComplete` is already `true` on the next `next()` call. Replaces `CompletedBlockPopBehavior`. Used for container blocks where a timer or event marks completion externally and the block should wait for in-flight children.
- **Configuration**: `ExitConfig` — `mode`, `onNext?`, `onEvents?`

#### ~~`LeafExitBehavior`~~ *(deprecated)*
Replaced by `ExitBehavior({ mode: 'immediate' })`. Still exists for backward compatibility.

#### ~~`CompletedBlockPopBehavior`~~ *(deprecated)*
Replaced by `ExitBehavior({ mode: 'deferred' })`. Still exists for backward compatibility.

### Which Strategies Apply Completion Behaviors

| Strategy | Priority | Fragment Match | Exit Config |
|----------|----------|---------------|-------------|
| **GenericTimerStrategy** | p50 | `Duration` fragment | `ExitBehavior({ mode: 'immediate', onNext: true, onEvents: ['timer:complete'] })` |
| **EffortFallbackStrategy** | p0 | No Duration/Rounds/children | `ExitBehavior({ mode: 'immediate', onNext: true })` |
| **IdleBlockStrategy** | p100 | Idle block | `ExitBehavior({ mode: 'immediate', onNext: true })` |
| **WaitingToStartBlock** | direct | Waiting gate | `ExitBehavior({ mode: 'immediate', onNext: true })` |
| **RestBlock** | direct | Rest block | `ExitBehavior({ mode: 'immediate', onNext: false, onEvents: ['timer:complete'] })` |
| **ChildrenStrategy** | p50 | Statement has children | `ExitBehavior({ mode: 'deferred' })` — removes any immediate ExitBehavior |

---

### 5. Children Aspect

See **Iteration Aspect** above — `ChildSelectionBehavior` is both the child dispatcher and the round-state owner.

#### Applied via `builder.asContainer(config)`:
- `childGroups: number[][]` — statement groups to dispatch
- `addLoop: boolean` — enable looping
- `loopConfig?: { condition: ChildSelectionLoopCondition }` — loop type

### Which Strategies Apply Children Behaviors

| Strategy                | Priority | Fragment Match                            | Container Config                                                     |
| ----------------------- | -------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **ChildrenStrategy**    | p50      | First statement has `children.length > 0` | Loop if countdown or `hasRoundConfig()`; rest injection if countdown |
| **WorkoutRootStrategy** | p100     | Root block                                | No-loop container                                                    |
| **SessionRootBlock**    | p100     | Session root                              | Loop with `rounds-remaining` condition                               |

---

### 6. Display Aspect

#### `LabelingBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onDispose`
- **Core Function**: Creates display text fragments (label, subtitle, action, round display) in `display` memory on mount; dynamically updates round label on `next()` when round state changes.
- **Memory Created**: Display fragments in `display` memory

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

### 7. Output Aspect

#### `ReportOutputBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Emits structured output events: `output:segment` on mount, `output:milestone` on round changes, `output:completion` on unmount with computed time results.
- **Events Emitted**: `output:segment`, `output:milestone`, `output:completion`

#### `HistoryRecordBehavior`
- **Lifecycle**: `onUnmount`, `onDispose`
- **Core Function**: On unmount, gathers elapsed time, timer direction/duration, and completed rounds; emits `history:record` for persistence.
- **Events Emitted**: `history:record`

#### `SoundCueBehavior`
- **Lifecycle**: `onMount`, `onNext`, `onUnmount`, `onDispose`
- **Core Function**: Emits `system:output` sound cues at lifecycle points and subscribes to `tick` events for countdown thresholds (3-2-1 beeps).
- **Cue Types**: `start-beep`, `countdown-beep`, `timer-complete`, `interval-complete`, `interval-start`
- **Events Subscribed**: `tick`

### Which Strategies Apply Output Behaviors

| Strategy | Priority | Fragment Match | Outputs Applied |
|----------|----------|---------------|-----------------|
| **ReportOutputStrategy** | p15 | Universal | `ReportOutputBehavior` |
| **HistoryStrategy** | p20 | Universal | `HistoryRecordBehavior` |
| **SoundStrategy** | p20 | Universal | `SoundCueBehavior` |
| **AmrapLogicStrategy** | p90 | AMRAP | `SoundCueBehavior` (start + countdown + complete) |
| **IntervalLogicStrategy** | p90 | EMOM | `SoundCueBehavior` (start + countdown + interval-complete) |
| **WorkoutRootStrategy** | p100 | Root block | `HistoryRecordBehavior` |

---

### 8. Controls Aspect

#### `ButtonBehavior`
- **Lifecycle**: `onMount`, `onUnmount`, `onDispose`
- **Core Function**: Pushes `Action`-type fragments to `controls` memory on mount and clears them on unmount. Static method `updateButton(block, id, updates)` allows dynamic state changes.
- **Memory Created**: Control fragments in `controls` memory

### Which Strategies Apply Controls

| Strategy | Priority | Fragment Match | Buttons |
|----------|----------|---------------|---------|
| **WorkoutRootStrategy** | p100 | Root block | Pause / Next / Stop |
| **IdleBlockStrategy** | p100 | Idle block | Optional configured button |

---

### 9. Lifecycle Gating

#### `WaitingToStartInjectorBehavior`
- **Lifecycle**: `onMount`, `onDispose`
- **Core Function**: On mount, pushes a `WaitingToStartBlock` onto the stack as an idle gate before workout execution begins. The parent's `ChildSelectionBehavior` should be configured with `skipOnMount: true` to defer child dispatch until the gate is dismissed.

### Which Strategies Apply Lifecycle Gating

| Strategy | Priority | Fragment Match |
|----------|----------|---------------|
| **SessionRootBlock** | p100 | Direct-build only |

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
  └─ IntervalLogicStrategy (EMOM: countdown + fixed rounds, reset-interval)

Priority p50   Components (fill in timer/group/loop if not already set)
  ├─ GenericTimerStrategy (any Duration fragment)
  ├─ GenericGroupStrategy (children without Duration/Rounds)
  ├─ GenericLoopStrategy (any Rounds fragment)
  ├─ ChildrenStrategy (first statement has children)
  └─ RestBlockStrategy (direct-build only)

Priority p20   Enhancements (cross-cutting concerns)
  ├─ SoundStrategy (universal: add sound cues)
  └─ HistoryStrategy (universal: add history recording)

Priority p15   Enhancement Final Pass
  └─ ReportOutputStrategy (universal: add output reporting)

Priority p0    Fallback (catch-all for simple efforts)
  └─ EffortFallbackStrategy (no Duration/Rounds/children)
```

### Behavior Deduplication

Strategies check `builder.hasBehavior(Type)` before attaching. If a behavior is already present, the strategy skips it. This ensures composability without duplication:

- `CountdownTimerBehavior` / `CountupTimerBehavior` prevent re-attachment in lower-priority strategies.
- `ChildSelectionBehavior` prevents duplicate child dispatch setup.
- `SoundCueBehavior` prevents duplicate sound cue handlers.

When `ChildrenStrategy` runs it **removes** any `ExitBehavior` in `immediate` mode that a lower-priority component strategy added, replacing it with `ExitBehavior({ mode: 'deferred' })` — because the container block's exit is now controlled by its completion state, not a direct next/event trigger.

### `BlockBuilder` Composer Methods

| Method | Effect |
|--------|--------|
| `asTimer(config)` | Adds `CountdownTimerBehavior` or `CountupTimerBehavior` + optional `TimerEndingBehavior` |
| `asRepeater(config)` | **Stores** `RepeaterConfig` as `pendingRoundConfig` — adds no behaviors directly |
| `asContainer(config)` | Adds `ChildSelectionBehavior`, injecting `startRound`/`totalRounds` from `pendingRoundConfig` if set |
| `hasRoundConfig()` | Returns `true` if `asRepeater()` was already called (used by strategies to conditionally set loop conditions) |

---

## Common Composition Patterns

### Pattern 1: Simple Timed Block (e.g., "10:00 Run")

**Input**: Statement with `Duration` fragment (10 minutes)

**Matching Strategies** (in order):
1. ✓ **GenericTimerStrategy** (p50) matches `Duration` fragment
   - Sets blockType: `"Timer"`
   - Attaches: `CountdownTimerBehavior({ mode: 'complete-block' })`, `ExitBehavior({ mode: 'immediate', onNext: true, onEvents: ['timer:complete'] })`, `LabelingBehavior`, `SoundCueBehavior`
2. ✓ **SoundStrategy** (p20) — already has `SoundCueBehavior`, skips
3. ✓ **HistoryStrategy** (p20) — attaches `HistoryRecordBehavior`
4. ✓ **ReportOutputStrategy** (p15) — attaches `ReportOutputBehavior`

**Result**: Countdown block that pops on timer expiry, with sound cues, history, and output.

---

### Pattern 2: AMRAP Block (e.g., "10:00 AMRAP 5 reps KB Swing")

**Input**: Statement with `Duration` (10 min) + children (reps) + `Effort` action="amrap"

**Matching Strategies** (in order):
1. ✓ **AmrapLogicStrategy** (p90) matches `Duration` + amrap action
   - Sets blockType: `"AMRAP"`
   - Calls `builder.asTimer({ direction: 'down', mode: 'complete-block' })` → `CountdownTimerBehavior`
   - Calls `builder.asRepeater({ totalRounds: undefined, startRound: 1 })` → stores `pendingRoundConfig`
   - Attaches: `LabelingBehavior`, `SoundCueBehavior`
2. ✗ **GenericTimerStrategy** (p50) — blockType already set, skips
3. ✓ **ChildrenStrategy** (p50) — statement has children
   - Detects `builder.hasRoundConfig()` → sets loop condition `'timer-active'`
   - Calls `builder.asContainer({ childGroups, addLoop: true, loopConfig: { condition: 'timer-active' } })` → `ChildSelectionBehavior({ ..., startRound: 1, totalRounds: undefined, loop: { condition: 'timer-active' } })`
   - Replaces any immediate `ExitBehavior` with `ExitBehavior({ mode: 'deferred' })`
   - Attaches: `FragmentPromotionBehavior`
4. ✓ **SoundStrategy** (p20) — already has `SoundCueBehavior`, skips
5. ✓ **HistoryStrategy** (p20) — attaches `HistoryRecordBehavior`
6. ✓ **ReportOutputStrategy** (p15) — attaches `ReportOutputBehavior`

**Result**: Countdown block with `ChildSelectionBehavior` looping children until timer expires. No separate `ReEntryBehavior` or `CompletedBlockPopBehavior` needed.

---

### Pattern 3: Rounds Block (e.g., "3 rounds: 5 KB Swings, 10 Box Jumps")

**Input**: Statement with `Rounds` fragment (3 rounds) + children

**Matching Strategies** (in order):
1. ✓ **GenericLoopStrategy** (p50) matches `Rounds` fragment
   - Sets blockType: `"Rounds"`
   - Calls `builder.asRepeater({ totalRounds: 3, startRound: 1 })` → stores `pendingRoundConfig`
   - Attaches: `LabelingBehavior`, `FragmentPromotionBehavior` (cycle reps by round)
2. ✓ **ChildrenStrategy** (p50) — statement has children
   - Detects `builder.hasRoundConfig()` → sets loop condition `'rounds-remaining'`
   - Calls `builder.asContainer(...)` → `ChildSelectionBehavior({ startRound: 1, totalRounds: 3, loop: { condition: 'rounds-remaining' } })`
   - Attaches: `ExitBehavior({ mode: 'deferred' })`
3. ✓ **HistoryStrategy** (p20) — attaches `HistoryRecordBehavior`
4. ✓ **ReportOutputStrategy** (p15) — attaches `ReportOutputBehavior`

**Result**: Block that loops children 3 times; round state lives inside `ChildSelectionBehavior`.

---

### Pattern 4: Simple Group (e.g., "Warm up: Row, Push-ups")

**Input**: Statement with children, NO `Duration`, NO `Rounds`

**Matching Strategies** (in order):
1. ✓ **GenericGroupStrategy** (p50) — children without Duration/Rounds
   - Sets blockType: `"Group"`, attaches `LabelingBehavior`
2. ✓ **ChildrenStrategy** (p50) — no `hasRoundConfig()`, no countdown
   - Sets loop condition `'always'`
   - `ChildSelectionBehavior({ loop: { condition: 'always' } })` (no round config)
   - Attaches: `ExitBehavior({ mode: 'deferred' })`
3. ✓ **HistoryStrategy** (p20) — attaches `HistoryRecordBehavior`
4. ✓ **ReportOutputStrategy** (p15) — attaches `ReportOutputBehavior`

**Result**: Block that sequentially executes children once (no round tracking).

---

### Pattern 5: Simple Effort (e.g., "Push-ups")

**Input**: Statement with no `Duration`, no `Rounds`, no children

**Matching Strategies** (in order):
1. ✗ All logic/component strategies skip
2. ✓ **EffortFallbackStrategy** (p0)
   - Sets blockType: `"effort"`
   - Attaches: `CountupTimerBehavior`, `ExitBehavior({ mode: 'immediate', onNext: true })`
3. ✓ **SoundStrategy** (p20) — attaches `SoundCueBehavior` (start beep)
4. ✓ **HistoryStrategy** (p20) — attaches `HistoryRecordBehavior`
5. ✓ **ReportOutputStrategy** (p15) — attaches `ReportOutputBehavior`

**Result**: Leaf block with countup timer that pops on next.

---

## Memory Layout by Behavior

| Memory Key | Written By | Contents |
|------------|-----------|----------|
| `time` | `SpanTrackingBehavior`, `CountupTimerBehavior`, `CountdownTimerBehavior` | `TimerState` — direction, durationMs, spans |
| `round` | `ChildSelectionBehavior` (when `startRound` set) | `CurrentRoundFragment` — current and total rounds |
| `display` | `LabelingBehavior` | Label, Subtitle, Action, RoundDisplay fragments |
| `controls` | `ButtonBehavior` | Action-type fragments (UI buttons) |
| `children:status` | `ChildSelectionBehavior` | Child index and completion state |
| `completion` | `CompletionTimestampBehavior` | `SystemTime` timestamp when `isComplete` first set |

---

## Event Flow

### Standard Lifecycle Events (Emitted by Runtime)

| Event | Emitted By | Listeners |
|-------|-----------|-----------|
| `tick` | Clock system | `CountdownTimerBehavior`, `SoundCueBehavior` |
| `timer:pause` | User UI | `CountupTimerBehavior`, `CountdownTimerBehavior` |
| `timer:resume` | User UI | `CountupTimerBehavior`, `CountdownTimerBehavior` |

### Behavior-Emitted Events

| Event | Emitted By | Listeners |
|-------|-----------|-----------|
| `timer:complete` | `CountdownTimerBehavior` | `ExitBehavior` (immediate mode, if configured) |
| `history:record` | `HistoryRecordBehavior` | History storage service |
| `output:segment` | `ReportOutputBehavior` | Output subscribers |
| `output:milestone` | `ReportOutputBehavior` | Output subscribers |
| `output:completion` | `ReportOutputBehavior` | Output subscribers |

---

## Key Invariants

1. **`CompletionTimestampBehavior` is universal** — added to every block; records when `isComplete` first becomes true.
2. **Timer behaviors are mutually exclusive** — a block gets exactly one of `SpanTrackingBehavior`, `CountupTimerBehavior`, or `CountdownTimerBehavior`.
3. **Round state lives in `ChildSelectionBehavior`** — `asRepeater()` stores config that `asContainer()` injects; no separate init or safety-net behaviors.
4. **Exit is always `ExitBehavior`** — leaf blocks use `mode: 'immediate'`, containers use `mode: 'deferred'`; `ChildrenStrategy` swaps the mode when converting a leaf to a container.
5. **`asRepeater()` before `asContainer()`** — `asRepeater()` stores `pendingRoundConfig`; `asContainer()` consumes it. Calling them out of order loses the round config.
6. **Fragment promotion** — `FragmentPromotionBehavior` inherits from parent memory after parent's `onMount`, before child's `onMount`.
7. **Bubble scope tick events** — parent countdown timers continue tracking even when child blocks are active.
8. **No behavior duplication** — strategies check `hasBehavior()` before attaching; lower-priority strategies skip if already present.

---

## Lifecycle Execution Sequence Example: AMRAP Block

```
1. Block constructed with behaviors attached via AmrapLogicStrategy + ChildrenStrategy

2. block.mount()
   ├─ CompletionTimestampBehavior.onMount()      (no-op)
   ├─ CountdownTimerBehavior.onMount()           (create 'time' fragment, open TimeSpan, subscribe tick/pause/resume)
   ├─ ChildSelectionBehavior.onMount()
   │   ├─ write CurrentRoundFragment (round=1, total=undefined) → 'round' memory
   │   └─ dispatch first child → compile + PushBlockAction
   │       └─ Child block.mount() [recursive]
   ├─ LabelingBehavior.onMount()                 (create label/subtitle displays)
   ├─ SoundCueBehavior.onMount()                 (emit start-beep, subscribe tick for countdown)
   ├─ ExitBehavior.onMount()                     (deferred mode: no-op)
   ├─ FragmentPromotionBehavior.onMount()        (promote parent fragments into child statement)
   ├─ HistoryRecordBehavior.onMount()            (no-op)
   └─ ReportOutputBehavior.onMount()             (emit segment output if configured)

3. [clock ticks, children execute and pop]

4. block.next()  [child completed, dispatch next]
   ├─ CompletionTimestampBehavior.onNext()       (block not complete, no-op)
   ├─ ExitBehavior.onNext()                      (deferred: block.isComplete = false, no-op)
   ├─ ChildSelectionBehavior.onNext()
   │   ├─ childIndex < totalChildren → dispatch next child
   │   ├─ childIndex >= totalChildren → shouldLoop? timer-active check
   │   │   ├─ true  → advanceRound(), reset childIndex, dispatch first child again
   │   │   └─ false → markComplete('children-complete')
   ├─ LabelingBehavior.onNext()                  (update round display if round changed)
   └─ ReportOutputBehavior.onNext()              (emit milestone if round advanced)

5. [CountdownTimerBehavior tick fires, elapsed >= durationMs]
   ├─ CountdownTimerBehavior calls ctx.markComplete('timer:complete')
   ├─ CountdownTimerBehavior emits 'timer:complete' event
   └─ CountdownTimerBehavior clears children (ClearChildrenAction)

6. block.next()  [final — after timer expiry]
   ├─ ExitBehavior.onNext()                      (deferred: block.isComplete = true → PopBlockAction)
   └─ Runtime pops block

7. block.unmount()
   ├─ CountdownTimerBehavior.onUnmount()         (close current TimeSpan, unsubscribe)
   ├─ LabelingBehavior.onUnmount()               (no-op)
   ├─ SoundCueBehavior.onUnmount()               (emit complete-beep)
   ├─ ChildSelectionBehavior.onUnmount()         (no-op)
   ├─ ExitBehavior.onUnmount()                   (no-op)
   ├─ HistoryRecordBehavior.onUnmount()          (emit history:record)
   └─ ReportOutputBehavior.onUnmount()           (emit completion output with time results)

8. block.dispose()
   └─ [resource cleanup: unsubscribe listeners, clear memory refs]
```

---

## Testing Behaviors

Use `BehaviorTestHarness` for unit testing individual behaviors in isolation:

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { CountupTimerBehavior } from '@/runtime/behaviors';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01T12:00:00Z'));

const block = new MockBlock('test-timer', [new CountupTimerBehavior()]);
harness.push(block);
harness.mount();
harness.advanceClock(5000);
// elapsed is tracked internally via time spans
```

For integration testing strategies and full block composition, use `RuntimeTestBuilder`:

```typescript
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { ChildSelectionBehavior } from '@/runtime/behaviors';

const harness = new RuntimeTestBuilder()
  .withScript('10:00 AMRAP')
  .withStrategy(new AmrapLogicStrategy())
  .build();

const block = harness.pushStatement(0);
const csb = block.getBehavior(ChildSelectionBehavior);
expect(csb).toBeDefined();
expect((csb as any).config?.startRound).toBe(1);
expect((csb as any).config?.totalRounds).toBeUndefined(); // unbounded
```

---

## References

- [IRuntimeBehavior](src/runtime/contracts/IRuntimeBehavior.ts)
- [IRuntimeBlockStrategy](src/runtime/contracts/IRuntimeBlockStrategy.ts)
- [Behavior Index](src/runtime/behaviors/index.ts)
- [BlockBuilder](src/runtime/compiler/BlockBuilder.ts)
- [ChildSelectionBehavior](src/runtime/behaviors/ChildSelectionBehavior.ts)
- [ExitBehavior](src/runtime/behaviors/ExitBehavior.ts)
- [CountdownTimerBehavior](src/runtime/behaviors/CountdownTimerBehavior.ts)
- [CountupTimerBehavior](src/runtime/behaviors/CountupTimerBehavior.ts)
- [Strategy Priority Tiers](src/runtime/compiler/strategies/)
