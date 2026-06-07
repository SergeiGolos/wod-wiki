# Rename & Rebrand Index: WOD → Whiteboard, Tracker/Timer → WallClock

> Deep audit of every reference surface across code, docs, configs, and UI.
> Generated 2026-06-07 from full codebase scan.

---

## 0. Executive Summary

**Two rename axes:**

| Axis | From | To | Scope |
|------|------|----|-------|
| **Language** | `wod` / "WOD" / "WOD Wiki" | "Whiteboard" / "Whiteboard Language" / "Whiteboard Script" | ~338+ file hits, ~28 named code files, ~6 type identifiers |
| **Runtime UI** | "tracker" / "timer" / "run" | "WallClock" (formal feature name for the clock-driven execution layer) | ~99+ file hits, ~10 named code files, ~3 type identifiers |

**Key finding:** The codebase *already uses* "Whiteboard" for the language in documentation (`docs/whiteboard-language/`), the grammar file (`whiteboardscript.grammar`), and the parser class (`WhiteboardScript`). And "WallClock" already appears in canvas markdown and `wallClockNow` in `INowProvider.ts`. The rename is a **completion and alignment** effort, not a fresh rebrand.

**Risk zones:**
- The `wod` fence tag in Markdown is a **user-facing syntax contract** — renaming it breaks every existing `.md` workout file.
- Package name `@bitcobblers/wod-wiki-library` and GitHub repo `SergeiGolos/wod-wiki` are external identity — DNS, npm, URLs.
- The `WodDialect` class is a domain concept (recognizes STRENGTH, METCON, etc.) — the dialect *name* `wod` maps to the fence tag, not the language.

---

## 1. Language Rename: WOD → Whiteboard

### 1.1 Already Aligned (No Change Needed)

These already use "Whiteboard" and are correct:

| Surface | Location | Status |
|---------|----------|--------|
| Grammar file | `src/grammar/whiteboardscript.grammar` | ✅ Whiteboard |
| Parser class | `src/parser/WhiteboardScript` | ✅ Whiteboard |
| Language docs | `docs/whiteboard-language/` (entire directory) | ✅ Whiteboard |
| Visualizer | `src/components/organisms/WhiteboardScriptVisualizer.tsx` | ✅ Whiteboard |
| Skill references | `.agent/skills/wod-extraction/SKILL.md` ("Converting Workouts to Whiteboard Script") | ✅ Whiteboard |
| CodeMirror skill | `.gemini/skills/codemirror-decoration-builder/SKILL.md` | ✅ WhiteboardScript |

### 1.2 Code Identifiers to Rename

#### Type/Interface Names

| Current | File | Proposed | Notes |
|---------|------|----------|-------|
| `WodDialect` | `src/dialects/WodDialect.ts` | Keep as `WodDialect` | This is a *dialect* (one of 6), not the language itself. It recognizes STRENGTH/METCON/WOD patterns. The `wod` here refers to the CrossFit "Workout of the Day" concept, not the language. **Do NOT rename.** |
| `WodDialect` (type) | `src/components/Editor/types/section.ts` | `FenceDialect` or `DialectFence` | This type = `'wod' \| 'log' \| 'plan'` — it's the fence selector, not the language |
| `VALID_WOD_DIALECTS` | `src/components/Editor/types/section.ts` | `VALID_FENCE_DIALECTS` or `VALID_DIALECTS` | Constant naming |
| `WodBlock` | `src/components/Editor/types/index.ts` (re-exported from section.ts) | Keep — this is a structural concept (a parsed code block) | Low risk rename if desired → `ScriptBlock` |

#### File Names

| Current Path | Proposed | Risk |
|-------------|----------|------|
| `src/dialects/WodDialect.ts` | **Keep** (see rationale above) | N/A |
| `src/dialects/WodDialect.test.ts` | **Keep** | N/A |
| `src/components/Editor/extensions/wod-results-widget.ts` | `script-results-widget.ts` or `whiteboard-results-widget.ts` | Medium — imported in editor |
| `src/components/Editor/extensions/wod-linter.ts` | `whiteboard-linter.ts` | Medium — imported in editor |
| `src/components/Editor/extensions/wod-overlay.ts` | `whiteboard-overlay.ts` | Medium |
| `src/components/Editor/extensions/wod-autocomplete.ts` | `whiteboard-autocomplete.ts` | Medium |
| `src/components/Editor/hooks/useWodBlockResults.ts` | `useScriptBlockResults.ts` | Medium |
| `src/components/Editor/hooks/useWodLineResults.ts` | `useScriptLineResults.ts` | Medium |
| `src/components/Editor/overlays/WodCommand.ts` | `ScriptCommand.ts` | Low |
| `src/components/Editor/utils/parseWodBlock.ts` | `parseScriptBlock.ts` | Low |
| `src/components/molecules/AddWodToNoteDropdown.tsx` | `AddScriptToNoteDropdown.tsx` | Medium |
| `src/components/molecules/WodPlaygroundButton.tsx` | `WhiteboardPlaygroundButton.tsx` | Low |
| `src/components/organisms/editor/WodCompanion.tsx` | `WhiteboardCompanion.tsx` | Medium |
| `src/components/organisms/layout/WodIndexPanel.tsx` | `ScriptIndexPanel.tsx` | Medium |
| `src/hooks/useWodCollections.ts` | `useScriptCollections.ts` or `useCollections.ts` | Low |
| `src/hooks/useWodRouting.ts` | `useScriptRouting.ts` | Low |
| `src/repositories/wod-collections.ts` | `script-collections.ts` or `collections.ts` | Medium |
| `src/repositories/wod-feeds.ts` | `script-feeds.ts` or `feeds.ts` | Medium |
| `src/repositories/wod-feeds.test.ts` | `script-feeds.test.ts` | Medium |
| `src/repositories/wod-loader.ts` | `script-loader.ts` | Medium |
| `src/repositories/__mocks__/wod-collections.ts` | `script-collections.ts` | Low |

#### Playground Files

| Current Path | Proposed | Risk |
|-------------|----------|------|
| `playground/src/hooks/useWodBlockCommands.tsx` | `useScriptBlockCommands.tsx` | Medium |

#### Test Files

| Current Path | Proposed | Risk |
|-------------|----------|------|
| `src/components/Editor/extensions/__tests__/wod-results-widget.test.ts` | `whiteboard-results-widget.test.ts` | Low |
| `src/components/Editor/extensions/__tests__/wod-linter.test.ts` | `whiteboard-linter.test.ts` | Low |

### 1.3 String Literals / UI Text

#### Fence Tag: ` ```wod ` — ⚠️ CRITICAL CONTRACT

The `wod` fence tag is **user-facing syntax** embedded in every Markdown workout file. Options:

| Option | Description | Impact |
|--------|-------------|--------|
| **A. Keep `wod` as primary fence, add `whiteboard` alias** | `wod` fence keeps working; `whiteboard` becomes an accepted alternative | Zero breakage. `WodDialect` type value `'wod'` stays. Gradual migration. |
| **B. Swap to `whiteboard`, keep `wod` as alias** | `whiteboard` becomes canonical; `wod` accepted for backward compat | New docs use `whiteboard`. Old files still work. |
| **C. Full rename** | Only `whiteboard` accepted | Breaks every existing `.md` file. High migration cost. |

**Recommendation:** Option A or B. The fence tag is a backwards-compatibility contract.

#### Agent/Skill Configuration

| File | String | Context |
|------|--------|---------|
| `.agent/skills/wod-extraction/SKILL.md` | "WOD Wiki syntax", "wod syntax", "```wod" | Skill description and examples |
| `.agent/skills/runtime-debugger/SKILL.md` | "WOD Wiki runtime engine", `./wod/2024.01.md` | Skill name and CLI example |
| `.gemini/skills/runtime-debugger/SKILL.md` | Same as above | Duplicate of agent skill |
| `.gemini/antigravity.md` | "WOD Wiki project", `wod-extraction` | Agent config |
| `.goosehints` | "WOD Wiki Documentation Preferences", `WodWiki` | Documentation preferences |
| `AGENTS.md` | "WOD Wiki", `WodWiki.tsx`, "wod blocks" | AI development guide |
| `CLAUDE.md` | Same as AGENTS.md | Claude-specific config |

#### Code Comments & JSDoc

Hundreds of references across `src/` — all internal. Low priority, batch-replaceable.

#### UI-Facing Strings

| Location | String | Proposed |
|----------|--------|----------|
| `CONTEXT.md` | "WOD Wiki — Domain Context", "`wod` block parses into" | "Whiteboard Wiki" or "WOD Wiki (powered by Whiteboard)" |
| `README.md` | "WOD Wiki", "`wod` block syntax" | Keep "WOD Wiki" as product name, add "Whiteboard Language" |
| `docs/README.md` | "WOD Wiki — Documentation" | Same |
| `.storybook/manager-head.html` | `wod-wiki-logo-*.png` | Asset rename |
| `.env.example` | "WOD Wiki API server" | "Whiteboard API server" |
| `.github/codeql/codeql-config.yml` | "WOD Wiki CodeQL Configuration" | Update |
| `.github/workflows/*.yml` | `wod.wiki`, `wod-wiki-preview`, `WOD-436`, `WOD-733` | URLs stay; issue references stay |
| `.github/prompts/wod-convert.prompt.md` | "WOD Convert", "WOD blocks" | Entire file is about the convert prompt |

### 1.4 External Identity (High Impact, Low Urgency)

| Surface | Current | Proposed | Notes |
|---------|---------|----------|-------|
| npm package | `@bitcobblers/wod-wiki-library` | `@bitcobblers/whiteboard-wiki` or keep | npm namespace change requires deprecation cycle |
| GitHub repo | `SergeiGolos/wod-wiki` | `SergeiGolos/whiteboard-wiki` | GitHub handles redirects, but CI URLs change |
| Domain | `wod.wiki`, `preview.wod.wiki` | Could add `whiteboard.wiki` alias | DNS changes |
| Logo files | `wod-wiki-logo-*.png` | `whiteboard-wiki-logo-*.png` | Asset rename |
| Storybook | Story titles use "Tracker", "WOD" | Update story metadata | Cosmetic |

### 1.5 Documentation

| File | References | Priority |
|------|-----------|----------|
| `docs/01-overview.md` | "WOD Wiki", "fenced ```wod blocks" | High |
| `docs/02-syntax-reference.md` | "wod Block Syntax Reference", extensive examples | High — but fence syntax stays |
| `docs/03-domain-model.md` | "`wod` block" | Medium |
| `docs/04-metric-lifecycle.md` | "fenced `wod` block" | Medium |
| `docs/05-architecture.md` | "WOD Wiki", "CrossFit, WOD, Cardio..." | Medium (WOD here = dialect name) |
| `docs/06-interfaces-and-implementations.md` | "WOD Wiki", "WodDialect" | Low |
| `docs/07-screens-and-workflow.md` | "`wod` editor", "`wod` blocks" | Medium |
| `docs/3.1-classification.md` | File lists with `Wod*` names | Low (reference doc) |
| `docs/whiteboard-language/*` | Already uses "Whiteboard" ✅ | N/A |
| `docs/working/canvas-pages-inventory.md` | "WOD Wiki", "wod block" | Medium |
| `docs/working/landing-hero-redesign.md` | "Tracker" references | High — rename to WallClock |
| `docs/working/hero-poc/` | "tracker screen", "WOD" | Medium |
| `CONTEXT.md` | "WOD Wiki — Domain Context" | High |

---

## 2. Runtime UI Rename: Tracker/Timer → WallClock

### 2.1 Conceptual Boundary

Current naming is inconsistent:
- **"Tracker"** = the full-screen page (`TrackerPage`, `/run/:runtimeId`, `/tracker/:runtimeId`)
- **"Timer"** = the clock display component (`TimerHarness`, `timer-panel.tsx`, `RuntimeTimerPanel`)
- **"Run"** = the verb used in routes (`/run/:runtimeId`) and the docs ("execute on the clock")
- **"RuntimeClock"** = the internal time source (`RuntimeClock`, `IRuntimeClock`)
- **"Wall Clock"** = already used in canvas markdown as the user-facing feature name

**Proposed model:**

```
WallClock (feature name, user-facing)
├── WallClock Page (was TrackerPage) — the full-screen execution UI
├── WallClock Panel (was timer-panel) — the clock display component
├── RuntimeClock (keep internal) — the time source interface
└── Run verb (keep) — "press Run to start the WallClock"
```

### 2.2 Already Using "WallClock"

| Surface | Location | Context |
|---------|----------|---------|
| `wallClockNow` | `src/runtime/INowProvider.ts` | Default now-provider constant |
| "Wall Clock" | `markdown/canvas/home/README.md` | "Wall Clock enabled Journal powered by Whiteboard" |
| "WallClock" | `markdown/canvas/home/README.md` | "Press Run to fire up the WallClock" |
| "WallClock" | `markdown/canvas/home/welcome-1.md` | "Press Run ↑ to start the WallClock" |
| "wall-clock" | `docs/working/runtime-testability-plan.md` | "Wall-clock leaks → single IRuntimeClock time source" |

### 2.3 Code Identifiers to Rename

#### Page/Route Level

| Current | File | Proposed |
|---------|------|----------|
| `TrackerPage` (component) | `playground/src/pages/TrackerPage.tsx` | `WallClockPage` |
| `TrackerPage` (import) | `playground/src/App.tsx:53` | `WallClockPage` |
| `TrackerRedirect` | `playground/src/App.tsx:656` | `WallClockRedirect` |
| `/tracker/:runtimeId` route | Route pattern in App.tsx | `/wallclock/:runtimeId` (add alias, keep tracker redirect) |
| `TrackerPage` (e2e) | `e2e/pages/TrackerPage.ts` | `WallClockPage` |
| `pendingRuntimes` description | `playground/src/runtimeStore.ts:6` | "WallClockPage reads and deletes the entry" |

#### Component Level

| Current | File | Proposed |
|---------|------|----------|
| `timer-panel.tsx` | `src/panels/timer-panel.tsx` | `wallclock-panel.tsx` |
| `timer-panel-chromecast.tsx` | `src/panels/timer-panel-chromecast.tsx` | `wallclock-panel-chromecast.tsx` |
| `TimerHarness` | `src/clock/components/TimerHarness.tsx` | Keep (internal component) |
| `RuntimeTimerPanel` | Referenced in stories | Keep internal, or rename to `WallClockPanel` |

#### Storybook

| Current | Proposed |
|---------|----------|
| `stories/catalog/pages/TrackerPage.stories.tsx` | `WallClockPage.stories.tsx` |
| `stories/catalog/pages/TrackerPage.mdx` | `WallClockPage.mdx` |
| `stories/catalog/integration/PlaygroundTracker.stories.tsx` | `PlaygroundWallClock.stories.tsx` |
| `stories/catalog/templates/Tracker/` | `WallClock/` |
| `.storybook/preview.mjs` — Tracker category | WallClock category |

#### Storybook Labels

| Current | Location | Proposed |
|---------|----------|----------|
| `'Tracker'` | `.storybook/preview.mjs:77` | `'WallClock'` |
| `'TrackerPage'` | `.storybook/preview.mjs:83` | `'WallClockPage'` |
| `'Tracker'` | `.storybook/preview.mjs:89` | `'WallClock'` |

### 2.4 File Names to Rename

| Current Path | Proposed | Risk |
|-------------|----------|------|
| `playground/src/pages/TrackerPage.tsx` | `WallClockPage.tsx` | Medium — imported in App.tsx, stories |
| `e2e/pages/TrackerPage.ts` | `WallClockPage.ts` | Medium — imported in e2e tests |
| `src/panels/timer-panel.tsx` | `wallclock-panel.tsx` | Medium |
| `src/panels/timer-panel-chromecast.tsx` | `wallclock-panel-chromecast.tsx` | Medium |
| `e2e/acceptance/fullscreen-timer-close.e2e.ts` | `fullscreen-wallclock-close.e2e.ts` | Low |
| `stories/catalog/pages/TrackerPage.stories.tsx` | `WallClockPage.stories.tsx` | Low |
| `stories/catalog/pages/TrackerPage.mdx` | `WallClockPage.mdx` | Low |
| `stories/catalog/integration/PlaygroundTracker.stories.tsx` | `PlaygroundWallClock.stories.tsx` | Low |
| `stories/catalog/templates/Tracker/` (directory) | `WallClock/` | Low |
| `src/runtime/behaviors/__tests__/integration/timer-block.test.ts` | Keep — tests timer behavior, not the UI feature | N/A |
| `tests/runtime-compliance/timer.compliance.test.ts` | Keep — tests timer behavior compliance | N/A |
| `tests/jit-compilation/sequential-timers.test.ts` | Keep — tests timer compilation | N/A |
| `src/parser/md-timer.ts` | Keep — internal parser concern | N/A |
| `src/parser/md-timer.integration.test.ts` | Keep | N/A |

### 2.5 Keep As-Is (Internal Runtime)

These are internal implementation details, NOT user-facing:

| Identifier | Rationale |
|-----------|-----------|
| `RuntimeClock` / `IRuntimeClock` | Internal time source — not user-visible |
| `RuntimeStack` | Internal execution stack |
| `TimerBehavior` / `CountupTimerBehavior` | Behavior implementations — "timer" is correct for a countdown/countup mechanism |
| `SpanTrackingBehavior` | Internal |
| `TimerStrategy` | Compiler strategy |
| `wallClockNow` / `INowProvider` | Already correctly named |

### 2.6 Documentation References

| File | Current | Proposed |
|------|---------|----------|
| `docs/07-screens-and-workflow.md` | "Tracker / Run" | "WallClock / Run" |
| `docs/07-screens-and-workflow.md` | "tracker / run" | "WallClock / run" |
| `docs/05-architecture.md` | "clock/timer" | "clock / WallClock" |
| `docs/working/landing-hero-redesign.md` | "Tracker (`/run/:runtimeId`)" | "WallClock (`/run/:runtimeId`)" |
| `README.md` | "TRACK — execute on the clock", "Tracker / Run" | "TRACK — execute on the WallClock" |
| `docs/working/hero-poc/idea-3.html` | "tracker screen" | "WallClock screen" |
| `docs/working/hero-poc/markdown/hero-poc-v3/README.md` | "tracker screen" | "WallClock screen" |

---

## 3. Migration Strategy

### Phase 1: Internal Code Rename (Low Risk)
1. Rename `WodDialect` type → `FenceDialect` in `src/components/Editor/types/section.ts`
2. Rename `VALID_WOD_DIALECTS` → `VALID_FENCE_DIALECTS`
3. Rename `TrackerPage` → `WallClockPage` (playground + e2e + stories)
4. Rename `timer-panel*.tsx` → `wallclock-panel*.tsx`
5. Rename `wod-*.ts/tsx` editor extensions → `whiteboard-*.ts/tsx` (or `script-*.ts`)
6. Rename `WodCommand` → `ScriptCommand`
7. Update storybook categories: Tracker → WallClock
8. Run `check:architecture` to verify no broken imports

### Phase 2: Route Aliases (Medium Risk)
1. Add `/wallclock/:runtimeId` as new canonical route
2. Keep `/tracker/:runtimeId` as redirect (backward compat for bookmarks/deep links)
3. Keep `/run/:runtimeId` as-is (it's the verb, not the feature name)

### Phase 3: Fence Tag Alias (Medium Risk)
1. Add `whiteboard` as accepted fence tag alongside `wod`
2. Update docs to show ` ```whiteboard ` as canonical
3. Keep `wod` fence accepted by parser forever (backward compat)
4. Update `WodDialect` type to `'wod' | 'log' | 'plan' | 'whiteboard'` or map `whiteboard` → `wod` dialect

### Phase 4: Documentation Sweep (Low Risk)
1. Update all docs to use "Whiteboard Language" / "Whiteboard Script"
2. Update all docs to use "WallClock" for the execution feature
3. Update CONTEXT.md, AGENTS.md, CLAUDE.md, .goosehints
4. Update skill descriptions in `.agent/` and `.gemini/`

### Phase 5: External Identity (High Impact, Separate Decision)
1. Package name discussion (`@bitcobblers/wod-wiki-library` → ???)
2. GitHub repo rename (or not)
3. Domain strategy (add `whiteboard.wiki` alias?)
4. Logo/branding assets

---

## 4. Inventory Summary

### Files with "wod" in name (non-markdown, non-lockfile): 28
- `src/`: 22 files
- `playground/`: 2 files
- `.agent/.gemini/`: skill configs (not code)
- Logo assets: 2 PNGs

### Files with "tracker" in name: 0 code files
- "Tracker" appears as component names (`TrackerPage`) and story titles, not as file names (except storybook `Tracker/` dir)

### Files with "timer" in name: 12
- `src/panels/`: 2 files
- `src/parser/`: 2 files
- `src/clock/components/`: 1 file
- `src/runtime/behaviors/__tests__/`: 1 file
- `tests/`: 3 files
- `e2e/`: 1 file
- `markdown/canvas/`: ~8 content files

### String literal hits (approximate):
- "wod" (case-insensitive): **338+ matches** across 100+ files
- "tracker" (case-insensitive): **99+ matches** across 40+ files
- "timer" (case-insensitive): **351+ matches** across 80+ files (many are internal behavior/code)
- "whiteboard" (case-insensitive): **105+ matches** across 30+ files (already partially adopted)
- "wallclock" / "wall clock": **36+ matches** across 15+ files (already partially adopted)

### Code identifiers to rename: ~12
### Files to rename: ~20
### Route patterns to add/alias: 1
### Documentation files to update: ~15
