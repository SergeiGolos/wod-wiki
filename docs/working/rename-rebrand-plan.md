# Rename & Rebrand Implementation Plan

Operationalizes `docs/working/rename-rebrand-index.md`. Aligns the codebase with the
locked decisions (product = WOD Wiki; language = Whiteboard; feature = WallClock;
fence tag = `wod` forever, `whiteboard` alias). Excludes everything explicitly
out-of-scope (repo, domain, logo, `WodDialect` class, internal runtime types).

Vocabulary: module / interface / seam / facade / adapter. Domain terms from
`CONTEXT.md`: Statement, Block, Behavior, Metric, Origin, Dialect, Strategy, Fence.

---

## Scope restated

| Axis | From | To | Touch surface |
|------|------|----|----|
| Language identifiers & files | `Wod*` / `wod-*` | `Whiteboard*` / `ScriptBlock` / `whiteboard-*` | ~28 files, ~15 type identifiers, 338+ string hits |
| Runtime UI identifiers & files | `TrackerPage` / `timer-panel*` | `WallClockPage` / `wallclock-panel*` | ~10 files, 1 type identifier, 99+ string hits |
| Fence tag alias | `wod` only | `wod` + `whiteboard` | parser, editor fence resolver, autocomplete |
| npm package | `@bitcobblers/wod-wiki-library` | `@bitcobblers/whiteboard-lang` | `package.json`, CI, docs |

**Out of scope.** Repo (`SergeiGolos/wod-wiki`), domain (`wod.wiki`), logo
assets, `WodDialect` class (CrossFit domain concept), internal runtime
identifiers (`TimerBehavior`, `RuntimeClock`, `IRuntimeClock`,
`RuntimeStackTracker`, `TrackerBridge`, `WorkoutTracker`,
`wallClockNow`, `TimerStrategy`).

**Hard rules.**
- `wod` fence tag must keep parsing forever. Aliases can be added; the tag
  itself is never removed.
- `WodDialect` class stays. The `wod` here = CrossFit "Workout of the Day",
  not the language.
- No behavior change in any phase. Tests must pass at every phase boundary.
- The rebrand is **completion**, not invention. Existing semantics
  preserved; identifiers updated.

---

## Phase ordering

The plan runs in five phases. Earlier phases unblock later ones; a phase
boundary is the only natural commit point.

```
Phase 1  →  Type-level rename inside Editor types    (low risk, no UI)
Phase 2  →  File + identifier rename for language    (medium, mechanical)
Phase 3  →  File + identifier rename for WallClock   (medium, mechanical)
Phase 4  →  Fence tag alias `whiteboard`              (medium, parser)
Phase 5  →  Package rename to `whiteboard-lang`       (medium, CI)
Phase 6  →  Documentation + agent-skill sweep         (low, content)
```

**Gates.** After each phase, run:
- `bun run lint` (TypeScript)
- `bun run test` (Bun unit tests, `src/`)
- `bun run test:components` (Storybook + component tests)
- `bun run check:architecture` (no broken imports, no cycle regressions)
- Storybook build (catches story-id + category drift)
- `e2e/acceptance/fullscreen-wallclock-close.e2e.ts` after Phase 3 (was `fullscreen-timer-close.e2e.ts`)

---

## Phase 1 — Type-level rename in `Editor/types/section.ts`

> Lowest-risk phase. Only renames one type alias and one constant.
> No file renames, no identifier renames elsewhere. Unblocks the linter
> to detect stale consumers in later phases.

### 1.1 Rename `WodDialect` type → `FenceDialect`

The type `'wod' | 'log' | 'plan'` is the *fence selector*, not the
language. Renaming clarifies the seam.

**Files.**
- `src/components/Editor/types/section.ts` (declare + first use sites)
- `src/components/Editor/types/index.ts` (re-export)
- `src/components/Editor/utils/blockDetection.ts` (import)
- `src/components/Editor/utils/sectionParser.ts` (import + `blockDialect` return type)
- `src/core/analytics/IAnalyticsProcessorDescriptor.ts` (import)
- `src/core/analytics/IAnalyticsProfile.ts` (import)

**Change.**
```ts
// src/components/Editor/types/section.ts
-export type WodDialect = 'wod' | 'log' | 'plan';
+/** Fence selector: which dialect a fenced code block declares. */
+export type FenceDialect = 'wod' | 'log' | 'plan';
```

Update all named imports: `WodDialect` → `FenceDialect`. Update the
`blockDialect(block: WodBlock): WodDialect` return type in
`sectionParser.ts`.

**Acceptance.** `grep -r "WodDialect" src/` returns zero hits outside
`src/dialects/WodDialect.ts` and `WodDialect.test.ts` (the class
**stays**). `bun run test` passes.

### 1.2 Rename `VALID_WOD_DIALECTS` → `VALID_FENCE_DIALECTS`

**Files.**
- `src/components/Editor/types/section.ts` (declare)
- `src/components/Editor/types/index.ts` (re-export)
- `src/components/Editor/utils/blockDetection.ts` (import + usage in
  `matchDialectFence`)

**Change.**
```ts
// section.ts
-export const VALID_WOD_DIALECTS: WodDialect[] = ['wod', 'log', 'plan'];
+export const VALID_FENCE_DIALECTS: FenceDialect[] = ['wod', 'log', 'plan'];
```

**Acceptance.** `grep -r "VALID_WOD_DIALECTS"` returns zero hits. `bun run
test` passes — `blockDetection.test.ts` covers all three fence values.

### 1.3 Decision: `WodBlock` interface → `ScriptBlock`?

The index marks this as **low-risk but optional**. The interface is used
in 79 files across `src/`, `playground/`, `tests/`, `stories/`. The blast
radius is large but the change is mechanical (LSP rename across the
monorepo). Defer to Phase 2 where it sits next to the other identifier
renames and travels with the `wod-*.ts` file renames.

---

## Phase 2 — Language rename: identifiers, files, hooks, repositories

> Mechanical rename of `Wod*` / `wod-*` / `useWod*` / `parseWod*` /
> `detectWod*` to their `Whiteboard*` / `whiteboard-*` / `useScript*` /
> `parseScript*` / `detectScript*` equivalents. The `WodDialect` class
> stays. Uses LSP `rename` + `rename_file` for cross-file consistency.

### 2.1 LSP rename: `WodBlock` interface → `ScriptBlock`

**Files (79 references).** The full list is enumerated in the index and
covers:

| Group | Files |
|-------|-------|
| Type declaration + re-export | `src/components/Editor/types/index.ts`, `section.ts` |
| Editor utilities | `blockDetection.ts`, `sectionParser.ts`, `parseWodBlock.ts`, `documentStructure.ts` |
| Editor extensions | `runtime-panel-state.ts` |
| Editor hooks | `useWodBlockResults.ts`, `useWodLineResults.ts` |
| Editor overlays | `WodCommand.ts` |
| Editor organisms | `WodCompanion.tsx`, `NoteEditor.tsx`, `InlineCommandBar.tsx`, `EditorCastBridge.tsx`, `RuntimeTimerPanel.tsx` |
| Review organisms | `FullscreenTimer.tsx` |
| Workout organisms | `WorkoutContextPanel.tsx`, `RuntimeDebugPanel.tsx`, `WorkoutPreviewPanel.tsx` |
| App services | `runtimeTimerModel.ts`, `workbenchDocumentModel.ts`, `workbenchModeResolver.ts`, `workbenchProjection.ts` |
| Stores | `WorkoutStore.ts`, `workbenchSyncStore.ts` |
| Services | `WorkoutEventBus.ts`, `WorkbenchEventBus.ts` |
| Hooks | `useWorkbenchRuntime.ts`, `useWorkbenchEffects.ts` (in `components/layout`) |
| Core | `createAnalyticsEngineForBlock.ts` |
| Runtime | `RuntimeController.ts`, `RuntimeFactory.ts`, `RuntimeFactory.test.ts` |
| Contexts | `RuntimeLifecycleContext.ts`, `RuntimeLifecycleProvider.tsx`, `WorkbenchContext.tsx` |
| Panels | `track-panel.tsx`, `plan-panel.tsx` |
| Storage types | `src/types/storage.ts` |
| Playground | `pages/PlaygroundNotePage.tsx`, `pages/WorkoutEditorPage.tsx`, `pages/shared/useNotePageNav.ts`, `services/journalEntryFlow.ts`, `services/openInPlayground.ts`, `services/playgroundDB.ts`, `runtimeStore.ts` |
| Stories | `FullscreenTimer.{stories,mdx}`, `RuntimeTimerPanel.{stories,mdx}` |
| Tests | `useWorkbenchRuntime.test.tsx`, `runtimeTimerModel.test.ts`, `workbenchDocumentModel.test.ts`, `blockDetection.test.ts`, `syntax-source-markdown.test.ts` |

**Tooling.** Use `lsp rename` (TypeScript server) for the interface
declaration in `src/components/Editor/types/index.ts:125`. The server
will rewrite all `import type { WodBlock }` and inline references in one
pass. Re-`read` every cross-file import to confirm the rewrite landed.

**Naming collision risk.** `WodBlock` appears in `parseWodBlock.ts` as a
function name (`parseWodBlock(content)`) **and** as the return type. The
function name is also being renamed in this phase (→ `parseScriptBlock`).
Rename the function first, then rename the type — the second LSP
operation will not collide with the first because the function name no
longer contains `Wod`.

**Acceptance.** `grep -r "WodBlock" src/ playground/ tests/ stories/`
returns zero hits. `bun run test` passes. `bun run
check:architecture` passes.

### 2.2 File renames: editor extensions

| Current | New | Imports updated in |
|---------|-----|--------------------|
| `src/components/Editor/extensions/wod-results-widget.ts` | `whiteboard-results-widget.ts` | editor extension registration (search for importer) |
| `src/components/Editor/extensions/wod-linter.ts` | `whiteboard-linter.ts` | editor extension registration |
| `src/components/Editor/extensions/wod-overlay.ts` | `whiteboard-overlay.ts` | editor extension registration |
| `src/components/Editor/extensions/wod-autocomplete.ts` | `whiteboard-autocomplete.ts` | editor extension registration |
| `src/components/Editor/extensions/__tests__/wod-results-widget.test.ts` | `whiteboard-results-widget.test.ts` | (colocated test, auto) |
| `src/components/Editor/extensions/__tests__/wod-linter.test.ts` | `whiteboard-linter.test.ts` | (colocated test, auto) |

**Tooling.** Use `lsp rename_file`. The LSP will update import paths via
`workspace/willRenameFiles`. Verify with `grep -r "wod-results-widget\|wod-linter\|wod-overlay\|wod-autocomplete" src/`.

### 2.3 File renames: editor hooks + utilities

| Current | New |
|---------|-----|
| `src/components/Editor/hooks/useWodBlockResults.ts` | `useScriptBlockResults.ts` |
| `src/components/Editor/hooks/useWodLineResults.ts` | `useScriptLineResults.ts` |
| `src/components/Editor/overlays/WodCommand.ts` | `ScriptCommand.ts` |
| `src/components/Editor/utils/parseWodBlock.ts` | `parseScriptBlock.ts` |

After rename, also rename the exports inside:
- `useScriptBlockResults` (function) and `UseScriptBlockResultsReturn`
- `useScriptLineResults` (function) and `UseScriptLineResultsReturn`
- `ScriptCommand` (interface)
- `parseScriptBlock` (function)

**Tooling.** `lsp rename_file` for files; `lsp rename` for the in-file
identifier renames. Both the file and the export share the prefix
(`useWodBlockResults` / `useScriptBlockResults`), so the LSP can do them
in one pass when the file is opened with the new name.

**Acceptance.** `grep -r "useWod\|UseWod\|WodCommand\|parseWodBlock"
src/` returns zero hits.

### 2.4 File + identifier renames: molecules, organisms, hooks

| Current file | New file | Renamed exports |
|--------------|----------|-----------------|
| `src/components/molecules/AddWodToNoteDropdown.tsx` | `AddScriptToNoteDropdown.tsx` | `AddScriptToNoteDropdown` (component), `wodBlock` prop → `scriptBlock` |
| `src/components/molecules/WodPlaygroundButton.tsx` (note: in `src/components/atoms/`) | `src/components/atoms/WhiteboardPlaygroundButton.tsx` | `WhiteboardPlaygroundButton` |
| `src/components/organisms/editor/WodCompanion.tsx` | `WhiteboardCompanion.tsx` | `WhiteboardCompanion`, `buildWodBlock` (private) → `buildScriptBlock` |
| `src/components/organisms/layout/WodIndexPanel.tsx` | `ScriptIndexPanel.tsx` | `ScriptIndexPanel` |
| `src/hooks/useWodCollections.ts` | `useScriptCollections.ts` | `useScriptCollections` |
| `src/hooks/useWodRouting.ts` | `useScriptRouting.ts` | `useScriptRouting` |

**Note on `WodPlaygroundButton` location.** The file lives in
`src/components/atoms/` (verified by `find`), not `molecules/` as the
index listed. Verify exact path before `lsp rename_file`.

**Acceptance.** `grep -r "AddWodToNoteDropdown\|WodPlaygroundButton\|WodCompanion\|WodIndexPanel\|useWodCollections\|useWodRouting" src/` returns zero hits.

### 2.5 File renames: repositories

| Current | New |
|---------|-----|
| `src/repositories/wod-collections.ts` | `script-collections.ts` |
| `src/repositories/wod-feeds.ts` | `script-feeds.ts` |
| `src/repositories/wod-feeds.test.ts` | `script-feeds.test.ts` |
| `src/repositories/wod-loader.ts` | `script-loader.ts` |
| `src/repositories/__mocks__/wod-collections.ts` | `script-collections.ts` (in `__mocks__/`) |

After rename, also rename exported types/identifiers in these files:
- `WodCollection`, `WodCollectionItem` → `ScriptCollection`, `ScriptCollectionItem`
- `WodFeed` → `ScriptFeed` (verify exact export name with `lsp symbols`)
- `wod-feeds` consumers in `playground/src/services/journalEntryFlow.ts`,
  `playground/src/services/paletteDataSources.ts`, `paletteDataSources.test.ts`

**Mock collision.** `src/repositories/__mocks__/script-collections.ts`
shadows `script-collections.ts` in tests; the Jest-style auto-mock
resolution path. Verify with `bun test` after rename — the mock must
still resolve.

**Acceptance.** `grep -r "wod-collections\|wod-feeds\|wod-loader" src/ playground/` returns zero hits. `bun run test:components` passes.

### 2.6 File rename: playground hook

| Current | New |
|---------|-----|
| `playground/src/hooks/useWodBlockCommands.tsx` | `useScriptBlockCommands.tsx` |

Rename the export `useWodBlockCommands` → `useScriptBlockCommands` in the
same pass. Update importers in `pages/PlaygroundNotePage.tsx:31` and
`pages/WorkoutEditorPage.tsx:26`.

**Acceptance.** `grep -r "useWodBlockCommands" playground/` returns zero hits.

### 2.7 Internal block-detection helper rename

`detectWodBlocks` in `src/components/Editor/utils/blockDetection.ts`
should rename to `detectScriptBlocks`. Its sibling
`extractWodBlocks` (in `playground/src/services/paletteDataSources.ts`)
also renames to `extractScriptBlocks`. Update the regex string literal
`/(wod|log|plan)/` to also match `whiteboard` — but defer the alias
addition to Phase 4; in Phase 2, only the identifier changes.

**Acceptance.** `grep -r "detectWodBlocks\|extractWodBlocks" src/ playground/ tests/` returns zero hits. `blockDetection.test.ts` still passes (tests don't reference the identifier, only the behavior).

### 2.8 Phase 2 gate

- `bun run test` (1)
- `bun run test:components` (2)
- `bun run check:architecture` (3)
- `grep -r "WodBlock\|wod-results-widget\|wod-linter\|WodCompanion\|WodIndexPanel\|wod-collections\|wod-feeds\|wod-loader\|WodPlaygroundButton\|WodCommand\|useWod\|parseWodBlock\|detectWodBlocks" src/ playground/ tests/ stories/` → zero hits
- `grep -r "VALID_WOD_DIALECTS\|WodDialect" src/` → zero hits (the
  `WodDialect` *class* is excluded)
- `find src playground tests stories -name '*wod*' -o -name '*Wod*'` → only
  the class file and its test

---

## Phase 3 — Runtime UI rename: Tracker / Timer → WallClock

> Rename the user-facing page + panel files and identifiers. Internal
> runtime types (`TimerBehavior`, `RuntimeClock`, `RuntimeStackTracker`,
> `TrackerBridge`, `WorkoutTracker`, `wallClockNow`) **stay**.

### 3.1 Page rename: `TrackerPage` → `WallClockPage`

| Current | New |
|---------|-----|
| `playground/src/pages/TrackerPage.tsx` | `playground/src/pages/WallClockPage.tsx` |
| `e2e/pages/TrackerPage.ts` | `e2e/pages/WallClockPage.ts` |

**Importers to update.**
- `playground/src/App.tsx:53` (named import + JSX usage)
- `playground/src/App.tsx:31` (`TrackerRedirect` import — see 3.4)
- `playground/src/App.tsx:656` (`TrackerRedirect` usage)
- `playground/src/runtimeStore.ts:6` (comment only)
- `stories/catalog/pages/TrackerPage.stories.tsx:12` (will rename in 3.5)
- `stories/catalog/pages/TrackerPage.mdx:2` (will rename in 3.5)
- `stories/catalog/integration/PlaygroundTracker.stories.tsx:17` (will rename in 3.5)

**Identifier rename in the file.** `TrackerPage` →
`WallClockPage`. Re-`read` the new file to confirm the default export
and the route's element prop both updated.

**Acceptance.** `grep -r "TrackerPage" playground/ e2e/ stories/`
returns zero hits. `bun run test:components` passes.

### 3.2 Panel file renames

| Current | New |
|---------|-----|
| `src/panels/timer-panel.tsx` | `src/panels/wallclock-panel.tsx` |
| `src/panels/timer-panel-chromecast.tsx` | `src/panels/wallclock-panel-chromecast.tsx` |

**Identifier rename in the files.** Default exports
`TimerPanel` → `WallClockPanel`,
`TimerPanelChromecast` → `WallClockPanelChromecast` (verify exact
export name with `lsp symbols`).

**Importers.** Search for `from.*timer-panel` across `src/`,
`playground/`, `stories/` and update each. The import surface is small
(panels are typically consumed by page shells).

**Acceptance.** `find src/panels -name 'timer-*'` returns zero hits. `bun run test:components` passes.

### 3.3 e2e file rename

| Current | New |
|---------|-----|
| `e2e/acceptance/fullscreen-timer-close.e2e.ts` | `e2e/acceptance/fullscreen-wallclock-close.e2e.ts` |

Inside the file, rename the describe block label
`'Fullscreen Timer close'` → `'Fullscreen WallClock close'`. Update the
e2e test runner config (if any) to match the new path.

**Acceptance.** `find e2e -name 'timer-*'` returns zero hits (excluding
the runtime-compliance tests in `tests/runtime-compliance/`, which are
out of scope).

### 3.4 Route alias strategy

The canonical path stays `/run/:runtimeId` (the verb, not the feature
name). The legacy `/tracker/:runtimeId` stays as a redirect for
bookmarks. No new `/wallclock/:runtimeId` route is added — the page is
reached at `/run/:runtimeId` and the user-facing *feature* name
"WallClock" appears in the page's UI copy and Storybook titles, not in
the URL.

**`ROUTE_PATTERNS.tracker`** in `playground/src/lib/routes.tsx:35`
stays (URL pattern unchanged). The
`trackerPath(runtimeId)` builder stays. `isTrackerPath` in
`routes.tsx:316` stays (it matches both `/tracker/` and `/run/`). Only
the `TrackerRedirect` component's *display* or *docs* can mention
"WallClock" — the redirect itself is silent.

**No file changes for routes in this phase.**

### 3.5 Storybook stories + templates + categories

**File renames.**
- `stories/catalog/pages/TrackerPage.stories.tsx` → `WallClockPage.stories.tsx`
- `stories/catalog/pages/TrackerPage.mdx` → `WallClockPage.mdx`
- `stories/catalog/integration/PlaygroundTracker.stories.tsx` → `PlaygroundWallClock.stories.tsx`
- `stories/catalog/templates/Tracker/` → `WallClock/` (directory)

**Identifier renames in `.storybook/preview.mjs`.** The
`status: {}` map at lines 77, 83, 89 uses category names `'Tracker'`,
`'TrackerPage'`, `'Tracker'`. Update to `'WallClock'`,
`'WallClockPage'`, `'WallClock'`.

**Story meta titles.** Inside each `.stories.tsx`, update the
`title: 'catalog/pages/TrackerPage'` style strings to use
`WallClockPage`. The directory rename in `templates/Tracker/` only
moves files; update the imports inside the templates to point to
`../atoms/...` and `../molecules/...` relative paths (verify with
`lsp rename_file`).

**`MetricTrackerCard` consideration.** `stories/catalog/molecules/MetricTrackerCard.mdx`
exists but is a card molecule, not the Tracker page. It tracks
*metrics*, which is the correct internal vocabulary. **Do not rename.**
The index doesn't list it.

**Acceptance.** `find stories -path '*Tracker*' -o -name '*Tracker*'`
returns zero hits (the `MetricTrackerCard` excluded). Storybook build
succeeds; categories list `WallClock` instead of `Tracker`.

### 3.6 Documentation rename: "Tracker" → "WallClock" in feature descriptions

**Files (in priority order).**
- `docs/07-screens-and-workflow.md` — "Tracker / Run" → "WallClock / Run"
- `docs/05-architecture.md` — "clock/timer" → "clock / WallClock" (where
  it refers to the user-facing feature; leave internal "timer" references alone)
- `docs/working/landing-hero-redesign.md` — "Tracker (`/run/:runtimeId`)" →
  "WallClock (`/run/:runtimeId`)"
- `README.md` — "TRACK — execute on the clock" → "TRACK — execute on the
  WallClock"; "Tracker / Run" → "WallClock / Run"
- `docs/working/hero-poc/idea-3.html` — "tracker screen" → "WallClock screen"
- `docs/working/hero-poc/markdown/hero-poc-v3/README.md` — same

**Out of scope (internal).** `src/runtime/INowProvider.ts` (contains
`wallClockNow` — already correctly named), all `Timer*` behavior files
in `src/runtime/behaviors/`, the `src/clock/` directory contents,
`src/parser/md-timer.ts` and its tests (internal parser concern).

**Acceptance.** `grep -r "Tracker" docs/working/landing-hero-redesign.md docs/07-screens-and-workflow.md` returns zero hits outside code-fence contexts and the `isTrackerPath` reference.

### 3.7 Phase 3 gate

- `bun run test`
- `bun run test:components`
- `bun run check:architecture`
- `bun run e2e` (or local playwright against `e2e/acceptance/fullscreen-wallclock-close.e2e.ts`)
- Storybook build
- `find . -path ./node_modules -prune -o -name 'Tracker*' -print -o -name 'tracker*' -print`
  → only `MetricTrackerCard` and the `isTrackerPath` route helper
- `find . -path ./node_modules -prune -o -name 'timer-panel*' -print` → zero hits

---

## Phase 4 — Fence tag alias: `whiteboard` accepted alongside `wod`

> Adds `whiteboard` as an accepted fence info string. `wod` keeps
> parsing forever. The change touches three places: the parser
> downstream resolver, the editor fence detector, the autocomplete
> suggestion.

### 4.1 Update the CodeMirror markdown language resolver

**File.** `src/app/editor/noteEditorServices.ts:87-93`

```ts
export function resolveWhiteboardCodeLanguage(info: string | null | undefined) {
-  if (info === 'wod' || info === 'log' || info === 'plan') {
+  if (
+    info === 'wod' ||
+    info === 'whiteboard' ||
+    info === 'log' ||
+    info === 'plan'
+  ) {
    return whiteboardScriptLanguage;
  }
  return null;
}
```

**Mirror in the test fixture.** `src/parser/whiteboard-script-language.highlight.test.ts:27`
contains the same predicate inside a CodeMirror `codeLanguages` config.
Add the same `info === "whiteboard"` branch.

**Alias mapping rule.** The fence `whiteboard` is treated as
semantically identical to `wod`. The `FenceDialect` returned by
`blockDialect()` in `sectionParser.ts` is `'wod'` (not `'whiteboard'`)
so downstream consumers (compiler, strategy selection, results linkage)
do not need to learn a fourth fence value. The fence name is
*display-only*; the dialect identity is preserved.

### 4.2 Update the editor fence detector

**File.** `src/components/Editor/utils/blockDetection.ts`

The `matchDialectFence` function iterates `VALID_FENCE_DIALECTS` to
recognize ` ```wod `, ` ```log `, ` ```plan `. The `whiteboard` alias is
*not* added to the array (that would make it a new dialect). Instead,
add a one-off check in the function: if the fence is `whiteboard`,
return `'wod'`.

```ts
function matchDialectFence(trimmedLine: string): FenceDialect | null {
  const lower = trimmedLine.toLowerCase();
  // Fence alias: 'whiteboard' maps to the 'wod' dialect.
  if (lower === '```whiteboard' || lower.startsWith('```whiteboard ') || lower.startsWith('```whiteboard\t')) {
    return 'wod';
  }
  for (const d of VALID_FENCE_DIALECTS) {
    if (lower === '```' + d || lower.startsWith('```' + d + ' ') || lower.startsWith('```' + d + '\t')) {
      return d;
    }
  }
  return null;
}
```

**Tests.** Add cases to `blockDetection.test.ts`:
- ` ```whiteboard\n...``` ` → single block with `dialect: 'wod'`
- ` ```WhiteBoard\n...``` ` → single block (case-insensitive)

### 4.3 Update the playground block extractor

**File.** `playground/src/services/paletteDataSources.ts:223`

The regex `/(wod|log|plan)/gi` extracts fences from raw markdown for the
command palette. Add `whiteboard` to the alternation. The returned
`ExtractedWodBlock.dialect` is normalized to lowercase — when the
matched name is `whiteboard`, normalize it to `'wod'` (same rule as
4.2). Rename the interface field `dialect` types and the
`WodBlocks` extraction label accordingly.

```ts
const re = /```(wod|whiteboard|log|plan)\r?\n([\s\S]*?)```/gi;
// ...
const rawDialect = match[1].toLowerCase();
const dialect = rawDialect === 'whiteboard' ? 'wod' : rawDialect;
```

**Tests.** Add to `paletteDataSources.test.ts`:
- ` ```whiteboard\nFoo\n``` ` → single block with `dialect: 'wod'`
- Mixed `wod` + `whiteboard` fences → both parsed

### 4.4 Update the autocomplete suggestion

**File.** `src/components/Editor/extensions/whiteboard-autocomplete.ts`
(renamed from `wod-autocomplete.ts` in Phase 2)

The autocomplete suggests `wod`, `log`, `plan` as fence tags when the
user types ` ``` `. Add `whiteboard` as a fourth suggestion labeled
"Whiteboard Script (alias for wod)".

**Acceptance test.** Manual: in playground, type ` ```wh` — autocomplete
suggests `whiteboard`. Pressing enter inserts a `whiteboard` fence that
parses identically to `wod`.

### 4.5 Markdown canvas content

**File.** `markdown/canvas/**/*.md` — many of the canvas pages already
use ` ```wod ` fences (e.g. `markdown/canvas/home/welcome-1.md` uses
`WallClock` in prose but `wod` fence). These need **no change** — the
fence tag stays `wod` and continues to parse. New content may use either
`wod` or `whiteboard`; both are valid.

**Acceptance.** `bun run test:components` passes. Manual smoke test in
playground confirms ` ```whiteboard` fence renders identically to
` ```wod`.

### 4.6 Phase 4 gate

- `bun run test`
- `bun run test:components`
- `bun run check:architecture`
- New tests pass (blockDetection, paletteDataSources, whiteboardscript highlight)
- No regression: existing ` ```wod ` content still parses bit-for-bit identically

---

## Phase 5 — Package rename: `@bitcobblers/wod-wiki-library` → `@bitcobblers/whiteboard-lang`

> Medium risk: CI config, lockfile, publish pipeline. Internal
> consumers update `package.json` references and the `bun.lock` is
> regenerated. The old package is published alongside (deprecation
> alias) for one release cycle.

### 5.1 Update `package.json`

**File.** `package.json:2`

```diff
-  "name": "@bitcobblers/wod-wiki-library",
+  "name": "@bitcobblers/whiteboard-lang",
   "version": "0.5.2",
   "description": "A React component library for parsing, displaying, and executing workout definitions using a specialized syntax. ... whiteboard language ...",
```

Bump the version to `0.6.0` — minor bump signals the rename + alias.

### 5.2 Regenerate the lockfile

```bash
rm bun.lock
bun install
```

Verify the lockfile resolves the new package name and that the
`scripts/fix-codemirror-deps.cjs` postinstall still works.

### 5.3 Update CI workflow references

**Files to grep.**
- `.github/workflows/*.yml`
- `.github/codeql/codeql-config.yml`
- `.github/prompts/wod-convert.prompt.md`

Most of these reference the **repo** (`wod.wiki`, `SergeiGolos/wod-wiki`)
or the **product** (`WOD-436`, `WOD-733` issue refs) — both stay. Only
references to the **npm package name** change.

**Acceptance.** `grep -r "wod-wiki-library" .github/ scripts/`
returns zero hits.

### 5.4 Publish the new package, deprecate the old

```bash
# Publish new
bun publish --tag latest

# Publish old as deprecated pointer
cd /tmp/checkout-old
# Bump old to 0.5.3, add deprecation message
bun publish --tag deprecated
```

The old package's `package.json` adds:
```json
"deprecated": "Renamed to @bitcobblers/whiteboard-lang. See https://wod.wiki/guide/whiteboard-lang"
```

### 5.5 Update agent / AI configuration

**Files.**
- `AGENTS.md` — replace `wod-wiki-library` with `whiteboard-lang`
- `CLAUDE.md` — same
- `.agent/skills/wod-extraction/SKILL.md` — update import examples
- `.agent/skills/runtime-debugger/SKILL.md` — update CLI example
- `.gemini/skills/wod-extraction/SKILL.md` — same
- `.gemini/skills/runtime-debugger/SKILL.md` — same
- `.gemini/antigravity.md` — update package reference
- `.goosehints` — update package reference

**Acceptance.** `grep -r "wod-wiki-library" .agent/ .gemini/ AGENTS.md CLAUDE.md .goosehints` returns zero hits.

### 5.6 Phase 5 gate

- `bun install` succeeds
- `bun run build` succeeds
- `bun run test` passes
- `bun run check:architecture` passes
- CI dry-run: `act -j build` or equivalent on a feature branch
- npm publish dry-run: `npm publish --dry-run`

---

## Phase 6 — Documentation + agent-skill content sweep

> Lowest-risk phase. All language/feature rename edits to documentation
> and AI skill descriptions. The product name (WOD Wiki), URLs, and
> domain stay; only the language and feature vocabulary is updated.

### 6.1 Top-level docs

| File | Change |
|------|--------|
| `CONTEXT.md` | Title stays "WOD Wiki — Domain Context". Line 16: "`wod` block parses into" → "Whiteboard block parses into". Line 17: "A `wod` block parses" → "A Whiteboard block parses". |
| `README.md` | Add tagline "powered by the Whiteboard Language". Update TRACK section to mention WallClock. |
| `docs/README.md` | Title stays "WOD Wiki — Documentation". Add one-line reference to the Whiteboard Language. |
| `docs/01-overview.md` | "WOD Wiki" stays. "fenced ```wod blocks" → "fenced ```wod (or ```whiteboard) blocks". |
| `docs/02-syntax-reference.md` | Title stays. Examples: add a note that ` ```whiteboard` is an accepted alias. |
| `docs/03-domain-model.md` | "`wod` block" → "Whiteboard block". |
| `docs/04-metric-lifecycle.md` | "fenced `wod` block" → "fenced Whiteboard block". |
| `docs/05-architecture.md` | "WOD Wiki" stays. "clock/timer" → "clock / WallClock" (where user-facing). "CrossFit, WOD, Cardio..." stays (these are dialect *names*, not the language). |
| `docs/06-interfaces-and-implementations.md` | "WOD Wiki" stays. `WodDialect` row stays (the *class* is unchanged). |
| `docs/07-screens-and-workflow.md` | "Tracker / Run" → "WallClock / Run". "`wod` editor" → "Whiteboard editor". "`wod` blocks" → "Whiteboard blocks". |
| `docs/3.1-classification.md` | `Wod*` file names stay (low priority reference doc; reflects current state at time of writing). Add a footer noting the post-rename names. |
| `docs/working/canvas-pages-inventory.md` | "WOD Wiki" stays. "wod block" → "Whiteboard block". |
| `docs/working/landing-hero-redesign.md` | "Tracker" → "WallClock" in feature descriptions. |
| `docs/working/hero-poc/idea-3.html` | "tracker screen" → "WallClock screen". |
| `docs/working/hero-poc/markdown/hero-poc-v3/README.md` | Same. |

### 6.2 Agent / AI skills

| File | Change |
|------|--------|
| `.agent/skills/wod-extraction/SKILL.md` | Title: "Converting Workouts to Whiteboard Script" (already partly there). Replace "WOD Wiki syntax" with "Whiteboard Language syntax". Replace "wod syntax" with "Whiteboard syntax". Examples: add ` ```whiteboard` fence alongside ` ```wod`. |
| `.agent/skills/runtime-debugger/SKILL.md` | "WOD Wiki runtime engine" → "WOD Wiki runtime engine (powered by the Whiteboard Language)". `./wod/2024.01.md` stays (filename; not the language). |
| `.gemini/skills/wod-extraction/SKILL.md` | Same as agent. |
| `.gemini/skills/runtime-debugger/SKILL.md` | Same as agent. |
| `.gemini/antigravity.md` | "WOD Wiki project" stays. `wod-extraction` skill name stays (the skill itself identifies the wod fence in markdown). Add note: "Language is Whiteboard; wod is the canonical fence tag." |
| `.goosehints` | "WOD Wiki Documentation Preferences" stays. `WodWiki` references: keep. Add note about Whiteboard as the language name. |
| `AGENTS.md` | "WOD Wiki" stays. `WodWiki.tsx` filename stays. "wod blocks" → "Whiteboard blocks". |
| `CLAUDE.md` | Same as AGENTS.md. |
| `.github/prompts/wod-convert.prompt.md` | "WOD Convert" → "Whiteboard Convert". "WOD blocks" → "Whiteboard blocks". The prompt's filename `wod-convert.prompt.md` stays (it's a stable identifier, like a file id). |

### 6.3 Code comments + JSDoc

Hundreds of references inside `src/`. Batch-replace using
`scripts/fix-unresolved-imports.py` (or a similar text-replace script
under `scripts/`). Patterns:

- `WOD block` → `Whiteboard block`
- `WOD Wiki syntax` → `Whiteboard Language syntax`
- `the wod language` → `the Whiteboard language`
- `wod syntax` → `Whiteboard syntax`
- `wod script` → `Whiteboard script`

**Exclude.** Comments that reference the `WodDialect` class, the `wod`
fence tag literally, or the `WOD` workout concept (CrossFit). A
context check (presence of `Dialect`, `fence`, or `WOD-` nearby) is a
good heuristic.

**Tooling.** Add a one-off script `scripts/sweep-rebrand-comments.cjs`
that runs the safe substitutions with a context window check. Run
before final commit; review the diff.

### 6.4 Storybook docs

The `.mdx` files in `stories/catalog/` were updated for category renames
in Phase 3. Sweep remaining prose for "Tracker" / "Timer" / "WOD" in
feature descriptions.

**Exclude.** `MetricTrackerCard.mdx` (the molecule name is internal and
correct for "tracks metrics", not "the Tracker page").

### 6.5 Phase 6 gate

- `bun run check-docs-links` (verifies no broken `docs/` cross-references)
- `grep -r "WOD Wiki" docs/ README.md CONTEXT.md` — hits allowed (product name stays)
- `grep -r "```wod" docs/` — hits allowed (fence tag is the user-facing syntax; docs continue to show it)
- `grep -r "Tracker" docs/working/landing-hero-redesign.md docs/07-screens-and-workflow.md docs/README.md` — zero hits
- `grep -r "Whiteboard" docs/whiteboard-language/` — every existing hit preserved + new content

---

## Cross-cutting verification

Run after every phase boundary:

| Check | Command | Pass criteria |
|-------|---------|---------------|
| Type check | `bun run lint` | zero errors |
| Unit tests | `bun run test` | all pass |
| Component tests | `bun run test:components` | all pass |
| Architecture | `bun run check:architecture` | zero issues |
| Storybook build | `bun run storybook:build` | succeeds |
| Docs links | `bun run check-docs-links` | zero broken refs |
| e2e | `bun run e2e` (after Phase 3) | `fullscreen-wallclock-close` passes |
| Unused exports | `bun run check-unused-exports` | no new unused exports introduced |
| Fence parsing | `bun run test:components -- fence` | both `wod` and `whiteboard` fences parse |

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `WodBlock` rename collides with `parseWodBlock` / `extractWodBlocks` | High | Phase 2.1 calls the function rename first, then the type rename. |
| Storybook category rename breaks story-id URL stability | Medium | Phase 3.5 keeps `title` string aligned with file path; verify build before merge. |
| Fence alias `whiteboard` causes downstream consumers to receive a `'whiteboard'` dialect they don't know | High | Phase 4.2 / 4.3 normalize the alias to `'wod'` at the earliest seam; `FenceDialect` union is unchanged. |
| `metric-inheritance.compliance.test.ts` (or any compliance test) hard-codes `WodBlock` in fixtures | Medium | Run `bun test` after each Phase 2 sub-step; fix fixtures in the same commit as the rename. |
| `bun.lock` regeneration pulls a newer transitive dep version | Low | Pin the new package's `bun install --frozen-lockfile=false` once; review the diff for unrelated changes. |
| Old `@bitcobblers/wod-wiki-library` consumers in the wild break | Low | Phase 5.4 deprecates rather than removes; new package is the `latest` tag. |
| Storybook story `title:` strings break visual regression baselines | Medium | Phase 3.5 updates `title:` in lockstep with the file path rename; Chromatic baselines are re-recorded as a follow-up (out of plan scope). |
| `WodPlaygroundButton` is in `atoms/`, not `molecules/` as the index listed | Already caught | Verify exact path with `find` before `lsp rename_file`. |

---

## Open questions (defer or resolve before kicking off)

1. **Is `WodBlock` → `ScriptBlock` in scope for v0.6.0, or held for v0.7.0?**
   79 files touched. Mechanically safe via `lsp rename`, but a large
   diff. If held, Phase 2.1 is skipped and Phases 2.2–2.7 proceed with
   `WodBlock` as the type name (only file + identifier renames for the
   *exports*, not the type).
   *Default:* include in v0.6.0 — the type is internal and the rename
   is mechanical.

2. **Should `WodIndexPanel` rename to `ScriptIndexPanel` (per the index)
   or to `WhiteboardIndexPanel`?**
   The index lists `ScriptIndexPanel`. Match the index. Confirm at
   Phase 2.4.

3. **Should the new package name be `whiteboard-lang` or
   `whiteboard-language`?**
   The index locks `whiteboard-lang`. Use it. If the npm scope
   disallows the hyphen for any reason, fall back to
   `whiteboard-language` and update the index.

4. **Does the Storybook `Tracker/` template directory contain any
   file other than component templates?**
   Verify with `ls stories/catalog/templates/Tracker/` before the
   directory rename.

---

## Summary

| Phase | Renames touched | Risk | Gate |
|-------|-----------------|------|------|
| 1 | 2 type identifiers in `Editor/types` | Low | unit tests + arch check |
| 2 | 1 interface (`WodBlock`→`ScriptBlock`), 22 files, ~20 functions/hooks | Medium | unit + components + arch + storybook |
| 3 | 1 page, 2 panels, 1 e2e, 3 stories + 1 template dir, route + story category strings | Medium | unit + components + arch + storybook + e2e |
| 4 | Fence tag alias `whiteboard` in 3 sites (resolver, detector, extractor) + tests | Medium | unit + components + new alias tests |
| 5 | `package.json` name + lockfile + CI + agent config | Medium | install + build + dry-run publish |
| 6 | ~15 docs, 8 agent/AI files, JSDoc sweep | Low | docs-link check + grep gates |

Net effect: 0 behavior changes. ~30 file renames, ~25 type/identifier
renames, 1 fence alias, 1 package rename. Estimated scope: 5–7 focused
PRs, one per phase, each independently mergeable and reversible.
