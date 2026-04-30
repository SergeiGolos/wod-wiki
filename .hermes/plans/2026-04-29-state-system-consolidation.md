# State System Consolidation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Zustand (`workbenchSyncStore`) the single cross-panel state authority by eliminating bridge anti-patterns, duplicate state, and the `_hydrateRuntime` pattern.

**Architecture:** Five sequential phases — each independently shippable. Phase 1 removes the most dangerous anti-pattern (`_hydrateRuntime`). Phases 2–4 are mechanical deletions and deduplication. Phase 5 converts the bridge component to a hook.

**Tech Stack:** TypeScript, React, Zustand, CodeMirror 6, Bun Test

---

## Phase 1 — Eliminate `_hydrateRuntime`

### Task 1.1: Create `RuntimeController` interface and implementation

**Objective:** Replace injected React hook closures with a stable controller object stored in a React ref.

**Files:**
- Create: `src/runtime/RuntimeController.ts`

**Step 1: Create the interface and factory**

```ts
// src/runtime/RuntimeController.ts

import type { WodBlock } from '@/components/Editor/types';
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';

export interface RuntimeController {
  initialize(block: WodBlock): void;
  dispose(): void;
  getRuntime(): IScriptRuntime | null;
}

/**
 * Creates a RuntimeController backed by the provided hook-based callbacks.
 * Called once inside RuntimeLifecycleProvider; the ref is stable for the
 * lifetime of the provider.
 */
export function createRuntimeController(
  initializeRuntime: (block: WodBlock) => void,
  disposeRuntime: () => void,
  getRuntime: () => IScriptRuntime | null,
): RuntimeController {
  return {
    initialize: (block) => initializeRuntime(block),
    dispose: () => disposeRuntime(),
    getRuntime,
  };
}
```

**Step 2: Commit**

```bash
git add src/runtime/RuntimeController.ts
git commit -m "feat: add RuntimeController interface"
```

---

### Task 1.2: Add `runtimeController` to `RuntimeLifecycleProvider` context

**Objective:** Expose a stable `RuntimeController` ref through the existing lifecycle context so consumers can call it without needing React hook closures in Zustand.

**Files:**
- Modify: `src/components/layout/RuntimeLifecycleProvider.tsx`

**Step 1: Read the current context shape**

```bash
cat src/components/layout/RuntimeLifecycleProvider.tsx
```

**Step 2: Add controller to context**

Find the context value object and add:

```ts
import { createRuntimeController } from '@/runtime/RuntimeController';
import type { RuntimeController } from '@/runtime/RuntimeController';

// Inside the provider component, alongside existing hooks:
const runtimeControllerRef = useRef<RuntimeController | null>(null);

// Build/update the controller whenever the underlying callbacks change
const { initializeRuntime, disposeRuntime, runtime } = useWorkbenchRuntime(/* ... */);

runtimeControllerRef.current = createRuntimeController(
  initializeRuntime,
  disposeRuntime,
  () => runtimeControllerRef.current?.getRuntime() ?? runtime,
);

// Include in context value:
// controller: runtimeControllerRef,
```

> Note: The exact integration depends on how `RuntimeLifecycleProvider` currently exposes `initializeRuntime`/`disposeRuntime`. If those already come from `useWorkbenchRuntime`, wrap them here. If they come from `WorkbenchSyncBridge`, defer until Task 1.4.

**Step 3: Export `RuntimeController` from context type**

Add `controller: React.RefObject<RuntimeController | null>` to the context interface and value.

**Step 4: Commit**

```bash
git commit -am "feat: expose RuntimeController via RuntimeLifecycleProvider"
```

---

### Task 1.3: Remove `_hydrateRuntime` from store

**Objective:** Delete the anti-pattern action from `workbenchSyncStore` and the state fields it injected (the function fields: `initializeRuntime`, `disposeRuntime`, `handleStart`, etc.).

**Files:**
- Modify: `src/components/layout/workbenchSyncStore.ts`

**Step 1: Remove function fields from `WorkbenchSyncState`**

Delete from the interface:
```ts
// REMOVE these — they are React hook closures, not plain state:
initializeRuntime: (block: WodBlock) => void;
disposeRuntime: () => void;
handleStart: () => void;
handlePause: () => void;
handleStop: () => void;
handleNext: () => void;
handleStartWorkoutAction: (block: WodBlock) => void;
```

**Step 2: Remove `_hydrateRuntime` from `WorkbenchSyncActions`**

Delete:
```ts
_hydrateRuntime: (payload: { ... }) => void;
```

**Step 3: Remove initial values and implementation from `create()`**

Delete the no-op functions from initial state and the `_hydrateRuntime` implementation.

**Step 4: Remove from `resetStore()`** — same no-op functions.

**Step 5: Type-check**

```bash
bun x tsc --noEmit
```

Fix any resulting type errors — callers of `_hydrateRuntime` will error; we'll fix them in Task 1.4.

**Step 6: Commit**

```bash
git commit -am "refactor: remove _hydrateRuntime anti-pattern from store"
```

---

### Task 1.4: Update `WorkbenchSyncBridge` to use `RuntimeController`

**Objective:** Replace the `useEffect` that called `_hydrateRuntime` with direct calls to `runtimeControllerRef`.

**Files:**
- Modify: `src/components/layout/WorkbenchSyncBridge.tsx`

**Step 1: Remove the hydration `useEffect`**

Delete the ~15-line block:
```ts
// REMOVE:
useEffect(() => {
  store.getState()._hydrateRuntime({ runtime, execution, ... });
}, [...]);
```

**Step 2: Replace runtime init/dispose calls**

Any place that calls `initializeRuntime(selectedBlock)` or `disposeRuntime()` should now call:
```ts
const { controller } = useRuntimeLifecycle();
// ...
controller.current?.initialize(selectedBlock);
controller.current?.dispose();
```

**Step 3: Keep `runtime` and `execution` in store** — These are still read by panels via Zustand. The bridge should still push them:
```ts
useEffect(() => {
  store.getState().setRuntime(runtime);
}, [runtime]);

useEffect(() => {
  store.getState().setExecution(execution);
}, [execution]);
```

Add `setRuntime` and `setExecution` actions to the store if not present.

**Step 4: Type-check + tests**

```bash
bun x tsc --noEmit
bun test
```

**Step 5: Commit**

```bash
git commit -am "refactor: WorkbenchSyncBridge uses RuntimeController, no more _hydrateRuntime"
```

---

## Phase 2 — Remove duplicated `selectedBlock`

### Task 2.1: Remove `selectedBlock` from `WorkbenchContext`

**Objective:** `WorkbenchContext` no longer holds `selectedBlock`; all consumers read from `workbenchSyncStore`.

**Files:**
- Modify: `src/components/layout/WorkbenchContext.tsx`

**Step 1: Find all consumers of context `selectedBlock`**

```bash
grep -rn "useWorkbench().*selectedBlock\|WorkbenchContext.*selectedBlock\|context\.selectedBlock\|{ selectedBlock" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: For each consumer, switch to store**

Replace:
```ts
const { selectedBlock } = useWorkbench();
```
With:
```ts
const selectedBlock = useWorkbenchSyncStore(s => s.selectedBlock);
```

**Step 3: Remove `selectedBlock` from context interface and value**

In `WorkbenchContext.tsx`, delete the `selectedBlock` field from the context type and the value assembly.

**Step 4: Type-check**

```bash
bun x tsc --noEmit
```

**Step 5: Commit**

```bash
git commit -am "refactor: remove selectedBlock from WorkbenchContext, store is canonical"
```

---

## Phase 3 — Delete `DisplaySyncBridge`

### Task 3.1: Remove `displayState` from the Zustand store

**Objective:** `displayState` was the output of `DisplaySyncBridge`. Once the bridge is gone, the field is dead.

**Files:**
- Modify: `src/components/layout/workbenchSyncStore.ts`

**Step 1: Find all consumers of `store.displayState`**

```bash
grep -rn "displayState\|setDisplayState" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Confirm `WorkbenchCastBridge` does NOT read `displayState`**

Looking at the current `WorkbenchCastBridge.tsx`, it reads `analyticsSegments`, `execution`, `runtime`, etc. — it does NOT read `displayState`. Confirm, then proceed.

**Step 3: Remove `displayState` from `WorkbenchSyncState` and actions**

Delete `displayState` field and `setDisplayState` action.

**Step 4: Type-check**

```bash
bun x tsc --noEmit
```

---

### Task 3.2: Delete `DisplaySyncBridge`

**Objective:** The component is no longer needed — Chromecast display data is already handled by `WorkbenchCastBridge` which reads directly from `useWorkbenchSyncStore`.

**Files:**
- Delete: `src/components/layout/DisplaySyncBridge.tsx`

**Step 1: Find where `DisplaySyncBridge` is rendered**

```bash
grep -rn "DisplaySyncBridge" src/ --include="*.tsx" --include="*.ts"
```

**Step 2: Remove the `<DisplaySyncBridge />` usage** from wherever it's rendered (likely `Workbench.tsx`).

**Step 3: Delete the file**

```bash
rm src/components/layout/DisplaySyncBridge.tsx
```

**Step 4: Type-check + tests**

```bash
bun x tsc --noEmit
bun test
```

**Step 5: Commit**

```bash
git commit -am "refactor: delete DisplaySyncBridge, displayState removed from store"
```

---

## Phase 4 — Single source of truth for WodBlockState

### Task 4.1: Audit `wodBlockRuntimeField` and `activeWorkoutIdField` in CodeMirror

**Objective:** Confirm that `wodBlockRuntimeField` duplicates data that's now canonical in the store, and that `activeWorkoutIdField` is written by `WorkbenchSyncBridge` from the store.

**Files:** Read-only audit

**Step 1: Find the CodeMirror StateField definitions**

```bash
grep -rn "wodBlockRuntimeField\|activeWorkoutIdField" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Read each definition and its writers**

For each field:
- Where is it defined? (StateField declaration)
- Who dispatches transactions to update it?
- Who reads it?

**Step 3: Document findings**

If `wodBlockRuntimeField` stores data that is a strict subset of `workbenchSyncStore.execution.status` + `activeSegmentIds`, proceed to Task 4.2. If it has additional data (e.g., per-block progress), note that and skip simplification.

---

### Task 4.2: Consolidate `WodBlockState` derivation

**Objective:** Ensure the CM6 StateField for block runtime state is written from the Zustand store (not from a separate subscription), and that it doesn't duplicate `execution.status`.

**Files:**
- Modify: `src/components/layout/WorkbenchSyncBridge.tsx` (or wherever the CM6 dispatch happens)

**Step 1: Locate the dispatch call that updates `wodBlockRuntimeField`**

```bash
grep -rn "wodBlockRuntimeField\|activeWorkoutId" src/ -A 5 --include="*.ts" --include="*.tsx"
```

**Step 2: If written by `WorkbenchSyncBridge`, verify it reads from the Zustand store**

The write should look like:
```ts
const activeSegmentIds = store.getState().activeSegmentIds;
// ... dispatch to CM6 using activeSegmentIds
```

If it reads from both the runtime directly AND the store, consolidate to read from store only.

**Step 3: Type-check + tests**

```bash
bun x tsc --noEmit
bun test
```

**Step 4: Commit**

```bash
git commit -am "refactor: CM6 block state derives from Zustand store, not parallel runtime subscription"
```

---

## Phase 5 — Convert `WorkbenchSyncBridge` to a hook

### Task 5.1: Extract `useWorkbenchEffects` hook

**Objective:** Move all `useEffect` logic from the renderless `WorkbenchSyncBridge` component into a custom hook so it's called from the parent layout component rather than rendering a tree node.

**Files:**
- Create: `src/components/layout/useWorkbenchEffects.ts`
- Modify: `src/components/layout/WorkbenchSyncBridge.tsx`
- Modify: `src/components/layout/Workbench.tsx` (or wherever `WorkbenchSyncBridge` is rendered)

**Step 1: Create the hook file**

```ts
// src/components/layout/useWorkbenchEffects.ts

/**
 * useWorkbenchEffects — consolidates all workbench-level side effects.
 *
 * Replaces the renderless WorkbenchSyncBridge component.
 * Call from the layout root component (Workbench.tsx or equivalent).
 */
export function useWorkbenchEffects(): void {
  // Move every useEffect from WorkbenchSyncBridge here, verbatim.
  // The hook has no return value — it exists purely for side effects.
}
```

**Step 2: Move effects from `WorkbenchSyncBridge` into the hook**

Cut the entire body of `WorkbenchSyncBridge` (minus the `return <>{children}</>`) and paste into `useWorkbenchEffects`.

**Step 3: Update `WorkbenchSyncBridge` to delegate**

```tsx
// WorkbenchSyncBridge.tsx — simplified
export const WorkbenchSyncBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useWorkbenchEffects();
  return <>{children}</>;
};
```

This keeps the component temporarily in place — the tree doesn't change yet.

**Step 4: Type-check + tests**

```bash
bun x tsc --noEmit
bun test
```

**Step 5: Commit**

```bash
git commit -am "refactor: extract useWorkbenchEffects from WorkbenchSyncBridge"
```

---

### Task 5.2: Call `useWorkbenchEffects` from layout root and delete bridge

**Objective:** Eliminate the renderless wrapper entirely — call the hook directly from the parent.

**Files:**
- Modify: `src/components/layout/Workbench.tsx` (or wherever `<WorkbenchSyncBridge>` is used)
- Delete: `src/components/layout/WorkbenchSyncBridge.tsx` (if nothing else imports it)

**Step 1: Find the render site**

```bash
grep -rn "WorkbenchSyncBridge" src/ --include="*.tsx"
```

**Step 2: Replace `<WorkbenchSyncBridge>` wrapper with hook call**

Before:
```tsx
<WorkbenchSyncBridge>
  <RestOfLayout />
</WorkbenchSyncBridge>
```

After:
```tsx
function WorkbenchLayout() {
  useWorkbenchEffects();  // ← replaces the renderless wrapper
  return <RestOfLayout />;
}
```

Note: The `children` pass-through is no longer needed since it's a hook, not a component.

**Step 3: Delete `WorkbenchSyncBridge.tsx`**

```bash
rm src/components/layout/WorkbenchSyncBridge.tsx
```

**Step 4: Type-check + tests**

```bash
bun x tsc --noEmit
bun test
```

**Step 5: Commit**

```bash
git commit -am "refactor: WorkbenchSyncBridge → useWorkbenchEffects hook, renderless component removed"
```

---

## Validation Checklist

After all phases:

```bash
# 1. Types pass
bun x tsc --noEmit

# 2. Unit tests pass
bun test

# 3. Renderless component inventory — only these should remain:
grep -rn "return null" src/components --include="*.tsx"
# Expected survivors: WorkbenchCastBridge, EditorCastBridge (and any others with a valid reason)

# 4. No _hydrateRuntime references
grep -rn "_hydrateRuntime" src/
# Expected: 0 results

# 5. No displayState in store
grep -rn "displayState" src/
# Expected: 0 results (or only in Chromecast receiver types, not in workbenchSyncStore)

# 6. selectedBlock is only in the store
grep -rn "selectedBlock" src/components/layout/WorkbenchContext.tsx
# Expected: 0 results
```

---

## Risk Notes

- **Phase 1 is highest risk** — `_hydrateRuntime` touches the runtime initialization path. Test manually in the Track view (start/pause/stop a workout) after completing Phase 1.
- **Mobile:** `WorkbenchSyncBridge` runs on Mobile. Before deleting it (Phase 5), grep for any mobile-specific conditional logic inside it and preserve those effects in `useWorkbenchEffects`.
- **Chromecast receiver is unaffected** — it renders from RPC-delivered state. The RPC payload format does not change.
