# Fence-Tag Consumer Inventory & Dynamic-Dialect Detection Audit

**Ticket:** #889 · **Map:** #887 (Fence Tags → time/log cutover) · **Date:** 2026-08-03 · **Branch:** wql-for-all

This is the checklist the retag / rename / migration tickets work from. It covers:

1. Every code path keyed on the ` ```wod ` / ` ```log ` / ` ```plan ` / ` ```whiteboard ` fence strings.
2. Every `section.type === 'wod'` / `dataType === 'wod'` consumer.
3. Verdict on the `FenceDialect` comment — *"each loads different strategies"*.
4. Verdict on dynamic ` ```{dialect-name} ` detection.
5. Playground / guide / quest-ring / seed / fixture references with counts.

---

## 1. Verdicts (answered up front)

### Does the fence name drive runtime strategy selection? — **DEBUNKED**

The comment on `FenceDialect` (`src/components/Editor/types/section.ts:18`) — *"Valid WOD dialect identifiers — each loads different strategies"* — is **stale/aspirational**. No fence-dialect-gated runtime strategy exists.

Evidence:

- `src/runtime/compiler/JitCompiler.ts:57-59` — `compile(nodes, runtime)` filters strategies purely by `s.match(statements, runtime)`. The compiler input is `ICodeStatement[]`, which carries **no dialect field**; no dialect parameter exists anywhere in the compiler.
- Every strategy's `match()` is metric/hint/children-keyed, dialect-blind: `GenericTimerStrategy.ts:29-36` (Duration fragments + `behavior.*` hints), `GenericLoopStrategy.ts:27-30` (Rounds), `GenericGroupStrategy.ts:26-36`, `ChildrenStrategy.ts:23-26`, `SoundStrategy.ts:26`, `ReportOutputStrategy.ts:23`, `IdleBlockStrategy.ts:51` / `SessionRootStrategy.ts:37` (hardcoded false). Repo-wide grep of `src/runtime/` for `dialect|fence|'wod'|'log'|'plan'`: zero strategy/compiler hits (only doc comments about *DialectStack-emitted hints* — a different axis).
- `src/runtime/services/runtimeServices.ts:34-51` — `strategyRegistry` is one global registry, seeded with 9 built-ins; `createCompiler()` reads it with no dialect filtering.
- `src/runtime/compiler/RuntimeFactory.ts:109` — the **only** place `ScriptBlock.dialect` enters the runtime stack, and it feeds `createAnalyticsEngineForBlock`, not the compiler.

**Where the fence name *does* change behavior — analytics eligibility only:**

- `src/core/analytics/createAnalyticsEngineForBlock.ts:36` — `const dialect = block.dialect || 'wod'` → `AnalyticsProfileContext.dialect` (:59).
- `src/core/analytics/StandardAnalyticsProfile.ts:68-73` — processor eligibility: `if (!processor.fenceTypes.includes(context.dialect)) return false`.
- `src/core/analytics/TwoPassEffortResolutionProcess.ts:29` — `fenceTypes = ['wod','log','plan']` (admits all three → no effective gating today).
- `src/core/analytics/calc/engine.ts:56,71-73` — CalcEngine `fenceTypes = ['wod','log','plan']`; filters calc definitions: `!d.fences || d.fences.includes(deps.dialect)`.
- `src/core/analytics/calc/seeds.ts` — the real fence gating: segment calcs `fences: ['wod','log']` (:30,:42,:54,:66,:100) exclude `plan`; workout/store calcs mixed `['wod','log','plan']` (:126,:138,:149,:161,:173,:285) vs `['wod','log']` (:190,:237,:348,:364,:380). Comment :98-99: *"must not appear on plan-dialect logs"*.
- `src/core/analytics/IAnalyticsProcessorDescriptor.ts:12-15` — docs state `fenceTypes` is "the **fence** axis only".

The metric-dialect axis (`src/dialects/DialectStack.ts:29-64` — Units, CrossFit, Wod, Cardio, Yoga, Habits, Climb) is a **global** parse-time statement processor (called from `src/parser/lezer-mapper.ts:29`), applied to every statement regardless of fence name. Orthogonal to this migration except for the name collision `WodDialect.id = 'wod'` (`src/dialects/WodDialect.ts:26`).

### Does any code recognize arbitrary ` ```{dialect-name} ` fences dynamically? — **NO. Confirmed.**

Every recognition site matches against a **fixed literal list**; unknown fence languages degrade to generic `code` sections:

- `src/components/Editor/extensions/section-state.ts:150-161` — `matchDialectFence` loops `VALID_DIALECTS = ['wod','log','plan']` only. **No `whiteboard` alias here** (inconsistency — see §2).
- `src/components/Editor/extensions/section-state.ts:191-204` — `matchGenericFence` extracts *any* ` ```<lang> ` tag but classifies it as `type: "code"` (never as a dialect/wod section).
- `src/components/Editor/utils/blockDetection.ts:14-25` — `matchDialectFence` loops `VALID_FENCE_DIALECTS`, plus the hardcoded `whiteboard` alias (:16-18).
- `src/app/editor/noteEditorServices.ts:87-96` — `resolveWhiteboardCodeLanguage(info)` matches exactly `'wod' | 'whiteboard' | 'log' | 'plan'`; everything else → `null` (no syntax highlighting).
- `playground/src/services/paletteDataSources.ts:250` — regex `` /```(wod|whiteboard|log|plan)\r?\n([\s\S]*?)```/gi ``; fixed alternation.
- `playground/src/lib/routeView.ts:240`, `playground/src/pages/shared/pageUtils.ts:68` — regex `/^```(wod|log|plan)/`; fixed alternation.

Nothing in the repo takes an arbitrary fence name and treats it as a runnable dialect. A ` ```climbing ` fence today parses as a plain code block, unhighlighted, unrunnable.

### Alias inconsistency flag for migration

`whiteboard`→`wod` normalization exists in exactly **three** places: `blockDetection.ts:16-18`, `noteEditorServices.ts:90`, `paletteDataSources.ts:255`. It is **missing** from `section-state.ts:150-161` (the live CM6 section parser) — so ` ```whiteboard ` currently parses as a generic `code` section in the editor but as a `wod` block in the string-based `detectScriptBlocks` path. The cutover deletes the alias everywhere; no content file uses it (see §5).

---

## 2. Fence-recognition seams (parsers)

| Site | What it keys on | Notes |
|---|---|---|
| `src/components/Editor/extensions/section-state.ts:20-21` | `EditorDialect` type + `VALID_DIALECTS` const | Live CM6 parser |
| `src/components/Editor/extensions/section-state.ts:150-161` | `matchDialectFence` → `type: "wod"` section (:376-397) | No `whiteboard` alias |
| `src/components/Editor/types/section.ts:18-22` | `FenceDialect` type + `VALID_FENCE_DIALECTS` | Comment at :18 debunked (§1) |
| `src/components/Editor/types/index.ts:127-130` | `ScriptBlock.dialect` field + doc comment | Comment "determines which strategies are loaded" also stale |
| `src/components/Editor/utils/blockDetection.ts:14-25,36-57` | `matchDialectFence` + `detectScriptBlocks` | Holds `whiteboard` alias :16-18; generates `wod-block-*` ids :53 |
| `src/components/Editor/utils/sectionParser.ts:80-84,328-356` | `blockDialect(block) ?? 'wod'`; re-emits ` ```{dialect} ` raw content :331-332 | String-based parser |
| `src/app/editor/noteEditorServices.ts:87-96` | `resolveWhiteboardCodeLanguage` info-string check | Includes `whiteboard` |
| `src/components/Editor/extensions/whiteboard-autocomplete.ts:25-54` | `DIALECTS` completions: ` ```wod ` (:27), ` ```whiteboard ` (:34), ` ```log ` (:41), ` ```plan ` (:48) | Also `wrapInWodFence` Cmd+Shift+W hardcodes ` ```wod ` :149-168 |
| `playground/src/services/paletteDataSources.ts:250,255` | regex + `whiteboard`→`wod` normalize | Only alias consumer outside src/ |
| `playground/src/lib/routeView.ts:240,245,260,279` | fence regex → nav links `type:'wod'` | Skipped on `/guide/` pages |
| `playground/src/pages/shared/pageUtils.ts:68-70` | fence regex → `Workout N` links | `extractPageIndex` |

## 3. `section.type === 'wod'` / `dataType === 'wod'` consumers (src/)

**Editor extensions**
- `cursor-focus-panel.ts:298-301` — filters wod sections for dim underlines + cursor panel.
- `preview-decorations.ts:55` — fence-line decorations (`cm-wod-fence-open/close`).
- `whiteboard-linter.ts:59` — lints wod section content.
- `whiteboard-results-widget.ts:183` — attaches run results to wod sections.

**Editor organisms / molecules**
- `NoteEditor.tsx:322,759,864,883,905` — wod section filtering, `WhiteboardCompanion` slot, `sectionToScriptBlock` (`dialect || "wod"` :883).
- `EditorCastBridge.tsx:46,62,70,120,135` — cast payload build + block targeting; `dialect || 'wod'`.
- `InlineCommandBar.tsx:35,222` — command bar for wod rects; `dialect || "wod"`.
- `WhiteboardCompanion.tsx:167-171,388-391,471` — ScriptBlock conversion, fence-line suppression, dialect badge (`?? "wod"`).
- `AddScriptToNoteDropdown.tsx:100,122` — emits ` ```${dialect || 'wod'} ` fences into notes.
- `OverlayTrack.tsx:262,301,332,336` — wod slot geometry/pointer-event handling.
- `OverlayWidthPolicy` (+ test) — `sectionType: "wod"` → 35%/20% width rules.

**Workbench / app**
- `workbenchDocumentModel.ts:24` — `section.type === 'wod' && section.scriptBlock` → hydrate blocks.
- `workbenchProjection.ts:68` — `item.type === 'wod'` → workbench update items.
- `documentStructure.ts:3,12,32` — `DocumentItemType = 'wod' | ...`.

**Persistence / query (storage-level `'wod'` dataType)**
- `src/types/storage.ts:15,131-134` — `SegmentDataType` union member `'wod'`.
- `src/services/content/IndexedDBContentProvider.ts:52,112-113,171-174,195-204` — `SectionType`↔`SegmentDataType` mapping; re-emits ` ```{dialect ?? 'wod'} ` fences on save/materialize.
- `src/services/query/QueryService.ts:788,793,881,892` — `find:block`/`find:note` joins gate on `dataType === 'wod'`.
- `src/components/organisms/wql-composer/suggestionSources.ts:90-93,143` — block dataTypes surfaced as WQL suggestions (vocabulary shifts on rename).
- `src/generated/static-block-index.json` — generated; embedded `"dataType":"wod"` records. **Regenerate, don't hand-edit.**

**Panels / page shells**
- `src/panels/preview-panel-chromecast.tsx:65-68` — dialect badge for `dialect !== 'wod'`.
- `src/panels/track-panel.tsx:42,85` — `previewFilter` default `['wod']`.
- `src/panels/page-shells/CanvasPage.tsx:263,279` — `link.type === 'wod'` styling/run button.
- `src/panels/page-shells/JournalPageShell.tsx:165,176-179,197` — same, + result-count badge.
- `PageNavDropdown.tsx:15-16,87,94` — `'heading' | 'wod'` link type.
- `ScriptIndexPanel.tsx:76,101,114` — `item.type === 'wod'` icons/preview.
- `NotePreview.tsx:76,89,100` — wod item rendering + start button.
- `WorkoutPreviewPanel.tsx:8-10` — default filter `['wod']`.

**Misc**
- `src/content/syntaxGuideReference.ts:32,35,51` — extracts ` ```wod ` block from guide examples; re-emits fence.
- `src/dialects/WodDialect.ts:26` — `id = 'wod'` (metric-dialect id; name collision only).

## 4. Playground / e2e / tools consumers

- `playground/src/services/openInPlayground.ts:20-21` — `dialect || 'wod'`; emits fence into zip.
- `playground/src/services/journalWorkout.ts:44` — emits ` ```wod ` wrapper.
- `playground/src/pages/PlaygroundNotePage.tsx:209` — `item.type === 'wod'` scroll-to-workout.
- `playground/src/pages/PlaygroundLandingPage.tsx:140` — emits ` ```wod `.
- `playground/src/pages/Concept3LandingPage.tsx:60` — ` ```wod ` extraction regex.
- `playground/src/canvas/scrollRunway.ts:23` — ring `tag` type; literal tags in markdown YAML (§5).
- `playground/src/tour/tourStages.ts:92` — `tagA: ' ```wod Fence'`.
- `playground/src/tour/TourCaptions.tsx:41-56,100-104`, `TourHero.tsx:68`, `HeroCarousel.tsx:31` — demo scripts + copy.
- `e2e/helpers/wodwikiDb.ts:771-774` — `dataType === 'wod' || 'script'` → fence re-emission.
- `tests/wods/all-wods.test.ts:27` — ` ```wod ` block splitter.
- `tools/lint-wods.ts:25` — ` ```wod ` extraction regex.
- `scripts/restructure-kettlebell-workouts.py:118-136` — ` ```wod ` extract + re-emit.

## 5. Content / seeds / fixtures (counts, Main-verified)

**Opening-fence totals across `markdown/`:** ` ```wod ` ×2280 (730 files), ` ```log ` ×1, ` ```plan ` ×1, ` ```whiteboard ` ×0.

- `markdown/collections/**` + `markdown/feeds/**` — 2206 ` ```wod ` across 667 files; **zero log/plan/whiteboard**. Top: `collections/girevoy-sport/4-week-beginner-girevoy-sport-program.md` (12).
- `markdown/canvas/**` — ~75 ` ```wod ` across guide pages (syntax/, behaviors/, analytics/, home/); `markdown/efforts/**` — 0.
- **The only `log`/`plan` content fences:** `markdown/canvas/syntax/dialect-log.md:5`, `markdown/canvas/syntax/dialect-plan.md:5` (+ guide mentions in `syntax/dialects.md`, `docs/whiteboard-language/dialect-{wod,log,plan}.md`).
- **Quest/scroll ring tags** (literal fence strings in YAML, matched at runtime by scrollRunway/tour): `markdown/canvas/home/README.md:19` (` ```wod Fence`), `markdown/canvas/syntax/basics.md:48`, `markdown/canvas/syntax/dialects.md:41/48/54` (` ```wod `/` ```log `/` ```plan `).
- `docs/**` — ~44 (02-syntax-reference 12, canvas-reference 20, ADRs, whiteboard-language).
- Skill copies: `playground/public/ai-skills/parse.md` (20), `public/wod-extraction-skill.md` (20), `.agent/skills/wod-extraction/SKILL.md` (20), `storybook-static/` copy (20) — regenerate artifacts.
- Root: `README.md` (3), `CONTEXT.md` (1), `.github/prompts/wod-convert.prompt.md` (2).
- Stories fixtures: `stories/catalog/_shared/fixtures.ts` (5 notes), `PlaygroundHome.stories.tsx`, `HomeView.stories.tsx` (3 each).
- Test fixtures with ` ```wod ` / `dialect: 'wod'` / `dataType: 'wod'` literals (~25 files): colocated editor tests (`section-state.test.ts`, `sectionParser.test.ts`, `blockDetection.test.ts`, `whiteboard-linter/results-widget/cursor-focus-panel/query-block-preview/widget-block-preview` tests), `workbenchDocumentModel.test.ts`, `workbenchProjection.test.ts`, `StandardAnalyticsProfile.test.ts`, `calc/engine.test.ts`, `captureSessionRpe.test.ts`, `workoutDerivation.test.ts`, `resultIdentity.integration.test.ts`, `workbenchSessionStore.test.ts`, `IndexedDBNotePersistence.test.ts`, `backfillV12.integration.test.ts`, `crossStoreJoin/findAnchor/findBlock/findRange/findSource/staticNotesFromBlocks/staticBlockIndex` tests, `suggestionSources.test.ts`, `wql.test.ts`, `whiteboard-script-language.highlight.test.ts:23,27`, `useWorkbenchRuntime.test.tsx`, `MetricInlinePanel.test.tsx`, `CanvasPage.test.tsx`, `paletteDataSources.test.ts` (incl. ` ```whiteboard ` :122,131 and uppercase ` ```WOD ` :182), `syntaxChallengeValidator.test.ts`, `parseCanvasMarkdown.test.ts:612`, `scrollRunway.test.ts:7,45`, `HomeTour*.test.tsx`, e2e suite (10 files), playground HTML prototypes (3).
- **Regenerate, don't migrate:** `dist/markdown/**` (stale, includes removed getting-started tree), `storybook-static/**`.

## 6. Migration-relevant notes

- `src/lib/routes.ts` — `view: 'plan'` is a **route view name**, not the ` ```plan ` fence. Avoid false-positive churn.
- No ` ```widget:<name> `, ` ```query `, ` ```dashboard ` fences are affected (out of scope per #887).
- `WodDialect` (metric dialect) is *not* a fence consumer but its `id = 'wod'` collides with the rename; decide separately whether the metric dialect keeps its name.
- Case handling: all matchers lowercase before comparing, so ` ```WOD ` is accepted today (fixture: `paletteDataSources.test.ts:182`).
