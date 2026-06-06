# Dead Code Analysis — Action Plan

> Generated from `knip` and `ts-prune` scans on 2026-06-06.
> Baseline: 1,502 unused exports (ts-prune), 185 unused files (knip).

---

## [x] Phase 1: Fix Broken Imports (62 unresolved) — **DONE 2026-06-06**

> **Status (2026-06-06):** All Phase-1 broken-import items below have been applied in the working tree. `bun run build` (Storybook + receiver) now completes; the previous fatal errors (`UNRESOLVED_IMPORT` for `playground/src/pages/JournalWeeklyPage`, `MISSING_EXPORT` for `lucide-react`'s `Github` icon) are resolved. §1.7 (workbenchSyncStore relative paths) was already obsolete — store was migrated to `@/` aliases — and has been removed. §1.9 (stale `{@link import(...)}` JSDoc tags) was also cleared: 23 stories rewritten with relative paths or plain descriptions, and 8 stories that pointed at nonexistent files had their `{@link}` dropped. **Phase 2 is also DONE** — 13 dependencies removed (6 prod, 7 dev) after per-dep verification against call-sites, npm scripts, and config files; 6 deps the doc flagged as candidates were kept because verification showed they are referenced (`@lezer/common`, `@storybook/addon-docs`, `concurrently`, `ts-morph`, `ts-prune`, plus `@lezer/generator` kept on user opt-in). **Phase 3.2 is also DONE** — 4 unused production barrels removed (`src/clock/index.ts`, `src/components/Editor/extensions/index.ts`, `src/panels/index.ts`, `src/parser/index.ts`), and the `stories/` tree reduced: deleted `acceptance/`, `testing/`, `clock/`, `compiler/`, `parsing/`, `assets/`, plus 2 root-level story files; kept `stories/catalog/` (including `catalog/integration/`); moved `stories/_shared/` to `stories/catalog/_shared/` and rewrote 4 import paths + `.storybook/preview.mjs` accordingly. **Phase 4 is also DONE** — 25 duplicate exports resolved: 24 `export default Foo` lines removed (every one had zero default-style imports — purely dead code), plus the deprecated `useCommandPalette` alias in `CommandContext.tsx` was dropped and `src/editor-entry.ts` updated to export the canonical `useCommandContext` name. knip duplicate-export count went from 25 → 0; unused-export count dropped 339 → 295. **Phase 5 is also DONE** — baseline raised 1,317 → 1,397 (current actual). The remaining 1,397 unused exports are concentrated in `src/index.ts` re-exports of public types. `bun run check:unused-exports` passes. The ~200 pre-existing TypeScript warnings emitted by `unplugin-dts` during transform remain non-fatal — see "Non-blocking TS noise" note at end of phase. No build-config change was required.

These are imports that TypeScript / Vite cannot resolve at build time. They will cause runtime errors or build failures.

### [x] 1.1 Moved Context Files

The `NotebookContext` and `ThemeProvider` contexts were moved to `src/contexts/` but several call-sites still reference old paths.

| File | Broken Import | Correct Import |
|------|---------------|----------------|
| `src/components/molecules/AddToNotebookButton.tsx:19` | `./NotebookContext` | `@/contexts/NotebookContext` |
| `src/components/organisms/notebook/NotebookMenu.tsx:25` | `./NotebookContext` | `@/contexts/NotebookContext` |
| `src/components/organisms/workbench/NotebooksSection.tsx:5` | `@/components/organisms/notebook/NotebookContext` | `@/contexts/NotebookContext` |
| `src/components/organisms/workbench/NoteDetailsPanel.tsx:13` | `@/components/organisms/notebook/NotebookContext` | `@/contexts/NotebookContext` |
| `src/components/organisms/CommitGraph.tsx:2` | `../theme/ThemeProvider` | `@/contexts/ThemeProvider` |

### [x] 1.2 Editor Overlay / Extension Imports

Several editor organism components reference `./WodCommand` and `./useOverlayWidthState` as if they were co-located, but they actually live under `src/components/Editor/overlays/`.

| File | Broken Import | Correct Import |
|------|---------------|----------------|
| `src/components/organisms/editor/InlineCommandBar.tsx:16` | `./WodCommand` | `@/components/Editor/overlays/WodCommand` |
| `src/components/organisms/editor/MetricInlinePanel.tsx:26` | `./WodCommand` | `@/components/Editor/overlays/WodCommand` |
| `src/components/organisms/editor/OverlayTrack.tsx:22` | `./useOverlayWidthState` | `@/components/Editor/overlays/useOverlayWidthState` |
| `src/components/organisms/editor/WodCompanion.tsx:25` | `./WodCommand` | `@/components/Editor/overlays/WodCommand` |
| `src/components/organisms/editor/WodCompanion.tsx:331` | `import('../extensions/section-geometry')` | `import('@/components/Editor/extensions/section-geometry')` |

### [x] 1.3 Missing Barrel / Index File

`src/components/organisms/review/` has no `index.ts`; the barrel is `review-grid-index.ts`.

| File | Broken Import | Correct Import |
|------|---------------|----------------|
| `src/components/organisms/layout/Workbench.tsx:54` | `@/components/organisms/review` | `@/components/organisms/review/review-grid-index` |

### [x] 1.4 Deleted / Renamed Model File

`IMetric` was folded into `src/core/models/Metric.ts`.

| File | Broken Import | Correct Import |
|------|---------------|----------------|
| `src/components/molecules/StatementDisplay.test.tsx:5` | `@/core/models/IMetric` | `@/core/models/Metric` |

### [x] 1.5 CDL Interpreter Relative Path Errors

The interpreter modules (`cdlCellRenderer`, `cdlFallbackInterpreter`, `cdlFilterInterpreter`, `cdlGraphInterpreter`, `cdlSortInterpreter`, `cdlSourceResolver`) and their tests reference `./types` and `./column-definition-language` as if they were in the same folder, but those files live one directory up in `src/components/organisms/review/`.

| Files | Broken Import | Correct Import |
|-------|---------------|----------------|
| `interpreters/*.tsx, interpreters/*.ts` | `./types` | `../types` |
| `interpreters/*.tsx, interpreters/*.ts` | `./column-definition-language` | `../column-definition-language` |
| `interpreters/__tests__/*.test.*` | `../column-definition-language` | `../../column-definition-language` |
| `interpreters/__tests__/test-helpers.ts:5` | `../types` | `../../types` |
| `interpreters/__tests__/derivedColumns.test.ts:26` | `../types` | `../../types` |

### [x] 1.6 Missing / Renamed Runtime Types

| File | Broken Import | Fix |
|------|---------------|-----|
| `src/runtime/compiler/metrics/GroupMetric.ts:2` | `../../../parser/timer.visitor` | Define `export type GroupType = string` in-file (type was never created) |
| `src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts:2` | `../../../contracts/core/IRuntimeBlockBuilder` | Import `BlockBuilder` from `../../BlockBuilder` and change parameter type from `IRuntimeBlockBuilder` to `BlockBuilder` |
| `src/runtime/hooks/__tests__/useBlockMemory.test.ts:19` | `../../memory/IMemoryEntry` | Import `MemoryEntry` from `../../types/executionSnapshot` |
| `tests/harness/__tests__/RuntimeTestBuilder.test.ts:5` | `@/runtime/BlockBuilder` | `@/runtime/compiler/BlockBuilder` |

| File | Broken Import | Status |
|------|---------------|--------|
| `stories/catalog/integration/PlaygroundJournal.stories.tsx:18` | `../../../playground/src/pages/JournalWeeklyPage` | **Resolved 2026-06-06** — renamed target to `../../../playground/src/views/ListViews` (matches the sibling `stories/catalog/pages/JournalWeeklyPage.stories.tsx` and the actual `App.tsx` consumer). |

### [x] 1.9 JSDoc-Only Unresolved Imports (Documentation Links)

These appear in `{@link import(...)}` JSDoc tags inside story files. They do **not** affect compilation but indicate stale documentation.

| File | Broken JSDoc Link | Resolution |
|------|-------------------|------------|
| `stories/catalog/pages/{Collections,HomeView,JournalPage,PlaygroundNotePage,ReviewPage,TrackerPage,WorkoutEditorPage,EffortDetailPage,EffortsCatalogPage}.stories.tsx` | `@/playground/src/...` | Replaced with `../../../playground/src/...` to match the actual import below. |
| `stories/catalog/pages/Planner.stories.tsx` | `@/components/organisms/editor/NoteEditor` | Replaced with `../../../src/components/organisms/editor/NoteEditor`. |
| `stories/catalog/templates/{CollectionWorkoutsList,JournalDateScroll,LandingTemplate}.stories.tsx` | `@/playground/src/...` | Replaced with `../../../playground/src/...`. |
| `stories/catalog/templates/{CanvasPage,ReviewGrid,SidebarLayout}.stories.tsx` | `@/components/...`, `@/panels/...`, `@/templates/...` | Replaced with `../../../src/...`. |
| `stories/catalog/templates/Review/Chromecast.stories.tsx` | `@/panels/review-panel-chromecast` | Replaced with `../../../src/panels/review-panel-chromecast` (file exists). |
| `stories/catalog/templates/Tracker/Chromecast.stories.tsx` | `@/panels/stack-panel-chromecast` | Replaced with `../../../src/panels/track-panel-chromecast` (file is `track-` not `stack-`). |
| `stories/catalog/templates/NoteEditor/{Mobile,Web}.stories.tsx` | `@/panels/note-editor-mobile`, `@/panels/note-editor-web` | Target files do not exist. JSDoc replaced with a plain description of what the story actually renders (`StorybookWorkbench`). |
| `stories/catalog/templates/Review/{Mobile,Web}.stories.tsx` | `@/panels/review-panel-{mobile,web}` | Target files do not exist. JSDoc replaced with a plain description (`ReviewGrid` at the given dimensions). |
| `stories/catalog/templates/Tracker/{Mobile,Web}.stories.tsx` | `@/panels/stack-panel-{mobile,web}` | Target files do not exist. JSDoc replaced with a plain description (`Timer + VisualStatePanel` at the given dimensions). |
| `stories/catalog/molecules/{ButtonGroup,ButtonLink,CalendarSplitButton,NavSearchInput,ResultListItem}.stories.tsx` | `@/components/molecules/...` | Replaced with `../../../src/components/molecules/...`. |
| `stories/catalog/organisms/{FullscreenReview,FullscreenTimer}.stories.tsx` | `@/components/molecules/FocusedDialog` | Replaced with `../../../src/components/molecules/FocusedDialog`. |
| `stories/catalog/organisms/RuntimeTimerPanel.stories.tsx` | `@/components/organisms/editor/RuntimeTimerPanel` | Replaced with `../../../src/components/organisms/editor/RuntimeTimerPanel`. |

---

**Non-blocking TS noise (does not break the build):** With Storybook 10 + Vite 8 + `unplugin-dts`, the build transform emits ~200 TypeScript errors (TS6133 unused-locals, TS6192 unused-imports, TS6133 unused-parameters, a few `any`/implicit-`any` warnings in storybook template code, plus two `MISSING_EXPORT` patterns that surface as warnings when the actual fatal error is downstream). These are **reported but do not stop the build** — Vite proceeds to module-graph transform and only fails on a hard `UNRESOLVED_IMPORT`/`MISSING_EXPORT` on a module the bundler actually needs. They are pre-existing and out of scope for the "build not erroring" fix; they belong to a future hygiene pass and should be counted under the `noUnusedLocals` / `noUnusedParameters` cleanup in Phase 2, not as broken imports.

## [x] Phase 2: Remove Unused Dependencies — **DONE 2026-06-06**

### [x] 2.1 Production Dependencies (6 removed, 1 kept) — **DONE 2026-06-06**


Verification was performed via `search` against `src/`, `playground/`, `stories/`, `tests/`, `scripts/`, `e2e/`, `server/`, `tools/`, plus config inspection (`.storybook/`, `playground/vite.config.ts`, `vite.receiver.config.ts`). Outcome:

| Dep | Doc claim | Verified status | Action |
|-----|-----------|-----------------|--------|
| `@lezer/common` | "only used in Vite `dedupe` config" | **IN_USE** — explicitly listed in `resolve.dedupe` of `vite.config.ts:22`, `playground/vite.config.ts:27`, `vitest.storybook.config.js:15`, and in `.storybook/main.mjs:20,107` | Kept |
| `@types/jszip` | "types-only" | **SAFE** — `jszip@3.10.1` ships its own `index.d.ts`; no source imports `@types/jszip` | Removed |
| `cmdk` | "Command Palette primitive" | **SAFE** — no source imports; only an `optimizeDeps.include` hint in `.storybook/main.mjs:104` (also removed). MDX docs mention it as text only. | Removed |
| `lodash` | "verify if any `_` imports remain" | **SAFE** — no imports found | Removed |
| `minimatch` | "likely unused after refactor" | **SAFE** — no direct imports; only transitive | Removed |
| `react-joyride` | "verify if `useTutorialStore` uses it" | **SAFE** — `useTutorialStore` is a plain zustand store; no UI coupling to joyride | Removed |
| `remark-frontmatter` | "verify if markdown parser uses it" | **SAFE** — no imports; pipeline uses `remark-gfm` (in `.storybook/main.mjs:5`) | Removed |

### [x] 2.2 Dev Dependencies (7 removed, 5 kept) — **DONE 2026-06-06**


| Dep | Doc claim | Verified status | Action |
|-----|-----------|-----------------|--------|
| `@lezer/generator` | "grammar build tool" | **KEPT** — generated parser (`src/grammar/parser.ts`, `parser.terms.ts`) is committed; the dep is only needed if someone regenerates from `.grammar`. Low-risk to remove, kept per the option-0 "fully safe only" rule. | Kept (user opt-in) |
| `@storybook/addon-docs` | "may be redundant" | **IN_USE** — explicitly registered in `.storybook/main.mjs:38` with `mdxPluginOptions`; 71 MDX stories import `{ Meta }` from `@storybook/addon-docs/blocks` | Kept |
| `@types/cors` | "verify server still needs" | **SAFE** — `server/src/index.ts` uses `https.createServer` + `ws`, not `cors` | Removed |
| `@types/express` | "verify server still needs" | **SAFE** — same; no express code anywhere | Removed |
| `@types/uuid` | "verify if `uuid` is still used" | **SAFE** — `uuid@14.0.0` ships its own `.d.ts`; 27 source files import `uuid` but none import `@types/uuid` | Removed |
| `cors` | "verify server still needs" | **SAFE** — no imports; server has no CORS middleware | Removed |
| `express` | "verify server still needs" | **SAFE** — no imports; server is plain `https` + `ws` | Removed |
| `concurrently` | "verify if any npm scripts use it" | **IN_USE** — `scripts/dev-start.cjs:233-276` builds a `concurrently` command array; `dev` and `dev:all` scripts invoke it | Kept |
| `dotenv-cli` | "verify if build scripts use it" | **SAFE** — all `dotenv` usage is programmatic (require/import); the CLI wrapper is never invoked | Removed |
| `eslint-plugin-storybook` | "verify ESLint config" | **SAFE** — `.eslintrc.json` does not reference it; only `check-storybook-deps.cjs:23` mentions the name (as a classification) | Removed |
| `ts-morph` | "AST refactor tool" | **IN_USE** — `scripts/ast-refactor.ts:1` imports `ts-morph` | Kept |
| `ts-prune` | "can be removed after switching to knip" | **IN_USE** — `scripts/check-unused-exports-regressions.cjs:9` spawns it; the `check:unused-exports` and `check:architecture` npm scripts depend on it. The doc's "switch to knip" precondition has not been met. | Kept |



---

## [ ] Phase 3: Remove / Audit Unused Files (185)

High-value clusters to review first:

### [ ] 3.1 Likely Real Dead Code

| Directory | Files | Action |
|-----------|-------|--------|
| `src/components/molecules/` | `ActionBarView.tsx`, `HeroCarousel.tsx`, `HeroSlider*.tsx`, `CalendarButton.tsx`, `CastButton.tsx`, `CastCallout.tsx`, `MemoryValuePopover.tsx`, `NewPostButton.tsx`, `NoteActions.tsx`, `ParsedView.tsx`, etc. | Verify unused, then delete |
| `src/components/organisms/workbench/` | `CollectionItemList.tsx`, `CollectionPreview.tsx`, `HistoryDetailsPanel.tsx`, `NotePreview.tsx` | Verify unused, then delete |
| `src/components/organisms/history/` | `CalendarWidget.tsx`, `CollectionsFilter.tsx`, `HistoryPostList.tsx`, `ImportMarkdownDialog.tsx` | Verify unused, then delete |
| `src/runtime/actions/audio/` | `PlaySoundAction.ts` | Verify unused, then delete |
| `src/services/cast/` | Large chunks of Chromecast RPC code | Audit carefully — some may be used by receiver build |
| `src/testing/setup/` | Entire test setup action registry | Verify if any tests still use it |
| `src/timeline/` | `GitTreeSidebar.ts`, `TimelineView.tsx` | Verify unused, then delete |
| `src/tools/` | `ExerciseNameIndexer.ts`, `ExercisePathIndexer.ts` | Verify unused, then delete |

### [x] 3.2 Potentially Used by Storybook / Tests Only — **DONE 2026-06-06**


Verification: each candidate was grep'd against `src/`, `playground/`, `e2e/`, `server/`, `scripts/`, `tests/`, and `stories/` for any importer. None of the four barrels had a single call-site outside stories (the only `@/clock` reference was a JSDoc example inside `src/clock/index.ts` itself). Result:

| File | Status | Action |
|------|--------|--------|
| `src/clock/index.ts` | **SAFE** — zero importers | Removed |
| `src/components/Editor/extensions/index.ts` | **SAFE** — zero importers; individual extensions (e.g. `wod-overlay`, `section-state`) are imported directly throughout `src/`, so the barrel re-exports were dead weight | Removed |
| `src/panels/index.ts` | **SAFE** — zero importers | Removed |
| `src/parser/index.ts` | **SAFE** — zero importers | Removed |

Additionally, the `stories/` tree was reduced per the user's instruction: keep `stories/catalog/` (including `catalog/integration/`) and remove the rest. Deleted entire directories `stories/acceptance/`, `stories/testing/`, `stories/clock/`, `stories/compiler/`, `stories/parsing/`, `stories/assets/`, and the root-level `stories/data-for-storybook.md` and `stories/declarations.d.ts`. The shared helper modules under `stories/_shared/` were **moved** (not deleted) into `stories/catalog/_shared/` because the catalog stories still import `StorybookWorkbench`, `EditorShellHeader`, `fixtures`, etc. Import paths in 4 catalog stories (`CalendarSplitButton`, `Collections`, `NoteEditor/Mobile`, `NoteEditor/Web`) and in `.storybook/preview.mjs` were updated to the new location. A stale `Data: See {@link ../../data-for-storybook.md}` JSDoc line was removed from 33 catalog stories. The `stories/**/*.ts/tsx` entries in `tsconfig.json`'s `include` were also dropped (deleted files no longer need to be tracked).

---

## [x] Phase 4: Fix Duplicate Exports (25) — **DONE 2026-06-06**


**Resolution:** For each of the 25 duplicates, the minority-style imports were counted via a code search. Every single module had **zero default-style imports** — all call-sites used the named import. The fix was therefore mechanical: remove the `export default Foo;` line from each module, no call-sites to convert.

| Module | Resolved by |
|--------|-------------|
| `playground/src/templates/LandingTemplate.tsx` | dropped `export default LandingTemplate` |
| `src/components/atoms/ShortcutBadge.tsx` | dropped `export default ShortcutBadge` |
| `src/components/atoms/VisibilityBadge.tsx` | dropped `export default VisibilityBadge` |
| `src/components/molecules/MetricSourceRow.tsx` | dropped `export default MetricSourceRow` |
| `src/components/molecules/StatementDisplay.tsx` | dropped `export default StatementDisplay` |
| `src/components/organisms/editor/InlineCommandBar.tsx` | dropped `export default InlineCommandBar` |
| `src/components/organisms/layout/TimerIndexPanel.tsx` | dropped `export default TimerIndexPanel` |
| `src/components/organisms/layout/Workbench.tsx` | dropped `export default Workbench` |
| `src/components/organisms/metrics/MetricSourceList.tsx` | dropped `export default MetricSourceList` |
| `src/contexts/CommandContext.tsx` | special case — see below |
| `src/contexts/RuntimeLifecycleProvider.tsx` | dropped `export default RuntimeLifecycleProvider` |
| `src/hooks/useActiveScrollSection.ts` | dropped `export default useActiveScrollSection` |
| `src/hooks/useWakeLock.ts` | dropped `export default useWakeLock` |
| `src/hooks/useWorkoutEvents.ts` | dropped `export default useWorkoutEvents` |
| `src/panels/page-shells/CalendarPageShell.tsx` | dropped `export default CalendarPageShell` |
| `src/panels/page-shells/CanvasPage.tsx` | dropped `export default CanvasPage` |
| `src/panels/page-shells/HeroBanner.tsx` | dropped `export default HeroBanner` |
| `src/panels/page-shells/JournalPageShell.tsx` | dropped `export default JournalPageShell` |
| `src/panels/page-shells/ParallaxSection.tsx` | dropped `export default ParallaxSection` |
| `src/panels/page-shells/ScopedRuntimeProvider.tsx` | dropped `export default ScopedRuntimeProvider` |
| `src/panels/page-shells/ScrollSection.tsx` | dropped `export default ScrollSection` |
| `src/panels/page-shells/StickyNavPanel.tsx` | dropped `export default StickyNavPanel` |
| `src/panels/timer-panel.tsx` | dropped `export default TimerDisplay` |
| `src/templates/WorkbenchTemplate.tsx` | dropped `export default WorkbenchTemplate` |
| `stories/catalog/_shared/StorybookWorkbench.tsx` | dropped `export default StorybookWorkbench` |

**Special case (`CommandContext.tsx`):** This module's duplicate was not `named | default` but `useCommandContext | useCommandPalette` — both are named exports, with `useCommandPalette` being a deprecated alias (`export const useCommandPalette = useCommandContext;`) marked `@deprecated Use useCommandContext instead`. There were zero direct imports of `useCommandPalette` in the source; the only consumer was a public-API re-export in `src/editor-entry.ts:26`. The deprecated alias was dropped and `editor-entry.ts` was updated to export the canonical `useCommandContext` name. This is a public-API change for the wod-wiki library surface (the `@deprecated` tag had signalled it was going away).

**knip verification:** Duplicate-export count went from 25 → 0. Unused-export count dropped 339 → 295 (the 44 default re-exports are no longer flagged).

---

## [x] Phase 5: Update ts-prune Baseline — **DONE 2026-06-06**

The current baseline in `scripts/check-unused-exports-regressions.cjs` was **1,317** but the actual count was **~1,502**. Phases 1–4 collectively dropped the unused-export count from **1,502** to **1,397** (a 105-export reduction). The baseline was raised to **1,397**; `bun run check:unused-exports` now passes.

**Decision taken:** Option A — raise the baseline to match the current state. Option C (replacing ts-prune with knip) was not taken because `check:architecture` (the current CI gate) still spawns ts-prune and switching tools would require a separate migration; that work belongs to a future hygiene pass. The remaining 1,397 unused exports are concentrated in `src/index.ts` (re-exports of public types: `WhiteboardScript`, `BlockKey`, `Duration`, `IRuntimeBlock`, `IScriptRuntime`, etc.) and in deep compiler/runtime internals — most are real exports of the library surface that happen to have no internal consumers but are part of the public API contract documented in `docs/01-overview.md` and `docs/03-domain-model.md`.

---
## Verification Checklist

After each phase, run:

```bash
# Type-check
bun x tsc --noEmit

# Run knip again
bun x knip --no-exit-code

# Run tests
bun test

# Build library
bun run build-library
```
