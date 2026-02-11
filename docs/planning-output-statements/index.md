# Planning: Output Statement Expectations

> **Purpose**: Step-through execution tables for each workout type, defining what `OutputStatement`s the runtime should produce at each lifecycle event. Use these tables to validate compiler strategies, write integration tests, and catch missing or duplicate outputs.

## Generic Output Model

Every runtime block falls into one of two categories based on its role in the execution tree. The output contract differs by category:

### Container Blocks (non-leaf: Rounds, Loop, AMRAP, EMOM, SessionRoot, Group)

Container blocks manage child blocks and track aggregate state (rounds, timers, child progress). Their output contract:

| Trigger | Output Type | Content | Purpose |
|---------|-------------|---------|---------|
| **Entry** (mount) | `segment` | Initial state snapshot — timer duration, round count (current/total), label | Announce that this container has begun execution and identify its starting state |
| **State change** (next, after child pop) | `milestone` | Updated state — new round number, timer checkpoint, child progress | Log each meaningful transition so the output stream captures the container's progression |
| **Exit** (unmount) | `completion` | Final state — total elapsed time, final round count, closed timeSpan | Close out the container's bracket with its terminal state |

**Key principle**: Containers produce output that reflects their own state, not their children's work. Every state mutation that alters the container's identity (round advance, timer expiry, phase change) should generate a `milestone` output.

### Leaf Blocks (exercises, effort, timer-only, rest, idle)

Leaf blocks represent active work. They carry **display fragments** (`fragment:display` memory) that describe the exercise — effort name, rep count, resistance, timer duration, etc. Their output contract:

| Trigger | Output Type | Content | Purpose |
|---------|-------------|---------|---------|
| **Entry** (mount) | `segment` | All display fragments — effort, reps, resistance, timer, label | Announce what the athlete should do right now |
| **Self-initiated exit** (next → pop) | `completion` | Display fragments + runtime-tracked fragments (elapsed time, rep count achieved) | Log the completed work when the leaf decides to end itself (user clicks "next" or timer expires) |
| **Parent-initiated exit** (parent pops child) | `completion` | Display fragments + runtime-tracked fragments | Log the completed work when the parent forces removal (e.g., AMRAP timer expires while child is active) |

**Key principle**: Leaf blocks are the source of truth for **what work was performed**. Their completion output must include both the prescribed fragments (from the parser) and the tracked fragments (from runtime memory — elapsed time, actual reps, etc.).

### Output Timing Rules

1. **Leaf self-pop**: When `next()` is called on a leaf, the leaf knows it will pop. Output should be generated capturing the leaf's final state. Currently this happens on `onUnmount` after `PopOnNextBehavior` triggers the pop.
2. **Parent-forced pop**: When a parent pops a child (e.g., AMRAP timer expires → `ClearChildrenAction`), the child is unmounted without `next()` being called. Output must still be generated — this is the `onUnmount` path.
3. **Container state change**: When a container's `next()` is called (after child pops back), the container should emit a `milestone` for any state change before pushing the next child.
4. **Container entry**: Containers emit a `segment` on mount to establish the bracket. This output identifies the container's initial configuration.

### Fragment Flow

```
Parser Fragments (compile time)         Runtime Fragments (execution time)
────────────────────────────────         ──────────────────────────────────
effort: "Pullups"                        duration: 45000ms (elapsed)
reps: 10                                 timer: "0:45" (formatted)
resistance: "bodyweight"                 round: { current: 2, total: 5 }
timer: 300000ms (prescribed)             
                                         
         │                                        │
         └──── fragment:display memory ────────────┘
                        │
                        ▼
                  OutputStatement
                  - outputType: 'segment' | 'completion' | 'milestone'
                  - fragments: [...parser, ...runtime]
                  - timeSpan: { start, end }
                  - sourceBlockKey, stackLevel
```

---

## Overview

This documentation is organized by workout pattern type. Each type includes:

1. **Behavior Stack reference** — which behaviors are active on each block type in that pattern
2. **Step-through execution tables** — detailed sequence of outputs for representative workouts
3. **State variable tracking** — parent block state changes on each `→next()` call
4. **Validation guidance** — expected outputs and checkpoints

## Workout Types

| Type | Pattern | Category | Workouts | Key Output Behaviors |
|------|---------|----------|----------|---------------------|
| **[For Time (single)](./for-time-single.md)** | `Root > Exercise` | Leaf-only | Grace, Karen | `SegmentOutput`, `TimerOutput`, `SoundCue`, `PopOnNext` |
| **[For Time (rep-scheme)](./for-time-rep-scheme.md)** | `Root > Loop(N) > Exercises` | Container + Leaf | Fran, Annie, Diane | `RoundOutput`, `RoundAdvance`, `RoundCompletion`, `ChildLoop`, `ChildRunner` |
| **[AMRAP](./amrap.md)** | `Root > AMRAP(timer) > Exercises` | Container + Leaf | Cindy | `TimerCompletion`, `RoundAdvance`, `ChildLoop`, `CompletedBlockPop` |
| **[EMOM](./emom.md)** | `Root > EMOM(N×interval) > Exercises` | Container + Leaf | Chelsea | `RoundCompletion`, `TimerCompletion`, `CompletedBlockPop` |
| **[Sequential Timers](./sequential-timers.md)** | `Root > Timer > Timer > ...` | Leaf-only | Simple and Sinister | `TimerCompletion`, `TimerOutput`, `SoundCue`, `SegmentOutput` |
| **[Fixed-round Loop](./fixed-round-loop.md)** | `Root > Loop(N) > Exercises` | Container + Leaf | Helen, Nancy | Same as rep-scheme |
| **[Loop + Rest](./loop-with-rest.md)** | `Root > Loop(N) > [Exercises, Rest]` | Container + Leaf | Barbara | Same as loop, Rest is a timer leaf |

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

### Behavior → Output Mapping (by Block Category)

#### Container Blocks

| Behavior | Lifecycle | Output Type | Content | Generic Role |
|---|---|---|---|---|
| `SegmentOutputBehavior` | `onMount` | `segment` | Display fragments (label, timer, rounds) | **Entry identification** |
| `RoundOutputBehavior` | `onNext` | `milestone` | Round fragment (current / total) | **State change logging** |
| `SegmentOutputBehavior` | `onUnmount` | `completion` | Display fragments with closed `timeSpan` | **Exit closure** |
| `HistoryRecordBehavior` | `onUnmount` | _(event)_ | `history:record` event with elapsed, rounds | **Persistence** |

#### Leaf Blocks

| Behavior | Lifecycle | Output Type | Content | Generic Role |
|---|---|---|---|---|
| `SegmentOutputBehavior` | `onMount` | `segment` | Display fragments (effort, reps, resistance) | **Entry identification** |
| `TimerOutputBehavior` | `onUnmount` | `completion` | Display fragments + elapsed duration | **Exit with tracked metrics** |
| `SegmentOutputBehavior` | `onUnmount` | `completion` | Display fragments with closed `timeSpan` | **Exit closure** |
| `SoundCueBehavior` | `onMount` / tick / `onUnmount` | `milestone` | `SoundFragment` (start beep, countdown, completion) | **Audible milestone** |

### Legend

- **Step** — sequential execution step number; `→` prefix = auto-triggered parent `next()` after child pop
- **Event** — lifecycle trigger (`mount`, `next`, `tick`, `unmount`, `→next` = parent receives control)
- **Block** — which runtime block is active
- **Category** — `container` or `leaf` (determines output contract)
- **Depth** — runtime stack depth
- **Output** — expected `OutputStatementType`
- **Fragments** — key fragments on the output (parser + runtime)
- **State Changes** — parent variable mutations and resulting action on `→next` rows
- **Pop Source** — `self` (leaf calls next → pop), `parent` (parent forces pop), `timer` (timer expires → pop), `completion` (round/child exhaustion → pop)
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
- 🔍 **[Output Shortfalls Analysis](./output-shortfalls.md)** — Gaps between generic model and current implementation

---

## Validation Checklist (Common to All Types)

Use this checklist when writing integration tests:

### Generic Output Contract
- [ ] **Container entry**: Every container block emits `segment` on mount with initial state (round count, timer duration, label)
- [ ] **Container state change**: Every state-mutating `next()` on a container emits a `milestone` (round advance, timer checkpoint)
- [ ] **Container exit**: Every container block emits `completion` on unmount with final state
- [ ] **Leaf entry**: Every leaf block emits `segment` on mount with all display fragments (effort, reps, resistance, timer)
- [ ] **Leaf self-pop**: When a leaf pops itself (user advance via `PopOnNextBehavior`), a `completion` output is emitted with display + tracked fragments
- [ ] **Leaf parent-pop**: When a parent forces a leaf off the stack (timer expiry, `ClearChildrenAction`), the leaf still emits a `completion` output with correct fragments
- [ ] **Tracked fragments**: Leaf `completion` outputs include runtime-tracked fragments (elapsed time, actual reps) alongside parser-defined fragments

### Structural Integrity
- [ ] Every `segment` output has matching `completion` output (paired lifecycle)
- [ ] `timeSpan.start` on segment ≤ `timeSpan.end` on completion
- [ ] `stackLevel` matches actual runtime stack depth at emission time
- [ ] `sourceStatementId` traces back to a valid parsed `CodeStatement`
- [ ] Round `milestone` outputs have correct `current` / `total` counts
- [ ] Sound `milestone` outputs fire at correct timing thresholds
- [ ] `history:record` event fires exactly once per block unmount
- [ ] No duplicate outputs for the same lifecycle event
- [ ] Fragment origins are correct (`parser` for initial, `runtime` for tracked values)
