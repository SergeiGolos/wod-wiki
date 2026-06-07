# Rename & Rebrand Index: Whiteboard Language + WallClock

> Deep audit of every reference surface across code, docs, configs, and UI.
> Generated 2026-06-07 from full codebase scan.

---

## 0. Decisions Locked

| Decision | Resolution |
|----------|------------|
| **Product name** | **WOD Wiki** stays. URL (`wod.wiki`), repo (`SergeiGolos/wod-wiki`), page titles, domain all unchanged. |
| **npm package** | `@bitcobblers/wod-wiki-library` → **`@bitcobblers/whiteboard-lang`** |
| **Language name** | **Whiteboard** / "Whiteboard Language" / "Whiteboard Script" — the DSL inside ` ```wod ` fences |
| **Runtime feature** | **WallClock** — the formal feature name for the clock-driven execution layer |
| **Fence tag** | `wod` stays as canonical fence tag (backward compat). `whiteboard` added as accepted alias. |

The branding sits on the **language** (Whiteboard) and the **feature** (WallClock), not on the product/URL.

## 0.1 Scope Summary

| Axis | From | To | Scope |
|------|------|----|-------|
| **Language** | `wod` / "WOD" in code identifiers, docs | "Whiteboard" / "Whiteboard Language" / "Whiteboard Script" | ~338+ string hits, ~28 named files, ~6 type identifiers |
| **Runtime UI** | "tracker" / "timer" in page/component names | "WallClock" (formal feature name) | ~99+ string hits, ~10 named files, ~3 type identifiers |
| **Package** | `@bitcobblers/wod-wiki-library` | `@bitcobblers/whiteboard-lang` | `package.json`, CI, publish config |

**Key finding:** The codebase *already uses* "Whiteboard" for the language (`whiteboardscript.grammar`, `WhiteboardScript`, `docs/whiteboard-language/`) and "WallClock" in canvas content and `wallClockNow`. The rename is a **completion and alignment** effort, not a fresh rebrand.

**Risk zones:**
- The `wod` fence tag is a **user-facing syntax contract** — adding `whiteboard` as alias, keeping `wod` forever.
- The `WodDialect` class is a domain concept (recognizes STRENGTH, METCON, etc.) — the `wod` here is the CrossFit "Workout of the Day", not the language. **Do not rename the class.**
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

| Current              | File                                                                 | Proposed                                                  | Notes                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WodDialect`         | `src/dialects/WodDialect.ts`                                         | Keep as `WodDialect`                                      | This is a *dialect* (one of 6), not the language itself. It recognizes STRENGTH/METCON/WOD patterns. The `wod` here refers to the CrossFit "Workout of the Day" concept, not the language. **Do NOT rename.** |
| `WodDialect` (type)  | `src/components/Editor/types/section.ts`                             | `FenceDialect` or `DialectFence`                          | This type = `'wod' \| 'log' \| 'plan'` — it's the fence selector, not the language                                                                                                                            |
| `VALID_WOD_DIALECTS` | `src/components/Editor/types/section.ts`                             | `VALID_FENCE_DIALECTS` or `VALID_DIALECTS`                | Constant naming                                                                                                                                                                                               |
| `WodBlock`           | `src/components/Editor/types/index.ts` (re-exported from section.ts) | Keep — this is a structural concept (a parsed code block) | Low risk rename if desired → `ScriptBlock`                                                                                                                                                                    |

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

#### Fence Tag: ` ```wod ` — DECIDED: keep `wod`, add `whiteboard` alias

The `wod` fence tag is **user-facing syntax** embedded in every Markdown workout file.
Decision: keep `wod` as the canonical fence tag forever. Add `whiteboard` as an accepted
alias in the parser. New documentation may show either `wod` or `whiteboard`; old content
never breaks.

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
| `CONTEXT.md` | "WOD Wiki — Domain Context", "`wod` block parses into" | Keep "WOD Wiki", change "`wod` block" → "Whiteboard block" |
| `README.md` | "WOD Wiki", "`wod` block syntax" | Keep "WOD Wiki", add "powered by the Whiteboard Language" tagline |
| `docs/README.md` | "WOD Wiki — Documentation" | Keep "WOD Wiki" |
| `.storybook/manager-head.html` | `wod-wiki-logo-*.png` | Keep — logo stays |
| `.env.example` | "WOD Wiki API server" | Keep |
| `.github/codeql/codeql-config.yml` | "WOD Wiki CodeQL Configuration" | Keep |
| `.github/workflows/*.yml` | `wod.wiki`, `wod-wiki-preview`, `WOD-436`, `WOD-733` | Keep — URLs and issue refs stay |
| `.github/prompts/wod-convert.prompt.md` | "WOD Convert", "WOD blocks" | Update to "Whiteboard Convert", "Whiteboard blocks" |

### 1.4 External Identity — DECIDED

| Surface | Current | Decision | Notes |
|---------|---------|----------|-------|
| **npm package** | `@bitcobblers/wod-wiki-library` | → `@bitcobblers/whiteboard-lang` | Deprecation cycle: publish both, point old to new |
| GitHub repo | `SergeiGolos/wod-wiki` | **Keep** | GitHub redirects are fragile for CI |
| Domain | `wod.wiki`, `preview.wod.wiki` | **Keep** | Product URL = product name |
| Logo files | `wod-wiki-logo-*.png` | **Keep** | Product branding |
| Storybook | Story titles use "Tracker", "WOD" | Update to "WallClock", keep "WOD Wiki" | Cosmetic |

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
5. Rename `wod-*.ts/tsx` editor extensions → `whiteboard-*.ts/tsx`
6. Rename `WodCommand` → `ScriptCommand`
7. Rename `WodCompanion` → `WhiteboardCompanion`
8. Rename `WodPlaygroundButton` → `WhiteboardPlaygroundButton`
9. Rename `WodIndexPanel` → `ScriptIndexPanel`
10. Rename `AddWodToNoteDropdown` → `AddScriptToNoteDropdown`
11. Rename `useWod*` hooks → `useScript*` / `useWhiteboard*`
12. Rename `wod-*` repository files → `script-*`
13. Update storybook categories: Tracker → WallClock
14. Run `check:architecture` to verify no broken imports

### Phase 2: Fence Tag Alias (Medium Risk)
1. Add `whiteboard` as accepted fence tag alongside `wod` in the parser/grammar
2. Map `whiteboard` → `wod` dialect internally (same behavior, different fence name)
3. Keep `wod` fence accepted by parser forever (backward compat)
4. Update editor autocomplete to show both `wod` and `whiteboard`

### Phase 3: Route Aliases (Low Risk)
1. Keep `/run/:runtimeId` as-is (it's the verb, not the feature name)
2. Keep `/tracker/:runtimeId` as redirect (backward compat for bookmarks)
3. Optionally add `/wallclock/:runtimeId` as alias (defer if not needed)

### Phase 4: Package Rename (Medium Risk, CI-impacting)
1. Update `package.json` name: `@bitcobblers/whiteboard-lang`
2. Update all import paths in CI workflows that reference the old package name
3. Update `bun.lock` (regenerate)
4. Publish `@bitcobblers/whiteboard-lang` to npm
5. Deprecate `@bitcobblers/wod-wiki-library` with a pointer to the new name
6. Update `AGENTS.md`, `CLAUDE.md` package references

### Phase 5: Documentation Sweep (Low Risk)
1. Update all docs: "WOD Wiki" stays as product name, language → "Whiteboard Language"
2. Update all docs: "Tracker" → "WallClock" in feature descriptions
3. Update `CONTEXT.md` — keep "WOD Wiki — Domain Context" title, update language references
4. Update skill descriptions in `.agent/` and `.gemini/`
5. Update `.goosehints`
6. Update `.github/prompts/wod-convert.prompt.md` → language references only

### NOT in scope
- GitHub repo rename (`SergeiGolos/wod-wiki` stays)
- Domain/URL changes (`wod.wiki` stays)
- Logo asset changes
- Removing `wod` fence tag support
- Renaming `WodDialect` class (CrossFit domain concept, not the language)
- Renaming internal runtime types (`TimerBehavior`, `RuntimeClock`, etc.)

---

## 4. Inventory Summary

### Files with "wod" in name (non-markdown, non-lockfile): 28
- `src/`: 22 files
- `playground/`: 2 files
- `.agent/.gemini/`: skill configs (not code)
- Logo assets: 2 PNGs (staying as-is)

### Files with "tracker" in name: 0 code files
- "Tracker" appears as component names (`TrackerPage`) and story titles, not as file names (except storybook `Tracker/` dir)

### Files with "timer" in name: 12
- `src/panels/`: 2 files (→ `wallclock-panel*`)
- `src/parser/`: 2 files (keeping — internal)
- `src/clock/components/`: 1 file (keeping — internal)
- `src/runtime/behaviors/__tests__/`: 1 file (keeping)
- `tests/`: 3 files (keeping)
- `e2e/`: 1 file
- `markdown/canvas/`: ~8 content files

### String literal hits (approximate):
- "wod" (case-insensitive): **338+ matches** across 100+ files
- "tracker" (case-insensitive): **99+ matches** across 40+ files
- "timer" (case-insensitive): **351+ matches** across 80+ files (many internal — not renamed)
- "whiteboard" (case-insensitive): **105+ matches** across 30+ files (already adopted)
- "wallclock" / "wall clock": **36+ matches** across 15+ files (already adopted)

### Code identifiers to rename: ~15
### Files to rename: ~22
### Route patterns to add/alias: 0-1 (optional)
### Documentation files to update: ~15