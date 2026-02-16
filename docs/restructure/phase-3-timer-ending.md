# Phase 3 — Timer Ending Aspect

## Goal

Replace `TimerCompletionBehavior`, `PopOnNextBehavior`, and `PopOnEventBehavior` with two clearly separated behaviors: `TimerEndingBehavior` (countdown-based completion) and `LeafExitBehavior` (user-advance exit for leaf blocks).

## Duration: ~1.5 hours

## Rationale

`TimerCompletionBehavior` had a dual-mode boolean (`completesBlock`) that switched between AMRAP (complete block) and EMOM (reset interval). This phase makes those modes explicit via a union config. Meanwhile, `PopOnNextBehavior` and `PopOnEventBehavior` were leaf-block exit mechanisms — not timer endings — and are consolidated into `LeafExitBehavior`.

## Current State

| Behavior | Hook | What It Does |
|----------|------|--------------|
| `TimerCompletionBehavior` | `onMount` | Subscribes to `tick` event. On tick: checks elapsed ≥ durationMs. If `completesBlock=true` (AMRAP): marks complete + pop. If `false` (EMOM): resets timer spans, clears children. |
| `PopOnNextBehavior` | `onNext` | Marks block complete, returns `PopBlockAction`. Used for leaf blocks (effort, simple timer). |
| `PopOnEventBehavior` | `onMount` | Subscribes to configured events. On event: marks complete, returns `PopBlockAction`. Used for idle/waiting blocks. |

## New Behaviors

### `TimerEndingBehavior`

**File:** `src/runtime/behaviors/TimerEndingBehavior.ts`

#### Config
```typescript
export type TimerEndingMode = 
  | { mode: 'complete-block' }      // AMRAP: mark complete on timer expiry
  | { mode: 'reset-interval' };     // EMOM: reset spans, don't complete

export interface TimerEndingConfig {
  ending: TimerEndingMode;
}
```

#### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | Subscribe to `tick` event (bubble). On tick: read `timer` memory, compute elapsed. If elapsed ≥ durationMs → execute mode action. |
| `onNext` | No-op |
| `onUnmount` | No-op |
| `onDispose` | Unsubscribe from tick |

#### Mode Actions

| Mode | On Timer Expiry |
|------|----------------|
| `complete-block` | `ctx.markComplete('timer-expired')`. Return `PopBlockAction`. |
| `reset-interval` | Reset timer spans in memory (close current, open new). Write `children:status` reset. Does NOT mark complete. |

#### Memory Contract
- **Reads:** `timer` tag
- **Writes:** `timer` tag (reset-interval mode only — new spans)
- **Events consumed:** `tick` (bubble)
- **Events emitted:** `timer:complete` (for coordination)

### `LeafExitBehavior`

**File:** `src/runtime/behaviors/LeafExitBehavior.ts`

#### Config
```typescript
export interface LeafExitConfig {
  /** Exit on user advance (next()) — default behavior */
  onNext?: boolean;        // default: true
  /** Exit on specific events */
  onEvents?: string[];     // e.g., ['timer:complete', 'user:skip']
}
```

#### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | If `onEvents` configured: subscribe to each event. On event: `markComplete(eventName)`, return `PopBlockAction`. |
| `onNext` | If `onNext` enabled: `markComplete('user-advance')`, return `PopBlockAction`. |
| `onUnmount` | No-op |
| `onDispose` | Unsubscribe from events |

## Tasks

### 3.1 Create `TimerEndingBehavior`

**File:** `src/runtime/behaviors/TimerEndingBehavior.ts`

Port tick subscription and completion logic from `TimerCompletionBehavior`. Use union config instead of boolean.

### 3.2 Create `TimerEndingBehavior.test.ts`

Test cases:
- `complete-block` mode: marks complete when elapsed ≥ duration
- `complete-block` mode: does NOT mark complete when elapsed < duration
- `complete-block` mode: emits `timer:complete` event
- `reset-interval` mode: resets timer spans when elapsed ≥ duration
- `reset-interval` mode: does NOT mark complete
- `reset-interval` mode: handles multiple resets
- Handles missing timer memory gracefully
- Unsubscribes on dispose

### 3.3 Create `LeafExitBehavior`

**File:** `src/runtime/behaviors/LeafExitBehavior.ts`

Merge `PopOnNextBehavior` + `PopOnEventBehavior` logic.

### 3.4 Create `LeafExitBehavior.test.ts`

Test cases:
- Marks complete and pops on next (default)
- Does not pop on next when disabled
- Subscribes to configured events
- Marks complete on event trigger
- Handles multiple event types
- Unsubscribes on dispose

### 3.5 Update `BlockBuilder.asTimer()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
// Before:
if (config.addCompletion !== false) {
    this.addBehavior(new TimerCompletionBehavior(config.completionConfig));
}

// After:
if (config.addCompletion !== false) {
    this.addBehavior(new TimerEndingBehavior({
        ending: config.completionConfig?.completesBlock === false
            ? { mode: 'reset-interval' }
            : { mode: 'complete-block' }
    }));
}
```

### 3.6 Update Strategies

Replace `PopOnNextBehavior` and `PopOnEventBehavior` with `LeafExitBehavior`:

- `GenericTimerStrategy.ts` — `PopOnNextBehavior` → `LeafExitBehavior({ onNext: true })`
- `EffortFallbackStrategy.ts` — `PopOnNextBehavior` → `LeafExitBehavior({ onNext: true })`
- `IdleBlockStrategy.ts` — `PopOnNextBehavior` + `PopOnEventBehavior` → `LeafExitBehavior({ onNext: true, onEvents: [...] })`
- `ChildrenStrategy.ts` — removes `PopOnNextBehavior` → update removal logic to target `LeafExitBehavior`

### 3.7 Update `behaviors/index.ts`

- Add: `TimerEndingBehavior`, `LeafExitBehavior`
- Remove: `TimerCompletionBehavior`, `PopOnNextBehavior`, `PopOnEventBehavior`

### 3.8 Delete Old Behaviors

- `src/runtime/behaviors/TimerCompletionBehavior.ts`
- `src/runtime/behaviors/PopOnNextBehavior.ts`
- `src/runtime/behaviors/PopOnEventBehavior.ts`

### 3.9 Update Existing Tests

- `src/runtime/behaviors/__tests__/PopOnNextBehavior.test.ts` → port to `LeafExitBehavior.test.ts`
- `src/runtime/behaviors/__tests__/AspectComposers.test.ts` — `.asTimer()` completion wiring
- Integration tests that check for `PopOnNextBehavior` or `TimerCompletionBehavior` by class

### 3.10 Validate

```bash
bun run test
bun x tsc --noEmit
```

## Dependencies

- **Requires:** Phase 1 (TimerBehavior writes timer memory)
- **Required by:** None directly (independent of later phases)

## Risk: Low

Clear 1:1 mapping from old to new. The union config pattern is well-understood. `LeafExitBehavior` is a simple merge of two simple behaviors.
