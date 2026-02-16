# Phase 5 — Child Selection Aspect

## Goal

Merge `ChildRunnerBehavior` + `ChildLoopBehavior` + `RestBlockBehavior` into a single `ChildSelectionBehavior` that owns all child management: compilation, dispatch, looping, and rest injection.

## Duration: ~3–4 hours

## Rationale

This is the **highest-risk phase** because `ChildRunnerBehavior` is the most complex behavior in the system and is referenced by four other behaviors via `getBehavior()`. The ordering fragility (RestBlock → ChildLoop → ChildRunner must be in exact sequence) existed because three behaviors shared mutable state through direct references. As one behavior, the internal state machine is explicit and self-contained.

## Current State

| Behavior | Hook | What It Does | Coupling |
|----------|------|--------------|----------|
| `ChildRunnerBehavior` | `onMount`, `onNext` | Compiles child blocks via JIT. Dispatches next child on `onNext()`. Tracks `childIndex`, `allChildrenExecuted`, `allChildrenCompleted`. Emits `UpdateNextPreviewAction`. | **Read by:** `ChildLoopBehavior`, `RoundAdvanceBehavior`*, `RoundOutputBehavior`*, `RestBlockBehavior`, `SessionCompletionBehavior`* |
| `ChildLoopBehavior` | `onNext` | Checks if all children executed. If looping conditions met (timer running OR rounds unbounded), resets `ChildRunnerBehavior.childIndex` to 0. | **Reads:** `ChildRunnerBehavior.allChildrenExecuted`, `.resetChildIndex()`. Also reads `RestBlockBehavior.isRestPending`. |
| `RestBlockBehavior` | `onNext` | After all children executed, if countdown timer has remaining time, injects a rest block before the next loop iteration. Internal state machine: `idle` → `pending` → `active` → `idle`. | **Reads:** `ChildRunnerBehavior.allChildrenExecuted`, timer memory. |

*These couplings are already resolved by Phases 2 and 4 (they now read `children:status` memory instead).*

## New Behavior: `ChildSelectionBehavior`

### File: `src/runtime/behaviors/ChildSelectionBehavior.ts`

### Config
```typescript
export interface ChildSelectionConfig {
  /** Groups of statement indices to compile and dispatch */
  childGroups: number[][];
  /** Enable looping when all children complete */
  loop?: boolean | {
    /** Loop condition: always, while timer running, or while rounds remain */
    condition?: 'always' | 'timer-active' | 'rounds-remaining';
  };
  /** Inject rest blocks between loop iterations */
  injectRest?: boolean;
  /** Skip first child dispatch on mount (e.g., for deferred start) */
  skipOnMount?: boolean;
}
```

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | Initialize internal state (`childIndex=0`, compile first child group). Dispatch first child (unless `skipOnMount`). Write `children:status` to memory. |
| `onNext` | 1. If current child just completed → mark as completed. 2. Advance `childIndex`. 3. If all children executed → check loop conditions. 4. If looping → optionally inject rest block → reset index. 5. Dispatch next child. 6. Write `children:status` to memory. Emit `UpdateNextPreviewAction`. |
| `onUnmount` | No-op (children are managed by the stack) |
| `onDispose` | Clear compiled references |

### Internal State Machine

```
INIT → DISPATCHING → ALL_EXECUTED → [REST_PENDING → REST_ACTIVE →] LOOP_RESET → DISPATCHING → ...
                                   → COMPLETED (if not looping)
```

### Memory Contract
- **Writes:** `children:status` tag — `ChildrenStatusState` (every mount/next)
- **Reads:** `timer` tag — to check if timer is still running (for loop condition + rest injection)
- **Reads:** `round` tag — to check if rounds remain (for loop condition)
- **Events consumed:** None
- **Events emitted:** `UpdateNextPreviewAction` (action, not event)

### Key Architectural Design

The three old behaviors communicated via `getBehavior()`:
```
RestBlockBehavior → reads → ChildRunnerBehavior.allChildrenExecuted
ChildLoopBehavior → reads → ChildRunnerBehavior.allChildrenExecuted
                  → calls → ChildRunnerBehavior.resetChildIndex()
                  → reads → RestBlockBehavior.isRestPending
```

As one behavior, this becomes internal state transitions:
```typescript
class ChildSelectionBehavior {
  private childIndex = 0;
  private restState: 'idle' | 'pending' | 'active' = 'idle';

  onNext(ctx) {
    // 1. Check rest state
    if (this.restState === 'active') {
      this.restState = 'idle';
      // Rest block just completed, continue to next child
    }

    // 2. Advance child or check completion
    if (this.childIndex >= this.totalChildren) {
      if (this.shouldLoop(ctx)) {
        if (this.shouldInjectRest(ctx)) {
          this.restState = 'pending';
          return [new CompileChildBlockAction(restBlock)];
        }
        this.childIndex = 0; // Loop reset
      } else {
        this.writeStatus(ctx);
        return [];
      }
    }

    // 3. Dispatch next child
    return this.dispatchNext(ctx);
  }
}
```

## Tasks

### 5.1 Create `ChildSelectionBehavior`

**File:** `src/runtime/behaviors/ChildSelectionBehavior.ts`

This is the largest single behavior in the system. Port logic from all three behaviors, consolidating the state machine.

Key internal methods:
- `dispatchNext(ctx)` — compile + push next child group
- `shouldLoop(ctx)` — check timer/round memory for loop conditions
- `shouldInjectRest(ctx)` — check countdown timer has remaining time
- `writeStatus(ctx)` — write `children:status` to memory (replaces the Phase 2 shim)
- `compileRestBlock(ctx)` — create rest block for injection

### 5.2 Create `ChildSelectionBehavior.test.ts`

**File:** `src/runtime/behaviors/__tests__/ChildSelectionBehavior.test.ts`

Test cases (port + expand from existing tests):

**Basic dispatch:**
- Dispatches first child on mount
- Dispatches next child on subsequent next() calls  
- Tracks childIndex correctly
- Returns CompileChildBlockAction with correct statement indices
- Emits UpdateNextPreviewAction

**Status tracking:**
- Writes children:status to memory on mount
- Writes children:status on each next()
- allExecuted is true when childIndex reaches totalChildren
- allCompleted is true when last dispatched child has completed

**Looping:**
- Resets childIndex when loop enabled and all children executed
- Loops while timer is active (timer memory exists, not expired)
- Loops while rounds remain (round.current ≤ round.total)
- Does NOT loop when timer expired
- Does NOT loop when rounds exhausted

**Rest injection:**
- Injects rest block between loop iterations when countdown timer has time
- Does NOT inject rest for count-up timers
- Rest block state machine: idle → pending → active → idle
- Skips rest when timer has expired

**Edge cases:**
- Single child group
- Empty child groups
- skipOnMount configuration
- Multiple loop iterations

### 5.3 Remove `children:status` Shim from `ChildRunnerBehavior`

The shim added in Phase 2 is no longer needed. But since we're deleting `ChildRunnerBehavior` entirely, this is automatic.

### 5.4 Update `BlockBuilder.asContainer()`

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
// Before:
asContainer(config) {
    if (config.addLoop !== false) {
        this.addBehavior(new ChildLoopBehavior(config.loopConfig));
    }
    this.addBehavior(new ChildRunnerBehavior({ childGroups: config.childGroups, ... }));
}

// After:
asContainer(config) {
    this.addBehavior(new ChildSelectionBehavior({
        childGroups: config.childGroups,
        loop: config.addLoop !== false ? {
            condition: config.loopConfig?.condition ?? 'timer-active'
        } : false,
        injectRest: false,  // configured per-strategy
        skipOnMount: config.skipOnMount,
    }));
}
```

### 5.5 Update Strategies

- `ChildrenStrategy.ts` — replace `ChildRunnerBehavior` addition with `ChildSelectionBehavior`
- `AmrapLogicStrategy.ts` — update `RestBlockBehavior` → `injectRest: true` in child selection config
- `IntervalLogicStrategy.ts` — same
- `WorkoutRootStrategy.ts` — update `.asContainer()` call

### 5.6 Update `behaviors/index.ts`

- Add: `ChildSelectionBehavior`
- Remove: `ChildRunnerBehavior`, `ChildLoopBehavior`, `RestBlockBehavior`

### 5.7 Delete Old Behaviors

- `src/runtime/behaviors/ChildRunnerBehavior.ts`
- `src/runtime/behaviors/ChildLoopBehavior.ts`
- `src/runtime/behaviors/RestBlockBehavior.ts`

### 5.8 Update Existing Tests

Heavy test update phase:
- `src/runtime/behaviors/__tests__/ChildRunnerBehavior.test.ts` → port to `ChildSelectionBehavior.test.ts`
- `src/runtime/behaviors/__tests__/ChildLoopBehavior.test.ts` → port to `ChildSelectionBehavior.test.ts`
- `src/runtime/behaviors/__tests__/RestBlockBehavior.test.ts` → port to `ChildSelectionBehavior.test.ts`
- All integration tests that reference `ChildRunnerBehavior` by class
- `tests/strategies/RestBlockBehaviorIntegration.test.ts`

### 5.9 Validate

```bash
bun run test
bun run test:components
bun x tsc --noEmit
```

## Dependencies

- **Requires:** Phase 0 (ChildrenStatusState interface), Phase 2 (children:status contract established)
- **Required by:** Phase 7 (Labeling — optional, reads children:status)

## Risk: HIGH

`ChildRunnerBehavior` is the most complex behavior (compile + push + track + preview). It has the most external couplings (4 behaviors read from it) and the most internal state. The merge itself is sound architecturally, but the volume of test updates and edge cases is significant.

### Mitigation

1. **Write `ChildSelectionBehavior` tests first** (TDD) — define expected behavior before porting code
2. **Port one sub-concern at a time**: first basic dispatch, then looping, then rest injection
3. **Run integration tests after each sub-concern** — catch regressions early
4. **Keep `ChildRunnerBehavior` alive during development** — only delete after all tests pass with the new behavior

## Rollback

Revert to three separate behaviors. The `children:status` memory contract remains valid — it was a forward-compatible addition.
