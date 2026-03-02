# Current Implementation Analysis: What Exists Today

This document catalogs every behavior, strategy, and execution archetype in the current runtime. It serves as the baseline that any restructure must account for.

## 1. The 18 Behaviors

The current system has **18 behavior classes** in `src/runtime/behaviors/`. Each is a small unit of logic that hooks into the block lifecycle (`onMount`, `onNext`, `onUnmount`, `onDispose`).

### Core Execution Behaviors

| Behavior | Category | Purpose |
| :--- | :--- | :--- |
| `TimerBehavior` | Timer | Manages `TimeSpan[]` state (start/stop timestamps). Handles pause/resume via event subscriptions. Writes `time` memory tag. |
| `TimerEndingBehavior` | Timer | Subscribes to `tick` events. When countdown elapsed ≥ duration, fires `timer:complete` event. Two modes: `complete-block` (marks block done) or `reset-interval` (resets timer for next EMOM round). |
| `TimerInitBehavior` | Timer | Lightweight timer init — pushes a timer fragment to `time` memory. No pause/resume support. |
| `TimerPauseBehavior` | Timer | Handles `timer:pause`/`timer:resume` events — closes/opens time spans. |
| `TimerTickBehavior` | Timer | Subscribes to `tick` events (bubble scope). Closes last span on unmount. |
| `ChildSelectionBehavior` | Container | **Most complex behavior.** Compiles and pushes child blocks in sequence via JIT compiler. Manages `childIndex` cursor, loop conditions (`always`, `timer-active`, `rounds-remaining`), round advancement, rest injection, and `children:status` memory. |
| `ReEntryBehavior` | Rounds | Initializes round state (`CurrentRoundFragment`) in `round` memory. Configurable `startRound` and `totalRounds` (undefined = unbounded for AMRAP). |
| `RoundsEndBehavior` | Rounds | Safety-net: on `onNext()`, if `round.current > round.total`, marks block complete. Guards edge cases. |
| `LeafExitBehavior` | Completion | Completion behavior for leaf blocks. On `onNext()`, marks complete + returns `PopBlockAction`. Can also exit on named events (e.g., `timer:complete`). |
| `CompletedBlockPopBehavior` | Completion | Safety-net: if block is already `isComplete` when `onNext()` fires, returns `PopBlockAction`. Handles deferred timer-controlled completion (AMRAP/EMOM). |
| `CompletionTimestampBehavior` | Completion | Auto-added to every block. Records timestamp when `isComplete` flips to `true`. |

### Output & Analytics Behaviors

| Behavior | Category | Purpose |
| :--- | :--- | :--- |
| `ReportOutputBehavior` | Output | Primary analytics emitter. Emits `segment` on mount, `milestone` on round changes, `completion` on unmount. Computes elapsed/total time from spans with proportional split across fragment groups. |
| `HistoryRecordBehavior` | Output | Emits `history:record` event on unmount with execution details (elapsed, direction, completed rounds). External systems subscribe to persist workout records. |
| `SoundCueBehavior` | Output | Emits `system` outputs with `SoundFragment` at lifecycle points: mount, unmount, complete, and countdown (3-2-1 beeps). |

### UI & Display Behaviors

| Behavior | Category | Purpose |
| :--- | :--- | :--- |
| `LabelingBehavior` | Display | Writes display fragments (label, subtitle, action display, round display) to `display` memory. Supports modes: `clock`, `timer`, `countdown`, `hidden`. Updates round labels on `onNext()`. |
| `ButtonBehavior` | Display | Initializes control button state in `controls` memory. UI reads `ActionFragment`s to render buttons. |
| `FragmentPromotionBehavior` | Compilation | Promotes fragments (e.g., rep schemes 21-15-9) from parent to child blocks during JIT compilation. Maps round number to the correct rep target. |
| `WaitingToStartInjectorBehavior` | Lifecycle | On mount, creates a `WaitingToStartBlock` gate and pushes it. Used by `SessionRootBlock` to defer workout start. |

---

## 2. The 7 Execution Archetypes

Every block in the system falls into one of these patterns. They are formed by **composing behaviors** via the `BlockBuilder`'s aspect methods (`asTimer`, `asRepeater`, `asContainer`).

### Archetype 1: Gate (Pure User Input)

**Blocks:** `WaitingToStartBlock`, Idle blocks  
**Completion:** User clicks "Start" → `LeafExitBehavior.onNext()` → `PopBlockAction`  
**Timer:** None  
**Children:** None  
**Rounds:** None

**Behaviors:** `LeafExitBehavior`, `LabelingBehavior`, `ButtonBehavior`, `ReportOutputBehavior`

> A gate block does nothing until the user acts. No clock, no automation.

### Archetype 2: Timer Leaf (Auto-Completing Countdown)

**Blocks:** `RestBlock`, standalone timer statements (e.g., `1:00 Rest`)  
**Completion:** Timer expires → `TimerEndingBehavior` → `timer:complete` event → `LeafExitBehavior` pops  
**Timer:** Countdown (primary)  
**Children:** None  
**Rounds:** None  
**User can skip:** No (LeafExitBehavior configured with `onNext: false`)

**Behaviors:** `TimerBehavior(down)`, `TimerEndingBehavior(complete-block)`, `LeafExitBehavior(onEvents: ['timer:complete'])`, `SoundCueBehavior`, `LabelingBehavior`, `ReportOutputBehavior`

> The timer runs and the block auto-pops when time is up. The user cannot skip it.

### Archetype 3: Effort Leaf (User-Advance with Tracking)

**Blocks:** `EffortBlock` (e.g., `21 Burpees`)  
**Completion:** Rep target met OR user force-advances → `EffortCompletionBehavior.onNext()` → marks complete  
**Timer:** Count-up (secondary, informational only)  
**Children:** None  
**Rounds:** None  
**User can skip:** Yes

**Behaviors:** `EffortCompletionBehavior` (inner class), `TimerBehavior(up, secondary)`, `LabelingBehavior`

> The block tracks effort. The user advances when done. The secondary timer just records how long it took.

### Archetype 4: Sequential Container (Children-Driven)

**Blocks:** Group blocks, single-round containers  
**Completion:** All children executed → `ChildSelectionBehavior` → `ctx.markComplete('children-complete')`  
**Timer:** Count-up (informational)  
**Children:** Yes (sequential dispatch)  
**Rounds:** 1 (trivial)  
**User can skip:** Via "Next" button on children

**Behaviors:** `ChildSelectionBehavior(loop: false)`, `TimerBehavior(up)`, `ReEntryBehavior(totalRounds: 1)`, `RoundsEndBehavior`, `ReportOutputBehavior`, `LabelingBehavior`

> Children are compiled and pushed one at a time. When the last child pops, the container pops.

### Archetype 5: Round-Looping Container (N Rounds × Children)

**Blocks:** `3 Rounds:` blocks  
**Completion:** All rounds × all children exhausted → `ChildSelectionBehavior.shouldLoop() = false` → complete  
**Timer:** Count-up (informational)  
**Children:** Yes (reset cursor each round)  
**Rounds:** N (fixed)  
**Loop condition:** `rounds-remaining`

**Behaviors:** `ChildSelectionBehavior(loop: { condition: 'rounds-remaining' })`, `TimerBehavior(up)`, `ReEntryBehavior(totalRounds: N)`, `RoundsEndBehavior`, `FragmentPromotionBehavior`, `ReportOutputBehavior`, `LabelingBehavior`

> After all children execute, the cursor resets, the round counter advances, and children run again. Optionally injects rest between rounds.

### Archetype 6: AMRAP (Timer-Terminated Unbounded Loop)

**Blocks:** `10:00 AMRAP:` blocks  
**Completion:** Timer expires → `TimerEndingBehavior(complete-block)` → clears children → marks complete  
**Timer:** Countdown (primary, drives completion)  
**Children:** Yes (loop while timer active)  
**Rounds:** Unbounded (no total)  
**Loop condition:** `timer-active`

**Behaviors:** `TimerBehavior(down)`, `TimerEndingBehavior(complete-block)`, `ReEntryBehavior(totalRounds: undefined)`, `ChildSelectionBehavior(loop: { condition: 'timer-active' })`, `SoundCueBehavior`, `LabelingBehavior`, `ReportOutputBehavior`

> The timer is king. Children loop as many times as possible until the clock runs out. Round count is tracked but doesn't control completion.

### Archetype 7: EMOM (Interval-Reset Fixed Rounds)

**Blocks:** `10 × 1:00 EMOM:` blocks  
**Completion:** All rounds exhausted → `RoundsEndBehavior` → marks complete  
**Timer:** Countdown per interval (resets each round)  
**Children:** Yes (reset each interval)  
**Rounds:** Fixed N  
**Loop condition:** `rounds-remaining`

**Behaviors:** `TimerBehavior(down, intervalMs)`, `TimerEndingBehavior(reset-interval)`, `ReEntryBehavior(totalRounds: N)`, `RoundsEndBehavior`, `ChildSelectionBehavior(loop: { condition: 'rounds-remaining' })`, `SoundCueBehavior`, `LabelingBehavior`, `ReportOutputBehavior`

> Each round has a fixed time window. When the interval timer fires, children are cleared, the cursor resets, and the next round begins. Block completes when all rounds are done.

---

## 3. The Composition Primitives

The `BlockBuilder` provides three orthogonal aspect composers. This is how the 7 archetypes are constructed without subclassing.

### `asTimer(config)` — Time Aspect

Adds:
- `TimerBehavior` — Core timer state (direction, duration, spans)
- `TimerEndingBehavior` — Completion policy: `complete-block` vs `reset-interval`

### `asRepeater(config)` — Iteration Aspect

Adds:
- `ReEntryBehavior` — Round initialization (current/total)
- `RoundsEndBehavior` — Safety-net completion on round exhaustion

### `asContainer(config)` — Children Aspect

Adds:
- `ChildSelectionBehavior` — Child dispatch, looping, rest injection

### Composition Matrix

| Archetype | asTimer | asRepeater | asContainer |
| :--- | :---: | :---: | :---: |
| Gate | — | — | — |
| Timer Leaf | ✓ (down) | — | — |
| Effort Leaf | ✓ (up, secondary) | — | — |
| Sequential Container | ✓ (up) | ✓ (1 round) | ✓ (no loop) |
| Round-Loop Container | ✓ (up) | ✓ (N rounds) | ✓ (rounds-remaining) |
| AMRAP | ✓ (down, completes) | ✓ (unbounded) | ✓ (timer-active) |
| EMOM | ✓ (down, resets) | ✓ (N rounds) | ✓ (rounds-remaining) |

---

## 4. Systems Not Covered in the Restructure Plan

The following capabilities exist in the current implementation but are **not addressed** (or only superficially mentioned) in the proposed Fragment-Centric architecture documents:

### 4.1 Event System

Many behaviors use event subscriptions:
- `timer:pause` / `timer:resume` — Pause/resume timer spans
- `timer:complete` — Timer expiry signal
- `tick` (with `bubble` scope) — Clock tick for countdown tracking
- `next` — User advance signal
- `history:record` — Workout persistence

The restructure plan's "Processors" are described as running `onTick()` and `onNext()`, but the full event taxonomy and subscription model (scoped events, bubble-up) is not addressed.

### 4.2 Action Queue & Execution Context

The current system uses a **work-list of actions** (`PushBlockAction`, `PopBlockAction`, `NextAction`, `ClearChildrenAction`, `CompileAndPushBlockAction`) processed within a frozen-clock `ExecutionContext`. This ensures deterministic execution within a single turn.

The restructure plan's "Execution Loop" (iterate processors, call `onTick`) is a simplification that doesn't account for the action queue, multi-step cascading (child pop → parent next → compile next child → push), or time-frozen turns.

### 4.3 Timer Lifecycle Complexity

The plan proposes a single `TimerProcessor` but the current implementation has **5 timer behaviors**:
- `TimerBehavior` — Core state + pause/resume
- `TimerEndingBehavior` — Two completion modes
- `TimerInitBehavior` — Lightweight init
- `TimerPauseBehavior` — Pause/resume handler
- `TimerTickBehavior` — Tick subscriber + span closure

These handle distinct concerns: state management, completion policy, pause/resume, and tick processing. A single `TimerProcessor` must absorb all of these responsibilities or they need to be split.

### 4.4 Child Dispatch & JIT Compilation

`ChildSelectionBehavior` is the most complex behavior (~300 lines). It handles:
- Sequential child group iteration via a cursor
- Three loop conditions: `always`, `timer-active`, `rounds-remaining`
- JIT compilation of children via `CompileAndPushBlockAction`
- Rest block injection between loop iterations
- Round advancement (incrementing `round.current`)
- Child status tracking in `children:status` memory

The plan mentions a `RoundProcessor` but doesn't discuss child compilation, loop conditions, rest injection, or the cursor-based dispatch model.

### 4.5 Completion & Safety Nets

Multiple behaviors cooperate to handle completion correctly:
- `LeafExitBehavior` — Standard pop on next
- `CompletedBlockPopBehavior` — Deferred pop for already-complete blocks
- `RoundsEndBehavior` — Safety net for round exhaustion
- `CompletionTimestampBehavior` — Records completion time

Edge cases (AMRAP timer fires while child is mid-execution, double-pop prevention, deferred completion) require careful handling that the restructure plan doesn't address.

### 4.6 Sound Cues

`SoundCueBehavior` emits audio signals at lifecycle points. Configurable triggers: `mount`, `unmount`, `complete`, `countdown`. Countdown beeps (3-2-1) require tick subscription with bubble scope. Not mentioned in the restructure plan.

### 4.7 History Recording

`HistoryRecordBehavior` emits `history:record` events on unmount for workout persistence. External systems subscribe. Not mentioned in the restructure plan.

### 4.8 Button/Controls

`ButtonBehavior` manages UI action buttons (Start, Next, Pause). Writes `ActionFragment`s to `controls` memory. Not mentioned in the restructure plan.

### 4.9 Display/Labeling

`LabelingBehavior` manages multiple display modes (`clock`, `timer`, `countdown`, `hidden`) and writes to `display` memory. Updates round labels dynamically. The plan's "Fragment Renderer" concept partially addresses this but doesn't cover display mode logic.

### 4.10 Observable Memory

The current `MemoryLocation` system is **observable** — UI components subscribe to memory changes and re-render reactively. The plan's "flat fragment list" doesn't specify a reactivity mechanism.

### 4.11 Fragment Promotion (Parent → Child Inheritance)

`FragmentPromotionBehavior` promotes fragments from parent to child during JIT compilation — crucially for rep schemes (21-15-9 where round 1 gets 21, round 2 gets 15, etc.). This is partially mentioned but the round-indexed promotion logic is not detailed.

### 4.12 Waiting-to-Start Gate

`WaitingToStartInjectorBehavior` injects an idle gate block before workout execution begins. This session-level lifecycle step is not addressed.
