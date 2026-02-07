# Runtime Behavior Refactoring Guide

> **Goal:** Establish universal block invariants, enforce single-responsibility principle (SRP) across all runtime behaviors, and define a consistent, repeatable composition pattern that eliminates special-case logic from strategies.

## Table of Contents

- [Target Architecture: Universal Block Invariants](#target-architecture-universal-block-invariants)
- [Current State Analysis](#current-state-analysis)
- [Gap Analysis: Current vs Target](#gap-analysis-current-vs-target)
- [Refactoring Plan](#refactoring-plan)
  - [New Memory Types](#new-memory-types)
  - [New Behaviors to Create](#new-behaviors-to-create)
  - [Behaviors to Split](#behaviors-to-split)
  - [Behaviors to Keep As-Is](#behaviors-to-keep-as-is)
  - [Behaviors to Delete](#behaviors-to-delete)
  - [Shared Utilities to Extract](#shared-utilities-to-extract)
- [Final Behavior Catalog](#final-behavior-catalog)
- [Block Composition Matrix](#block-composition-matrix)
- [Block Type Compositions](#block-type-compositions)
- [Behavior Ordering Contract](#behavior-ordering-contract)
- [Migration Path](#migration-path)
- [Summary of Changes](#summary-of-changes)

---

## Target Architecture: Universal Block Invariants

Every block in the runtime — regardless of type — must satisfy these invariants. This eliminates conditional logic in strategies and makes every block's lifecycle predictable.

### Invariant 1: Every Block Has a Timer

**Every block initializes `TimerInitBehavior`** to create timer memory with an open span on mount. This ensures:
- Every block can report how long it was active
- Completion timestamps are always derivable from timer spans
- No special-case logic for "does this block have a timer?"

> **Current gap:** `EffortFallbackStrategy`, `GenericLoopStrategy`, and `GenericGroupStrategy` do not add timer behaviors. `IdleBlockStrategy` adds them conditionally.

### Invariant 2: Every Block Has a Re-entry Counter

**Every block allocates a `reentry` memory slot** — a monotonically increasing counter incremented each time `onNext()` is called. This provides:
- A universal "how many times was this block re-entered?" metric
- A mechanism for behaviors to detect first-entry vs re-entry
- Loop iteration tracking without coupling to `RoundState`

> **Current gap:** No `ReentryState` memory type exists. No behavior tracks re-entry.

### Invariant 3: Blocks With Children Push Children

**All parent blocks compose `ChildRunnerBehavior`** to manage child execution. The `ChildrenStrategy` enhancement handles this today and remains unchanged.

### Invariant 4: Blocks With Children Track Rounds From Lap Fragments

**Parent blocks derive round count from the `LapFragment`** on their compiled statement, not from ad-hoc configuration. If a statement has a lap/rounds fragment, the block gets round tracking behaviors. This makes round configuration data-driven rather than strategy-driven.

### Invariant 5: Round Reporting Based on Block Category

Blocks with children that fall into these categories add `RoundOutputBehavior`:
- **Timer-bound** (AMRAP, EMOM) — unbounded or bounded rounds driven by timer
- **Unbound** — no timer, no defined rounds (single-pass, but still report)
- **Defined rounds** — explicit round count from fragments

### Invariant 6: All Blocks Timestamp Completion

**Every block emits a completion timestamp** on unmount via output behaviors. Multiple output behaviors coexist for different output types (segment, timer, history) but all blocks must have at least one. The timer span provides the ground-truth timestamp.

### Invariant 7: Early Termination is Logged

**If a block is popped before completing** (due to a parent timer expiring, user stop, or runtime event), the block's behaviors must:
1. Log the termination reason into completion memory
2. Close the timer span with the latest clock timestamp
3. Emit a completion output reflecting the early termination

> **Current gap:** `PopOnEventBehavior` marks complete with a reason, but `TimerCompletionBehavior`'s timer-expired pop does not propagate a reason to child blocks being unwound. No behavior explicitly handles the "popped-by-parent" case.

### Invariant 8: Sound Behaviors Produce Sound Output

`SoundCueBehavior` is the sole owner of audio output. It emits `SoundFragment` milestone outputs that external audio systems observe. This remains unchanged.

### Invariant 9: Timer Events Drive Stack Cleanup

**When a timer completes**, the `TimerCompletionBehavior` marks the block complete, which triggers a pop. The pop cascades through the stack — each block's `onUnmount` fires, closing spans, emitting outputs, and recording history. This is the standard teardown path for timer-bound blocks.

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

### Existing Memory Types

| Memory Key | Type | Description |
|-----------|------|-------------|
| `timer` | `TimerState` | Spans, direction, duration, label, role |
| `round` | `RoundState` | Current round, total rounds |
| `fragment` | `FragmentState` | Inherited fragments |
| `completion` | `CompletionState` | isComplete, reason, completedAt |
| `display` | `DisplayState` | Mode, labels, round display |
| `controls` | `ButtonsState` | Button configurations |

---

## Gap Analysis: Current vs Target

### Gap 1: Timer Not Universal

| Strategy | Has `TimerInitBehavior`? | Action Required |
|----------|:------------------------:|-----------------|
| `WorkoutRootStrategy` | ✅ up | None |
| `AmrapLogicStrategy` | ✅ down | None |
| `IntervalLogicStrategy` | ✅ down | None |
| `GenericTimerStrategy` | ✅ up/down | None |
| `GenericLoopStrategy` | ❌ | **Add** `TimerInitBehavior(up, role: 'secondary')` |
| `EffortFallbackStrategy` | ❌ | **Add** `TimerInitBehavior(up, role: 'secondary')` |
| `ChildrenStrategy` | ❌ (inherits) | Verify parent always has timer |
| `IdleBlockStrategy` | 🔄 conditional | **Make unconditional** |

**Simplification:** If every strategy adds `TimerInitBehavior`, we can remove the `trackTiming` flag from `IdleBlockConfig` and the conditional logic in `EffortFallbackStrategy`. The `SoundStrategy` and `HistoryStrategy` enhancements no longer need to check `hasBehavior(TimerInitBehavior)`.

### Gap 2: No Re-entry Counter

No `ReentryState` memory type exists. Need:
1. New memory type in `MemoryTypes.ts`
2. New `ReentryCounterBehavior` that increments on every `onNext()` call
3. Add to `MemoryTypeMap` and `MemoryType` union

### Gap 3: Rounds Not Data-Driven

Currently, round counts are hard-coded in strategy `apply()` methods. The target is to derive round counts from the statement's `LapFragment` (or `RoundsFragment`). The `ChildrenStrategy` partially does this for timer-bound blocks but uses a boolean `hasTimer` check rather than reading fragment data.

### Gap 4: Early Termination Not Logged

When a parent timer expires, `TimerCompletionBehavior` calls `ctx.markComplete('timer-expired')`. The runtime then pops child blocks, but:
- Child blocks receive `onUnmount()` with no indication of *why* they're being unmounted
- No behavior writes a termination reason to child block memory
- Timer spans may not close with the correct timestamp if the child's timer was a secondary timer

**Resolution:** Add an `EarlyTerminationBehavior` that listens for parent completion events and records the cause, OR enhance `onUnmount` to receive a termination reason parameter.

### Gap 5: Timer Span Management Duplicated

Both `TimerTickBehavior` and `TimerPauseBehavior` manage TimeSpan lifecycle with identical code patterns:

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

### Gap 6: `calculateElapsed()` Duplicated 4 Times

| File | Implementation |
|------|----------|
| `TimerCompletionBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `TimerOutputBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `HistoryRecordBehavior.ts` | `calculateElapsed(timer, now)` (named function) |
| `SoundCueBehavior.ts` | Inline loop (identical logic) |

### Gap 7: Output Coordination Undocumented

Multiple output behaviors can coexist and must not duplicate outputs:
- `SegmentOutputBehavior`: emits 'segment' (mount) and 'completion' (unmount)
- `TimerOutputBehavior`: emits 'completion' (unmount) with timer data
- `RoundOutputBehavior`: emits 'milestone' (onNext)

Strategies must avoid composing both `SegmentOutputBehavior` and `TimerOutputBehavior` (both emit 'completion' on unmount), but this is not enforced.

---

## Refactoring Plan

### New Memory Types

#### `ReentryState`

```typescript
/**
 * Re-entry counter stored in memory.
 * Tracks how many times onNext() has been called on this block.
 */
export interface ReentryState {
    /** Number of times onNext() has been invoked (0 = never re-entered) */
    readonly count: number;
}
```

Add to `MemoryTypeMap`:

```typescript
export type MemoryType = 'timer' | 'round' | 'fragment' | 'completion' | 'display' | 'controls' | 'reentry';

export interface MemoryTypeMap {
    timer: TimerState;
    round: RoundState;
    fragment: FragmentState;
    completion: CompletionState;
    display: DisplayState;
    controls: ButtonsState;
    reentry: ReentryState;
}
```

### New Behaviors to Create

#### 1. `ReentryCounterBehavior` (Universal)

**Responsibility:** Initialize and increment the re-entry counter on every `onNext()` call.

```typescript
/**
 * ReentryCounterBehavior tracks how many times a block is re-entered.
 * 
 * ## Aspect: Lifecycle (Universal)
 * 
 * Every block gets this behavior. The counter starts at 0 on mount
 * and increments by 1 on every onNext() call.
 * 
 * Use cases:
 * - Distinguish first-entry from re-entry in downstream behaviors
 * - Provide a universal iteration metric independent of RoundState
 * - Enable loop detection without coupling to timer/round logic
 */
export class ReentryCounterBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.setMemory('reentry', { count: 0 });
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const state = ctx.getMemory('reentry') as ReentryState | undefined;
        const current = state?.count ?? 0;
        ctx.setMemory('reentry', { count: current + 1 });
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
```

#### 2. `TimerSpanBehavior`

**Responsibility:** Sole owner of TimeSpan lifecycle in timer memory. Consolidates span management from `TimerTickBehavior.onUnmount()` and `TimerPauseBehavior`.

```typescript
/**
 * TimerSpanBehavior manages the TimeSpan lifecycle in timer memory.
 * 
 * ## Aspect: Time (Span Management)
 * 
 * Consolidates all span open/close operations:
 * - Subscribes to timer:pause → closes current span
 * - Subscribes to timer:resume → opens new span
 * - On unmount → closes final open span (with latest clock timestamp)
 * 
 * Replaces span management previously split across
 * TimerTickBehavior and TimerPauseBehavior.
 * 
 * ## Early Termination
 * 
 * When a block is popped early (parent timer expired, user stop),
 * onUnmount still fires, ensuring the final span is closed with
 * the accurate clock timestamp. This is critical for Invariant 7.
 */
export class TimerSpanBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.subscribe('timer:pause', (_event, pauseCtx) => {
            this.closeCurrentSpan(pauseCtx);
            return [];
        });

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

#### 3. `PauseStateBehavior`

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

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] { return []; }
    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] { return []; }

    get paused(): boolean { return this.isPaused; }
}
```

#### 4. `CompletionTimestampBehavior` (Universal)

**Responsibility:** Ensure every block records its completion timestamp and closes its timer span on unmount — regardless of whether the block completed normally or was terminated early.

```typescript
/**
 * CompletionTimestampBehavior records the completion timestamp for a block.
 * 
 * ## Aspect: Output (Universal)
 * 
 * Every block gets this behavior. On unmount:
 * 1. Reads the completion state to determine the reason
 * 2. If no reason is set (early termination by parent), writes 'terminated-early'
 * 3. Records completedAt timestamp in completion memory
 * 4. Emits a 'completion' output with the timestamp and reason
 * 
 * This satisfies Invariant 6 (all blocks timestamp completion) and
 * Invariant 7 (early termination is logged).
 */
export class CompletionTimestampBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] { return []; }
    onNext(_ctx: IBehaviorContext): IRuntimeAction[] { return []; }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();
        const completion = ctx.getMemory('completion') as CompletionState | undefined;

        // If no completion reason was set, this block was terminated early
        const reason = completion?.reason ?? 'terminated-early';
        const isEarlyTermination = !completion?.isComplete;

        // Update completion memory with timestamp
        ctx.setMemory('completion', {
            isComplete: completion?.isComplete ?? false,
            reason,
            completedAt: now
        });

        // Emit completion output with termination context
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const elapsed = timer ? calculateElapsed(timer, now) : 0;

        ctx.emitOutput('completion', [], {
            label: isEarlyTermination
                ? `${ctx.block.label} [${reason}] — ${formatDuration(elapsed)}`
                : `${ctx.block.label} — ${formatDuration(elapsed)}`
        });

        return [];
    }
}
```

### Behaviors to Split

#### 1. `TimerTickBehavior` → `TimerTickBehavior` (simplified) + `TimerSpanBehavior` (new)

**Current `TimerTickBehavior`** does two things:
- Subscribes to tick events (currently a no-op subscription since UI computes elapsed from spans)
- Closes the final span on unmount

**After split:** `TimerTickBehavior` is simplified to only subscribe to tick events. Span closing moves to `TimerSpanBehavior`.

#### 2. `TimerPauseBehavior` → absorbed into `TimerSpanBehavior` + `PauseStateBehavior`

**Current `TimerPauseBehavior`** does two things:
- Tracks `isPaused` flag (instance state)
- Opens/closes TimeSpans on pause/resume events

**After split:** Span open/close moves to `TimerSpanBehavior`. Pause flag tracking moves to `PauseStateBehavior`.

### Behaviors to Keep As-Is

These behaviors already follow SRP and have clean boundaries:

| Behavior | Why It's Clean |
|----------|---------------|
| `TimerInitBehavior` | Single responsibility: initialize timer memory. **Now universal.** |
| `TimerCompletionBehavior` | Single responsibility: check elapsed vs duration on tick. Clean. |
| `RoundInitBehavior` | Single responsibility: initialize round memory. No overlap. |
| `RoundAdvanceBehavior` | Single responsibility: increment round counter on next(). Clean. |
| `RoundCompletionBehavior` | Single responsibility: check rounds exhausted on next(). Clean. |
| `RoundDisplayBehavior` | Single responsibility: update display.roundDisplay. Clean. |
| `RoundOutputBehavior` | Single responsibility: emit round milestone on next(). Clean. |
| `PopOnNextBehavior` | Single responsibility: mark complete on next(). Minimal. |
| `PopOnEventBehavior` | Single responsibility: mark complete on event. Minimal. |
| `DisplayInitBehavior` | Single responsibility: initialize display memory. No overlap. |
| `SegmentOutputBehavior` | Single responsibility: emit segment/completion outputs. Clean. |
| `TimerOutputBehavior` | Single responsibility: emit timer completion output. Clean. |
| `HistoryRecordBehavior` | Single responsibility: emit history record. Clean. |
| `ButtonBehavior` | Single responsibility: manage button state. Clean. |
| `ChildRunnerBehavior` | Pushing children + exposing loop state. Acceptable coupling with ChildLoop. |
| `ChildLoopBehavior` | Single responsibility: reset child index when looping. Clean. |
| `SoundCueBehavior` | Cohesive around "sound cues". Extract utility only. |

### Behaviors to Delete

| Behavior | Reason |
|----------|--------|
| `IdleInjectionBehavior` | Deprecated no-op stub. All methods return `[]`. No references. |
| `TimerPauseBehavior` (current) | Replaced by `TimerSpanBehavior` + `PauseStateBehavior`. |

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
- `CompletionTimestampBehavior.ts` — import on creation

---

## Final Behavior Catalog

After refactoring, the behavior catalog will be:

### Universal Behaviors (every block gets these)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `TimerInitBehavior` | Initialize timer state | `onMount`: write timer | W: timer |
| `TimerSpanBehavior` | Manage TimeSpan open/close | `onMount`: subscribe pause/resume; `onUnmount`: close span | U: timer |
| `ReentryCounterBehavior` | Track next() call count | `onMount`: write reentry; `onNext`: increment | W/U: reentry |
| `CompletionTimestampBehavior` | Record completion time + reason | `onUnmount`: write completion, emitOutput | W: completion, R: timer |
| `DisplayInitBehavior` | Initialize display state | `onMount`: write display | W: display |

### Time Aspect (2 additional behaviors, added based on block type)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `TimerTickBehavior` | Subscribe to tick events | `onMount`: subscribe tick | R: timer |
| `TimerCompletionBehavior` | Mark complete on countdown expiry | `onMount`: subscribe tick, check zero | R: timer, M: completion |

### Iteration Aspect (4 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `RoundInitBehavior` | Initialize round state (from fragment data) | `onMount`: write round | W: round |
| `RoundAdvanceBehavior` | Increment round counter | `onNext`: update round | U: round |
| `RoundCompletionBehavior` | Mark complete when rounds done | `onNext`: check round | R: round, M: completion |
| `RoundDisplayBehavior` | Update display with round text | `onMount`, `onNext`: update display | R: round, U: display |

### Children Aspect (2 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `ChildRunnerBehavior` | Push child blocks | `onMount`, `onNext`: compile & push | None |
| `ChildLoopBehavior` | Reset child index for looping | `onNext`: check & reset | R: timer, round |

### Completion Aspect (2 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `PopOnNextBehavior` | Complete on user advance | `onNext`: markComplete + PopAction | M: completion |
| `PopOnEventBehavior` | Complete on event | `onMount`: subscribe events | M: completion |

### Controls Aspect (2 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `ButtonBehavior` | Manage button state | `onMount`: write controls; `onUnmount`: clear | W: controls |
| `PauseStateBehavior` | Track pause/resume state | `onMount`: subscribe pause/resume | None (instance) |

### Output Aspect (5 behaviors)

| Behavior | Responsibility | Lifecycle Hooks | Memory |
|----------|---------------|-----------------|--------|
| `SegmentOutputBehavior` | Emit segment outputs on mount | `onMount`: emitOutput | R: fragments |
| `TimerOutputBehavior` | Emit timer completion output | `onUnmount`: emitOutput | R: timer |
| `RoundOutputBehavior` | Emit round milestones | `onNext`: emitOutput | R: round |
| `HistoryRecordBehavior` | Emit history record event | `onUnmount`: emitEvent | R: timer, round, reentry |
| `SoundCueBehavior` | Emit sound cue outputs | `onMount`, `onUnmount`, tick: emitOutput | R: timer |

### Deleted

| Behavior | Reason |
|----------|--------|
| `IdleInjectionBehavior` | Deprecated no-op, unused |
| `TimerPauseBehavior` | Replaced by `TimerSpanBehavior` + `PauseStateBehavior` |

**Total: 20 behaviors → 22 behaviors** (2 deleted, 4 created: `ReentryCounterBehavior`, `TimerSpanBehavior`, `PauseStateBehavior`, `CompletionTimestampBehavior`)

---

## Block Composition Matrix

This matrix shows which behaviors compose each block type. **Universal behaviors** are present on every block and shown in a separate section.

### Legend

- ✅ = Always present
- ⬜ = Not used
- 🔄 = Conditional (based on fragments or configuration)

### Universal Layer (ALL blocks)

| Behavior | Root | AMRAP | EMOM | Timer (↓) | Timer (↑) | Rounds | Group | Effort | Idle |
|----------|:----:|:-----:|:----:|:---------:|:---------:|:------:|:-----:|:------:|:----:|
| `TimerInitBehavior` | ✅ up¹ | ✅ down | ✅ down | ✅ down | ✅ up | ✅ up² | ✅ up² | ✅ up² | ✅ up² |
| `TimerSpanBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ReentryCounterBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `CompletionTimestampBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `DisplayInitBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ¹ = Primary timer, drives UI display. ² = Secondary timer, tracks duration only (role: 'secondary').

### Conditional Layer (varies by block type)

| Behavior | Root | AMRAP | EMOM | Timer (↓) | Timer (↑) | Rounds | Group | Effort | Idle |
|----------|:----:|:-----:|:----:|:---------:|:---------:|:------:|:-----:|:------:|:----:|
| **Time** | | | | | | | | | |
| `TimerTickBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `TimerCompletionBehavior` | ⬜ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Iteration** | | | | | | | | | |
| `RoundInitBehavior` | 🔄³ | ✅ ∞ | ✅ N | ⬜ | ⬜ | ✅ N | 🔄⁴ | ⬜ | ⬜ |
| `RoundAdvanceBehavior` | 🔄³ | ✅ | ✅ | ⬜ | ⬜ | ✅ | 🔄⁴ | ⬜ | ⬜ |
| `RoundCompletionBehavior` | 🔄³ | ⬜ | ✅ | ⬜ | ⬜ | ✅ | 🔄⁴ | ⬜ | ⬜ |
| `RoundDisplayBehavior` | 🔄³ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ |
| `RoundOutputBehavior` | 🔄³ | ✅ | ✅ | ⬜ | ⬜ | ✅ | 🔄⁴ | ⬜ | ⬜ |
| **Children** | | | | | | | | | |
| `ChildRunnerBehavior` | ✅ | ✅* | ✅* | ⬜ | ⬜ | ✅* | ✅* | ⬜ | ⬜ |
| `ChildLoopBehavior` | ⬜ | ✅* | ✅* | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Completion** | | | | | | | | | |
| `PopOnNextBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ✅ | 🔄 |
| `PopOnEventBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔄 |
| **Controls** | | | | | | | | | |
| `ButtonBehavior` | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔄 |
| `PauseStateBehavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Output** | | | | | | | | | |
| `SegmentOutputBehavior` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ |
| `TimerOutputBehavior` | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `HistoryRecordBehavior` | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ | ⬜ |
| `SoundCueBehavior` | ⬜ | ✅ | ✅ | ✅ | 🔄 | ⬜ | ⬜ | ⬜ | ⬜ |

> **\*** = Added by `ChildrenStrategy` enhancement, not by the primary strategy
> **³** = Added if workout has multi-round configuration
> **⁴** = Added by `ChildrenStrategy` as default single-pass round tracking
> **∞** = Unbounded rounds (totalRounds=undefined)
> **N** = Bounded rounds derived from lap/rounds fragment on compiled statement

### Output Behavior Mutual Exclusion Rules

These behaviors must NOT be combined on the same block (both emit `'completion'` on unmount):

| Combination | Risk | Resolution |
|------------|------|------------|
| `SegmentOutputBehavior` + `TimerOutputBehavior` | Duplicate 'completion' output | Use one or the other. Effort blocks use `SegmentOutput`; timer blocks use `TimerOutput`. |
| Any output behavior + `CompletionTimestampBehavior` | `CompletionTimestamp` always emits completion | `CompletionTimestamp` is the *fallback*; if a specialized output behavior (e.g., `TimerOutputBehavior`) is present, it should suppress `CompletionTimestamp` or `CompletionTimestamp` should detect the existing output and skip. |

**Recommended approach:** `CompletionTimestampBehavior` checks whether a 'completion' output was already emitted by a prior behavior in the same unmount cycle. If so, it only writes the completion memory (timestamp + reason) without emitting a duplicate output.

---

## Block Type Compositions

### Universal Base (applied to ALL blocks by a base strategy or builder hook)

```
TimerInit(direction, role) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit
```

### Root Workout Block

```
[Universal: TimerInit(up, primary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(clock)]
  → TimerTick → PauseState
  → [RoundInit(N) → RoundAdvance → RoundCompletion → RoundDisplay → RoundOutput]  (if multi-round)
  → ChildRunner
  → ButtonBehavior(pause, next, stop)
  → HistoryRecord
```

### AMRAP Block

```
[Universal: TimerInit(down, primary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(countdown)]
  → TimerTick → PauseState → TimerCompletion
  → RoundInit(∞ from fragment) → RoundAdvance → RoundDisplay → RoundOutput
  → [ChildLoop → ChildRunner]  (via ChildrenStrategy)
  → TimerOutput → HistoryRecord
  → SoundCue(mount, countdown 3-2-1, complete)
```

### EMOM Block

```
[Universal: TimerInit(down, primary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(countdown)]
  → TimerTick → PauseState → TimerCompletion
  → RoundInit(N from fragment) → RoundAdvance → RoundCompletion → RoundDisplay → RoundOutput
  → [ChildLoop → ChildRunner]  (via ChildrenStrategy)
  → TimerOutput → HistoryRecord
  → SoundCue(mount, countdown 3-2-1, complete)
```

### Countdown Timer Block (e.g., `:60 Work`)

```
[Universal: TimerInit(down, primary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(countdown)]
  → TimerTick → PauseState → TimerCompletion
  → TimerOutput
  → SoundCue(countdown 3-2-1, complete)
```

### Count-Up Timer Block (e.g., `For Time`)

```
[Universal: TimerInit(up, primary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(clock)]
  → TimerTick → PauseState
  → PopOnNext
  → TimerOutput
```

### Rounds Block (e.g., `(3 Rounds)`)

```
[Universal: TimerInit(up, secondary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(clock)]
  → RoundInit(N from fragment) → RoundAdvance → RoundCompletion → RoundDisplay → RoundOutput
  → [ChildRunner]  (via ChildrenStrategy)
  → HistoryRecord
```

### Group Block (children, no timer/rounds)

```
[Universal: TimerInit(up, secondary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(clock)]
  → [ChildRunner]  (via ChildrenStrategy, adds single-pass RoundInit)
  → HistoryRecord
```

### Effort Block (e.g., `10 Push-ups`)

```
[Universal: TimerInit(up, secondary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(hidden)]
  → PopOnNext
  → SegmentOutput
```

### Idle Block (transition screens)

```
[Universal: TimerInit(up, secondary) → TimerSpan → ReentryCounter → CompletionTimestamp → DisplayInit(clock)]
  → PopOnNext | PopOnEvent  (configurable)
  → [ButtonBehavior]  (if button configured)
```

---

## Behavior Ordering Contract

Behaviors execute in array order. The following ordering constraints **must** be respected.

### Hard Dependencies (will break if violated)

| Rule | Reason |
|------|--------|
| `TimerInitBehavior` before any timer-reading behavior | Timer memory must exist before read |
| `TimerSpanBehavior` after `TimerInitBehavior` | Timer must exist before span management |
| `ReentryCounterBehavior` before round behaviors | Counter must exist for round behaviors to read |
| `RoundInitBehavior` before `RoundAdvanceBehavior` | Round memory must exist before increment |
| `RoundAdvanceBehavior` before `RoundCompletionBehavior` | Must increment before checking exhaustion |
| `ChildLoopBehavior` before `ChildRunnerBehavior` | Must reset index before runner checks it |
| `DisplayInitBehavior` before `RoundDisplayBehavior` | Display memory must exist before update |
| `CompletionTimestampBehavior` after all other output behaviors | Must be last output to detect duplicates |

### Soft Dependencies (better output if respected)

| Rule | Reason |
|------|--------|
| `RoundAdvanceBehavior` before `RoundDisplayBehavior` | Display shows updated round number |
| Init behaviors before output behaviors | Output reads initialized state |
| Completion behaviors before output behaviors | Output reflects completion state |

### Recommended Canonical Order

```
1. Universal Init    → TimerInit, TimerSpan, ReentryCounter, DisplayInit
2. Tick/Event Subs   → TimerTick, PauseState
3. Children          → ChildLoop, ChildRunner
4. State Advancement → RoundInit, RoundAdvance
5. Completion Check  → TimerCompletion, RoundCompletion, PopOnNext, PopOnEvent
6. Display Updates   → RoundDisplay
7. Controls          → ButtonBehavior
8. Output            → SegmentOutput, TimerOutput, RoundOutput, HistoryRecord, SoundCue
9. Universal Output  → CompletionTimestamp (always last)
```

---

## Migration Path

### Phase 1: Extract Shared Utilities (non-breaking)

1. Create `src/runtime/utils/timerUtils.ts` with `calculateElapsed()` and `formatDuration()`
2. Update `TimerCompletionBehavior`, `TimerOutputBehavior`, `HistoryRecordBehavior`, `SoundCueBehavior` to import from utility
3. Delete local duplicates
4. Run existing tests — **zero behavior changes**

### Phase 2: Add `ReentryState` Memory Type (non-breaking)

1. Add `ReentryState` interface to `MemoryTypes.ts`
2. Add `'reentry'` to `MemoryType` union and `MemoryTypeMap`
3. Create `ReentryCounterBehavior` in `src/runtime/behaviors/`
4. Add tests for counter initialization and increment
5. Do NOT add to strategies yet

### Phase 3: Create `TimerSpanBehavior` + `PauseStateBehavior` (non-breaking)

1. Create `TimerSpanBehavior` in `src/runtime/behaviors/`
2. Create `PauseStateBehavior` in `src/runtime/behaviors/`
3. Add tests for span close/open operations and pause state tracking
4. Do NOT remove old behaviors yet

### Phase 4: Create `CompletionTimestampBehavior` (non-breaking)

1. Create `CompletionTimestampBehavior` in `src/runtime/behaviors/`
2. Add tests for normal completion, early termination, and duplicate output detection
3. Do NOT add to strategies yet

### Phase 5: Make Timer Universal (breaking — incremental)

1. Add `TimerInitBehavior(up, role: 'secondary')` to strategies that lack it:
   - `EffortFallbackStrategy`
   - `GenericLoopStrategy`
2. Make `IdleBlockStrategy` timer unconditional (remove `trackTiming` flag)
3. Add `TimerSpanBehavior` alongside existing `TimerPauseBehavior` (temporary overlap)
4. Run tests — verify no regressions

### Phase 6: Add Universal Behaviors to All Strategies (breaking)

1. Add `ReentryCounterBehavior` to all strategy `apply()` / `buildBehaviors()` methods
2. Add `CompletionTimestampBehavior` as the last behavior in every strategy
3. **Alternative:** Create a `UniversalBehaviorStrategy` enhancement at lowest priority that adds all universal behaviors if not present
4. Run full test suite

### Phase 7: Swap Timer Span Management (breaking)

1. Update all strategies to use `TimerSpanBehavior` + `PauseStateBehavior` instead of `TimerPauseBehavior`
2. Simplify `TimerTickBehavior` — remove `onUnmount` span closing
3. Update `behaviors/index.ts` exports
4. Run full test suite

### Phase 8: Cleanup (breaking)

1. Delete `TimerPauseBehavior`
2. Delete `IdleInjectionBehavior`
3. Remove `trackTiming` from `IdleBlockConfig`
4. Remove from `behaviors/index.ts`
5. Final test pass

### Phase 9: Refactor Round Tracking to Fragment-Driven (breaking)

1. Update `ChildrenStrategy` to read `RoundsFragment` / `LapFragment` from compiled statement
2. Remove hard-coded round counts from logic strategies where fragment data exists
3. Ensure `RoundOutputBehavior` is added for all parent block categories (timer-bound, unbound, defined)
4. Run full test suite + Storybook validation

### Phase 10: Documentation

1. Update `docs/diagrams/behavior-memory-matrix.md`
2. Update `docs/domain-model/contracts/IRuntimeBehavior.md`
3. Update strategy JSDoc comments
4. Document universal invariants in `AGENTS.md`

---

## Summary of Changes

| Action | Count | Details |
|--------|:-----:|---------|
| **Create behavior** | 4 | `ReentryCounterBehavior`, `TimerSpanBehavior`, `PauseStateBehavior`, `CompletionTimestampBehavior` |
| **Create memory type** | 1 | `ReentryState` (+ update `MemoryType` union and `MemoryTypeMap`) |
| **Delete behavior** | 2 | `IdleInjectionBehavior`, `TimerPauseBehavior` |
| **Simplify behavior** | 1 | `TimerTickBehavior` (remove span closing from onUnmount) |
| **Extract utility** | 1 | `timerUtils.ts` shared utility (deduplicate 4 copies of `calculateElapsed`) |
| **Modify strategies** | 6 | Add universal behaviors to `EffortFallbackStrategy`, `GenericLoopStrategy`, `GenericTimerStrategy`, `IdleBlockStrategy`, `WorkoutRootStrategy`, `ChildrenStrategy` |
| **Keep unchanged** | 16 | All other behaviors remain as-is |
| **New invariants** | 9 | Universal timer, re-entry counter, universal completion timestamp, early termination logging, fragment-driven rounds, timer event stack cleanup, sound output ownership |

### Key Simplifications Achieved

| Before | After | Simplification |
|--------|-------|----------------|
| Strategies check `hasBehavior(TimerInitBehavior)` | Every block has timer | Remove all `hasBehavior` checks for timer |
| `IdleBlockConfig.trackTiming` flag | Always track timing | Remove conditional, delete flag |
| `SoundStrategy` checks for timer | Timer always present | Simplify match logic |
| `HistoryStrategy` checks for timer/rounds | Timer always present | Simplify record construction |
| Span closing in 2 behaviors | `TimerSpanBehavior` owns all spans | Single source of truth |
| `calculateElapsed` in 4 files | `timerUtils.ts` | Single import |
| No early termination logging | `CompletionTimestampBehavior` handles all cases | Consistent lifecycle recording |
| Ad-hoc round configuration | Fragment-driven round counts | Data-driven, not strategy-driven |
| No re-entry tracking | `ReentryCounterBehavior` universal | Every block reports iteration count |
