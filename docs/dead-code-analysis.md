# Dead Code Analysis — Action Plan

> Generated from `knip` and `ts-prune` scans on 2026-06-06.
> Baseline: 1,502 unused exports (ts-prune), 185 unused files (knip).

---

## [x] Phase 1: Fix Broken Imports (62 unresolved) — **DONE 2026-06-06**

> **Status (2026-06-06):** All Phase-1 broken-import items below have been applied in the working tree. `bun run build` (Storybook + receiver) now completes; the previous fatal errors (`UNRESOLVED_IMPORT` for `playground/src/pages/JournalWeeklyPage`, `MISSING_EXPORT` for `lucide-react`'s `Github` icon) are resolved. §1.7 (workbenchSyncStore relative paths) was already obsolete — store was migrated to `@/` aliases — and has been removed. §1.9 (stale `{@link import(...)}` JSDoc tags) was also cleared: 23 stories rewritten with relative paths or plain descriptions, and 8 stories that pointed at nonexistent files had their `{@link}` dropped. The ~200 pre-existing TypeScript warnings emitted by `unplugin-dts` during transform remain non-fatal — see "Non-blocking TS noise" note at end of phase. No build-config change was required.

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

## [ ] Phase 2: Remove Unused Dependencies

### [ ] 2.1 Production Dependencies (7)

These are listed in `dependencies` but never imported by production code.

- `@lezer/common` — only used in Vite `dedupe` config, not in source
- `@types/jszip` — types-only; likely used by a transitive dep, not directly
- `cmdk` — Command Palette primitive; knip says unused (verify before removing)
- `lodash` — verify if any `_` imports remain after dead-code cleanup
- `minimatch` — likely unused after refactor
- `react-joyride` — tutorial/onboarding library; verify if `useTutorialStore` still uses it
- `remark-frontmatter` — verify if markdown parser still uses it

### [ ] 2.2 Dev Dependencies (12)

- `@lezer/generator` — grammar build tool; verify if still in build pipeline
- `@storybook/addon-docs` — already in `addons` config; may be redundant
- `@types/cors`, `@types/express`, `cors`, `express` — server deps; verify if `server/src/index.ts` is still needed
- `@types/uuid` — verify if `uuid` is still used
- `concurrently` — verify if any npm scripts use it
- `dotenv-cli` — verify if build scripts use it
- `eslint-plugin-storybook` — verify ESLint config
- `ts-morph` — AST refactor tool; verify if scripts still use it
- `ts-prune` — can be removed after switching to `knip`

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

### [ ] 3.2 Potentially Used by Storybook / Tests Only

These files are not imported by production code but may be needed for stories or tests.

| File | Usage |
|------|-------|
| `src/clock/index.ts` | Barrel for clock components; may be used by stories |
| `src/components/Editor/extensions/index.ts` | Large barrel file; may be used by entry points |
| `src/panels/index.ts` | Barrel for panels; verify if playground still imports it |
| `src/parser/index.ts` | Barrel for parser; verify if still needed |

---

## [ ] Phase 4: Fix Duplicate Exports (25)

Several components are exported twice — once as a named export and once as `default`. This causes confusion and bundler warnings.

Examples:
- `LandingTemplate|default` — `playground/src/templates/LandingTemplate.tsx`
- `useCommandContext|useCommandPalette` — `src/contexts/CommandContext.tsx`
- `Workbench|default` — `src/components/organisms/layout/Workbench.tsx`
- `TimerDisplay|default` — `src/panels/timer-panel.tsx`

**Action:** Choose one export style per module and update all call-sites.

---

## [ ] Phase 5: Update ts-prune Baseline

The current baseline in `scripts/check-unused-exports-regressions.cjs` is **1,317** but the actual count is **~1,502**.

**Decision needed:**
- Option A: Raise baseline to 1,500+ and accept the current state.
- Option B: Do cleanup first, then lower baseline.
- Option C: Replace `ts-prune` with `knip` in CI (more comprehensive).

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
