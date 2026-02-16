# Phase 4 — Rounds End Aspect

## Goal

Merge `RoundCompletionBehavior` + `SessionCompletionBehavior` into a single `RoundsEndBehavior` that determines when a block completes based on round count exhaustion.

## Duration: ~1 hour

## Rationale

`SessionCompletionBehavior` was "rounds end where total = 1" — exactly the same concept as `RoundCompletionBehavior`. The session behavior also held a direct constructor reference to `ChildRunnerBehavior`, which is a coupling violation. The new behavior reads `round` and `children:status` memory instead.

## Current State

| Behavior | Hook | What It Does |
|----------|------|--------------|
| `RoundCompletionBehavior` | `onNext` | Reads `round` memory via `getMemory('round')`. If `current > total`, marks complete and returns `PopBlockAction`. |
| `SessionCompletionBehavior` | `onNext` | Holds injected `ChildRunnerBehavior` reference. Checks `allChildrenCompleted`. If true, marks complete and pops. |
| `CompletedBlockPopBehavior` | `onNext` | Checks if block is already marked complete. If so, returns `PopBlockAction`. Used as a safety net. |

## New Behavior: `RoundsEndBehavior`

### File: `src/runtime/behaviors/RoundsEndBehavior.ts`

### Config

None — reads memory directly.

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | No-op |
| `onNext` | 1. Read `round` memory. 2. If `current > total` (and total is defined), mark complete + pop. 3. For session blocks (total=1): read `children:status`. If `allCompleted`, mark complete + pop. |
| `onUnmount` | No-op |
| `onDispose` | No-op |

### Memory Contract
- **Reads:** `round` tag — `{ current, total }`
- **Reads:** `children:status` tag — `{ allCompleted }` (for session/single-round blocks)
- **Events consumed:** None
- **Events emitted:** None

### Key Architectural Change

**Before (behavior reference coupling):**
```typescript
// SessionCompletionBehavior constructor
constructor(private childRunner: ChildRunnerBehavior) {}

// onNext
if (this.childRunner.allChildrenCompleted) { markComplete(); }
```

**After (memory-based):**
```typescript
// RoundsEndBehavior.onNext()
const round = ctx.getMemory('round') as RoundState | undefined;
if (!round) return [];

if (round.total !== undefined && round.current > round.total) {
    ctx.markComplete('rounds-exhausted');
    return [new PopBlockAction()];
}

// For single-round session blocks: complete when children done
if (round.total === 1) {
    const childStatus = ctx.getMemory('children:status');
    if (childStatus?.allCompleted) {
        ctx.markComplete('session-complete');
        return [new PopBlockAction()];
    }
}
```

## Tasks

### 4.1 Create `RoundsEndBehavior`

**File:** `src/runtime/behaviors/RoundsEndBehavior.ts`

Unified round exhaustion check using memory.

### 4.2 Create `RoundsEndBehavior.test.ts`

Test cases:
- Completes block when current > total (bounded rounds)
- Does NOT complete for unbounded rounds (total = undefined)
- Does NOT complete when current ≤ total
- Completes session block (total=1) when children:status.allCompleted
- Does NOT complete session when children not done
- No-op when no round state exists
- Returns PopBlockAction on completion
- Sets appropriate completion reason

### 4.3 Evaluate `CompletedBlockPopBehavior`

Determine if `CompletedBlockPopBehavior` is still needed as a safety net, or if `RoundsEndBehavior` + `TimerEndingBehavior` cover all completion cases. If still needed, keep it unchanged.

### 4.4 Update `BlockBuilder.asRepeater()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
// Before:
if (config.addCompletion !== false) {
    this.addBehavior(new RoundCompletionBehavior());
}

// After:
if (config.addCompletion !== false) {
    this.addBehavior(new RoundsEndBehavior());
}
```

### 4.5 Update Strategies

- `ChildrenStrategy.ts` — replace `RoundCompletionBehavior` with `RoundsEndBehavior`
- `WorkoutRootStrategy.ts` / `SessionRootStrategy.ts` — replace `SessionCompletionBehavior` with `RoundsEndBehavior`

### 4.6 Update `behaviors/index.ts`

- Add: `RoundsEndBehavior`
- Remove: `RoundCompletionBehavior`, `SessionCompletionBehavior`

### 4.7 Delete Old Behaviors

- `src/runtime/behaviors/RoundCompletionBehavior.ts`
- `src/runtime/behaviors/SessionCompletionBehavior.ts`

### 4.8 Update Existing Tests

- `src/runtime/behaviors/__tests__/RoundCompletionBehavior.test.ts` → port to `RoundsEndBehavior.test.ts`
- Integration tests that reference `RoundCompletionBehavior` or `SessionCompletionBehavior`

### 4.9 Validate

```bash
bun run test
bun x tsc --noEmit
```

## Dependencies

- **Requires:** Phase 2 (ReEntryBehavior writes `round` memory; `children:status` shim exists)
- **Required by:** None (independent of later phases)

## Risk: Low

Both source behaviors are simple (`onNext` only). The merge is mechanical. The `children:status` memory contract was established in Phase 0 and shimmed in Phase 2.
