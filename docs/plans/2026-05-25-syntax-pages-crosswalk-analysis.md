# Syntax Pages Crosswalk Analysis

Date: 2026-05-25

## Scope

This analysis compares the current learner-facing syntax pages against the actual Whiteboard Script grammar, parser classification, dialect recognition, runtime strategy behavior, and the example files loaded by the canvas pages.

Primary surfaces reviewed:

- `markdown/canvas/syntax/README.md`
- `markdown/canvas/syntax/basics.md`
- `markdown/canvas/syntax/structure.md`
- `markdown/canvas/syntax/protocols.md`
- `markdown/canvas/syntax/complex.md`
- `markdown/canvas/getting-started/README.md`
- `stories/catalog/pages/Syntax.stories.tsx`
- `playground/src/pages/PlaygroundLandingPage.tsx`

Primary sources of truth reviewed:

- `src/grammar/whiteboardscript.grammar`
- `src/parser/syntax-parser.ts`
- `src/parser/semantic-classifier.ts`
- `src/dialects/CrossFitDialect.ts`
- `src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts`
- `src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts`
- `docs/whiteboard-language/core-syntax.md`
- `tests/language-compilation/syntax_features.test.ts`

## Executive Summary

The syntax documentation has the right broad shape, but the current published pages do not reliably teach the implemented language. The largest issue is not visual polish; it is content integrity.

The main problems are:

1. Several syntax page `set-source` references load the wrong file, a missing file, or a full documentation page instead of a WOD example.
2. Some protocol examples teach syntax that does not match the runtime strategy contract, especially EMOM.
3. The learning flow moves from basics to complex in name, but individual sections often display examples from a different concept than the prose describes.
4. Important implemented primitives are under-explained or missing: lap markers, `+` composition, `:?`, `*` required timers, `[:Action]`, properties, dialect fences, and exact quantity behavior.
5. Storybook's `Syntax.stories.tsx` is stale relative to the app guide and should not be treated as authoritative.

## Language Feature Crosswalk

| Feature | Implemented syntax / behavior | Source of truth | Current docs coverage | Gap / risk |
| --- | --- | --- | --- | --- |
| Markdown dialect fence | Fenced code blocks tagged `wod` wrap Whiteboard Script. Dialect pages also mention `log` and `plan`. | `docs/whiteboard-language/dialect-*.md`, canvas pages | Basics and Getting Started mention `wod`. | `log` and `plan` dialects are absent from learner-facing syntax pages. |
| Properties | `identifier: string|number|identifier` at program level. | `whiteboardscript.grammar` | Only covered in `docs/whiteboard-language/core-syntax.md`. | Missing from app syntax pages. |
| Statement model | One statement per line, with fragments and indentation-derived hierarchy. | `whiteboardscript.grammar`, `syntax-parser.ts` | Mentioned in basics. | Needs clearer anatomy view on the app page; sidebar links reference `anatomy`, but the canvas syntax pages do not define an `#anatomy` section. |
| Indentation hierarchy | Parent/child relationships derive from starting column after parsing. | `syntax-parser.ts`, `core-syntax.md` | Mentioned in basics and structure. | Good conceptually, but examples loaded by structure sections often do not match the prose. |
| Lap marker `-` | Starts a new round/group branch. | `syntax-parser.ts`, `core-syntax.md` | Not taught in app syntax pages. | Missing. |
| Compose marker `+` | Composes with previous branch at same level. | `syntax-parser.ts`, `core-syntax.md` | Not taught in app syntax pages. | Missing and important for advanced grouping. |
| Duration | `5:00`, `:30`, `1:30:00`; countdown by default when positive. | Grammar, `DurationMetric.ts` | Covered in protocols and examples. | Good coverage, but source/example mismatches reduce trust. |
| Count-up duration modifier | `^5:00` forces count-up despite explicit duration. | `DurationMetric.ts`, syntax tests | Mentioned as progressive load in basics and as trend in Storybook. | Misleading: docs call `^` progressive load/intensity, but implementation treats it as timer count-up. |
| Required timer modifier | `*5:00` / `*:30` sets required timer behavior. | `semantic-classifier.ts`, `GenericTimerStrategy.ts` | Described as rest marker / explicit rest period. | Misleading: `*` does not mean rest by itself; it marks a timer as required/non-skippable. Rest semantics come from text/action like `Rest`. |
| Collectible timer | `:?` records actual elapsed duration. | Grammar, `DurationMetric.ts`, syntax tests | Present in examples, not in main prose flow. | Should be taught explicitly near timers. |
| Rounds count | `(3)`, `(3 Rounds)`. | Grammar, `semantic-classifier.ts` | Covered. | Mostly fine. |
| Named group | `(Warmup)`, `(Strength)`. | Grammar, `semantic-classifier.ts` | Prose covers it. | The named-groups section loads `groups-1.md`, which is simple rounds, not named groups. |
| Rep scheme | `(21-15-9)` creates rounds plus rep metrics. | `semantic-classifier.ts`, runtime compliance tests | Covered. | Some landing copy incorrectly says comma-separated reps (`21,15,9`), while implemented syntax is dash-separated inside parentheses. |
| Action | `[Setup]` and `[:Row]` become `ActionMetric`. | Grammar, syntax tests, `semantic-classifier.ts` | Mentioned as setup actions. | Needs distinction between passive comments and blocking/interactive action cards. `[:Action]` is barely explained. |
| Text comment | `// comment` becomes `TextMetric`. | Grammar, `semantic-classifier.ts` | Mentioned in basics. | Loaded example for comments is often wrong due source mismatch. |
| Reps | `10 Pushups` or `? Pushups`. | Grammar, syntax tests | Covered. | Good. |
| Resistance | `225lb`, `100kg`, `bw`, `?lb`, `@135lb`. | Grammar, syntax tests | Covered partly. | Percentages are claimed, but grammar/runtime treat `@75%` awkwardly as resistance-ish plus symbol text, not a first-class percent metric. |
| Distance | `400m`, `10 miles`, `?m`. | Grammar, syntax tests | Covered. | Good, but some measurement sections load reps-only examples. |
| Effort/free text | Remaining identifiers/symbols become effort text. | Grammar, `semantic-classifier.ts` | Covered loosely as movement names, effort, and protocol keywords. | Needs clearer language: movement names are currently parsed as effort text unless promoted by runtime semantics. |
| AMRAP dialect behavior | Timer plus AMRAP keyword or timer plus rounds routes to AMRAP strategy. | `CrossFitDialect.ts`, `AmrapLogicStrategy.ts` | Covered. | `20:00 (AMRAP)` works as a label/rounds pattern, but docs should prefer one canonical form and explain why. |
| EMOM dialect behavior | Runtime interval strategy needs timer plus EMOM action/effort keyword or repeating interval hint. Compliance tests use forms like `(3) :60 EMOM`. | `CrossFitDialect.ts`, `IntervalLogicStrategy.ts`, compliance tests | Current pages teach `10:00 (EMOM)`. | High risk: `(EMOM)` parses as a rounds label, and the interval strategy does not directly match rounds-label EMOM. This can compile as AMRAP-like timer+rounds instead of EMOM. |
| Implicit EMOM | Rounds + timer + children can be recognized by dialect as implicit EMOM. | `CrossFitDialect.ts`, dialect tests | Mentioned as `Rounds + timer auto-detects EMOM` in an example title. | Not explained in the page flow, and the linked section text describes something else. |
| Tabata | Can be expressed structurally as `(8 Rounds)` with `:20` / `:10`; dialect also detects `Tabata` keyword but metric synthesis is still marked failing in tests. | CrossFit dialect tests, examples | Covered. | Prefer structural Tabata docs; avoid implying `Tabata Squats` is fully synthesized until failing tests are implemented. |
| For Time | Often represented by ordinary count-up completion or rep-scheme loop. Dialect detects `For Time`, but compliance docs prefer parser-friendly forms like `(21-15-9)`. | compliance tests, `CrossFitDialect.ts` | Story/app examples include literal `FOR TIME`. | Needs clarification: `FOR TIME` is a label/hint, not the core mechanism for completion. |

## Page-by-Page Findings

### Syntax Index

File: `markdown/canvas/syntax/README.md`

Findings:

- `source: wods/syntax/basics.md` resolves to `markdown/canvas/syntax/basics.md`, which is itself a canvas documentation page, not a WOD example.
- The Core Concepts command repeats the same source issue.
- `wods/syntax/complex.md` resolves to the complex syntax documentation page, not a workout example.
- Structure and timers index examples load valid example files, but the index does not expose the actual grammar anatomy despite sidebar links elsewhere pointing at anatomy-style anchors.

Recommendation:

- Use `wods/examples/syntax/...` for examples, or rename examples so `wods/syntax/*` never overlaps with canvas guide page filenames.
- Add a real overview/anatomy section that names the primitives: duration, rounds, action, quantity, effort, text, lap.

### Core Concepts

File: `markdown/canvas/syntax/basics.md`

Findings:

- The initial source again loads the page itself: `wods/syntax/basics.md`.
- `A Single Movement` loads `getting-started/statement-1.md`, whose code is a comment prompt, not an actual movement.
- `Measurements` says weights, distances, and percentages, but loads `syntax/metrics-1.md`, which only shows reps.
- `Unknown Load` loads `syntax/metrics-4.md`, which is titled `Combined`; the actual unknown load example is `syntax/metrics-5.md`.
- `Supplemental Data` claims effort/RPE such as `@easy`, `@hard`, `@7`, but loads `syntax/supplemental-1.md`, which demonstrates actions, unknown load, and required rest.
- `Setup Actions & Comments` loads `syntax/supplemental-2.md`, which demonstrates rest periods only.
- `Progressive Load` says `^` flags a warm-up ramp, but `^` is implemented as count-up timer override. The loaded example is comments, not progressive load.

Recommendation:

- Split basics into: movement/reps, load/distance, unknown values, action/comment, timer modifiers.
- Remove or rework `Progressive Load` unless a real progressive-load syntax exists.
- Avoid claiming percentages as a supported first-class syntax unless the parser/runtime has a percent metric.

### Structure & Rep Schemes

File: `markdown/canvas/syntax/structure.md`

Findings:

- `Simple Rounds` is aligned.
- `Named Groups` loads `syntax/groups-1.md`, which is simple rounds, not named groups.
- `Nested Groups` loads missing `wods/syntax/groups.md`.
- `Mixed Sections` loads `syntax/groups-2.md`, which is a rep scheme, not mixed named sections.
- `Rep Schemes` loads `getting-started/metrics-1.md`, which is reps, so the section is broadly aligned but basic.
- `Descending Reps` loads missing `wods/syntax/repeaters.md`.
- `Multiple Sets` loads `syntax/metrics-2.md`, a weight example, not sets.
- The page does not teach `-` and `+` lap/group branch markers even though they materially affect grouping.

Recommendation:

- Create or point to actual examples for named groups, nested groups, mixed sections, repeaters, and sets.
- Add lap marker / compose marker teaching before complex workouts.

### Timers & Protocols

File: `markdown/canvas/syntax/protocols.md`

Findings:

- `Timers and Rest` is mostly aligned, but describes rest as any timed line that says `Rest`; examples often use `*`, which actually means required timer.
- `Longer Durations` is aligned with `timers-4.md`.
- `Mixed Timers` is plausible, but should verify the loaded example matches the prose before publishing.
- `Classic AMRAP` prose says a time followed by `(AMRAP)` on the next indented level sets the time domain, while the example is `20:00 (AMRAP)` on one line.
- `AMRAP with a Time Cap` loads missing `wods/syntax/amrap.md`.
- `Multiple AMRAP Windows` loads `protocols-1.md`, a single AMRAP example.
- `Basic EMOM` loads missing `wods/syntax/emom.md`.
- Current EMOM teaching uses `10:00 (EMOM)`, which is risky because runtime interval matching expects an EMOM keyword as Action/Effort or a repeating-interval hint, not a rounds label.
- `Longer Intervals` describes `Every 2:00`, but loads `protocols-2.md`, which is the basic `10:00 (EMOM)` example.
- `Alternating EMOM` loads `protocols-3.md`, which is `FOR TIME`, not alternating EMOM.
- `Standard Tabata` loads missing `wods/syntax/tabata.md`; existing `protocols-4.md` is the Tabata example.
- `Custom Intervals` loads `protocols-4.md`, which is standard Tabata, not custom intervals.
- `Intervals with Distance` loads `protocols-5.md`, titled implicit EMOM, not a distance/rest interval example.

Recommendation:

- Rewrite this page around implemented canonical forms:
  - Countdown: `5:00 Run`
  - Count-up override: `^5:00 Row`
  - Required timer/rest: `*:30 Rest`
  - Collectible timer: `:? Run`
  - AMRAP: `20:00 AMRAP` or `20:00 (AMRAP)`, choose one canonical learner form
  - EMOM: `(10) :60 EMOM` or `(10) 1:00 EMOM`, matching compliance tests
  - Structural Tabata: `(8 Rounds)` with `:20` and `*:10 Rest` if rest must be non-skippable
  - Implicit EMOM: `(10) :60` with children, clearly labeled as advanced

### Complex Workouts

File: `markdown/canvas/syntax/complex.md`

Findings:

- The initial source and `Nested Protocols` command load the complex guide page itself, not a complex workout example.
- `Full Training Session` loads `document-1.md`, which is a small Markdown document with one AMRAP block, not a four-section full session.
- `Barbell Cycling` loads `document-2.md`, which is a warmup checklist and a bench press set, not multiple EMOM windows.
- `Partner Workout` loads `document-3.md`, which contains strength plus metcon, not partner alternating AMRAP windows.

Recommendation:

- Treat complex examples as fixtures with strong names, such as `complex-nested-protocols.md`, `complex-full-session.md`, `complex-barbell-cycling.md`, `complex-partner-amrap.md`.
- Do not reuse generic document examples whose titles/prose do not match the section promise.

### Getting Started

File: `markdown/canvas/getting-started/README.md`

Findings:

- The high-level flow is the strongest current learning path: movements -> metrics -> timers -> groups -> protocols -> review.
- Step 1 loads a comment prompt rather than a literal movement, which is helpful for editing but weak for a read-only teaching state.
- Step 5 uses `20:00 (AMRAP)`, while much of the rest of the repo and compliance surface uses `20:00 AMRAP`. Both should not compete without explanation.
- The route `/getting-started` appears in some older home templates, while route governance says `/guide/getting-started` is canonical.

Recommendation:

- Keep this flow as the beginner path, but align example syntax with the canonical syntax chosen for the full syntax pages.
- Avoid using the same example for Step 5 and Step 6 unless the review step actually displays meaningful completed-review state.

### Storybook Syntax Page

File: `stories/catalog/pages/Syntax.stories.tsx`

Findings:

- This is a standalone Storybook reference, not the canonical app syntax guide.
- It contains stale or unsupported claims:
  - `^` is described as increasing weight/intensity, but implementation treats it as timer count-up override.
  - Percentages are described as supported but are not a first-class metric in the grammar/runtime.
  - Bracketed actions are described as `[]`, but core docs and tests distinguish `[:Action]` as an action form too.
  - Timer/protocol examples differ from current compliance syntax.

Recommendation:

- Either retire this Storybook page or make it load the same markdown/example fixtures as the app guide.
- Avoid maintaining two separate prose sources for the same language behavior.

### Playground Landing Syntax Cards

File: `playground/src/pages/PlaygroundLandingPage.tsx`

Findings:

- The Rep schemes card says comma-separated reps and shows `21,15,9 Thrusters 95lb`; implemented rep schemes are dash-separated inside parentheses: `(21-15-9)`.
- The docs paths use `/guide/syntax?h=...`, but the actual detailed pages now live at `/guide/syntax/basics`, `/guide/syntax/structure`, `/guide/syntax/protocols`, and `/guide/syntax/complex`.
- `SyntaxGroupWidget.test.tsx` still asserts legacy `/syntax#timers`, conflicting with route governance that `/guide/syntax*` is canonical.

Recommendation:

- Update landing cards to canonical syntax examples and canonical guide routes.

## Source-Loading Defects

The canvas resolver maps `wods/examples/syntax/foo.md` to `markdown/canvas/syntax/foo.md`, and maps `wods/syntax/foo.md` to the same directory. This makes naming collisions dangerous.

Known bad or suspect source references:

| Page section | Source | Current resolution | Problem |
| --- | --- | --- | --- |
| Syntax index / Core Concepts | `wods/syntax/basics.md` | `markdown/canvas/syntax/basics.md` | Loads guide page as editor content. |
| Syntax index / Complex | `wods/syntax/complex.md` | `markdown/canvas/syntax/complex.md` | Loads guide page as editor content. |
| Basics / Three Core Rules | `wods/syntax/basics.md` | `markdown/canvas/syntax/basics.md` | Loads guide page as editor content. |
| Structure / Nested Groups | `wods/syntax/groups.md` | Missing | Shows source-not-found content. |
| Structure / Descending Reps | `wods/syntax/repeaters.md` | Missing | Shows source-not-found content. |
| Protocols / AMRAP with Time Cap | `wods/syntax/amrap.md` | Missing | Shows source-not-found content. |
| Protocols / Basic EMOM | `wods/syntax/emom.md` | Missing | Shows source-not-found content. |
| Protocols / Standard Tabata | `wods/syntax/tabata.md` | Missing | Shows source-not-found content. |
| Complex / Nested Protocols | `wods/syntax/complex.md` | `markdown/canvas/syntax/complex.md` | Loads guide page as editor content. |

Systemic fix:

- Reserve `markdown/canvas/syntax/*.md` route/page names for guide pages only, or move guide pages under a `pages/` subfolder.
- Put examples under a separate namespace such as `markdown/canvas/examples/syntax/*.md` and make all source references explicit.
- Add a test that walks all canvas pages, resolves every `source:` and `set-source:` path, and fails if the result is missing or resolves to a canvas page with `template: canvas`.

## Learning Flow Assessment

The intended high-level progression is good:

1. Movement lines
2. Reps, loads, distances, unknown values
3. Timers
4. Groups and rep schemes
5. Protocols
6. Full documents / complex workouts

The current execution breaks down because many sections display the wrong example. A learner sees prose for one concept and code for another, which makes the language feel arbitrary.

Recommended flow:

1. **First statement**: `Pushups`, then `10 Pushups`.
2. **Measurements**: `5 Back Squat 225lb`, `Run 400m`, `5 Deadlifts ?lb`.
3. **Timers**: `5:00 Run`, `^5:00 Row`, `:? Max Effort Pushups`, `*:30 Rest`.
4. **Comments/actions**: `// note`, `[Setup Barbell]`, `[:Row]` if action namespace matters.
5. **Groups**: `(3 Rounds)` with indentation.
6. **Rep schemes**: `(21-15-9)` with inherited per-round reps.
7. **Named sections**: `(Warmup)`, `(Strength)`, `(Conditioning)`.
8. **Branching/composition**: `-` and `+` markers.
9. **AMRAP**: one canonical form.
10. **EMOM**: one canonical form that matches runtime strategy tests.
11. **Intervals/Tabata**: structural examples first.
12. **Full documents**: Markdown around one or more `wod` blocks.
13. **Advanced behaviors**: implicit EMOM, collectible values, required timers, nested protocols.

## Recommended Fix Order

1. **Fix all bad `set-source` references.** This is the highest-leverage change because it immediately restores trust between prose and code.
2. **Choose canonical protocol syntax.** Especially decide whether learner-facing AMRAP is `20:00 AMRAP` or `20:00 (AMRAP)`, and switch EMOM to a form proven by runtime compliance such as `(10) :60 EMOM`.
3. **Rewrite misleading modifier descriptions.** `^` is count-up override; `*` is required timer, not inherently rest; `@75%` is not a first-class percentage metric.
4. **Create missing example fixtures.** Add actual files for named groups, mixed sections, repeaters, multiple sets, custom intervals, distance intervals, complex nested protocols, barbell cycling, and partner workouts.
5. **Add source-resolution coverage.** A test should prevent missing examples and guide-page-as-example regressions.
6. **Consolidate syntax truth.** Make Storybook and landing cards consume the same fixture/prose source or explicitly mark them as component demos rather than syntax authority.
7. **Add a parser-feature reference table to the app guide.** The current `docs/whiteboard-language/core-syntax.md` is accurate but not visible enough to users.

## Proposed Acceptance Criteria

- Every `source:` and `set-source:` in syntax canvas pages resolves to an existing file.
- No syntax guide preview source resolves to another `template: canvas` guide page.
- Every prose section's displayed code demonstrates the exact feature named in that section heading.
- All examples parse without errors through `MdTimerRuntime.read`.
- Protocol examples compile to the intended block type: AMRAP examples become AMRAP, EMOM examples become EMOM, plain timers become Timer, structural rounds become Rounds.
- App guide routes use `/guide/syntax*`; legacy `/syntax*` only appears in redirect tests.
- Storybook syntax stories either match the app guide content or are removed/renamed as historical demos.