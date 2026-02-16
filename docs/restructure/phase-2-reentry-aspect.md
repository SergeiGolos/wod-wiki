# Phase 2 — Re-Entry Aspect

## Goal

Merge `RoundInitBehavior` + `RoundAdvanceBehavior` + `ReentryCounterBehavior` into a single `ReEntryBehavior` that owns round counter initialization, advancement, and entry tracking.

## Duration: ~2 hours

## Rationale

The re-entry count IS the round count — they were the same concept split across three classes. `ReentryCounterBehavior` tracked push/next calls independently from the round counter, creating redundancy. `RoundInitBehavior` and `RoundAdvanceBehavior` were split along lifecycle hooks but share the same `round` memory tag.

## Current State

| Behavior | Hook | What It Does |
|----------|------|--------------|
| `RoundInitBehavior` | `onMount` | Creates `CurrentRoundFragment` in memory (`pushMemory('round', ...)`) with `{current, total}` |
| `RoundAdvanceBehavior` | `onNext` | Reads `round` memory, increments `current`, writes `CurrentRoundFragment` via `updateMemory`. **Coupling:** Calls `getBehavior(ChildRunnerBehavior)` to check `allChildrenCompleted` |
| `ReentryCounterBehavior` | `onMount` | Tracks internal push/next count. Auto-added to all blocks by `BlockBuilder.build()` |

## New Behavior: `ReEntryBehavior`

### File: `src/runtime/behaviors/ReEntryBehavior.ts`

### Config
```typescript
export interface ReEntryConfig {
  totalRounds?: number;   // undefined = unbounded
  startRound?: number;    // default: 1
}
```

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | Create `CurrentRoundFragment(startRound, totalRounds)`. Push to `round` memory tag. |
| `onNext` | Read `children:status` memory (if present). If `allCompleted` is false, skip. Otherwise increment round: create new `CurrentRoundFragment(current+1, total)`, write to `round` memory via `updateMemory`. |
| `onUnmount` | No-op |
| `onDispose` | No-op |

### Memory Contract
- **Writes:** `round` tag — `CurrentRoundFragment` (`{ current, total }`)
- **Reads:** `children:status` tag — checks `allCompleted` to gate advancement (replaces `getBehavior(ChildRunnerBehavior)`)
- **Events consumed:** None
- **Events emitted:** None

### Key Architectural Change: Decoupling via Memory

**Before (coupling):**
```typescript
// RoundAdvanceBehavior.onNext()
const childRunner = block.getBehavior(ChildRunnerBehavior);
if (childRunner && !childRunner.allChildrenCompleted) return [];
```

**After (memory contract):**
```typescript
// ReEntryBehavior.onNext()
const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
if (childStatus && !childStatus.allCompleted) return [];
```

This requires `ChildRunnerBehavior` (or its replacement in Phase 5) to **write** `children:status` memory. Until Phase 5, we add a shim: `ChildRunnerBehavior` writes `children:status` on each lifecycle call.

## Tasks

### 2.1 Add `children:status` Writing to `ChildRunnerBehavior` (Shim)

**File:** `src/runtime/behaviors/ChildRunnerBehavior.ts`

Add memory writes at the end of `onMount`, `onNext` to surface the internal state:

```typescript
private writeChildrenStatus(ctx: IBehaviorContext): void {
    ctx.setMemory('children:status', {
        childIndex: this.childIndex,
        totalChildren: this.totalChildren,
        allExecuted: this.allChildrenExecuted,
        allCompleted: this.allChildrenCompleted,
    });
}
```

Call `this.writeChildrenStatus(ctx)` at the end of `onMount()` and `onNext()`.

This is a **forward-compatible shim** — when `ChildSelectionBehavior` replaces `ChildRunnerBehavior` in Phase 5, it will write the same memory tag natively.

### 2.2 Create `ReEntryBehavior`

**File:** `src/runtime/behaviors/ReEntryBehavior.ts`

Merge init + advance + counter logic. Use `children:status` memory instead of `getBehavior()`.

### 2.3 Create `ReEntryBehavior.test.ts`

**File:** `src/runtime/behaviors/__tests__/ReEntryBehavior.test.ts`

Test cases:
- Initializes round state on mount (current=1, total=N)
- Custom startRound
- Unbounded rounds (total=undefined)
- Advances round on next (leaf block — no children:status)
- Advances round on next when children:status.allCompleted=true
- Does NOT advance when children:status.allCompleted=false
- Handles missing children:status (treats as leaf block — always advance)
- Creates proper CurrentRoundFragment with sourceBlockKey and timestamp

### 2.4 Update `BlockBuilder.asRepeater()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
// Before:
asRepeater(config) {
    this.addBehavior(new RoundInitBehavior({ ... }));
    this.addBehavior(new RoundAdvanceBehavior());
    if (config.addCompletion !== false) {
        this.addBehavior(new RoundCompletionBehavior());
    }
}

// After:
asRepeater(config) {
    this.addBehavior(new ReEntryBehavior({ ... }));
    if (config.addCompletion !== false) {
        this.addBehavior(new RoundCompletionBehavior());
    }
}
```

### 2.5 Remove `ReentryCounterBehavior` from `build()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

Remove `this.addBehaviorIfMissing(new ReentryCounterBehavior())` from `build()`. The reentry count is now tracked by `ReEntryBehavior` (for blocks with rounds) or not needed (for leaf blocks).

### 2.6 Update Strategies

Strategies that add round behaviors directly (not via `.asRepeater()`):
- `src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts` — adds `RoundInitBehavior`, `RoundAdvanceBehavior` directly. Replace with `ReEntryBehavior`.

### 2.7 Update `behaviors/index.ts`

- Add export for `ReEntryBehavior`
- Remove exports for `RoundInitBehavior`, `RoundAdvanceBehavior`, `ReentryCounterBehavior`

### 2.8 Delete Old Behaviors

- `src/runtime/behaviors/RoundInitBehavior.ts`
- `src/runtime/behaviors/RoundAdvanceBehavior.ts`
- `src/runtime/behaviors/ReentryCounterBehavior.ts`

### 2.9 Update Existing Tests

- `src/runtime/behaviors/__tests__/RoundAdvanceBehavior.test.ts` → port to `ReEntryBehavior.test.ts`
- `src/runtime/behaviors/__tests__/AspectBehaviors.test.ts` — round init assertions
- `src/runtime/behaviors/__tests__/AspectComposers.test.ts` — `.asRepeater()` composition
- `src/runtime/behaviors/__tests__/RoundPromotion.test.ts` — round memory source
- `src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts`
- `src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts`
- `src/runtime/behaviors/__tests__/integration/loop-block.test.ts`

### 2.10 Validate

```bash
bun run test           # No new failures
bun x tsc --noEmit     # No new type errors
```

## Dependencies

- **Requires:** Phase 0 (ChildrenStatusState interface)
- **Required by:** Phase 4 (Rounds End), Phase 6 (Report Output)
- **Interacts with:** Phase 5 (ChildSelectionBehavior replaces the shim in ChildRunnerBehavior)

## Risk: Medium

The `children:status` shim in `ChildRunnerBehavior` adds temporary complexity but is necessary for decoupling. The shim is removed in Phase 5 when `ChildSelectionBehavior` natively writes this tag.

## Rollback

Revert to three separate behaviors. The `round` memory tag contract is unchanged.
