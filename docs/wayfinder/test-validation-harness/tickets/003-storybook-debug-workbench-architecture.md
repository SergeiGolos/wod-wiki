---
state: closed 2026-08-26
labels: [wayfinder:grilling]
title: "Storybook debug workbench architecture"
assignee: serge # claimed 2026-08-26
---

## Resolution

Spec: [003-storybook-debug-workbench-architecture.md](../assets/003-storybook-debug-workbench-architecture.md)

One-line answer: **extend** the existing `Workbench/Language Workbench`
story (no new story); full-width **2×2 debug panel grid below the editor
lanes** — parser statement detail, runtime stack, block memory, output
logs — all visible at once; runtime is effect-owned via
`RuntimeFactory.createRuntime(block, { debugMode: true })`/`disposeRuntime`
fed through `RuntimeContext`, driven wall-clock by `useRuntimeExecution`
(20 ms ticks), observed by `useStackSnapshot`/`useBlockMemory`/
`useOutputStatements`; **freeze + dirty badge** for mid-run edits
(running script = Run-moment snapshot, edits mark "script changed —
re-run", re-run disposes and recreates); keystrokes re-parse the parser
panel only; query lane untouched (corpus swap is 010's). All seams
verified in-repo before deciding.

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
