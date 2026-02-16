# Behavior Proposed Structure

> **Goal:** Delete all current behaviors and rebuild from scratch, aligned to clearly separated **aspects**. Each aspect owns a single concern and composes cleanly. Strategies wire aspects together — no behavior needs to know about another behavior's internals.

---

## Current State (27 behaviors — DELETE ALL)

| Current Behavior | Aspect it serves | Problem |
|---|---|---|
| `TimerInitBehavior` | Timer | Config-heavy, split init from tick |
| `TimerTickBehavior` | Timer | Coupled to span model |
| `TimerCompletionBehavior` | Timer Ending | Dual-mode (AMRAP/EMOM) — single behavior doing two jobs |
| `TimerPauseBehavior` | Timer | Event wiring locked inside behavior |
| `RoundInitBehavior` | Re-Entry | Split init from advance |
| `RoundAdvanceBehavior` | Re-Entry | Reads `ChildRunnerBehavior` directly — tight coupling |
| `RoundCompletionBehavior` | Rounds End | Reads round memory — fine, but ordering-sensitive |
| `RoundDisplayBehavior` | Labeling | Reaches into display memory and mutates it |
| `RoundOutputBehavior` | Report Output | Reads `ChildRunnerBehavior` — tight coupling |
| `RepSchemeBehavior` | Fragment Promotion | Rep-specific; should be generic promotion |
| `PromoteFragmentBehavior` | Fragment Promotion | Already close to correct |
| `PopOnNextBehavior` | Timer Ending | Overloaded — used as leaf exit AND deferred pop |
| `PopOnEventBehavior` | Timer Ending | Fine but naming confuses with completion |
| `CompletedBlockPopBehavior` | Timer Ending | Ordering-dependent on child runner |
| `SessionCompletionBehavior` | Rounds End | Takes behavior reference in constructor |
| `DisplayInitBehavior` | Labeling | Creates fragments but never updates them |
| `ChildRunnerBehavior` | Child Selection | Too many responsibilities (compile + push + track + preview) |
| `ChildLoopBehavior` | Child Selection | MUST be before `ChildRunnerBehavior` — fragile ordering |
| `RestBlockBehavior` | Child Selection | State machine hidden inside, surfaced via flags |
| `SegmentOutputBehavior` | Report Output | Output-only, simple |
| `TimerOutputBehavior` | Report Output | Span computation on unmount — fine |
| `HistoryRecordBehavior` | Report Output | Event emission on unmount |
| `SoundCueBehavior` | Report Output | Mixed: subscribes to ticks AND emits outputs |
| `ButtonBehavior` | Controls | Side concern, not an aspect |
| `ReentryCounterBehavior` | Re-Entry (invariant) | Auto-added, keep as universal |
| `CompletionTimestampBehavior` | Report Output (invariant) | Auto-added, keep as universal |
| `WaitingToStartInjectorBehavior` | Lifecycle | Session-specific, not a general behavior |
| `IdleInjectionBehavior` | — | **DEPRECATED** — remove |

### Cross-Cutting Problems

1. **Behavior-to-behavior coupling** — `RoundAdvanceBehavior`, `RoundOutputBehavior`, `SessionCompletionBehavior`, `ChildLoopBehavior` all reach into `ChildRunnerBehavior` via `getBehavior()`.
2. **Ordering fragility** — `RestBlockBehavior` → `ChildLoopBehavior` → `ChildRunnerBehavior` must be in exact sequence.
3. **Dual-mode behaviors** — `TimerCompletionBehavior` switches between AMRAP/EMOM mode via a boolean.
4. **Display mutation** — `RoundDisplayBehavior` directly manipulates display memory slots created by `DisplayInitBehavior`.
5. **No label formatting** — Block labels are set as raw text; there's no behavior that formats the label based on block type (e.g., "AMRAP 20:00", "EMOM 10 × 1:00", "5 Rounds For Time").

---

## Proposed Aspects

Seven primary aspects plus universal invariants. Each aspect has **one** behavior (or a small coordinated pair where init/lifecycle is separated).

### 1. Timer Aspect

> Owns all time tracking: initialization, ticking, pausing, span management.

| Behavior        | Lifecycle Hooks                  | Responsibility                                                                                                                                                    |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TimerBehavior` | `onMount`, `onNext`, `onUnmount` | Single unified timer. Initializes spans, subscribes to `tick` events, handles pause/resume. Configurable: direction (`up`/`down`), `durationMs`, `label`, `role`. |
- on mount start a timer,
- on next end and start a span
- on pop push the ellapsed and total fragments to be saved as output statements
  
**Key change:** Merge `TimerInitBehavior` + `TimerTickBehavior` + `TimerPauseBehavior` into one `TimerBehavior`. A timer is one thing — tracking time. Splitting init from tick created unnecessary state coordination.

**Memory written:** `timer` tag — `TimeSpan[]`, direction, durationMs.

**Events consumed:**  `timer:pause` (active), `timer:resume` (active).

> no need to consume timer tick even here..  end timer behvavior cares about that not this one. 

**Events emitted:** None — timer is read-only state. Completion is a separate aspect.

```
Config: { direction: 'up' | 'down', durationMs?: number, label?: string, role?: 'primary' | 'secondary' }
```

---

### 2. Re-Entry Aspect

> Tracks how many times a block has been entered (rounds/iterations). This is the **primary counter** — other aspects read from it.

| Behavior | Lifecycle Hooks | Responsibility |
|---|---|---|
| `ReEntryBehavior` | `onMount`, `onNext` | Initializes round counter in memory. Advances on `onNext()` when children signal completion (via memory, not behavior reference). Optionally bounded. |
> reentery doesn't repace the  rounds, rounds is a higher level version that deals with fragmetns, thus track the numer of time on puth and next are called.. 

**Key change:** Merge `RoundInitBehavior` + `RoundAdvanceBehavior` + `ReentryCounterBehavior` into one `ReEntryBehavior`. The re-entry count IS the round count — they were the same concept split across three classes.

**Memory written:** `round` tag — `{ current: number, total?: number }`.   

**Advancement rule:** Advances when `children:status` memory tag shows all children completed (or immediately for leaf blocks). This replaces the `getBehavior(ChildRunnerBehavior)` coupling — uses shared memory instead.

**Events consumed:** None directly.

**Events emitted:** None — round state is passive. Completion checking is a separate aspect.

```
Config: { totalRounds?: number, startRound?: number }
```

---

### 3. Timer Ending Aspect

> Determines when a block completes based on timer expiry. Registers event handlers for completion conditions.

| Behavior | Lifecycle Hooks | Responsibility |
|---|---|---|
| `TimerEndingBehavior` | `onMount`, `onUnmount` | Subscribes to `tick` events. When countdown reaches zero, marks block complete and emits `timer:complete`. Two distinct sub-types via config — **not** a boolean toggle. |

**Modes (via config, not boolean):**
> emom is actually bounded rounds value that sets the 60 seconds timer for children to inherit

| Mode               | On Timer Expiry                                              | Effect                |
| ------------------ | ------------------------------------------------------------ | --------------------- |
| `'complete-block'` | Marks block complete, defers pop until children finish       | Used by AMRAP         |
| `'reset-interval'` | Resets timer spans, clears children, does NOT complete block | Used by EMOM/Interval |

**Key change:** `TimerCompletionBehavior`'s dual mode is preserved but made explicit via a union config type rather than a `completesBlock` boolean. The "pop on next" and "pop on event" leaf-block exits are separate — they aren't timer endings, they're **user-advance exits** handled by child selection or a simple `LeafExitBehavior`.

| Behavior           | Lifecycle Hooks | Responsibility                                                                                                 |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------------------- |
| `LeafExitBehavior` | `onNext`        | Simple: marks complete and returns `PopBlockAction` on `next()`. Replaces `PopOnNextBehavior` for leaf blocks. |

**Memory read:** `timer` tag.

**Events consumed:** `tick` (bubble).

**Events emitted:** `timer:complete` (for coordination).

```
Config: { mode: 'complete-block' | 'reset-interval' }
```

---

### 4. Rounds End Aspect

> Determines when a block completes based on round count exhaustion.

| Behavior            | Lifecycle Hooks | Responsibility                                                                                                                     |
| ------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `RoundsEndBehavior` | `onNext`        | Checks `round` memory: if `current > total`, marks block complete and returns `PopBlockAction`. For unbounded rounds, never fires. |

**Key change:** `RoundCompletionBehavior` + `SessionCompletionBehavior` merge into one `RoundsEndBehavior`. Session completion was just "rounds end where total = 1" — same logic.

**Memory read:** `round` tag.

**Events consumed:** None.

**Ordering:** After `ReEntryBehavior` (which advances the counter first).

```
Config: none — reads round memory directly
```

---

### 5. Child Selection Aspect

> Manages which child block is active. Compiles, pushes, loops, and injects rest blocks.

> these should be based on the MOD of the number of children and the reentry (ofset by any extra reentry points that i tmight have (root is a special case))

| Behavior                 | Lifecycle Hooks                  | Responsibility                                                                                                                                                                       |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ChildSelectionBehavior` | `onMount`, `onNext`, `onUnmount` | Unified child management. Compiles child groups via JIT, pushes next child on `onNext()`, loops when configured, injects rest blocks between children when timer has remaining time. |

**Key change:** Merge `ChildRunnerBehavior` + `ChildLoopBehavior` + `RestBlockBehavior` into one `ChildSelectionBehavior`. The ordering fragility (Rest → Loop → Runner) existed because they were three behaviors sharing mutable state via `getBehavior()`. As one behavior, the internal state machine is explicit and self-contained.

**Memory written:** `children:status` tag — `{ childIndex: number, totalChildren: number, allCompleted: boolean, allExecuted: boolean }`.

**Sub-behaviors (internal, not exposed):**
- **Sequential selection:** Push child groups in order.
- **Loop detection:** When all children executed and looping is enabled (timer running or rounds unbounded), reset index.
- **Rest injection:** When countdown timer has remaining time after all children complete, inject a rest block before looping.

**Events consumed:** None directly (acts on `onNext()`).

**Events emitted:** `UpdateNextPreviewAction` (for UI).

```
Config: {
  childGroups: number[][],
  loop?: boolean | { whileTimerRunning?: boolean, whileRoundsRemaining?: boolean },
  autoRest?: boolean,
  skipOnMount?: boolean
}
```

---

### 6. Fragment Promotion Aspect

> Promotes fragment values from parent to children so the JIT compiler can inject inherited metrics.

| Behavior                    | Lifecycle Hooks     | Responsibility                                                                                                                                                              |
| --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FragmentPromotionBehavior` | `onMount`, `onNext` | Reads a configured fragment type from block memory and writes it to `fragment:promote` visibility. Supports dynamic rep schemes (array of values indexed by current round). |

**Key change:** Merge `PromoteFragmentBehavior` + `RepSchemeBehavior` into one `FragmentPromotionBehavior`. Rep schemes are just "promote a rep fragment that changes per round" — a specialization of fragment promotion, not a separate concept.

**Memory written:** `fragment:promote` tag.

**Memory read:** `round` tag (for indexing into scheme arrays).

```
Config: {
  fragmentType: FragmentType,
  scheme?: unknown[],          // Per-round values (e.g., [21, 15, 9])
  static?: ICodeFragment       // Fixed fragment to promote every round
}
```

---

### 7. Labeling Aspect *(NEW)*

> Formats the block's display label based on its type and configured data. Ensures the UI shows contextually correct labels like "AMRAP 20:00", "EMOM 10 × 1:00", "Round 2 of 5", etc.

| Behavior           | Lifecycle Hooks     | Responsibility                                                                                                                                                               |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LabelingBehavior` | `onMount`, `onNext` | Initializes `display` memory with formatted label fragments. Updates on `onNext()` when round state changes. Replaces both `DisplayInitBehavior` and `RoundDisplayBehavior`. |

**Key change:** `DisplayInitBehavior` created static labels. `RoundDisplayBehavior` mutated those labels by reaching into display memory. The new `LabelingBehavior` owns all label formatting in one place and re-renders the full label on each state change.

**Label formatting by block type:**

| Block Type   | Label Format                                 | Data Sources          |
| ------------ | -------------------------------------------- | --------------------- |
| AMRAP        | `"AMRAP {duration}"`                         | Timer memory          |
| EMOM         | `"EMOM {rounds} × {interval}"`               | Round + Timer memory  |
| For Time     | `"For Time"` or `"{rounds} Rounds For Time"` | Round memory          |
| Tabata       | `"Tabata: {exercise}"`                       | Effort fragments      |
| Generic Loop | `"Round {current} of {total}"`               | Round memory          |
| Effort/Leaf  | `"{reps} {exercise}"` or `"{exercise}"`      | Display fragments     |
| Timer        | `"{duration} {exercise}"`                    | Timer memory + effort |
| Session      | `"Workout"`                                  | Static                |

**Memory written:** `display` tag — array of `ICodeFragment` with roles: `label`, `subtitle`, `round`, `action`.

**Memory read:** `round`, `timer`, `fragment:display`.

```
Config: {
  blockType: string,
  label?: string,
  subtitle?: string,
  actionDisplay?: string,
  formatPattern?: string      // Optional template: "{rounds} × {interval}"
}
```

---

### 8. Report Output Aspect

> Emits output records on lifecycle boundaries. Updates fragments on the block before it is popped.

| Behavior                | Lifecycle Hooks        | Responsibility                                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportOutputBehavior`  | `onMount`, `onUnmount` | On mount: emits `segment` output with display fragments. On unmount: computes final values (elapsed time from spans, round count, etc.) and writes result fragments to `fragment:result` memory. Emits `completion` output. Replaces `SegmentOutputBehavior` + `TimerOutputBehavior`. |
| `HistoryRecordBehavior` | `onUnmount`            | Emits `history:record` event with execution summary. *(Keep as-is — simple, single-purpose.)*                                                                                                                                                                                         |
| `SoundCueBehavior`      | `onMount`, `onUnmount` | Emits `milestone` outputs with `SoundFragment` at lifecycle points and countdown ticks. *(Keep as-is — distinct concern.)*                                                                                                                                                            |

**Key change:** `SegmentOutputBehavior` and `TimerOutputBehavior` merge into `ReportOutputBehavior`. They were two halves of the same job: "describe what this block did." The mount-time segment and unmount-time result are both output records for the same block.

**Memory read:** `timer`, `round`, `fragment:display`, `fragment:result`.

**Memory written:** `fragment:result` tag (on unmount, before pop).

**Outputs emitted:** `segment` (mount), `completion` (unmount), `metric` (optional intermediate values).

```
Config: {
  emitSegmentOnMount?: boolean,   // default true
  emitCompletionOnUnmount?: boolean, // default true
  computeTimerResults?: boolean,   // default: true if timer present
}
```

---

### Universal Invariants (auto-added by `BlockBuilder.build()`)

These are NOT aspects — they are cross-cutting concerns added to every block automatically.

| Behavior | Responsibility |
|---|---|
| `ReentryCounterBehavior` | **REMOVE** — absorbed into `ReEntryBehavior`. The reentry count IS the round/entry counter. |
| `CompletionTimestampBehavior` | **KEEP** — Records completion timestamp. Simple, universal, no coupling. |

---

## Aspect Gap Analysis

Comparing the proposed 8 aspects against current behaviors to ensure nothing is missed:

| Current Behavior | Mapped To | Status |
|---|---|---|
| `TimerInitBehavior` | **Timer** (`TimerBehavior`) | ✅ Merged |
| `TimerTickBehavior` | **Timer** (`TimerBehavior`) | ✅ Merged |
| `TimerPauseBehavior` | **Timer** (`TimerBehavior`) | ✅ Merged |
| `TimerCompletionBehavior` | **Timer Ending** (`TimerEndingBehavior`) | ✅ Mapped |
| `RoundInitBehavior` | **Re-Entry** (`ReEntryBehavior`) | ✅ Merged |
| `RoundAdvanceBehavior` | **Re-Entry** (`ReEntryBehavior`) | ✅ Merged |
| `ReentryCounterBehavior` | **Re-Entry** (`ReEntryBehavior`) | ✅ Absorbed |
| `RoundCompletionBehavior` | **Rounds End** (`RoundsEndBehavior`) | ✅ Mapped |
| `SessionCompletionBehavior` | **Rounds End** (`RoundsEndBehavior`) | ✅ Merged |
| `ChildRunnerBehavior` | **Child Selection** (`ChildSelectionBehavior`) | ✅ Merged |
| `ChildLoopBehavior` | **Child Selection** (`ChildSelectionBehavior`) | ✅ Merged |
| `RestBlockBehavior` | **Child Selection** (`ChildSelectionBehavior`) | ✅ Merged |
| `PromoteFragmentBehavior` | **Fragment Promotion** (`FragmentPromotionBehavior`) | ✅ Merged |
| `RepSchemeBehavior` | **Fragment Promotion** (`FragmentPromotionBehavior`) | ✅ Merged |
| `DisplayInitBehavior` | **Labeling** (`LabelingBehavior`) | ✅ Merged |
| `RoundDisplayBehavior` | **Labeling** (`LabelingBehavior`) | ✅ Merged |
| `PopOnNextBehavior` | **Timer Ending** (`LeafExitBehavior`) | ✅ Mapped |
| `PopOnEventBehavior` | **Timer Ending** (`TimerEndingBehavior`) | ✅ Absorbed |
| `CompletedBlockPopBehavior` | **Timer Ending** (`TimerEndingBehavior`) | ✅ Absorbed (deferred pop) |
| `SegmentOutputBehavior` | **Report Output** (`ReportOutputBehavior`) | ✅ Merged |
| `TimerOutputBehavior` | **Report Output** (`ReportOutputBehavior`) | ✅ Merged |
| `RoundOutputBehavior` | **Report Output** (`ReportOutputBehavior`) | ✅ Merged |
| `HistoryRecordBehavior` | **Report Output** (`HistoryRecordBehavior`) | ✅ Keep |
| `SoundCueBehavior` | **Report Output** (`SoundCueBehavior`) | ✅ Keep |
| `ButtonBehavior` | **Controls** (unchanged) | ✅ Keep |
| `CompletionTimestampBehavior` | **Universal invariant** | ✅ Keep |
| `WaitingToStartInjectorBehavior` | **Session-specific** (not an aspect) | ⚠️ Move to `SessionRootStrategy` |
| `IdleInjectionBehavior` | — | ❌ Delete (deprecated) |

### Potentially Missing Aspects

| Concern | Current Coverage | Proposed Coverage | Action |
|---|---|---|---|
| **Controls / Buttons** | `ButtonBehavior` | Keep as-is — not an aspect, it's a UI detail | No change |
| **Waiting-to-start gate** | `WaitingToStartInjectorBehavior` | Move into `SessionRootStrategy` as a special child | Strategy concern, not a behavior |
| **Milestone outputs (non-sound)** | `RoundOutputBehavior` | Absorbed into `ReportOutputBehavior` | ✅ |
| **Next-block preview** | Inside `ChildRunnerBehavior` | Inside `ChildSelectionBehavior` | ✅ |
| **Deferred pop** | `CompletedBlockPopBehavior` | `TimerEndingBehavior` handles deferred pop internally | ✅ |

---

## Strategy → Aspect Composition Matrix

How each strategy wires the new aspects together:

| Strategy | Timer | Re-Entry | Timer Ending | Rounds End | Child Selection | Fragment Promotion | Labeling | Report Output | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **AmrapLogicStrategy** | ✅ down | ✅ unbounded | ✅ `complete-block` | — | ✅ loop+rest | — | ✅ AMRAP format | ✅ segment+completion | Timer ends block; rounds are unbounded (no rounds end) |
| **IntervalLogicStrategy** | ✅ down | ✅ bounded | ✅ `reset-interval` | ✅ | ✅ loop+rest | — | ✅ EMOM format | ✅ segment+completion | Timer resets per interval; rounds end block |
| **WorkoutRootStrategy** | ✅ up | ✅ (if multi-round) | — | ✅ (if bounded) | ✅ | — | ✅ generic | ✅ | Top-level workout container |
| **GenericTimerStrategy** | ✅ up or down | — | ✅ (if countdown) | — | — | — | ✅ timer format | ✅ | Standalone timer (leaf or with exit) |
| **GenericLoopStrategy** | — | ✅ bounded | — | ✅ | — | ✅ (rep scheme) | ✅ rounds format | ✅ | Pure round-based repetition |
| **GenericGroupStrategy** | — | — | — | — | — | — | ✅ group label | ✅ (if no timer/rounds) | Passthrough grouping |
| **ChildrenStrategy** | — | ✅ (default 1) | — | ✅ | ✅ | — | — | — | Enhancement: adds children to any block |
| **EffortFallbackStrategy** | ✅ up (secondary) | — | — | — | — | — | ✅ effort format | ✅ segment | Leaf block: effort/exercise |
| **SessionRootStrategy** | — | — | — | — | ✅ | — | ✅ "Workout" | — | Session container (special) |
| **IdleBlockStrategy** | ✅ up (optional) | — | `LeafExit` | — | — | — | ✅ idle label | — | Waiting/idle gates |
| **RestBlockStrategy** | ✅ down | — | ✅ `complete-block` | — | — | — | ✅ "Rest" | ✅ segment | Auto-generated rest blocks |
| **SoundStrategy** | — | — | — | — | — | — | — | `SoundCueBehavior` | Enhancement: adds sound cues |
| **HistoryStrategy** | — | — | — | — | — | — | — | `HistoryRecordBehavior` | Enhancement: adds history recording |

---

## Communication Model: Memory Tags (No `getBehavior()`)

The key architectural change: **behaviors communicate through shared memory tags, never through direct behavior references.**

| Memory Tag | Writer | Reader(s) | Shape |
|---|---|---|---|
| `timer` | `TimerBehavior` | `TimerEndingBehavior`, `LabelingBehavior`, `ReportOutputBehavior`, `ChildSelectionBehavior` (for rest injection) | `{ spans: TimeSpan[], direction, durationMs, isPaused }` |
| `round` | `ReEntryBehavior` | `RoundsEndBehavior`, `LabelingBehavior`, `ReportOutputBehavior`, `FragmentPromotionBehavior` | `{ current: number, total?: number }` |
| `children:status` | `ChildSelectionBehavior` | `ReEntryBehavior` (for advance gating) | `{ childIndex, totalChildren, allCompleted, allExecuted }` |
| `display` | `LabelingBehavior` | `ReportOutputBehavior` | `ICodeFragment[]` with roles |
| `fragment:display` | Compiler | `LabelingBehavior`, `ReportOutputBehavior` | `ICodeFragment[][]` |
| `fragment:promote` | `FragmentPromotionBehavior` | JIT Compiler (parent injection) | `ICodeFragment[]` |
| `fragment:result` | `ReportOutputBehavior` | External consumers | `ICodeFragment[]` (elapsed, total, spans, etc.) |
| `controls` | `ButtonBehavior` | UI layer | `ICodeFragment[]` (action fragments) |
| `completion` | `CompletionTimestampBehavior` | External consumers | `ICodeFragment[]` (timestamp) |

### Ordering Contract

Behaviors execute in insertion order. The **strategy** determines insertion order. The required ordering is:

```
1. TimerBehavior              (init state)
2. ReEntryBehavior            (init state, advance counter)
3. ChildSelectionBehavior     (manage children, write children:status)
4. TimerEndingBehavior        (check timer, mark complete)
5. RoundsEndBehavior          (check rounds, mark complete)
6. FragmentPromotionBehavior  (promote values to children)
7. LabelingBehavior           (format display from all state)
8. ReportOutputBehavior       (emit outputs from all state)
9. SoundCueBehavior           (emit sound milestones)
10. HistoryRecordBehavior     (record history on unmount)
11. CompletionTimestampBehavior (universal invariant)
12. ButtonBehavior            (UI controls)
```

---

## New `BlockBuilder` Aspect API

```typescript
class BlockBuilder {
  // Aspect composers (each adds one behavior)
  withTimer(config: TimerConfig): BlockBuilder;
  withReEntry(config: ReEntryConfig): BlockBuilder;
  withTimerEnding(config: TimerEndingConfig): BlockBuilder;
  withRoundsEnd(): BlockBuilder;
  withChildren(config: ChildSelectionConfig): BlockBuilder;
  withFragmentPromotion(config: FragmentPromotionConfig): BlockBuilder;
  withLabeling(config: LabelingConfig): BlockBuilder;
  withReportOutput(config?: ReportOutputConfig): BlockBuilder;

  // Convenience: leaf block (adds LeafExitBehavior)
  asLeaf(): BlockBuilder;

  // Keep existing
  addBehavior(behavior: IRuntimeBehavior): BlockBuilder;
  addBehaviorIfMissing(behavior: IRuntimeBehavior): BlockBuilder;
  build(): IRuntimeBlock;
}
```

---

## Migration Path

### Phase 1: Create New Behaviors
1. `TimerBehavior` — merge init + tick + pause
2. `ReEntryBehavior` — merge round init + advance + reentry counter
3. `TimerEndingBehavior` — refactor completion with explicit modes
4. `LeafExitBehavior` — extract from `PopOnNextBehavior`
5. `RoundsEndBehavior` — merge round completion + session completion
6. `ChildSelectionBehavior` — merge runner + loop + rest
7. `FragmentPromotionBehavior` — merge promote + rep scheme
8. `LabelingBehavior` — merge display init + round display, add type-aware formatting
9. `ReportOutputBehavior` — merge segment + timer output + round output

### Phase 2: Update Strategies
- Rewrite each strategy to use new `BlockBuilder` aspect API
- Verify each strategy's composition against the matrix above

### Phase 3: Delete Old Behaviors
- Remove all 27 old behavior files
- Remove old barrel exports from `src/runtime/behaviors/index.ts`
- Update tests to use new behavior names

### Phase 4: Validate
- `bun run test` — no new failures
- `bun x tsc --noEmit` — no new type errors
- `bun run storybook` — all stories render

---

## Summary: Before vs After

| Metric | Before | After |
|---|---|---|
| Total behaviors | 27 (1 deprecated) | 12 (9 new + 3 kept) |
| `getBehavior()` cross-references | 6 | 0 |
| Ordering-sensitive chains | 3-behavior chain | Memory-mediated, strategy-controlled |
| Dual-mode behaviors | 1 (`TimerCompletionBehavior`) | 0 (explicit config types) |
| Display mutation hacks | 2 (`DisplayInit` + `RoundDisplay`) | 0 (single `LabelingBehavior` owns display) |
| Aspects | Implicit | 8 explicit aspects |
