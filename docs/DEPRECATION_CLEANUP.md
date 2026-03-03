# Deprecation Cleanup Register

> Last updated: 2026-03-02  
> Assessed against the current `main` branch after the WebRTC / receiver-rpc unification work.  
> New TypeScript errors visible in the current build are **not** addressed here; this document covers only `@deprecated`-annotated items.

---

## Summary Table

| #   | Item                                                          | File(s)                                                                                                      | Active callers?                                                  | Effort     | Risk   | Priority         |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------- | ------ | ---------------- |
| 1   | `TVPage` (entire component)                                   | `src/app/pages/TVPage.tsx`                                                                                   | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 2   | `useCastManager` hook                                         | `src/hooks/useCastManager.ts`                                                                                | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 3   | `CastManager` class                                           | `src/services/cast/CastManager.ts`                                                                           | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 4   | `tests/harness/index.ts` re-export                            | `tests/harness/index.ts`                                                                                     | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 5   | Runtime lifecycle type aliases                                | `RuntimeLifecycleContext.ts`, `useRuntimeLifecycle.ts`, `RuntimeLifecycleProvider.tsx`, `RuntimeContext.tsx` | ✅ None remaining                                                 | Small      | Low    | 🟢 Now           |
| 6   | `createDefaultRuntimeFactory()`                               | `src/runtime/compiler/RuntimeFactory.ts`                                                                     | ✅ None remaining                                                 | Small      | None   | 🟢 Now           |
| 7   | `ReEntryConfig` type alias                                    | `src/runtime/compiler/BlockBuilder.ts`                                                                       | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 8   | `EventHandlerResponse` type                                   | `src/runtime/contracts/events/IEventHandler.ts`                                                              | ✅ None remaining                                                 | Trivial    | None   | 🟢 Now           |
| 9   | `compact` prop on `WodScriptVisualizer` / `RuntimeHistoryLog` | `WodScriptVisualizer.tsx`, `FragmentVisualizer.tsx`, `RuntimeHistoryLog.tsx`                                 | ⚠️ 1 caller: `NotebooksPage.tsx`                                 | Small      | Low    | 🟡 Soon          |
| 10  | `LeafExitBehavior` + `CompletedBlockPopBehavior` exports      | `src/runtime/behaviors/index.ts`                                                                             | ⚠️ Tests only (`performance.test.ts`, `loop-block.test.ts`)      | Medium     | Medium | 🟡 Soon          |
| 11  | `ReEntryBehavior` + `RoundsEndBehavior` exports               | `src/runtime/behaviors/index.ts`                                                                             | ⚠️ Tests only (same test files)                                  | Medium     | Medium | 🟡 Soon          |
| 12  | `TimerFragment` class                                         | `src/runtime/compiler/fragments/TimerFragment.ts`                                                            | ⚠️ Several test files and one story                              | Medium     | Low    | 🟡 Soon          |
| 13  | `OutputStatement` proxy props: `.spans`, `.elapsed`, `.total` | `src/core/models/OutputStatement.ts`                                                                         | ⚠️ `AnalyticsTransformer.ts`, tests                              | Medium     | Medium | 🟠 Later         |
| 14  | `FragmentType.Time` enum value                                | `src/core/models/CodeFragment.ts`                                                                            | ⚠️ 3 behavior files still emit it; `FragmentPill.tsx` handles it | Large      | High   | 🟠 Later         |
| 15  | `FragmentType.Elapsed` / `FragmentType.Total` enum values     | `src/core/models/CodeFragment.ts`                                                                            | ⚠️ Canonical derived types — see note                            | —          | —      | ⚪ Re-evaluate    |
| 16  | `getMemory()` / `hasMemory()` / `setMemoryValue()` shims      | `RuntimeBlock.ts`, `MockBlock.ts`, `BehaviorContext.ts`, `IRuntimeBlock.ts`                                  | ⚠️ Pervasive (hundreds of call-sites)                            | Very Large | High   | 🔴 Future sprint |
| 17  | `IRuntimeMemory` EventBus subscription                        | `src/runtime/contracts/IRuntimeMemory.ts`, `RuntimeMemory.ts`                                                | ⚠️ Needs audit                                                   | Medium     | Medium | 🟠 Later         |

---

## Detailed Item Descriptions

### 1. `TVPage` — `src/app/pages/TVPage.tsx`

The WebSocket-relay TV receiver page. All three previously known callers (`App.tsx`, `Workbench.tsx`, `StorybookWorkbench.tsx`) have already been removed.

**Action:** Delete the file.

```bash
git rm src/app/pages/TVPage.tsx
```

---

### 2. `useCastManager` hook — `src/hooks/useCastManager.ts`

WebSocket relay hook, never imported by anything in the current codebase.

**Action:** Delete the file.

```bash
git rm src/hooks/useCastManager.ts
```

---

### 3. `CastManager` class — `src/services/cast/CastManager.ts`

The WebSocket relay manager class. No imports found outside the file itself.

**Action:** Verify no imports remain, then delete.

```bash
grep -r "CastManager" src/ --include="*.ts" --include="*.tsx" | grep -v "CastManager.ts"
git rm src/services/cast/CastManager.ts
```

---

### 4. `tests/harness/index.ts` re-export

Backward-compat re-export pointing to `@/testing/harness`. Zero files import from `tests/harness`.

**Action:** Delete the file (keep `tests/harness/OutputTracingHarness.ts` — it is imported directly).

```bash
git rm tests/harness/index.ts
```

---

### 5. Runtime lifecycle type aliases

Four backward-compat aliases with zero active call-sites:

| Symbol | Location |
|--------|----------|
| `RuntimeContextState` (type) | `src/components/layout/RuntimeLifecycleContext.ts` |
| `RuntimeContext` (const) | `src/components/layout/RuntimeLifecycleContext.ts` |
| `useRuntime` | `src/components/layout/useRuntimeLifecycle.ts` |
| `RuntimeProvider` | `src/components/layout/RuntimeLifecycleProvider.tsx` |
| `RuntimeProvider` (2nd) | `src/runtime/context/RuntimeContext.tsx` |
| `useRuntimeContext` | `src/runtime/context/RuntimeContext.tsx` |

**Action:** Remove each alias line after confirming no imports. Run `bun x tsc --noEmit` to confirm zero new errors.

---

### 6. `createDefaultRuntimeFactory()` — `src/runtime/compiler/RuntimeFactory.ts`

Factory convenience function. No external callers found.

**Action:** Remove the exported function from `RuntimeFactory.ts`.

---

### 7. `ReEntryConfig` type alias — `src/runtime/compiler/BlockBuilder.ts`

`type ReEntryConfig = RepeaterConfig` — alias with zero callers.

**Action:** Remove the one-line alias.

---

### 8. `EventHandlerResponse` type — `src/runtime/contracts/events/IEventHandler.ts`

Legacy response type on the `IEventHandler` interface. No external callers use it.

**Action:** Remove the type and its exports from `IEventHandler.ts` and `src/core/types/runtime.ts`.

---

### 9. `compact` boolean prop — `WodScriptVisualizer`, `FragmentVisualizer`, `RuntimeHistoryLog`

**Active caller:** [`src/app/pages/NotebooksPage.tsx`](../src/app/pages/NotebooksPage.tsx) passes `compact={true}` to `RuntimeHistoryLog`.

**Action (2 steps):**
1. In `NotebooksPage.tsx` change `compact={true}` → `size="compact"`.
2. Remove the `compact?: boolean` prop and the internal `effectiveSize` bridge from:
   - `src/components/WodScriptVisualizer.tsx`
   - `src/views/runtime/FragmentVisualizer.tsx`
   - `src/components/history/RuntimeHistoryLog.tsx`

---

### 10 & 11. `LeafExitBehavior`, `CompletedBlockPopBehavior`, `ReEntryBehavior`, `RoundsEndBehavior` exports

These behaviors still exist as concrete classes but are deprecated in `behaviors/index.ts` in favour of:
- `ExitBehavior({ mode: 'immediate' })` replaces `LeafExitBehavior`
- `ExitBehavior({ mode: 'deferred' })` replaces `CompletedBlockPopBehavior`
- `ChildSelectionBehavior` config replaces `ReEntryBehavior` + `RoundsEndBehavior`

**Active callers:** Two integration test files only —
- `src/runtime/behaviors/__tests__/integration/performance.test.ts`
- `src/runtime/behaviors/__tests__/integration/loop-block.test.ts`

**Action:**
1. Rewrite test blocks in `performance.test.ts` and `loop-block.test.ts` to use `ExitBehavior` / `ChildSelectionBehavior` config equivalents.
2. Mark the concrete class files themselves as internal-only or delete them once no code imports them.
3. Remove the deprecated export lines from `behaviors/index.ts`.

---

### 12. `TimerFragment` class — `src/runtime/compiler/fragments/TimerFragment.ts`

Legacy alias for `DurationFragment`. Should emit a Duration fragment, not a timer state fragment.

**Active callers (all test/story files):**
- `src/parser/fragment-origin.test.ts`
- `src/runtime/compiler/__tests__/JitComposition.test.ts`
- `src/runtime/compiler/__tests__/fragment-behavior.test.ts`
- `src/runtime/compiler/__tests__/JitInjection.test.ts`
- `src/runtime/compiler/strategies/__tests__/RestBlockBehaviorIntegration.test.ts`

**Action:**
1. Import `DurationFragment` directly in each caller; replace `new TimerFragment(...)` with `new DurationFragment(...)` (confirm constructor shape compatibility).
2. Delete `src/runtime/compiler/fragments/TimerFragment.ts`.

---

### 13. `OutputStatement` proxy properties: `.spans`, `.elapsed`, `.total`

Defined on `IOutputStatement` as deprecated convenience proxies over fragment data.

**Active callers:**
- `src/services/AnalyticsTransformer.ts` — uses `.elapsed`, `.total`, `.spans`
- `src/services/AnalyticsTransformer.test.ts` — sets and reads them
- `src/core/models/__tests__/OutputStatementFragmentSource.test.ts` — tests the proxies themselves

**Migration pattern:**
```typescript
// Before (deprecated)
const elapsed = output.elapsed;
const spans   = output.spans;

// After (canonical)
const elapsed = output.getFragment(FragmentType.Elapsed)?.value ?? 0;
const spans   = (output.getFragment(FragmentType.Spans)?.value as TimeSpan[]) ?? [];
```

**Action:**
1. Migrate `AnalyticsTransformer.ts` to use `getFragment()` calls.
2. Update the test file accordingly.
3. Remove the proxy property declarations from `IOutputStatement` and the `OutputStatement` implementation.

---

### 14. `FragmentType.Time` enum value

Still **emitted** by three production behavior files:
- `src/runtime/behaviors/CountdownTimerBehavior.ts`
- `src/runtime/behaviors/CountupTimerBehavior.ts`
- `src/runtime/behaviors/SpanTrackingBehavior.ts`

And **consumed** by:
- `src/components/review-grid/FragmentPill.tsx` (handles `FragmentType.Time` alongside Elapsed/Total)
- `src/components/review-grid/useGraphData.ts` (colour mapping)

**Migration:** Change behaviors to emit `FragmentType.Spans` only. Update `FragmentPill` and `useGraphData` to drop the `Time` case.

> ⚠️ High risk — touches the timer behavior core. Write regression tests first.

---

### 15. `FragmentType.Elapsed` / `FragmentType.Total` enum values

> **Re-evaluation note:** These are marked `@deprecated` in `CodeFragment.ts` with the comment "Calculated from Spans when needed." However, they are used as first-class canonical fragment types throughout the grid, graph, and display systems — `ElapsedFragment` and `TotalFragment` concrete classes reference them, and the review grid pivots on them.
>
> **Recommendation: Remove the `@deprecated` comments.** These are legitimate derived fragment types. The deprecation is misleading — the original intent was to stop *writing* them into raw timer memory (which was `FragmentType.Time`'s job), not to remove the types entirely.

**Action:** Remove the `@deprecated` JSDoc from these two enum values and reword the comment to clarify they are derived metrics computed from `Spans`.

---

### 16. `getMemory()` / `hasMemory()` / `setMemoryValue()` shims

Present on `RuntimeBlock`, `MockBlock`, `BehaviorContext`, and declared on `IRuntimeBlock`. These wrap `getMemoryByTag()` for backward compatibility.

**Call-site count:** Hundreds of references across behaviors, hooks, tests, stories, and testing utilities.

**Migration pattern:**
```typescript
// Before (deprecated shim)
const timer = ctx.getMemory('time') as TimerState | undefined;

// After (canonical)
const timerLoc = ctx.block.getMemoryByTag('time')[0];
const timer = timerLoc?.fragments[0]?.value as TimerState | undefined;
```

> ⚠️ This is the largest cleanup item. Recommended approach: do it in sub-sprint batches by subsystem (behaviors → hooks → tests → delete shims).

**Sub-tasks:**
1. Migrate `src/runtime/behaviors/` (CountdownTimerBehavior, CountupTimerBehavior, etc.)
2. Migrate `src/runtime/hooks/` (useStackDisplay, useBlockMemory, useTimerElapsed)
3. Migrate `src/clock/components/TimerHarness.tsx`
4. Migrate all test files
5. Remove shim methods and interface contracts

---

### 17. `IRuntimeMemory` EventBus subscription

Deprecated in `src/runtime/contracts/IRuntimeMemory.ts` with comment "Use EventBus handlers instead."  
Referenced in `src/runtime/RuntimeMemory.ts` with `// @deprecated`.

**Action:** Audit remaining callers, shift them to EventBus pattern, then remove the deprecated subscribe method.

---

## Cleanup Execution Order

```
Phase 1 — Zero-effort dead code (no callers, safe to delete immediately)
  ☐ Delete src/app/pages/TVPage.tsx
  ☐ Delete src/hooks/useCastManager.ts
  ☐ Delete src/services/cast/CastManager.ts  (verify zero imports first)
  ☐ Delete tests/harness/index.ts
  ☐ Remove runtime lifecycle type aliases (items 5, 6, 7, 8)

Phase 2 — Fix-the-note
  ☐ Remove @deprecated from FragmentType.Elapsed and FragmentType.Total (item 15)

Phase 3 — Small migrations (single caller)
  ☐ Migrate NotebooksPage.tsx compact → size="compact", then remove compact prop (item 9)

Phase 4 — Test-only migrations (no production risk)
  ☐ Migrate test files off LeafExitBehavior / CompletedBlockPopBehavior → ExitBehavior (item 10)
  ☐ Migrate test files off ReEntryBehavior / RoundsEndBehavior → ChildSelectionBehavior config (item 11)
  ☐ Migrate test files off TimerFragment → DurationFragment (item 12)

Phase 5 — Analytics migration
  ☐ Migrate AnalyticsTransformer off .spans/.elapsed/.total → getFragment() (item 13)
  ☐ Remove proxy properties from IOutputStatement / OutputStatement

Phase 6 — Timer behavior core (high risk — requires full test coverage first)
  ☐ Change CountdownTimerBehavior, CountupTimerBehavior, SpanTrackingBehavior to emit FragmentType.Spans (item 14)
  ☐ Remove FragmentType.Time enum value

Phase 7 — IRuntimeMemory EventBus cleanup (item 17)

Phase 8 — Memory shim removal (multi-sprint, item 16)
  ☐ Behaviors
  ☐ Hooks
  ☐ Clock components
  ☐ Tests
  ☐ Delete shim methods and contract declarations
```

---

## Notes for Future Reviewers

- **`FragmentType.Time` vs `FragmentType.Spans`:** The two are distinct. `Time` was written as a single TimerState object into block memory and is now deprecated; `Spans` holds `TimeSpan[]` raw segments and is the canonical source of truth.
- **`getMemory('time')` pattern:** This is an extremely pervasive pattern throughout behaviors. It works because the shim in `BehaviorContext.getMemory` synthesises a `TimerState` from `getMemoryByTag('time')`. Do not remove the shims until every caller is migrated.
- **TypeScript errors:** The build currently has ~369 baseline TypeScript errors unrelated to deprecation. Do not conflate deprecation cleanup with TS-error fixes.
- **Test files in `tests/harness/`:** `OutputTracingHarness.ts` is **not** deprecated — only `tests/harness/index.ts` is. Do not delete the harness directory.
