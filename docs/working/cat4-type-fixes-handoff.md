# Cat 4: Type-mismatch fixes — handoff doc

**Baseline:** `bun run build` → 74 errors. Cat 4 (TS2322/2339/2345/2352/2353/2344/2430/2769) = ~54 errors in 32 files.

**Goal:** zero Cat 4 errors. Each row below is a fix. Some rows are pre-decided (mechanical, low risk); some need a choice from you. Fill in the **Decision** column with your pick, then hand back.

**Legend for Decision column:**
- `OK` — proceed with the proposed fix as written.
- `KEEP-STALE` — leave the error (the code is "right" and the type should change to match, but the fix is bigger than this pass; we'll batch it later).
- `ALT-...` — pick a different approach from the alternatives.
- Free text — write your own decision.

---

## Group A — Mechanical, low risk (proceed by default)

These have an obvious right answer; flag if you disagree.

| #   | File:Line                                                  | Error                                                                             | Proposed fix                                                                                       | Decision |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| 1   | `src/components/atoms/primitives/combobox.tsx:210`         | `className` not in `{icon?: ...} & Omit<ComboboxInputProps, 'as' \| 'className'>` | Drop `'className'` from the Omit so the prop passes through                                        |          |
| 2   | `src/components/atoms/primitives/pagination.tsx:20`        | `plain` not in `ButtonProps`                                                      | Add `plain?: boolean` to `ButtonProps`                                                             |          |
| 3   | `src/components/atoms/primitives/pagination.tsx:42`        | same as #2                                                                        | same                                                                                               |          |
| 4   | `src/components/atoms/primitives/pagination.tsx:69`        | `href` not in `ButtonProps`                                                       | Add `href?: string` to `ButtonProps`                                                               |          |
| 5   | `src/components/molecules/ButtonLink.tsx:36`               | `aria-hidden="true"` (string) → `aria-hidden: boolean`                            | Change to `aria-hidden` (JSX shorthand for `true`)                                                 |          |
| 6   | `src/components/molecules/ButtonLink.tsx:38`               | same as #5                                                                        | same                                                                                               |          |
| 7   | `src/hooks/useActiveScrollSection.ts:155`                  | `setTimeout` returns `Timeout` (Bun) not `number`                                 | Cast: `setTimeout(...) as unknown as number`                                                       |          |
| 8   | `src/services/cast/receiverBootLoader.ts:45`               | same as #7                                                                        | Cast return: `return window.setTimeout(...) as unknown as number;`                                 |          |
| 9   | `src/hooks/useWodCollections.ts:28`                        | `useQueryState` overload mismatch on `defaultValue: null`                         | Use string default: `defaultValue: ''`; treat empty as null downstream                             |          |
| 10  | `src/hooks/useWodCollections.ts:42`                        | setter signature mismatch                                                         | Use `setActiveCollectionId(id ?? null)` (or update return type of hook)                            |          |
| 11  | `src/services/cast/CastManager.ts:200`                     | `unknown` not assignable to `CastMessage`                                         | Add runtime guard: `if (this.isCastMessage(message)) this.send(message);`                          |          |
| 12  | `src/runtime/behaviors/SpanTrackingBehavior.ts:34`         | `role: 'hidden'` not in `TimerState.role` union                                   | Add `'hidden'` to the `role` union on `TimerState`                                                 |          |
| 13  | `src/runtime/compiler/strategies/IdleBlockStrategy.ts:125` | `label: string \| undefined` not assignable to `label: string`                    | Use `??`: `label: config.button.label ?? ''`                                                       |          |
| 14  | `src/runtime/compiler/strategies/IdleBlockStrategy.ts:139` | `config` param unused                                                             | Rename to `_config`                                                                                |          |
| 15  | `src/effort-registry/IndexedDBEffortRegistry.ts:28`        | `db.get` returns `IEffort \| undefined`, expected `IEffort \| null`               | Change return type to `IEffort \| null` (caller already does `?? null`)                            |          |
| 16  | `src/panels/track-panel.tsx:180`                           | `filter` not in `WorkoutPreviewPanelProps`                                        | Add `filter?: SectionType[]` to `WorkoutPreviewPanelProps` (re-add `SectionType` as type-only)     |          |
| 17  | `src/panels/plan-panel.tsx:56`                             | `WorkoutResults` vs `WodBlock["results"]` (one is `\| undefined`)                 | Make the receiving prop accept `WorkoutResults \| undefined`                                       |          |
| 18  | `src/timeline/TimelineView.tsx:81`                         | `s.duration` possibly undefined                                                   | Add nullish fallback: `Math.max(maxDuration, s.duration ?? 0)`                                     |          |
| 19  | `src/timeline/TimelineView.tsx:87`                         | `seg.duration` possibly undefined                                                 | same: `if ((seg.duration ?? 0) > t)`                                                               |          |
| 20  | `src/timeline/TimelineView.tsx:250`                        | `seg.duration` possibly undefined                                                 | same: `formatDuration(seg.duration ?? 0)`                                                          |          |
| 21  | `src/timeline/TimelineView.tsx:253`                        | `seg.metrics` possibly undefined + index sig                                      | Type `seg.metrics` as `Record<string, number> \| undefined`; use `(seg.metrics?.[g.dataKey] ?? 0)` |          |
| 22  | `src/timeline/TimelineView.tsx:253`                        | implicit any on `seg.metrics[g.dataKey]` (TS7015)                                 | Same as #21                                                                                        |          |
| 23  | `src/hooks/useWodRouting.ts:64`                            | `RawRouteParams` lacks index signature                                            | Add `[key: string]: string \| undefined` to `RawRouteParams`                                       |          |
| 24  | `src/services/ExportImportService.ts:102`                  | `metrics.type` — `metrics` undefined here (typo)                                  | Fix to `metric.type`                                                                               |          |

---
## Group B — Type model decisions (you pick)

These are model-level fixes. The right call depends on which side is the source of truth.

### B1. `WodCollection.parent` — 3 errors

The `WodCollection` model lost a `parent?: string` field but 3 files still use it.

**Files:** `src/app/pages/CollectionsPage.tsx:80-82`, `src/components/organisms/history/CollectionsFilter.tsx:25-31`, `src/components/organisms/collections/CollectionBrowsePanel.tsx:22,33`

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-FIELD` | Re-add `parent?: string` to `WodCollection` in `repositories/wod-collections.ts` | Restores the tree structure consumers expect. Need to check if any code still *writes* it. |
| `REMOVE-FEATURE` | Delete the parent-child grouping logic in all 3 files; render flat | Simplest but loses a feature the UI clearly uses. |
| `STUB` | Replace `col.parent` with `undefined` in all 3 files; tree grouping becomes no-op | Quickest; same outcome as REMOVE-FEATURE for now. |

**My pick: `ADD-FIELD`** — restoring a field is one line in the model, doesn't break the 3 consumers, and preserves the visible UI.

**Your decision:** _____

---

### B2. `MetricType.Exertion` — 1 error

`column-definition-language.examples.ts:41` uses `MetricType.Exertion` but it doesn't exist on the enum.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-MEMBER` | Add `Exertion = 'exertion'` to `MetricType` in `core/models/Metric.ts` | If "exertion" is a real concept in the domain, it should be a first-class metric. |
| `REPLACE` | Replace with an existing member (e.g. `MetricType.Effort` if that's the closest) | Only if `Exertion` and `Effort` are the same thing under different names. |
| `REMOVE-EXAMPLE` | Remove the example line | The `.examples.ts` file is documentation; one less example is fine. |

**My pick: `REMOVE-EXAMPLE`** — this is a documentation file showing how to use the API. If `Exertion` isn't a real member, the example is teaching the wrong API.

**Your decision:** _____

---

### B3. `MetricType` string assignment in `createAnalyticsEngineForBlock.ts:42`

`scriptMetricTypes.add(metric.type)` — `metric.type` is `string`, but `Set<MetricType>` expects the union.

| Option           | What happens                                               | Trade-off                                         |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `CAST`           | `scriptMetricTypes.add(metric.type as MetricType)`         | Loses type safety.                                |
| `NARROW-IMetric` | Widen `IMetric.type` to use the `MetricType` enum directly | Correct long-term; needs touching the core model. |
| `NARROW-LOCALLY` | Type the `metric` loop var as `{ type: MetricType }`       | Local fix; trust upstream typing.                 |

**My pick: `NARROW-LOCALLY`** — `stmt.metrics` is already `IMetric[]`; the issue is the for-of inference. Use `for (const metric of stmt.metrics as ReadonlyArray<IMetric & {type: MetricType}>)`.

**Your decision:** _____

---

### B4. `parseWodBlock` arity (Cat 7) — 1 error

`src/app/workbench/workbenchDocumentModel.ts:38` calls `parseWodBlock(block.content, sharedParser)` but the function now takes 1 arg.

| Option | What happens | Trade-off |
|---|---|---|
| `SINGLE-ARG` | Drop the second arg: `parseWodBlock(block.content)` | Trust the new signature; check if `sharedParser` is still needed (maybe parser is module-scoped now). |
| `READ-API` | Read the new signature and pass correct args | Slower but safe. |
| `KEEP-STALE` | Leave the error; this is foundational | Doesn't fix anything; defer to a "fix Cat 7" pass. |

**My pick: `SINGLE-ARG`** — second arg is likely a holdover from when parser was injected per-call. Module-level now.

**Your decision:** _____

---

### B5. `RuntimeBlock` arity (Cat 7) — 1 error

`src/clock/components/TimerHarness.tsx:86` calls `new RuntimeBlock(runtime, [1], behaviors, 'Timer')` (4 args) but constructor now takes 1.

| Option | What happens | Trade-off |
|---|---|---|
| `FACTORY` | Replace with `RuntimeBlock.create({runtime, args: [1], behaviors, type: 'Timer'})` | Likely the new pattern. |
| `READ-API` | Read the new constructor and fix | Slower but safe. |
| `KEEP-STALE` | Leave the error; defer | |

**My pick: `FACTORY`** — almost certainly a `create()` static.

**Your decision:** _____

---

### B6. `WodCollection` model location (related to B1)

`repositories/wod-collections.ts` defines `WodCollection` and exports it. **Should we keep the type in `repositories/` or move to a shared `types/` location?**

This is bigger than Cat 4 — only relevant if you want a clean refactor.

| Option | What happens | Trade-off |
|---|---|---|
| `LEAVE` | Don't touch the location | One less change. |
| `MOVE` | Move to `src/types/wod-collection.ts`, re-export from old location | Cleaner; touches many imports. |
| `DEFER` | Note as tech debt, move later | Keeps Cat 4 small. |

**My pick: `DEFER`** — orthogonal to fixing the errors.

**Your decision:** _____

## Group C — Cross-file type drift (you pick the policy)

### C1. `ExercisePathIndex` — 2 errors

Two definitions exist:
- `src/core/types/providers.ts` (canonical, used by `provider.loadIndex()`)
- `src/tools/ExercisePathIndexer.ts` (stale, has `variations`, `searchTerms`, `variationCount`)

`src/components/Editor/ExerciseIndexManager.ts:99,102` assigns one to the other.

| Option | What happens | Trade-off |
|---|---|---|
| `ALIGN-TOOL` | Re-define `core/types/providers` to match the tool's shape (add `variations`, `searchTerms`, `variationCount`) | One file touches many. |
| `ALIGN-CORE` | Strip the extra fields from `tools/ExercisePathIndexer` | Loses fields the indexer computes. |
| `CAST` | Cast at boundary: `this.index = loadedIndex as unknown as ExercisePathIndex` | Quick; type-unsafe at the seam. |
| `KEEP-STALE` | Defer | |

**My decision: `CAST`** — the two types represent the same data at different stages (raw vs indexed). Consumer only uses `entry.searchTerms` (in both shapes) and structural iteration over `groups`. Honest about the seam. Add a TODO at the cast.
**Your decision:** `CAST`


---

### C2. `ExercisePathIndexer` `loadIndex()` signature (related to C1)

**My decision: `CAST`** — same policy as C1. The provider's `loadIndex()` keeps its core-type return; the manager casts at its own boundary. No second arg added.
**Your decision:** `CAST`

## Group D — `import.meta.glob` typings (you pick the policy)

### D1. 5 files use `import.meta.glob` with no `vite/client` reference — 5 errors

`src/repositories/effort-markdown.ts:16`, `page-examples.ts:19`, `wod-collections.ts:10`, `wod-feeds.ts:15`, `wod-loader.ts:5`

| Option | What happens | Trade-off |
|---|---|---|
| `GLOBAL-DTS` | Add `/// <reference types="vite/client" />` to `src/declarations.d.ts` | One-line fix; types `glob` globally. Recommended. |
| `PER-FILE` | Add the reference comment to each of the 5 files | More explicit; 5 changes. |
| `NPM-TYPES` | Add `vite` to `compilerOptions.types` in `tsconfig.json` | Pulls in all Vite client types (broader). |

**My decision: `GLOBAL-DTS`** — one source of truth in `src/declarations.d.ts`, matches the existing `*.css` declaration. Sibling of Cat 2's vite module declaration; keeps repo-wide ambient types in one place.

**Your decision:** `GLOBAL-DTS`

## Group E — Specific semantics (you confirm the rename or pick the policy)

### E1. `TimeSpan.duration` — 2 errors

`src/components/atoms/VisualStateComponents.tsx:28,293` reads `curr.timeSpan.duration`. The class exists in `src/runtime/models/TimeSpan.ts` (entry point per CLAUDE.md).

| Option | What happens | Trade-off |
|---|---|---|
| `READ-MODEL` | Read `TimeSpan.ts` to find the real field name | Need to know what the new field is. |
| `KEEP-STALE` | Defer | |

**My pick: `READ-MODEL`** — fast lookup, one rename. If the field was removed, the fix is to compute it inline.

**Your decision:** _____ (or just say "you do it")

---

### E2. `Duration.duration` — 1 error

`src/core/models/Duration.ts:32` reads `span.duration` inside `SpanDuration.constructor`. Same question as E1.

| Option | What happens | Trade-off |
|---|---|---|
| `READ-MODEL` | Find the new name on `TimeSpan` | Same as E1. |
| `KEEP-STALE` | Defer | |

**My pick: `READ-MODEL`** (and likely the same answer as E1).

**Your decision:** _____ (or just say "you do it")

---

### E3. `CastButton` store API — 6 errors

`src/components/molecules/CastButton.tsx:51,108,160` reads `store.handleNext`, `store.handleStart`, `store.handlePause`, `store.handleStop`, `store.displayState`. These don't exist on `WorkbenchSyncStore`.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-TO-STORE` | Add the missing actions/state to `WorkbenchSyncStore` | The component assumes they exist, so the store probably should expose them. |
| `REPLACE-WITH-API` | Find the actual methods the store uses (likely in `useWorkbenchSync()`) and update the component | Honest about current API. |
| `CAST-ANY` | Use `as any` casts (already partially used: `store.displayState as any`) | Quick and dirty. |

**My pick: `REPLACE-WITH-API`** — the destructuring at line 51 (extracting handlers) is a clear code smell if the store doesn't have them. They were probably moved to a different store or renamed. Read `useWorkbenchSync` to find them.

**Your decision:** _____

---

### E4. `Workbench.goToPlan` — 1 error

`src/components/organisms/layout/Workbench.tsx:262` reads `goToPlan` from `useWorkbench()`.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-TO-CTX` | Add `goToPlan` to `WorkbenchContext` | Single-purpose method on context. |
| `USE-NAVIGATE` | Use `useNavigate()` + `planPath(entryId)` | Already uses react-router anyway. |
| `READ-CTX` | Find the right method on the context | |

**My pick: `USE-NAVIGATE`** — `Workbench` already uses router; the function is a thin wrapper.

**Your decision:** _____

---

### E5. `test-helpers` `new TimeSpan(...)` — 1 error

`src/runtime/behaviors/test-helpers.ts:349` calls `new TimeSpan(config.startTime ?? 0)` but `TimeSpan` was imported as type-only.

**Note:** the `TimeSpan` import in test-helpers was just removed in Cat 1 (we said it was unused). So we need to re-add it as a value import, and check whether `TimeSpan` is exported as a class from `@/core`.

| Option | What happens | Trade-off |
|---|---|---|
| `VALUE-IMPORT` | Change to value import: `import { TimeSpan } from '@/core';` | Standard fix for type-only vs value-only confusion. |
| `READ-EXPORT` | Verify `TimeSpan` is exported as a class; if not, find the right class | |

**My pick: `READ-EXPORT`** — first confirm export, then value-import.

**Your decision:** _____ (or just say "you do it")

### E6. `ExecutionContextTestHarness.metrics: empty-array` — 1 error

The field is initialized with an empty array literal typed as `never[]`, but the field expects `MetricContainer`.

| Option | What happens | Trade-off |
|---|---|---|
| `NEW-CONTAINER` | `metrics: new MetricContainer()` | One-line fix. |

**My pick: `NEW-CONTAINER`** — Cat 1's `MetricContainer` removal in `RuntimeTimerPanel` suggests the model is still in use; this is the proper init.

**Your decision:** _____ (or just say "you do it")

---

### E7. `test-helpers.emitOutput` `metric` undefined — 2 errors

`runtime.outputs.push({ type, metric, metadata })` — `metric` is a free identifier, not a param. The Cat 1 fix renamed the param to `_metrics` but the body still references `metric`.

| Option | What happens | Trade-off |
|---|---|---|
| `RENAME-BODY` | `runtime.outputs.push({ type, metric: _metrics, metadata })` | Tiny fix. |
| `RENAME-PARAM-BACK` | Revert the `_` prefix since the body needs it | Less lint discipline. |

**My pick: `RENAME-BODY`** — body uses `metric: _metrics` so the field name on the pushed object stays `metric`.

**Your decision:** _____ (or just say "you do it")

---

### E8. `MockBlock` `onPush`/`onPop` not in `IRuntimeBehavior` — 2 errors

`MockBlock.ts:422,468` calls `behavior.onPush?.(...)` and `behavior.onPop?.(...)` but `IRuntimeBehavior` doesn't have those methods.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-TO-INTERFACE` | Add `onPush?` and `onPop?` to `IRuntimeBehavior` | Reflects that the mock uses a dual API (new `onMount`/old `onPush`). |
| `REMOVE-DEAD` | Remove the `onPush`/`onPop` branches entirely from `MockBlock` if no real behavior uses them | Tighter. |
| `CAST-ANY` | Cast: `(behavior as any).onPush?.(...)` | Quick. |

**My pick: `ADD-TO-INTERFACE`** — the code clearly maintains both APIs (see `usesNewApi` branching). The interface should reflect that.

**Your decision:** _____

---

### E9. `RuntimeTestBuilder.ts:61` missing `memory` in deps — 1 error

`new ScriptRuntime(script, jit, {memory, stack, clock, eventBus})` — `memory` is not a field on `ScriptRuntimeDependencies`.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-FIELD` | Add `memory?: RuntimeMemory` to `ScriptRuntimeDependencies` | |
| `REMOVE-FIELD` | Drop `memory` from the object literal; it's likely set elsewhere | Need to verify. |

**My pick: `READ-DEPS`** — check the type. `ScriptRuntimeDependencies` likely has `stack`, `clock`, `eventBus` but not `memory`. Remove from object.

**Your decision:** _____ (or just say "you do it")

---

### E10. `WorkoutTestHarness.ts:265` `loc.metrics: IMetric[]` expected, got `MetricContainer` — 1 error

`this._collectedFragments.push(loc.metrics)` — `loc.metrics` is `MetricContainer`, array expected.

| Option | What happens | Trade-off |
|---|---|---|
| `TOARRAY` | `this._collectedFragments.push(loc.metrics.toArray())` | |
| `CHANGE-FIELD-TYPE` | Make `_collectedFragments` an array of `MetricContainer` | Wider type. |

**My pick: `TOARRAY`** — narrower change. `MetricContainer.toArray()` exists per the model.

**Your decision:** _____ (or just say "you do it")

### E11. `TestableRuntime.ts:194` + `test-helpers.ts:178` + `MockBlock.ts:356` `as IMetric` — 3 errors

`new MemoryLocation('metric:label', [{origin: 'config', ...} as IMetric])` — the shape uses `'config'` as origin but `IMetric.origin` is the `MetricOrigin` enum.

| Option | What happens | Trade-off |
|---|---|---|
| `AS-UNKNOWN` | `[...] as unknown as IMetric[]` | Two-step cast. |
| `USE-ORIGIN-ENUM` | `origin: MetricOrigin.Config` | Proper. |
| `READ-MEMORY-LOCATION` | See what `MemoryLocation` constructor accepts; if it widens origin, no cast needed | |

**My pick: `READ-MEMORY-LOCATION`** — same pattern at 3 sites. One fix, all three.

**Your decision:** _____ (or just say "you do it")

---

### E12. `useWakeLock` `NavigatorWithWakeLock` — 1 error

`interface NavigatorWithWakeLock extends Navigator` but modern TS lib already has `navigator.wakeLock`.

| Option | What happens | Trade-off |
|---|---|---|
| `DROP-INTERFACE` | Remove the custom interface; use `navigator.wakeLock` directly | Simplest. |
| `OMIT-AUGMENT` | Change to `interface NavigatorWithWakeLock extends Omit<Navigator, 'wakeLock'>` | Keeps the abstraction. |

**My pick: `DROP-INTERFACE`** — same as Cat 6 analysis. The DOM lib has it now.

**Your decision:** _____ (or just say "you do it")

---

### E13. `ClockSync.ts:158` filter callback — 1 error

`msg => msg.type === 'rpc-clock-sync-response' && msg.requestTimestamp === t1` — predicate works but TS may not infer the narrowed type because the closure isn't a type guard.

| Option | What happens | Trade-off |
|---|---|---|
| `FIND-INSTEAD` | `const response = responses.find(...); if (!response) return null;` | Simpler. |
| `TYPE-GUARD` | `msg is RpcClockSyncResponse` predicate | More TS-pure. |

**My pick: `READ-FULL-CONTEXT`** — the call is `await this.waitForResponse<RpcClockSyncResponse>(...)`. If `waitForResponse` is already typed, just use `.find()`.

**Your decision:** _____ (or just say "you do it")

---

### E14. `column-definition examples.ts:184` `value as number` — 1 error

`const kph = value as number;` — TS2352 says neither type sufficiently overlaps.

| Option | What happens | Trade-off |
|---|---|---|
| `AS-UNKNOWN` | `const kph = value as unknown as number;` | Standard two-step. |
| `GUARD` | `if (typeof value === 'number') kph = value; else kph = parseFloat(value);` | Safer. |

**My pick: `AS-UNKNOWN`** — this is example code; not user-facing.

**Your decision:** _____ (or just say "you do it")

---

### E15. `TestableBlock.ts:81,137,154,236,261,277,613` — 7 errors (Cat 5 spillover)

Testable stub classes don't implement the full `IRuntimeBlock` / `IScriptRuntime` interface.

| Option | What happens | Trade-off |
|---|---|---|
| `ADD-STUBS` | Add the missing methods (subscribeToTracker, getMetricMemoryByVisibility, behaviors field, etc.) | Cleanest. |
| `CAST-AT-USE` | Cast to interfaces at use sites | Quick. |
| `STUB-RETURNS` | Make the methods return safe defaults (e.g. `() => empty-array`, `() => new Map()`) | Minimal code. |

**My pick: `STUB-RETURNS`** — these are test-only stubs. They need to satisfy the interface but don't need real behavior.

**Your decision:** _____

---

## Summary checklist

When you're done filling in decisions, hand the doc back and I'll execute top-to-bottom. Order of execution will be:

1. Group A (mechanical, ~24 edits, no choices)
2. Group D (vite/client reference, one-line)[[]]
3. Group B (model decisions, ~6 edits)
4. Group C (cross-file type drift, ~2 edits)
5. Group E (semantic, ~15 edits)
6. Re-run build, confirm zero Cat 4 errors

If you want me to defer specific items (write `KEEP-STALE` or `DEFER`), I'll leave those errors in place and report the post-fix error count.

**Total decisions to make: 24** (rows in Groups A–E)