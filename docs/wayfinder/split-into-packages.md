# Wayfinder Map: Split wod-wiki into 5 packages

> Local-markdown tracker (no issue tracker wired). Each ticket section below is
> independently claimable; if team coordination is needed later, port each to a
> GitHub issue labelled `wayfinder:<type>`. **Never resolve more than one ticket
> per session.** Refer to tickets by name, never by id.

## Destination

Split the `wod-wiki` monorepo into **five packages across three repos** with a one-way
dependency DAG and clean seams, so each can be tested, validated, and released
independently: **wod-wiki-core** (shared data vocabulary), **wod-wiki-lang**
(parse → compile → execute → analytics-generation), **wod-wiki-wql** (pure query),
**wod-wiki-sources** (markdown data + lint), **playground** (consumer UI). The repo
layout: the coupled engine trio (core + lang + wql) forms a `wod-wiki-packages`
workspace with one `node_modules` (CM/Lezer singleton solved by construction);
sources and playground are their own repos. The
package boundaries, dependency directions, and per-package contents are settled
in [`CONTEXT.md` § Packages](../../CONTEXT.md#packages-the-5-way-split) — that is
canonical; this map is the execution scaffold.

## Notes

- **Domain:** wod-wiki (Whiteboard Language). Read root `CONTEXT.md` + `CONTEXT-MAP.md`
  first; the Packages section is now the source of truth for the split.
- **Skills every session should consult:** `improve-codebase-architecture`
  (seam vocabulary), `wayfinder` (this process), `grill-with-docs` (CONTEXT.md/ADR
  discipline), `tdd` (extraction must preserve behaviour).
- **Standing preferences:** seams are DAG-forced, not taste-driven; one-way deps
  only; no god-packages; React stays out of pure-TS packages (core, wql); the
  internal parse↔execute seam in lang is preserved (separate tests + storybook
  sections); no shims/aliases left behind on cutover.
- **Verification bar:** each extracted package builds, its own tests pass, and the
  playground still consumes it end-to-end before that ticket closes.

## Decisions so far

<!-- the index — one line per closed decision; detail lives in CONTEXT.md § Packages -->

- [**5 packages, not 4**](../../CONTEXT.md#packages-the-5-way-split) — original ask
  had no home for the shared kernel or the execution runtime; resolved to
  core + lang + wql + sources + playground.
- [**wod-wiki-core is a deep module**](../../CONTEXT.md#packages-the-5-way-split) —
  data shapes + `MetricContainer`/ownership (forced: `MetricContainer` imports the
  resolver) + persistence vocabulary. Hints + `IAnalyticsEngine` are **lang-internal**
  (a benefit of merging lang+runtime: the emit/consume protocol is no longer
  cross-package).
- [**lang absorbs runtime**](../../CONTEXT.md#packages-the-5-way-split) — parse +
  compile + execute + analytics-generation in one package; the lang→runtime
  cross-repo dependency tax collapsed. Internal parse↔execute seam kept; React/execution
  behind a sub-export so pure-TS consumers (lint, parse-output stories) stay lean.
- [**Analytics generation → lang; wql → pure query**](../../CONTEXT.md#packages-the-5-way-split)
  — generation runs inside execution turns (`setAnalyticsEngine`); wql reads the fact
  rows lang writes via injectable store interfaces. wql does NOT depend on lang.
- [**Dialect Registry = tag-identity + per-package slices**](../../CONTEXT.md#packages-the-5-way-split)
  — dissolves the `dialect-block-alignment.md` conflict: one tag registry in core
  (source of truth for "which dialects exist"), each package owns its override slice.
- **wql-vocabulary → wql** — moves out of `src/parser/`; wql owns its keyword
  vocabulary. Calc-target alignment with lang's CalcEngine seeds stays a cross-package test.
- **3-repo layout (decided)** — `wod-wiki-packages` workspace (core + lang + wql, one
  `node_modules` — the CM/Lezer singleton is solved by construction inside the engine trio)
  + `wod-wiki-sources` (own repo/CI/Pages) + `wod-wiki-playground` (this repo becomes the
  app). The 5-repo variant was rejected: 3 coordinated releases per core change + CM dedupe
  re-fragmented across published packages. Setup plan: `package-split-setup.md` (repo root).
- **npm scope `@wod-wiki/*` (decided)** — `@wod-wiki/core`, `@wod-wiki/lang`,
  `@wod-wiki/wql`, `@wod-wiki/sources-index` replace `@bitcobblers/whiteboard-lang` on the
  next publish.

## Tickets

Status legend: `🔶 unblocked task` (frontier — take next) · `🟡 unblocked research` ·
`⛔ blocked` (see Blocks) · `✅ done`.

### Frontier (take these first)

**[✅ done] Cut the workbench→playground reverse import**
- Resolved: moved `resultRecorder.ts` + test to `src/services/` (all its ports were
  already library-level; its only playground dep was `parseNoteId`). Split
  `noteIdentity` at its natural seam — pure parse (`parseNoteId`/`NoteRef`/`NoteKind`)
  → `src/lib/noteIdentity.ts`; kind→route rule (`noteRefToPath`, needs `./routes`) stays
  in `playground/src/lib/noteIdentity.ts`. Migrated 5 callers + 6 tour mocks to
  `@/services/resultRecorder`; no shims left. Injection was rejected: one recorder
  adapter = hypothetical seam; the session already injects the writer port.
  _Verified:_ zero `src → playground` imports; 29 touched src tests green; the 13
  tour failures are pre-existing (confirmed identical on a stashed baseline — WIP
  analytics/calc changes on main). CONTEXT.md (root + playground) seam rows updated.

**[🔶 task] Consolidate the scattered kernel types + kill the upward import**
- Today the kernel is fragmented: `Metric`/`CodeStatement` (clean, `src/core/models/`),
  `WorkoutResults`/`StoredOutputStatement`/`ScriptBlock` (leaking in
  `src/components/Editor/types/`), and `src/types/storage.ts` which imports `WorkoutResults`
  **upward** from `components/Editor/types`. Relocate the shared shapes toward
  `src/core/` (the future core package), kill the upward import, dedupe `core/models/TimeSpan`
  vs `runtime/models/TimeSpan`. _Note:_ `toStoredOutputStatement` (the live→stored converter,
  uses `getHints`) stays with lang — only the **shape** moves to core. _Blocks:_ core extraction.

**[🟡 research] Resolve the CodeMirror/Lezer singleton at the playground seam**
- Dedupe lists for `@codemirror/*` / `@lezer/*` are duplicated across root
  `vite.config.ts`, `playground/vite.config.ts`, `.storybook/main.mjs`, +
  `scripts/fix-codemirror-deps.cjs`. Inside the packages workspace the singleton is
  **solved by construction** (one node_modules). The remaining question is the
  **playground seam**: playground composes `@wod-wiki/lang` + `@wod-wiki/wql` + its own
  CM — declare `@codemirror/*`/`@lezer/*` as **peerDependencies** in the published
  packages + hoist, and generalize the existing postinstall pattern? _Output:_ a short
  decision note (peer-deps + hoist recommended). _Blocks:_ lang + wql extraction, playground
  migration.

### Extraction sequence

**[⛔ task] Extract wod-wiki-core** — _Blocks:_ kernel-consolidation, cm-singleton.
Establish the types-only (shapes + `MetricContainer`/ownership + persistence vocab)
package. Publish as the first npm package; nothing depends on lang/runtime yet so this
is the lowest-risk extraction. _Verify:_ lang + wql + playground still type-check against
the published package.

**[⛔ task] Extract wod-wiki-lang** — _Blocks:_ core-extraction, reverse-import.
The biggest. Fold parser + runtime into one package; relocate the concrete metric classes
+ units/fusion/Dimension from `src/runtime/compiler/metrics/`; add the missing
`generate:whiteboard` lezer script (only `generate:wql` exists); carve the **internal
parse↔execute seam** (separate test suites + storybook sections); put React hooks +
execution entry behind a sub-export. Build the **parser storybook** (example text →
rendered code statements) — new work, seeded from `ParsedView`/`WhiteboardScriptVisualizer`.
_Verify:_ sources lint runs against the package; playground parses + executes end-to-end.

**[⛔ task] Extract wod-wiki-wql** — _Blocks:_ core-extraction, cm-singleton.
Move `wql-vocabulary` out of `src/parser/`; ship grammar + AST + `QueryService` +
`wql-language` CM. Invert the 4 engine seams by moving default store bindings out (the
injectable `FactQueryStore`/`NoteQueryStore`/`BlockQueryStore`/`EffortQueryStore`/
`ResultLogStore` interfaces already exist). Keep the `WQL_CALC_TARGETS` ↔ lang
CalcEngine-seeds alignment as a cross-package contract test (decide where cross-package
contract tests live — see Not-yet-specified). Build the **wql storybook** (example data
parsed with different WQL configurations). _Verify:_ playground dashboards query
end-to-end against the package.

**[⛔ grilling/prototype] Design the tag-identity Dialect Registry** — _Blocks:_
core-extraction, lang-extraction. Shape the registry per `dialect-block-alignment.md`
**for the split from the start**: tag-identity (tags + aliases + runnable flag) in core;
per-package override slices (lang: analyzer + language + analytics processors;
playground: editorExtensions). Prototype the descriptor + one real dialect (e.g. `climb`)
end-to-end across packages. _Verify:_ adding a dialect = register a tag + per-package
slices, no scattered switches.

**[⛔ task] Extract wod-wiki-sources** — _Blocks:_ lang-extraction. Fix the stale
`tools/lint-wods.ts` (points at a nonexistent `./wod` dir — repoint at `markdown/`),
wire parser-only fence validation into **its own CI**, and decide how the heavy
`test:markdown` (full parse-compile-run, currently NOT in CI) is served — via lang as
an npm dep. Build the collection→index artifact; stand up its own GitHub Pages deploy
outside the playground cycle. _Verify:_ CI validates the collections; playground pulls
the index at build time.

**[⛔ task] Migrate playground to consume the 4 packages** — _Blocks:_ lang-extraction,
wql-extraction. Kill the `@/` source alias (`playground/vite.config.ts → ../src`);
wire core + lang + wql as npm deps; pull sources' index at build time. Move widget
renderers + composer into playground (they're UI); keep `lib/dashboard/model.ts` (pure)
on the wql side or vendored — see Not-yet-specified. _Verify:_ full app build + e2e green
against published packages.

## Not yet specified

<!-- in-scope fog — can't yet phrase as a sharp ticket; graduates as the frontier advances -->

- **Rollup write-path boundary** — `storeRollup.ts` (triggered on dashboard-open) +
  `workloadRollup.ts` (the math). Lean: math → lang (analytics computation); trigger/driver
  → playground. Confirms during wql/playground extraction.
- **Dashboard widget renderer boundary** — `lib/dashboard/model.ts` is pure and imports
  `wql-vocabulary`; widget renderers are UI. Does the pure model live in wql or vendored in
  playground? Resolves during wql/playground extraction.
- **Cross-package contract tests** — the `WQL_CALC_TARGETS` ↔ lang CalcEngine-seeds
  alignment test, and any future dialect-registry alignment, must import from two
  packages. Where do they live in a multi-repo setup (a contract-tests package? in
  playground? a monorepo-only dev dep)? Needs the cm-singleton decision (repo layout is now
  decided) first.
- **Cast receiver app packaging** — `playground/src/receiver-rpc.tsx` + `receiverBootLoader`
  are a second vite input depending on runtime + panels. Confirm it rides with playground
  (its only consumer) during playground migration.
- **`src/stores/`, `src/hooks/`, `src/app/` ownership** — these `src/`-level modules are
  React glue between runtime and playground. Confirm they land in playground (not lang)
  during lang extraction; the reverse-import ticket is the first instance.

## Out of scope

<!-- ruled beyond the destination; closed, never graduates -->

- **Renaming the published npm package** (`@bitcobblers/whiteboard-lang` → per-package
  names like `@wod-wiki/core`). A release/naming decision, separate effort; per-package
  `publishConfig` can be set during extraction without resolving the org name here.
- **Refactoring the existing playground CI/CD graph** (`.github/workflows/*`). Orthogonal
  to the package split, though sources gets its own pipeline and playground's adapts —
  those are ticket-scoped, not a graph redesign.
- **Changing runtime/analytics semantics** (turn model, LIFO work-list, fault isolation).
  The split is structural; observable behaviour is preserved (per `runtime-context-seam.md`).
