# E2E Test Failures: Infinite Render Loop Investigation

**Date:** 2026-04-29  
**Issue:** [#540](https://github.com/SergeiGolos/wod-wiki/issues/540)  
**Status:** In Progress — root cause identified, fix partially applied  
**Branch:** main (both wod-wiki and wod-wiki-e2e)

---

## Summary

Running the full e2e acceptance suite (`bun run test:e2e`) in `wod-wiki-e2e` results in 8/11 tests failing. All failures trace back to a **React infinite render loop** (`Maximum update depth exceeded`) that prevents the Storybook story from mounting at all.

The root cause is a **cascading instability chain** from `RuntimeLifecycleProvider` through `useWorkbenchEffects`. A state-based guard (`isInitializing`) in `RuntimeLifecycleProvider` causes `initializeRuntime` to be recreated on every state flip, which invalidates a `useEffect` dep array in `useWorkbenchEffects`, which re-initializes the runtime, which triggers a Zustand store update, which triggers a re-render — and the loop begins.

---

## Test Environment

| Repo | Branch | Status |
|------|--------|--------|
| `wod-wiki/wod-wiki` | main | Modified (handlers + runtime fixes) |
| `wod-wiki/wod-wiki-e2e` | main (merged) | Modified (GTM removed, StorybookWorkbench rewritten) |
| Storybook | localhost:6006 | Story crashes on mount |
| Test runner | Playwright via `bun run test:e2e` | 8/11 failing |

---

## Passing / Failing Test Breakdown

### ✅ Passing (3/11)
- Smoke: `story loads successfully` (Fran, Annie, Cindy/Barbara)

### ❌ Failing (8/11)
- All interaction tests: `Next button advances through all blocks`, `Review view shows results`, `story loads and advances through first round`
- Root cause: story never mounts due to render loop

---

## Root Cause Chain

### Level 1: `RuntimeLifecycleProvider` — unstable `initializeRuntime`

**File:** `src/components/layout/RuntimeLifecycleProvider.tsx`

```ts
// BEFORE (broken)
const initializeRuntime = useCallback((block: WodBlock) => {
  if (isInitializing) return;      // reads isInitializing state
  setIsInitializing(true);
  // ...
  setIsInitializing(false);         // in finally
}, [isInitializing]);               // ← dep on isInitializing STATE
```

Every call to `initializeRuntime` flips `isInitializing: false → true → false`. Each flip produces a **new `initializeRuntime` function reference** because the `useCallback` dep array includes `isInitializing`.

**Fix:** Replace state with a `useRef` for the guard so `initializeRuntime` has a stable `[]` dep array:

```ts
// AFTER (fixed)
const isInitializingRef = useRef(false);

const initializeRuntime = useCallback((block: WodBlock) => {
  if (isInitializingRef.current) return;
  isInitializingRef.current = true;
  setIsInitializing(true);
  // ...
  isInitializingRef.current = false;
  setIsInitializing(false);
}, []);  // stable — no reactive deps
```

---

### Level 2: `useWorkbenchEffects` — initialization effect re-fires on new `initializeRuntime` ref

**File:** `src/components/layout/useWorkbenchEffects.ts`

```ts
useEffect(() => {
  // ...
  if (viewMode === 'track') {
    initializeRuntime(selectedBlock);
  }
}, [viewMode, selectedBlock, initializeRuntime, disposeRuntime]);
//                            ^^^^^^^^^^^^^^^^
//  Every time initializeRuntime gets a new ref, this effect fires again.
//  It calls initializeRuntime → creates new ScriptRuntime → setRuntime(newRuntime)
```

When `initializeRuntime` is recreated (Level 1), this effect re-fires even in `track` mode, creating a brand-new `ScriptRuntime`. This triggers Level 3.

---

### Level 3: New `runtime` → new `execution` object → handlers change → `setHandles` loop

**Files:** `useRuntimeExecution.ts` → `useWorkbenchRuntime.ts` → `useWorkbenchEffects.ts`

```
setRuntime(newRuntime)
  → useRuntimeExecution(runtime) called with new runtime
  → new start/pause/stop/reset/step callbacks (useCallback([runtime, ...]))
  → useMemo([status, ..., start, pause, ...]) → new execution object
  → handleStart = useCallback(() => execution.start(), [execution]) → new handleStart
  → useEffect([handleStart, handlePause, ...]) → setHandles(...)
  → Zustand store update → subscribers re-render
  → WorkbenchContent re-renders → useWorkbenchEffects re-runs
  → initializeRuntime ref changed? (if isInitializing flipped again)
  → LOOP
```

---

### Level 4 (secondary): `execution` object not memoized

**File:** `src/runtime/hooks/useRuntimeExecution.ts`

The hook returned a fresh object literal on every render:

```ts
// BEFORE
return { status, elapsedTime, stepCount, startTime, start, pause, stop, reset, step };
```

Even when all values were stable, any re-render of the parent created a new object reference. Any `useCallback([execution])` depending on this object would be invalidated.

**Fix applied:** Wrapped the return in `useMemo`:

```ts
// AFTER
return useMemo(() => ({
  status, elapsedTime, stepCount, startTime, start, pause, stop, reset, step
}), [status, elapsedTime, stepCount, startTime, start, pause, stop, reset, step]);
```

This alone doesn't break the Level 1–3 chain (because `start` itself changes when `runtime` changes), but it reduces unnecessary invalidations when primitives are stable.

---

### Level 5 (secondary): `setExecution` effect depended on whole `execution` object

**File:** `src/components/layout/useWorkbenchEffects.ts`

```ts
// BEFORE
useEffect(() => {
  store.getState().setExecution(execution);
}, [execution]);  // new object every render → Zustand update → re-render → loop
```

**Fix applied:** Changed deps to stable primitives:

```ts
// AFTER
useEffect(() => {
  store.getState().setExecution(execution);
}, [execution.status, execution.elapsedTime, execution.stepCount, execution.startTime]);
```

---

## Changes Made in This Investigation

### `wod-wiki` repo

| File | Change | Status |
|------|--------|--------|
| `src/components/layout/RuntimeLifecycleProvider.tsx` | `isInitializingRef` guard; `initializeRuntime` dep `[]` | ✅ Applied |
| `src/runtime/hooks/useRuntimeExecution.ts` | `useMemo` on returned execution object; `useMemo` import added | ✅ Applied |
| `src/components/layout/useWorkbenchEffects.ts` | `setExecution` effect uses primitive deps instead of whole object | ✅ Applied |
| `src/components/workbench/useWorkbenchRuntime.ts` | Handlers wrapped in `useCallback([execution])` | ✅ Applied |

### `wod-wiki-e2e` repo

| File | Change | Status |
|------|--------|--------|
| `.storybook/preview-head.html` | Removed Google Tag Manager `<script>` (caused `ERR_CONNECTION_REFUSED` in isolated test env) | ✅ Applied |
| `stories/_shared/StorybookWorkbench.tsx` | Replaced `NoteEditor`-only render with full `Workbench` component import | ✅ Applied |

---

## What the Fix Unlocks

Once the render loop is broken (Level 1 fix is the critical one), the story should mount successfully. At that point the test flow is:

1. Story loads → `Workbench` renders in `plan` view
2. Test clicks the "Start Workout" / "Run" button → navigation to `track` view
3. `initializeRuntime(selectedBlock)` fires **once** (guarded by ref)
4. `ScriptRuntime` created → workout blocks available
5. Test clicks `[title="Next Block"]` button in `TimerStackView` → advances through blocks
6. After all blocks, `track` → `review` view transition
7. Test asserts `[data-testid="review-panel"]` or similar review view selector visible

---

## Remaining Unknowns

1. **Review view selector** — tests look for a review panel after completion. The exact `data-testid` used by the review components in `Workbench.tsx` needs to be verified against what the tests assert.

2. **`[data-testid="tracker-next"]` vs `[title="Next Block"]`** — Tests fall back to `[title="Next Block"]`. Once the story mounts, this should be present in `TimerStackView.tsx:277`. Confirm the selector resolves.

3. **`nuqs` + `MemoryRouter` interaction** — `CommandProvider` uses `useQueryState` from `nuqs` which reads URL params. With `MemoryRouter` in Storybook and the real app's `BrowserRouter` in production, there may be subtle URL-state differences. Watch for `nuqs` warnings.

4. **Double `CommandProvider`** — `StorybookHost` (global decorator) wraps in `CommandProvider`, and `Workbench` internally also creates a `CommandProvider`. Two nested instances. Currently not confirmed to cause issues but worth monitoring.

---

## How to Resume

1. Verify fix is in place:
   ```bash
   grep -n "isInitializingRef" src/components/layout/RuntimeLifecycleProvider.tsx
   # should show ref declared AND used in initializeRuntime
   ```

2. Restart Storybook:
   ```bash
   cd ~/projects/wod-wiki/wod-wiki-e2e
   bun run storybook
   ```

3. Manually open `http://localhost:6006/?path=/story/acceptance-runtimecrossfit--fran`  
   Verify: story renders without crash, plan view visible

4. Run tests:
   ```bash
   bun run test:e2e
   ```

5. If 8 smoke + interaction tests pass → commit both repos, push PR against main.

6. If interaction tests still fail (story renders but Next button doesn't advance), investigate whether `initializeRuntime` is actually being called when navigating to track view, and whether the runtime's `step` function correctly fires block advancement.

---

## Commit Checklist (when tests pass)

**wod-wiki:**
- [ ] `RuntimeLifecycleProvider.tsx` — stable `initializeRuntime`
- [ ] `useRuntimeExecution.ts` — memoized execution object
- [ ] `useWorkbenchEffects.ts` — primitive deps on `setExecution`
- [ ] `useWorkbenchRuntime.ts` — handlers in `useCallback`

**wod-wiki-e2e:**
- [ ] `preview-head.html` — GTM removed
- [ ] `StorybookWorkbench.tsx` — renders full `Workbench`

---

## References

- GitHub Issue #540: https://github.com/SergeiGolos/wod-wiki/issues/540
- React docs — "Maximum update depth exceeded": https://react.dev/reference/react/useState#my-initializer-or-updater-function-runs-twice
- React `useCallback` stability: https://react.dev/reference/react/useCallback#every-time-my-component-renders-usecallback-returns-a-different-function
