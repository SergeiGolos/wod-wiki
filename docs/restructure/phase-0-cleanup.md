# Phase 0 — Cleanup & Foundation

## Goal

Remove dead code and establish the memory-based communication contract that replaces `getBehavior()` coupling. This phase creates no new behaviors — it sets the stage.

## Duration: ~30 minutes

## Tasks

### 0.1 Delete `IdleInjectionBehavior`

The behavior is a deprecated no-op stub (all lifecycle hooks are empty).

**Files:**
- **Delete:** `src/runtime/behaviors/IdleInjectionBehavior.ts`
- **Modify:** `src/runtime/behaviors/index.ts` — remove export
- **Search:** `grep -r "IdleInjectionBehavior"` — remove any remaining imports (none expected)

### 0.2 Define `ChildrenStatusState` Interface

Create the `children:status` memory contract that `ChildSelectionBehavior` (Phase 5) will write and other behaviors will read instead of calling `getBehavior(ChildRunnerBehavior)`.

**File:** `src/runtime/memory/MemoryTypes.ts`

```typescript
/** Written by ChildSelectionBehavior to children:status memory tag */
export interface ChildrenStatusState {
  /** Index of the next child to dispatch (0-based) */
  childIndex: number;
  /** Total number of child groups */
  totalChildren: number;
  /** True when all child groups have been dispatched at least once */
  allExecuted: boolean;
  /** True when all dispatched children have completed (popped) */
  allCompleted: boolean;
}
```

### 0.3 Register `children:status` as a Memory Tag

**File:** `src/runtime/memory/MemoryLocation.ts`

Add `'children:status'` to the `MemoryTag` type union if not already present.

### 0.4 Validate

```bash
bun run test           # No new failures
bun x tsc --noEmit     # No new type errors
```

## Acceptance Criteria

- [ ] `IdleInjectionBehavior.ts` deleted, no imports remain
- [ ] `ChildrenStatusState` interface exists in `MemoryTypes.ts`
- [ ] `children:status` is a valid memory tag
- [ ] All tests pass (≤12 baseline failures)

## Risk: Low

No behavior logic changes. Pure cleanup.
