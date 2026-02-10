# Planning: Output Statement Expectations

> **Purpose**: Step-through execution tables for each workout type, defining what `OutputStatement`s the runtime should produce at each lifecycle event. Use these tables to validate compiler strategies, write integration tests, and catch missing or duplicate outputs.

## Overview

This documentation is organized by workout pattern type. Each type includes:

1. **Behavior Stack reference** — which behaviors are active on each block type in that pattern
2. **Step-through execution tables** — detailed sequence of outputs for representative workouts
3. **State variable tracking** — parent block state changes on each `→next()` call
4. **Validation guidance** — expected outputs and checkpoints

## Workout Types

| Type | Pattern | Workouts | Behaviors |
|------|---------|----------|-----------|
| **[For Time (single)](#for-time-single)** | `Root > Exercise` | Grace, Karen | `SegmentOutput`, `SoundCue`, `PopOnNext` |
| **[For Time (rep-scheme)](#for-time-rep-scheme)** | `Root > Loop(N) > Exercises` | Fran, Annie, Diane | `RoundAdvance`, `RoundCompletion`, `ChildLoop`, `ChildRunner` |
| **[AMRAP](#amrap)** | `Root > AMRAP(timer) > Exercises` | Cindy | `TimerCompletion`, `RoundAdvance`, `ChildLoop` |
| **[EMOM](#emom)** | `Root > EMOM(N×interval) > Exercises` | Chelsea, EMOM Lifting, ABC | `RoundCompletion`, `TimerCompletion` + Round behaviors |
| **[Sequential Timers](#sequential-timers)** | `Root > Timer > Timer > ...` | Simple and Sinister | `TimerCompletion`, `SoundCue`, `SegmentOutput` |
| **[Fixed-round Loop](#fixed-round-loop)** | `Root > Loop(N) > Exercises` | Helen, Nancy | Same as rep-scheme |
| **[Loop + Rest](#loop-with-rest)** | `Root > Loop(N) > [Exercises, Rest]` | Barbara | Same as loop, Rest is a child |

---

## Shared Reference

### Output Statement Model

| Property            | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `outputType`        | `'segment'` · `'completion'` · `'milestone'` · `'metric'` · `'label'` |
| `timeSpan`          | `{ start, end }` timestamps for the output window                     |
| `fragments`         | Merged parser + runtime fragments attached to the output              |
| `sourceStatementId` | Links back to the parsed `CodeStatement.id`                           |
| `sourceBlockKey`    | Runtime block key that emitted this output                            |
| `stackLevel`        | Depth in the runtime stack when emitted                               |

### Behavior → Output Mapping

| Behavior | Lifecycle | Output Type | Content |
|---|---|---|---|
| `SegmentOutputBehavior` | `onMount` | `segment` | Display fragments (effort, reps, resistance, timer, etc.) |
| `SegmentOutputBehavior` | `onUnmount` | `completion` | Same fragments with closed `timeSpan` |
| `RoundOutputBehavior` | `onNext` | `milestone` | Round fragment (current / total) |
| `SoundCueBehavior` | `onMount` / tick / `onUnmount` | `milestone` | `SoundFragment` (start beep, countdown, completion) |
| `HistoryRecordBehavior` | `onUnmount` | _(event)_ | `history:record` event with elapsed, rounds, etc. |

### Legend

- **Step** — sequential execution step number; `→` prefix = auto-triggered parent `next()` after child pop
- **Event** — lifecycle trigger (`mount`, `next`, `tick`, `unmount`, `→next` = parent receives control)
- **Block** — which runtime block is active
- **Depth** — runtime stack depth
- **Output** — expected `OutputStatementType`
- **Fragments** — key fragments on the output
- **State Changes** — parent variable mutations and resulting action on `→next` rows
- **Expected?** — ✅ confirmed / ❓ needs validation / ❌ known gap

### Parent `next()` Behavior Chain (execution order)

When a child block pops, `PopBlockAction` fires `NextAction` on the parent. The parent runs:

| Order | Behavior | What it checks / does |
|------:|----------|----------------------|
| 0 | `RestBlockBehavior` (if parent has timer) | If timer exists → generate and push Rest block, return early (skip other behaviors) |
| 1 | `RoundAdvanceBehavior` | If `allChildrenCompleted` → `round.current += 1` |
| 2 | `RoundCompletionBehavior` | If `round.current > round.total` → `markComplete`, return `PopBlockAction` |
| 3 | `ChildLoopBehavior` | If `allChildrenExecuted` && `shouldLoop()` → `childIndex = 0` (reset) |
| 4 | `ChildRunnerBehavior` | If `childIndex < children.length` → compile & push next child, `childIndex += 1` |

**New Rest Block Behavior (Timer-based Parents Only):**
- When a child completes and parent has a timer (AMRAP, EMOM, Sequential), parent checks `RestBlockBehavior` first
- If rest needed, push Rest block with countdown timer
- Rest auto-completes on timer expiration, pops back to parent
- Parent's next `next()` call proceeds with normal behavior chain (advance round, push next child, etc.)

**SessionRoot Special Behavior:**
- When WaitingToStart pops → Root pushes first workout block
- When last workout block pops → Root detects `childIndex >= children.length` → marks complete and pops (session ends)

### Key State Variables Per Block

- `round.current` / `round.total` — round counter (only on multi-round strategies)
- `timer` — `TimerState` with elapsed, direction, durationMs (on countdown/timer blocks)
- `childIndex` — pointer to next child to push (0-based, on container blocks)
- `allChildrenExecuted` — `childIndex >= children.length`
- `allChildrenCompleted` — `allChildrenExecuted && !dispatchedThisCall`

---

## Quick Navigation

- 📃 **[For Time (single)](./for-time-single.md)** — Grace, Karen  
- 📃 **[For Time (rep-scheme)](./for-time-rep-scheme.md)** — Fran, Annie, Diane  
- 📃 **[AMRAP](./amrap.md)** — Cindy  
- 📃 **[EMOM](./emom.md)** — Chelsea, EMOM Lifting, ABC  
- 📃 **[Sequential Timers](./sequential-timers.md)** — Simple and Sinister  
- 📃 **[Fixed-round Loop](./fixed-round-loop.md)** — Helen, Nancy  
- 📃 **[Loop + Rest](./loop-with-rest.md)** — Barbara  

---

## Validation Checklist (Common to All Types)

Use this checklist when writing integration tests:

- [ ] Every `segment` output has matching `completion` output (paired lifecycle)
- [ ] `timeSpan.start` on segment ≤ `timeSpan.end` on completion
- [ ] `stackLevel` matches actual runtime stack depth at emission time
- [ ] `sourceStatementId` traces back to a valid parsed `CodeStatement`
- [ ] Round `milestone` outputs have correct `current` / `total` counts
- [ ] Sound `milestone` outputs fire at correct timing thresholds
- [ ] `history:record` event fires exactly once per block unmount
- [ ] No duplicate outputs for the same lifecycle event
- [ ] Fragment origins are correct (`parser` for initial, `runtime` for tracked values)
