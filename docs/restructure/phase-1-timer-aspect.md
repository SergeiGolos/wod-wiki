# Phase 1 — Timer Aspect

## Goal

Merge `TimerInitBehavior` + `TimerTickBehavior` + `TimerPauseBehavior` into a single `TimerBehavior` that owns all time tracking: initialization, ticking, span management, and pause/resume.

## Duration: ~2–3 hours

## Rationale

A timer is one concept split across three classes. They share the same `timer` memory tag and coordinate via shared mutable state. Merging eliminates:
- State coordination between init → tick → pause
- The need for three separate subscribe/unsubscribe cycles
- Ordering sensitivity (init must run before tick/pause)

## Current State

| Behavior | Hook | What It Does |
|----------|------|--------------|
| `TimerInitBehavior` | `onMount` | Creates `TimerState` in memory (`pushMemory('timer', ...)`) with direction, durationMs, initial span |
| `TimerTickBehavior` | `onMount` | Subscribes to `tick` event (bubble). On unmount: closes current span via `updateMemory` |
| `TimerPauseBehavior` | `onMount` | Subscribes to `timer:pause` and `timer:resume` events. Pause closes current span; resume opens new span |

## New Behavior: `TimerBehavior`

### File: `src/runtime/behaviors/TimerBehavior.ts`

### Config
```typescript
export interface TimerConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  label?: string;
  role?: 'primary' | 'secondary';
}
```

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | 1. Create `TimerState` with initial span. 2. `pushMemory('timer', state)`. 3. Subscribe to `timer:pause` (close span). 4. Subscribe to `timer:resume` (open span). |
| `onNext` | End current span, start new span (for interval resets — consumed by EMOM). |
| `onUnmount` | Close current span if open. Compute elapsed/total. Push `ElapsedFragment` + `TotalFragment` to `fragment:result` memory. |
| `onDispose` | Unsubscribe from all events. |

### Memory Contract
- **Writes:** `timer` tag — `TimerState` (`{ spans: TimeSpan[], direction, durationMs, label, role }`)
- **Events consumed:** `timer:pause`, `timer:resume`
- **Events emitted:** None (timer is passive state)

### Key Differences from Current
1. `onNext` ends/starts spans — replaces the EMOM timer reset logic that was in `TimerCompletionBehavior` (moved to Phase 3)
2. `onUnmount` pushes elapsed/total fragments — absorbs `TimerOutputBehavior` duty (or this can wait for Phase 6)
3. No `tick` subscription needed in the timer itself — `TimerEndingBehavior` (Phase 3) handles countdown completion

## Tasks

### 1.1 Create `TimerBehavior`

**File:** `src/runtime/behaviors/TimerBehavior.ts`

Port logic from all three behaviors into unified lifecycle hooks. Key decisions:
- The `tick` event subscription is **NOT** needed here — elapsed time is computed from spans, not tick counts. The `tick` subscription in `TimerTickBehavior` was a no-op handler used only to keep the event bus alive.
- Pause/resume mutates the timer state in memory (same as `TimerPauseBehavior`).

### 1.2 Create `TimerBehavior.test.ts`

**File:** `src/runtime/behaviors/__tests__/TimerBehavior.test.ts`

Test cases (port from existing test files + new):
- Initializes timer state on mount (direction, durationMs, spans)
- Creates initial TimeSpan on mount
- Subscribes to pause/resume events
- Pause closes current span
- Resume opens new span
- Handles multiple pause/resume cycles
- Closes span on unmount
- Handles unmount when already paused (no open span)
- `onNext` ends current span and starts new one (interval boundary)

### 1.3 Update `BlockBuilder.asTimer()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
// Before:
asTimer(config) {
    this.addBehavior(new TimerInitBehavior({ ... }));
    this.addBehavior(new TimerTickBehavior());
    this.addBehavior(new TimerPauseBehavior());
    if (config.addCompletion !== false) {
        this.addBehavior(new TimerCompletionBehavior(config.completionConfig));
    }
}

// After:
asTimer(config) {
    this.addBehavior(new TimerBehavior({ ... }));
    if (config.addCompletion !== false) {
        this.addBehavior(new TimerCompletionBehavior(config.completionConfig));
    }
}
```

### 1.4 Update Strategies

Update these files to use `TimerBehavior` if they add timer behaviors directly (most use `.asTimer()` so no changes needed):

- `src/runtime/compiler/strategies/components/GenericTimerStrategy.ts`
- `src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts`
- `src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts`
- `src/runtime/compiler/strategies/WorkoutRootStrategy.ts`
- `src/runtime/compiler/strategies/IdleBlockStrategy.ts`
- `src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts`

Most of these call `.asTimer()` — the change is centralized in `BlockBuilder`.

### 1.5 Update `behaviors/index.ts`

- Add export for `TimerBehavior`
- Remove exports for `TimerInitBehavior`, `TimerTickBehavior`, `TimerPauseBehavior`

### 1.6 Delete Old Behaviors

- `src/runtime/behaviors/TimerInitBehavior.ts`
- `src/runtime/behaviors/TimerTickBehavior.ts`
- `src/runtime/behaviors/TimerPauseBehavior.ts`

### 1.7 Update Existing Tests

Tests that import old timer behaviors directly need updating:
- `src/runtime/behaviors/__tests__/AspectBehaviors.test.ts` — timer init assertions
- `src/runtime/behaviors/__tests__/AspectComposers.test.ts` — `.asTimer()` composition checks
- `src/runtime/behaviors/__tests__/integration/timer-block.test.ts`
- `src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts`
- `src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts`
- `tests/strategies/AmrapLogicStrategy.test.ts`
- `tests/strategies/IntervalLogicStrategy.test.ts`
- `tests/lifecycle/MountBehavior.test.ts`

### 1.8 Validate

```bash
bun run test           # No new failures
bun x tsc --noEmit     # No new type errors
```

## Dependencies

- **Requires:** Phase 0 (cleanup)
- **Required by:** Phase 3 (Timer Ending), Phase 6 (Report Output)

## Risk: Medium

Timer is the most exercised behavior. The merge is straightforward (same memory tag, same state shape) but touches many strategy files and test files. The `tick` event removal needs careful validation — ensure `SoundCueBehavior` and `TimerCompletionBehavior` still receive ticks (they subscribe independently).

## Rollback

If issues arise, revert to three separate behaviors. The memory contract (`timer` tag) is unchanged, so downstream behaviors are not affected.
