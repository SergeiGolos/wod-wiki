---
state: open
labels: [wayfinder:task]
title: "Build the debug workbench story"
blocked-by: ["003-storybook-debug-workbench-architecture", "005-seed-fake-data-corpus"]
---

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
