# Runtime Behavior Refactoring Guide

> **Goal:** Enforce single-responsibility principle (SRP) across all runtime behaviors, eliminating overlap and enabling finer-grained block composition.

## Table of Contents

- [Current State Analysis](#current-state-analysis)
- [Overlap & SRP Violations](#overlap--srp-violations)
- [Refactoring Plan](#refactoring-plan)
  - [Behaviors to Split](#behaviors-to-split)
  - [Behaviors to Keep As-Is](#behaviors-to-keep-as-is)
  - [Behaviors to Delete](#behaviors-to-delete)
  - [New Behaviors to Create](#new-behaviors-to-create)
  - [Shared Utilities to Extract](#shared-utilities-to-extract)
- [Final Behavior Catalog](#final-behavior-catalog)
- [Block Composition Matrix](#block-composition-matrix)
- [Behavior Ordering Contract](#behavior-ordering-contract)
- [Migration Path](#migration-path)

---

## Current State Analysis

### Existing Behaviors (20 total)

| # | Behavior | Aspect | Responsibility |
|---|----------|--------|----------------|
| 1 | `TimerInitBehavior` | Time | Initialize timer state in memory |
| 2 | `TimerTickBehavior` | Time | Subscribe to ticks + **close span on unmount** |
| 3 | `TimerCompletionBehavior` | Completion | Mark complete when countdown expires |
| 4 | `TimerPauseBehavior` | Time/Controls | Pause/resume state + **span management** |
| 5 | `TimerOutputBehavior` | Output | Emit timer completion output |
| 6 | `RoundInitBehavior` | Iteration | Initialize round state |
| 7 | `RoundAdvanceBehavior` | Iteration | Increment round counter |
| 8 | `RoundCompletionBehavior` | Completion | Mark complete when rounds exhausted |
| 9 | `RoundDisplayBehavior` | Display | Update round text in display memory |
| 10 | `RoundOutputBehavior` | Output | Emit round milestone outputs |
| 11 | `ChildRunnerBehavior` | Children | Push child blocks + **track loop state** |
| 12 | `ChildLoopBehavior` | Children | Reset child index for looping |
| 13 | `PopOnNextBehavior` | Completion | Mark complete on user advance |
| 14 | `PopOnEventBehavior` | Completion | Mark complete on event |
| 15 | `DisplayInitBehavior` | Display | Initialize display state |
| 16 | `SegmentOutputBehavior` | Output | Emit segment/completion outputs |
| 17 | `HistoryRecordBehavior` | Output | Emit history:record event |
| 18 | `SoundCueBehavior` | Output | Emit sounds + **countdown tick logic** |
| 19 | `ButtonBehavior` | Controls | Initialize/clear button state |
| 20 | `IdleInjectionBehavior` | Legacy | No-op stub (deprecated) |

---

## Overlap & SRP Violations

### 1. Timer Span Management — Duplicated across two behaviors

**Problem:** Both `TimerTickBehavior` and `TimerPauseBehavior` manage TimeSpan lifecycle with identical code patterns:

```typescript
// Identical span-closing code in BOTH behaviors:
const updatedSpans = timer.spans.map((span, i) => {
    if (i === timer.spans.length - 1 && span.ended === undefined) {
        return new TimeSpan(span.started, now);
    }
    return span;
});
```

- `TimerTickBehavior.onUnmount()` — closes the final span
- `TimerPauseBehavior` on `timer:pause` — closes the current span
- `TimerPauseBehavior` on `timer:resume` — opens a new span

**Risk:** If both behaviors are present and a pause occurs right before unmount, the span could be double-closed (pause closes it, then tick tries to close it again). While the `span.ended === undefined` guard protects against this, the duplicated logic is a maintenance risk.

**Resolution:** Extract span management into a dedicated `TimerSpanBehavior`. Let `TimerTickBehavior` focus purely on tick subscription, and `TimerPauseBehavior` focus purely on pause state.

### 2. ChildRunner — Dual responsibility (pushing + loop state)

**Problem:** `ChildRunnerBehavior` owns two concerns:
1. Compiling and pushing child blocks (primary)
2. Exposing `allChildrenExecuted` and `resetChildIndex()` for `ChildLoopBehavior`

**Coupling:** `ChildLoopBehavior` directly accesses `ChildRunnerBehavior`'s internal state via `block.getBehavior()`, creating a tight coupling with a fragile ordering requirement.

```typescript
// ChildLoopBehavior reaches into ChildRunnerBehavior:
const childRunner = block.getBehavior(ChildRunnerBehavior);
childRunner.resetChildIndex();  // Direct mutation of another behavior's state
```

**Resolution:** This coupling is acceptable given the behavior pattern, but the loop state could be moved to block memory instead of being held as instance state. This would remove the need for `getBehavior()` cross-references. See [New Behaviors](#new-behaviors-to-create).

### 3. `calculateElapsed()` — Duplicated 4 times

**Problem:** The elapsed time calculation from spans is implemented in four locations — three as named functions and one inline:

| File | Implementation |
|------|----------|
| `TimerCompletionBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `TimerOutputBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `HistoryRecordBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `SoundCueBehavior.ts` | Inline loop (identical logic) |

The inline variant in `SoundCueBehavior.ts`:

```typescript
let elapsed = 0;
for (const span of timer.spans) {
    const end = span.ended ?? now;
    elapsed += end - span.started;
}
```

**Resolution:** Extract `calculateElapsed()` into a shared utility module `src/runtime/utils/timerUtils.ts`.

### 4. SoundCueBehavior — Three responsibilities

**Problem:** `SoundCueBehavior` handles:
1. **Mount sounds** — emit on mount
2. **Countdown tick logic** — subscribe to tick events, calculate remaining time, deduplicate played seconds
3. **Unmount sounds** — emit on unmount/complete

The countdown tick logic duplicates timer elapsed calculation and introduces its own state (`playedSeconds` Set).

**Resolution:** Split into `SoundOnMountBehavior`, `SoundOnUnmountBehavior`, and `CountdownSoundBehavior`. Or keep as-is since it's cohesive around "sound cues" — see [recommendation](#split-or-keep-soundcuebehavior).

### 5. Output Coordination — Undocumented mutual exclusion

**Problem:** Multiple output behaviors can coexist and must not duplicate outputs:
- `SegmentOutputBehavior`: emits both 'segment' (mount) and 'completion' (unmount)
- `TimerOutputBehavior`: emits 'completion' (unmount) with timer data
- `RoundOutputBehavior`: emits 'milestone' (onNext)

There's a documented comment in `TimerOutputBehavior`:
> "Mount-time segment output is NOT emitted here to avoid duplicates with other output behaviors."

But the strategies that use both `SegmentOutputBehavior` AND `TimerOutputBehavior` would emit two 'completion' outputs on unmount.

**Current workaround:** Strategies never use both together. But this is not enforced.

**Resolution:** Document the mutual exclusion rule. Consider making output behaviors aware of each other, or use a single `OutputBehavior` with configurable output types.

---

## Refactoring Plan

### Behaviors to Split

#### 1. `TimerTickBehavior` → `TimerTickBehavior` + `TimerSpanBehavior`

**Current `TimerTickBehavior`** does two things:
- Subscribes to tick events (currently a no-op subscription since UI computes elapsed from spans)
- Closes the final span on unmount

**Split into:**

| New Behavior | Responsibility | Hooks Used |
|-------------|----------------|------------|
| **`TimerTickBehavior`** (simplified) | Subscribe to tick events for behaviors that need tick awareness | `onMount` (subscribe) |
| **`TimerSpanBehavior`** (new) | Manage TimeSpan lifecycle: close span on unmount, open/close on pause/resume | `onMount` (subscribe pause/resume), `onUnmount` (close final span) |

**Rationale:** Separates "observing ticks" from "managing span lifecycle". The current `TimerTickBehavior` tick handler is actually a no-op (UI computes from spans), while the span-closing is the real work that overlaps with `TimerPauseBehavior`.

#### 2. `TimerPauseBehavior` → absorbed into `TimerSpanBehavior` + `PauseStateBehavior`

**Current `TimerPauseBehavior`** does two things:
- Tracks `isPaused` flag (instance state)
- Opens/closes TimeSpans on pause/resume events

**Split into:**

| New Behavior | Responsibility | Hooks Used |
|-------------|----------------|------------|
| **`TimerSpanBehavior`** (new, from split above) | All span open/close operations (pause, resume, unmount) | `onMount`, `onUnmount` |
| **`PauseStateBehavior`** (new) | Track pause/resume state, expose `isPaused` flag, emit pause-related events | `onMount` (subscribe) |

**Rationale:** The `isPaused` flag is an independent concern from span management. Some blocks may want pause state tracking without timer spans (e.g., for UI display updates).

#### 3. `SoundCueBehavior` — Recommend: Keep as-is (with utility extraction)

<a name="split-or-keep-soundcuebehavior"></a>

Despite handling mount/tick/unmount sounds, `SoundCueBehavior` is cohesive around the "sound cue" concept. Splitting it into 3 behaviors would create unnecessary complexity for minimal SRP gain.

**Instead:** Extract the elapsed time calculation to the shared utility, keeping the behavior intact.

```typescript
// Before (inline in SoundCueBehavior):
let elapsed = 0;
for (const span of timer.spans) {
    const end = span.ended ?? now;
    elapsed += end - span.started;
}

// After (using shared utility):
import { calculateElapsed } from '../utils/timerUtils';
const elapsed = calculateElapsed(timer, now);
```

### Behaviors to Keep As-Is

These behaviors already follow SRP and have clean boundaries:

| Behavior | Why It's Clean |
|----------|---------------|
| **`TimerInitBehavior`** | Single responsibility: initialize timer memory. No overlap. |
| **`TimerCompletionBehavior`** | Single responsibility: check elapsed vs duration on tick. Clean. |
| **`RoundInitBehavior`** | Single responsibility: initialize round memory. No overlap. |
| **`RoundAdvanceBehavior`** | Single responsibility: increment round counter on next(). Clean. |
| **`RoundCompletionBehavior`** | Single responsibility: check rounds exhausted on next(). Clean. |
| **`RoundDisplayBehavior`** | Single responsibility: update display.roundDisplay. Clean. |
| **`RoundOutputBehavior`** | Single responsibility: emit round milestone on next(). Clean. |
| **`PopOnNextBehavior`** | Single responsibility: mark complete on next(). Minimal. |
| **`PopOnEventBehavior`** | Single responsibility: mark complete on event. Minimal. |
| **`DisplayInitBehavior`** | Single responsibility: initialize display memory. No overlap. |
| **`SegmentOutputBehavior`** | Single responsibility: emit segment/completion outputs. Clean. |
| **`TimerOutputBehavior`** | Single responsibility: emit timer completion output. Clean. |
| **`HistoryRecordBehavior`** | Single responsibility: emit history record. Clean. |
| **`ButtonBehavior`** | Single responsibility: manage button state. Clean. |
| **`ChildRunnerBehavior`** | Pushing children + exposing loop state. Acceptable coupling with ChildLoop. |
| **`ChildLoopBehavior`** | Single responsibility: reset child index when looping. Clean dependency on ChildRunner. |

### Behaviors to Delete

| Behavior | Reason |
|----------|--------|
| **`IdleInjectionBehavior`** | Deprecated no-op stub. All methods return `[]`. No references from new code. Should be deleted. |
| **`TimerTickBehavior`** (current) | Replaced by simplified `TimerTickBehavior` + new `TimerSpanBehavior`. The current tick handler is a no-op. |
| **`TimerPauseBehavior`** (current) | Replaced by `TimerSpanBehavior` + `PauseStateBehavior`. Span logic unified. |

### New Behaviors to Create

#### 1. `TimerSpanBehavior`

**Responsibility:** Sole owner of TimeSpan lifecycle in timer memory.

```typescript
/**
 * TimerSpanBehavior manages the TimeSpan lifecycle in timer memory.
 * 
 * ## Aspect: Time (Span Management)
 * 
 * Consolidates all span open/close operations:
 * - Subscribes to timer:pause → closes current span
 * - Subscribes to timer:resume → opens new span
 * - On unmount → closes final open span
 * 
 * Replaces span management previously split across
 * TimerTickBehavior and TimerPauseBehavior.
 */
export class TimerSpanBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to pause: close current span
        ctx.subscribe('timer:pause', (_event, pauseCtx) => {
            this.closeCurrentSpan(pauseCtx);
            return [];
        });

        // Subscribe to resume: open new span
        ctx.subscribe('timer:resume', (_event, resumeCtx) => {
            this.openNewSpan(resumeCtx);
            return [];
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Close final open span
        this.closeCurrentSpan(ctx);
        return [];
    }

    private closeCurrentSpan(ctx: IBehaviorContext): void {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.spans.length === 0) return;

        const now = ctx.clock.now.getTime();
        const updatedSpans = timer.spans.map((span, i) => {
            if (i === timer.spans.length - 1 && span.ended === undefined) {
                return new TimeSpan(span.started, now);
            }
            return span;
        });

        ctx.setMemory('timer', { ...timer, spans: updatedSpans });
    }

    private openNewSpan(ctx: IBehaviorContext): void {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer) return;

        const now = ctx.clock.now.getTime();
        ctx.setMemory('timer', {
            ...timer,
            spans: [...timer.spans, new TimeSpan(now)]
        });
    }
}
```

#### 2. `PauseStateBehavior`

**Responsibility:** Track pause/resume state independently from span management.

```typescript
/**
 * PauseStateBehavior tracks pause/resume state for a block.
 * 
 * ## Aspect: Controls (Pause State)
 * 
 * Maintains an isPaused flag that other behaviors or UI can query.
 * Does NOT manage spans — that's TimerSpanBehavior's job.
 */
export class PauseStateBehavior implements IRuntimeBehavior {
    private isPaused = false;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.subscribe('timer:pause', () => {
            this.isPaused = true;
            return [];
        });

        ctx.subscribe('timer:resume', () => {
            this.isPaused = false;
            return [];
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    get paused(): boolean {
        return this.isPaused;
    }
}
```

### Shared Utilities to Extract

#### `src/runtime/utils/timerUtils.ts`

```typescript
import { TimerState } from '../memory/MemoryTypes';

/**
 * Calculate total elapsed time from timer spans.
 * Handles both closed and open spans.
 */
export function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}

/**
 * Format milliseconds as mm:ss.
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Files that should import from this utility:**
- `TimerCompletionBehavior.ts` — remove local `calculateElapsed()`
- `TimerOutputBehavior.ts` — remove local `calculateElapsed()` and `formatDuration()`
- `HistoryRecordBehavior.ts` — remove local `calculateElapsed()`
- `SoundCueBehavior.ts` — replace inline calculation

---

## Final Behavior Catalog

After refactoring, the behavior catalog will be:

### Time Aspect (4 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `TimerInitBehavior` | Initialize timer state | `onMount`: write timer | W: timer |
| `TimerTickBehavior` | Subscribe to tick events | `onMount`: subscribe tick | R: timer |
| `TimerSpanBehavior` | Manage TimeSpan open/close | `onMount`: subscribe pause/resume; `onUnmount`: close span | U: timer |
| `TimerCompletionBehavior` | Mark complete on countdown expiry | `onMount`: subscribe tick, check zero | R: timer, M: completion |

### Iteration Aspect (4 behaviors — unchanged)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `RoundInitBehavior` | Initialize round state | `onMount`: write round | W: round |
| `RoundAdvanceBehavior` | Increment round counter | `onNext`: update round | U: round |
| `RoundCompletionBehavior` | Mark complete when rounds done | `onNext`: check round | R: round, M: completion |
| `RoundDisplayBehavior` | Update display with round text | `onMount`, `onNext`: update display | R: round, U: display |

### Children Aspect (2 behaviors — unchanged)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `ChildRunnerBehavior` | Push child blocks | `onMount`, `onNext`: compile & push | None |
| `ChildLoopBehavior` | Reset child index for looping | `onNext`: check & reset | R: timer, round |

### Completion Aspect (2 behaviors — unchanged)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `PopOnNextBehavior` | Complete on user advance | `onNext`: markComplete + PopAction | M: completion |
| `PopOnEventBehavior` | Complete on event | `onMount`: subscribe events | M: completion |

### Display Aspect (1 behavior — unchanged)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `DisplayInitBehavior` | Initialize display state | `onMount`: write display | W: display |

### Controls Aspect (2 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `ButtonBehavior` | Manage button state | `onMount`: write controls; `onUnmount`: clear | W: controls |
| `PauseStateBehavior` | Track pause/resume state | `onMount`: subscribe pause/resume | None (instance state) |

### Output Aspect (5 behaviors — unchanged)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `SegmentOutputBehavior` | Emit segment/completion outputs | `onMount`, `onUnmount`: emitOutput | R: fragments |
| `TimerOutputBehavior` | Emit timer completion output | `onUnmount`: emitOutput | R: timer |
| `RoundOutputBehavior` | Emit round milestones | `onNext`: emitOutput | R: round |
| `HistoryRecordBehavior` | Emit history record event | `onUnmount`: emitEvent | R: timer, round |
| `SoundCueBehavior` | Emit sound cue outputs | `onMount`, `onUnmount`, tick: emitOutput | R: timer |

### Deleted

| Behavior | Reason |
|----------|--------|
| `IdleInjectionBehavior` | Deprecated no-op, unused |
| `TimerPauseBehavior` | Replaced by `TimerSpanBehavior` + `PauseStateBehavior` |

**Total: 20 behaviors → 20 behaviors** (net neutral count — 2 deleted, 2 created)

---

## Block Composition Matrix

This matrix shows which behaviors compose each block type created by the workout strategies.

### Legend

- ✅ = Required
- ⬜ = Not used
- 🔄 = Conditional

### Composition Table

| Behavior | Root | AMRAP | EMOM | Timer (↓) | Timer (↑) | Rounds | Group | Effort | Idle |
|----------|:----:|:-----:|:----:|:---------:|:---------:|:------:|:-----:|:------:|:----:|
| **Time** | | | | | | | | | |
| `TimerInitBehavior` | ✅ up | ✅ down | ✅ down | ✅ down | ✅ up | ⬜ | ⬜ | ⬜ | 🔄 up |
| `TimerTickBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | 🔄 |
| `TimerSpanBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `TimerCompletionBehavior` | ⬜ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Iteration** | | | | | | | | | |
| `RoundInitBehavior` | 🔄 | ✅ ∞ | ✅ N | ⬜ | ⬜ | ✅ N | ⬜ | ⬜ | ⬜ |
| `RoundAdvanceBehavior` | 🔄 | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| `RoundCompletionBehavior` | 🔄 | ⬜ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| `RoundDisplayBehavior` | 🔄 | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| **Children** | | | | | | | | | |
| `ChildRunnerBehavior` | ✅ | ✅* | ✅* | ⬜ | ⬜ | ✅* | ✅* | ⬜ | ⬜ |
| `ChildLoopBehavior` | ⬜ | ✅* | ✅* | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Completion** | | | | | | | | | |
| `PopOnNextBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ✅ | 🔄 |
| `PopOnEventBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔄 |
| **Display** | | | | | | | | | |
| `DisplayInitBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ✅ |
| **Controls** | | | | | | | | | |
| `ButtonBehavior` | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔄 |
| `PauseStateBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Output** | | | | | | | | | |
| `SegmentOutputBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ |
| `TimerOutputBehavior` | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `RoundOutputBehavior` | ⬜ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| `HistoryRecordBehavior` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ | ⬜ |
| `SoundCueBehavior` | ⬜ | ✅ | ✅ | ✅ | 🔄 | ⬜ | ⬜ | ⬜ | ⬜ |

> **\*** = Added by `ChildrenStrategy` enhancement, not by the primary strategy
> **🔄** = Conditionally added based on configuration
> **∞** = Unbounded rounds (totalRounds=undefined)
> **N** = Bounded rounds (totalRounds=number)

### Block Type Details

#### Root Workout Block
```
TimerInit(up) → TimerTick → TimerSpan → PauseState
  → [RoundInit(N) → RoundAdvance → RoundCompletion → RoundDisplay]  (if multi-round)
  → ChildRunner
  → DisplayInit(clock)
  → ButtonBehavior(pause, next, stop)
  → HistoryRecord
```

#### AMRAP Block
```
TimerInit(down, duration) → TimerTick → TimerSpan → PauseState → TimerCompletion
  → RoundInit(∞) → RoundAdvance  (NO RoundCompletion — timer controls end)
  → [ChildLoop → ChildRunner]  (via ChildrenStrategy)
  → DisplayInit(countdown) → RoundDisplay
  → TimerOutput → RoundOutput → HistoryRecord
  → SoundCue(mount, countdown 3-2-1, complete)
```

#### EMOM Block
```
TimerInit(down, interval) → TimerTick → TimerSpan → PauseState → TimerCompletion
  → RoundInit(N) → RoundAdvance → RoundCompletion
  → [ChildLoop → ChildRunner]  (via ChildrenStrategy)
  → DisplayInit(countdown) → RoundDisplay
  → TimerOutput → RoundOutput → HistoryRecord
  → SoundCue(mount, countdown 3-2-1, complete)
```

#### Countdown Timer Block (e.g., `:60 Work`)
```
TimerInit(down, duration) → TimerTick → TimerSpan → PauseState → TimerCompletion
  → DisplayInit(countdown)
  → TimerOutput
  → SoundCue(countdown 3-2-1, complete)
```

#### Count-Up Timer Block (e.g., `For Time`)
```
TimerInit(up) → TimerTick → TimerSpan → PauseState
  → PopOnNext
  → DisplayInit(clock)
  → TimerOutput
```

#### Rounds Block (e.g., `(3 Rounds)`)
```
RoundInit(N) → RoundAdvance → RoundCompletion
  → [ChildRunner]  (via ChildrenStrategy)
  → DisplayInit(clock) → RoundDisplay
  → RoundOutput → HistoryRecord
```

#### Group Block (children, no timer/rounds)
```
[ChildRunner]  (via ChildrenStrategy, adds single-pass RoundInit)
  → DisplayInit(clock)
  → HistoryRecord
```

#### Effort Block (e.g., `10 Push-ups`)
```
PopOnNext
  → SegmentOutput
```

#### Idle Block (transition screens)
```
[TimerInit(up) → TimerTick]  (if trackTiming)
  → PopOnNext | PopOnEvent  (configurable)
  → DisplayInit(clock)
  → [ButtonBehavior]  (if button configured)
```

---

## Behavior Ordering Contract

Behaviors execute in array order. The following ordering constraints **must** be respected:

### Hard Dependencies (will break if violated)

| Rule | Reason |
|------|--------|
| `TimerInitBehavior` before any timer-reading behavior | Timer memory must exist before read |
| `RoundInitBehavior` before `RoundAdvanceBehavior` | Round memory must exist before increment |
| `RoundAdvanceBehavior` before `RoundCompletionBehavior` | Must increment before checking exhaustion |
| `ChildLoopBehavior` before `ChildRunnerBehavior` | Must reset index before runner checks it |
| `DisplayInitBehavior` before `RoundDisplayBehavior` | Display memory must exist before update |

### Soft Dependencies (better output if respected)

| Rule | Reason |
|------|--------|
| `RoundAdvanceBehavior` before `RoundDisplayBehavior` | Display shows updated round number |
| Init behaviors before output behaviors | Output reads initialized state |
| Completion behaviors before output behaviors | Output reflects completion state |

### Recommended Canonical Order

```
1. Initialization    → TimerInit, RoundInit, DisplayInit
2. Span Management   → TimerSpan
3. Tick/Event Subs   → TimerTick, PauseState
4. Children          → ChildLoop, ChildRunner
5. State Advancement → RoundAdvance
6. Completion Check  → TimerCompletion, RoundCompletion, PopOnNext, PopOnEvent
7. Display Updates   → RoundDisplay
8. Controls          → ButtonBehavior
9. Output            → SegmentOutput, TimerOutput, RoundOutput, HistoryRecord, SoundCue
```

---

## Migration Path

### Phase 1: Extract Shared Utilities (non-breaking)

1. Create `src/runtime/utils/timerUtils.ts` with `calculateElapsed()` and `formatDuration()`
2. Update `TimerCompletionBehavior`, `TimerOutputBehavior`, `HistoryRecordBehavior`, `SoundCueBehavior` to import from utility
3. Delete local duplicates
4. Run existing tests — **zero behavior changes**

### Phase 2: Create `TimerSpanBehavior` (non-breaking)

1. Create `TimerSpanBehavior` in `src/runtime/behaviors/`
2. Add tests for span close/open operations
3. Do NOT remove old behaviors yet

### Phase 3: Create `PauseStateBehavior` (non-breaking)

1. Create `PauseStateBehavior` in `src/runtime/behaviors/`
2. Add tests for pause state tracking
3. Do NOT remove old behaviors yet

### Phase 4: Swap Strategies (breaking)

1. Update all strategies to use `TimerSpanBehavior` + `PauseStateBehavior` instead of `TimerPauseBehavior`
2. Simplify `TimerTickBehavior` — remove `onUnmount` span closing (now in `TimerSpanBehavior`)
3. Update `behaviors/index.ts` exports
4. Run full test suite
5. Update Storybook stories to verify runtime behavior

### Phase 5: Cleanup (breaking)

1. Delete `TimerPauseBehavior`
2. Delete `IdleInjectionBehavior`
3. Remove from `behaviors/index.ts`
4. Final test pass

### Phase 6: Documentation

1. Update `docs/diagrams/behavior-memory-matrix.md`
2. Update `docs/domain-model/contracts/IRuntimeBehavior.md`
3. Update strategy JSDoc comments

---

## Summary of Changes

| Action | Count | Details |
|--------|:-----:|---------|
| **Split** | 2 | TimerTickBehavior (simplify), TimerPauseBehavior (decompose) |
| **Create** | 2 | `TimerSpanBehavior`, `PauseStateBehavior` |
| **Delete** | 2 | `IdleInjectionBehavior`, `TimerPauseBehavior` |
| **Keep** | 16 | All others remain unchanged |
| **Extract** | 1 | `timerUtils.ts` shared utility (deduplicate 4 copies) |
| **Modify** | 4 | TimerCompletionBehavior, TimerOutputBehavior, HistoryRecordBehavior, SoundCueBehavior (import from utility) |
