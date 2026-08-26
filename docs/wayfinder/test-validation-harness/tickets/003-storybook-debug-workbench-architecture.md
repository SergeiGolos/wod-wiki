---
state: open
labels: [wayfinder:grilling]
title: "Storybook debug workbench architecture"
blocked-by: []
---

## Question

Architecture for the goal-3 workbench (code editor side-by-side with
parser/runtime/memory/log visualization):

1. Extend the existing `LanguageWorkbench.stories.tsx` or add a new Debug
   Workbench story?
2. Panel inventory and layout: parser (statement tree / metrics / hints),
   runtime (stack + block states), memory (per-block `memoryMap`), logs
   (`OutputStatement` stream).
3. Live wall-clock wiring (fixed at charting): which seams spin and observe
   the run — `RuntimeFactory.createRuntime`, the output + stack observer
   seams the **Workbench Session** pattern names; when a run is torn down.
4. Reactivity split: what re-parses on keystroke vs. what needs an explicit
   re-run; how mid-run edits are handled.
5. How the WQL/query panel consumes the corpus (002) once seeded.

Deliverable: architecture decision + wireframe-level panel description the
build ticket (009) implements against.
