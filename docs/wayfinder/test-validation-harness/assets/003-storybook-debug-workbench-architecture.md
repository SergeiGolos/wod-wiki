# Storybook Debug Workbench Architecture — Spec (v1)

Decided in [Storybook debug workbench architecture](../tickets/003-storybook-debug-workbench-architecture.md).
The contract ticket 009 implements.

## Headline decision

**Extend the existing `Workbench/Language Workbench` story** — no separate
Debug Workbench story. One surface gains a full-width **2×2 debug panel grid
below the existing two-lane editor grid**:

```
┌───────────────────────────┬───────────────────────────┐
│ Whiteboard Script editor  │ WQL editor + widgets      │  ← existing lanes
│ (live parse counters)     │ (unchanged; corpus swap   │
│                           │  rides ticket 010)        │
├───────────────────────────┴───────────────────────────┤
│ Parser statements     │ Runtime stack                 │
│ (tree + metrics/hints)│ (blocks, states, current)     │  ← new 2×2 grid
├───────────────────────┼───────────────────────────────┤
│ Block memory          │ Output logs                   │
│ (per-tag metric maps) │ (streaming OutputStatements)  │
└───────────────────────┴───────────────────────────────┘
```

All four panels visible at once — the validation value is watching stack,
memory, and logs evolve together during a live run.

## Seams (all verified in-repo)

| Concern | Seam | Notes |
|---|---|---|
| Runtime lifecycle | `RuntimeFactory.createRuntime(block, { debugMode: true })` / `disposeRuntime` | Effect-owned (Workbench Effect pattern): a `useEffect` creates on Run, disposes on stop/unmount/re-run. `debugMode: true` — this is a debug surface. |
| Wall-clock driving | `useRuntimeExecution(runtime)` | Fixed 20 ms tick loop; `start/pause/stop/reset/step`, `status`, `elapsedTime`. Live wall-clock is a charting-fixed decision. |
| Context feed | `RuntimeContext` provider | `useStackSnapshot()` reads the runtime from context; the creating effect sets the provider value. |
| Stack panel | `useStackSnapshot()` | Blocks top-to-bottom: label, `blockType`, `isComplete`, current-block marker. |
| Memory panel | `useBlockMemory(block, type)` / `block.memoryMap` | Subscribe per selected/current block and memory tag; fall back to rendering `getAllMemory()` entries by tag. |
| Logs panel | `useOutputStatements(runtime?)` | Streaming `OutputStatement`s, newest at bottom, capped (~200), auto-scroll. |
| Parser panel | existing parse memo, deepened | Keep the full `WhiteboardScript` (not just counts): per-statement list — line, raw, metrics (type/value/unit/origin), hints. Counters stay as the lane summary. |

## Reactivity split (freeze + dirty badge — decided)

- **Keystroke** → parse memo re-runs: parser panel + counters update live.
  No runtime involvement.
- **Run** → snapshot `scriptText`; parse → `ScriptBlock` (`content` +
  `statements`) → `createRuntime` → provider → `useRuntimeExecution.start()`.
- **Mid-run edits** → running runtime keeps its snapshot; a
  `script changed — re-run` badge appears while `scriptText !== runSnapshot`.
  Parser panel still live-parses the edited text.
- **Re-run** → `disposeRuntime` old → create → start. **Unmount/stop** →
  dispose + existing demo-pack unregistration.

## Scope notes

- Query lane untouched; its golden→corpus swap is ticket 010's, not 009's.
- Component test (`LanguageWorkbench.test.tsx`) extends to: panels render,
  parser panel reflects an edit, Run creates a runtime (status leaves
  `idle`), dirty badge appears on mid-run edit. Live-run behavior is
  manual browser validation (`dev:storybook`) — tick-loop assertions in
  jsdom stay out (flaky, low signal).
- The demo-pack toggle and parse-nonce re-parse stay as-is.
