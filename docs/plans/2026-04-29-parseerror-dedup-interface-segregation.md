# ParseError Deduplication & IRuntimeSubscription Interface Segregation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Eliminate three duplicate `ParseError` definitions and extract `sendAnalyticsSummary` from `IRuntimeSubscription` into a new `ICastSubscription` interface.

**Architecture:** `ParseError` canonical source is `src/core/types/core.ts` (already exported via `@/core`). The two other definitions in `metrics.ts` and `views/runtime/types.ts` and `components/Editor/types/index.ts` become re-exports. `IRuntimeSubscription` loses `sendAnalyticsSummary`; a new `ICastSubscription extends IRuntimeSubscription` carries it. `ChromecastRuntimeSubscription` implements `ICastSubscription`. `ProjectionSyncContext` narrows its prop type to `ICastSubscription | null`.

**Tech Stack:** TypeScript, bun

---

## Task 1: Re-export ParseError from `src/core/types/metrics.ts`

**Objective:** Remove the duplicate definition; re-export from canonical source.

**Files:**
- Modify: `src/core/types/metrics.ts`

**Step 1: Replace the definition**

Find and replace in `src/core/types/metrics.ts`:

```ts
// REMOVE this block (lines ~12-24):
/**
 * Parse error for metric visualization
 */
export interface ParseError {
  /** Human-readable error message */
  message: string;
  
  /** Optional line number where error occurred */
  line?: number;
  
  /** Optional column position where error occurred */
  column?: number;
  
  /** Optional code excerpt showing error context */
  excerpt?: string;
}
```

Replace with:

```ts
export type { ParseError } from './core';
```

**Step 2: Verify type check still passes**

```bash
cd /home/serge/projects/wod-wiki/wod-wiki
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add src/core/types/metrics.ts
git commit -m "refactor: re-export ParseError from core in metrics.ts"
```

---

## Task 2: Re-export ParseError from `src/views/runtime/types.ts`

**Objective:** Remove duplicate definition; re-export from `@/core`.

**Files:**
- Modify: `src/views/runtime/types.ts`

**Step 1: Replace entire file content**

```ts
// Type definitions for metrics visualization components

export type { ParseError } from '@/core/types/core';
```

**Step 2: Verify**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected: no new errors. `MetricVisualizer.tsx` imports `ParseError` from `./types` — the re-export keeps that working.

**Step 3: Commit**

```bash
git add src/views/runtime/types.ts
git commit -m "refactor: re-export ParseError from core in views/runtime/types.ts"
```

---

## Task 3: Re-export ParseError from `src/components/Editor/types/index.ts`

**Objective:** Remove duplicate definition; re-export from `@/core`.

**Files:**
- Modify: `src/components/Editor/types/index.ts`

**Step 1: Replace the definition block**

Find (around line 28-42):

```ts
/**
 * Parse error information
 */
export interface ParseError {
  /** Line number (1-indexed for display) */
  line?: number;

  /** Column number (1-indexed for display) */
  column?: number;

  /** Error message */
  message: string;
```

And the closing `}`, replacing the entire block with:

```ts
export type { ParseError } from '@/core/types/core';
```

**Step 2: Verify**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

**Step 3: Run unit tests**

```bash
cd /home/serge/projects/wod-wiki/wod-wiki
~/.bun/bin/bun test 2>&1 | tail -10
```

Expected: all pass.

**Step 4: Commit**

```bash
git add src/components/Editor/types/index.ts
git commit -m "refactor: re-export ParseError from core in Editor/types/index.ts"
```

---

## Task 4: Create `ICastSubscription`

**Objective:** Define the new interface that carries `sendAnalyticsSummary`.

**Files:**
- Create: `src/runtime/contracts/ICastSubscription.ts`

**Step 1: Create file**

```ts
import { IRuntimeSubscription } from './IRuntimeSubscription';

/**
 * ICastSubscription — extends IRuntimeSubscription with Chromecast-specific
 * analytics delivery. Only ChromecastRuntimeSubscription implements this.
 *
 * Use the isCastSubscription() type guard when narrowing from IRuntimeSubscription.
 */
export interface ICastSubscription extends IRuntimeSubscription {
    /**
     * Send analytics summary with projection results to the Chromecast receiver.
     * Called when the workout completes to trigger the focused review screen.
     */
    sendAnalyticsSummary(
        projections: Array<{ name: string; value: number; unit: string; metricType?: string }>,
        totalDurationMs: number,
        completedSegments: number,
    ): void;
}

/**
 * Type guard — narrows IRuntimeSubscription to ICastSubscription.
 */
export function isCastSubscription(s: IRuntimeSubscription): s is ICastSubscription {
    return 'sendAnalyticsSummary' in s;
}
```

**Step 2: Verify file parses**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected: no new errors (interface isn't wired yet).

**Step 3: Commit**

```bash
git add src/runtime/contracts/ICastSubscription.ts
git commit -m "feat: add ICastSubscription interface and isCastSubscription type guard"
```

---

## Task 5: Remove `sendAnalyticsSummary` from `IRuntimeSubscription`

**Objective:** Base interface should not carry Chromecast-only methods.

**Files:**
- Modify: `src/runtime/contracts/IRuntimeSubscription.ts`

**Step 1: Remove the method**

Delete this block from `IRuntimeSubscription`:

```ts
    /**
     * Send analytics summary with projection results to Chromecast review.
     * Called by browser when workout completes to show focused review.
     */
    sendAnalyticsSummary(
        projections: Array<{ name: string; value: number; unit: string; metricType?: string }>,
        totalDurationMs: number,
        completedSegments: number,
    ): void;
```

**Step 2: Check TS errors**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected errors at this stage:
- `ChromecastRuntimeSubscription` — implements method not in interface (fine, will fix next)
- `ProjectionSyncContext` — calls method on `IRuntimeSubscription` type (fine, will fix next)

If any unexpected errors appear, investigate before proceeding.

**Step 3: Commit**

```bash
git add src/runtime/contracts/IRuntimeSubscription.ts
git commit -m "refactor: remove sendAnalyticsSummary from IRuntimeSubscription"
```

---

## Task 6: Update `ChromecastRuntimeSubscription` to implement `ICastSubscription`

**Objective:** Explicitly type the Chromecast subscription against the new interface.

**Files:**
- Modify: `src/services/cast/rpc/ChromecastRuntimeSubscription.ts`

**Step 1: Update import and implements clause**

Replace:
```ts
import { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
```

With:
```ts
import { ICastSubscription } from '@/runtime/contracts/ICastSubscription';
```

Replace:
```ts
export class ChromecastRuntimeSubscription implements IRuntimeSubscription {
```

With:
```ts
export class ChromecastRuntimeSubscription implements ICastSubscription {
```

**Step 2: Verify**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected: `ChromecastRuntimeSubscription` error clears. `ProjectionSyncContext` error remains.

**Step 3: Commit**

```bash
git add src/services/cast/rpc/ChromecastRuntimeSubscription.ts
git commit -m "refactor: ChromecastRuntimeSubscription implements ICastSubscription"
```

---

## Task 7: Narrow `ProjectionSyncContext` to `ICastSubscription`

**Objective:** Fix the final callsite that calls `sendAnalyticsSummary` on `IRuntimeSubscription`.

**Files:**
- Modify: `src/components/cast/ProjectionSyncContext.tsx`

**Step 1: Update import**

Add to imports:
```ts
import type { ICastSubscription } from '../../runtime/contracts/ICastSubscription';
```

Remove or keep (can keep for other uses):
```ts
import type { IRuntimeSubscription } from '../../runtime/contracts/IRuntimeSubscription';
```

**Step 2: Update prop type in `ProjectionSyncProviderProps`**

Replace:
```ts
    chromecastSubscription?: IRuntimeSubscription | null;
```

With:
```ts
    chromecastSubscription?: ICastSubscription | null;
```

**Step 3: Remove the optional chaining guard** (it was compensating for the weak type)

The existing code:
```ts
if (chromecastSubscription?.sendAnalyticsSummary) {
    chromecastSubscription.sendAnalyticsSummary(...)
}
```

Can simplify to:
```ts
if (chromecastSubscription) {
    chromecastSubscription.sendAnalyticsSummary(...)
}
```

**Step 4: Verify — no errors**

```bash
~/.bun/bin/bun x tsc --noEmit 2>&1 | grep -v "useWorkbenchSync"
```

Expected: zero errors (outside the pre-existing merge conflict).

**Step 5: Run all unit tests**

```bash
~/.bun/bin/bun test 2>&1 | tail -15
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/components/cast/ProjectionSyncContext.tsx
git commit -m "refactor: narrow ProjectionSyncContext to ICastSubscription"
```

---

## Verification Checklist

After all tasks:

- [ ] `grep -rn 'export interface ParseError' src/` returns only `src/core/types/core.ts`
- [ ] `grep -rn 'sendAnalyticsSummary' src/runtime/contracts/IRuntimeSubscription.ts` returns nothing
- [ ] `grep -rn 'ICastSubscription' src/` shows the new file + Chromecast + ProjectionSyncContext
- [ ] `~/.bun/bin/bun x tsc --noEmit` shows only the pre-existing `useWorkbenchSync` merge conflict errors
- [ ] `~/.bun/bin/bun test` passes

---

## Files Changed Summary

| Action | File |
|--------|------|
| Modify | `src/core/types/metrics.ts` — replace definition with re-export |
| Modify | `src/views/runtime/types.ts` — replace definition with re-export |
| Modify | `src/components/Editor/types/index.ts` — replace definition with re-export |
| Create | `src/runtime/contracts/ICastSubscription.ts` |
| Modify | `src/runtime/contracts/IRuntimeSubscription.ts` — remove `sendAnalyticsSummary` |
| Modify | `src/services/cast/rpc/ChromecastRuntimeSubscription.ts` — implement `ICastSubscription` |
| Modify | `src/components/cast/ProjectionSyncContext.tsx` — narrow to `ICastSubscription` |
