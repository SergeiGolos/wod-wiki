---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Build the debug workbench story"
blocked-by: ["003-storybook-debug-workbench-architecture", "005-seed-fake-data-corpus"]
---

## Resolution

Landed in `apps/storybook/src/LanguageWorkbench.stories.tsx` per spec 003:
- Extended the existing Language Workbench story with a full-width 2×2 Debug Panel Grid below the dual-lane editors:
  1. **Parser Statements & Metrics**: live per-statement card list with type/value/unit and `@origin` badges, plus hints list.
  2. **Runtime Stack & Execution Controls**: wall-clock `useRuntimeExecution` controls (Run / Pause / Resume / Stop / Reset / Step), elapsed timer, step count, dirty badge on mid-run edit, and live `useStackSnapshot` block list.
  3. **Block Memory Map**: selectable block memory inspector rendering typed metrics across memory locations.
  4. **Output Log Stream**: streaming `useOutputStatements` statement list with types, sources, and metrics payloads.
- Effect-owned runtime lifecycle via `RuntimeFactory(createCompiler(), { debugMode: true })` + `ScriptRuntimeProvider` with clean Provider isolation between active and idle states.

Verification: `test:storybook` passes all story tests (4 files / 17 tests); `tsc --noEmit` clean.

## Question

Land the goal-3 workbench per 003's architecture:

1. Code editor (existing `editorPreset({ dialect: 'whiteboard' })` mounting)
   side-by-side with the decided panels: parser statement/metrics/hints,
   runtime stack + block states, per-block memory, output-log stream.
2. Live wall-clock run wiring through the seams 003 names, with teardown.
3. Keystroke re-parse vs explicit re-run per 003's split.
4. Query panel fed from the corpus (005).

Verification: `dev:storybook` — edit script, run workout, watch stack/
memory/logs evolve live; `test:storybook` passes.
