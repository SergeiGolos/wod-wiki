---
labels: [wayfinder:map]
title: "Data-driven test & validation harness"
---

# Wayfinder Map — Data-driven Test & Validation Harness

## Destination

A built-and-wired data-driven test + in-browser validation harness for the five
engine packages: fixture-file parser tests (whiteboard text → expected analyzed
Statements — dropping a new file into the catalog automatically adds a test),
WQL scenario tests (shared fake-data corpus → query → expected filter/data
output) covering every query family, a WQL example gallery over predefined
data structures, and a Storybook workbench pairing a live code editor with
parser/runtime/memory/log state visualization — all running under the repo's
existing `bun run test` / storybook flows.

## Notes

- Domain: root `CONTEXT.md` glossary (**Statement**, **Metric**, **Dialect
  Stack**, **WQL**, **Rows Query**, **Query Service**, UnifiedEventStore).
  WQL background: `docs/09-wql-deep-dive.md`; family vocabulary:
  `packages/wql/src/vocabulary.ts`.
- Skills: `/grilling`, `/domain-modeling` for HITL tickets. Output style:
  ADHD mode (lead with action, numbered steps, ≤5-item lists).
- **Execution is carried into this map** (chartering override of
  plan-don't-do): format tickets resolve decisions; build tickets then land
  the harness in-repo. Build tickets still stop at their stated scope.
- Standing decisions made at charting time — tickets treat these as fixed:
  1. Stage coverage: **parse + dialect-analyzed metrics**. Compiled-block
     (engine IR) and runtime-output fixtures are out of this effort's first
     harness (fog: graduate later).
  2. Expectation form: **human-readable, in-file** — the expected outcome
     lives in the fixture file, authored and reviewed by humans; the harness
     compares semantically, not by string diff.
  3. **One shared fake-data corpus** feeds the WQL scenario tests, the
     example gallery, and the Storybook workbench.
  4. Workbench runtime: **live wall-clock** run (no virtual-clock scrubbing).
  5. Existing ~90 inline-TS test files **coexist**; new coverage goes through

- Test-wiring facts (verified at charting): root vitest workspace = five
  package projects + contract suite (`vitest.config.ts`, source-aliased);
  storybook app runs its own vitest (`test:storybook`) plus Playwright e2e
  (`playwright.storybook.config.ts`); golden-fixture precedent:
  `apps/storybook/fixtures/golden/multi-week-journal.json` feeding the
  existing `LanguageWorkbench.stories.tsx` (dual CodeMirror, in-memory fact
  store, live widgets — the seed of goal 3).

## Decisions so far

- [Parser fixture file format](test-validation-harness/tickets/001-parser-fixture-file-format.md) —
  spec [asset](test-validation-harness/assets/001-parser-fixture-file-format.md): catalog at
  `packages/lang/tests/fixtures/parser/*.md`; flat-meta-line frontmatter,
  `## Script` wod-fence, `## Expected` metric DSL (`Type value [@origin]`,
  time→ms, amount+unit sugar, object tails); closed-set match with `match:
  subset` opt-in; parse errors spec'd but currently unreachable; 3 verified
  example fixtures landed.
- [Fake-data corpus shape](test-validation-harness/tickets/002-fake-data-corpus-shape.md) —
  spec [asset](test-validation-harness/assets/002-fake-data-corpus-shape.md):
  journal = UnifiedEventRecord `.json` (`kind: event-journal`) at
  `packages/wql/fixtures/corpus/`; no loader — queries slice; golden
  **absorbed** via new [Golden fixture cutover](test-validation-harness/tickets/010-golden-fixture-cutover.md)
  ticket; four journals (crossfit / endurance / mixed-wellness / climb-yoga)
  + integrity invariants for 005.

- [Storybook debug workbench architecture](test-validation-harness/tickets/003-storybook-debug-workbench-architecture.md) —
  spec [asset](test-validation-harness/assets/003-storybook-debug-workbench-architecture.md):
  extend Language Workbench in place; 2×2 panel grid (parser / stack /
  memory / logs) below the editor lanes; effect-owned
  `RuntimeFactory(debugMode)` + `RuntimeContext` + `useRuntimeExecution`
  wall-clock; freeze + dirty badge on mid-run edits.

- [Build the parser fixture harness](test-validation-harness/tickets/004-build-parser-fixture-harness.md) —
  landed: `tests/harness/parserFixture/` (DSL, comparator, anatomy
  parser) + glob-discovery driver `tests/parserFixtures.test.ts`; catalog
  3 → 10 fixtures; spec v1.1 adds quoted tail values + `?` undefined
  literal; full root suite green, wrong expectations fail readable.

## Not yet specified

- Stale-expectation workflow: how a fixture failure reads in CI, and whether
  an update/regenerate tool is wanted — unspecifiable until the fixture
  formats exist (001/006).
- Runtime-stage fixtures: compiled-Block (engine IR) and runtime-output
  expectations were excluded from stage coverage; graduate once the
  parse+dialect harness proves out in real use.
- Coverage inventory: which syntax corners, dialects, and WQL families lack
  fixture cases — needs the harness before gaps are enumerable. First two
  entries from 001's grounding: property-value spill (`Title: Morning
  Workout` → second statement reuses id 1) and slash-choices (`185/125 lb`
  parses as division, no **Choice Group**).
- Automated assertions on the workbench visualization (storybook component
  test / Playwright e2e on the new story) — depends on 003's architecture.
- Contract-suite + ui-package applicability of the corpus — whether those
  suites consume it too is undecided.

## Out of scope

- Playground app testing (unit or e2e) — packages + the storybook vehicle
  only.
- Big-bang migration of the existing inline test files.
- Performance / benchmark harnessing.
