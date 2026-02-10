# Planning: Output Statement Expectations

> **Purpose**: Step-through execution tables for each workout type, defining what `OutputStatement`s the runtime should produce at each lifecycle event. Use these tables to validate compiler strategies, write integration tests, and catch missing or duplicate outputs.

## Output Statement Model Reference

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

---

## Legend

- **Step** — sequential execution step number; `→` prefix = auto-triggered parent `next()` after child pop
- **Event** — lifecycle trigger (`mount`, `next`, `tick`, `unmount`, `→next` = parent receives control)
- **Block** — which runtime block is active
- **Stack** — runtime stack depth
- **Output Type** — expected `OutputStatementType`
- **Fragments** — key fragments on the output
- **State Changes** — parent variable mutations and resulting action on `→next` rows
- **Expected?** — ✅ confirmed / ❓ needs validation / ❌ known gap

### Parent `next()` Behavior Chain (execution order)

When a child block pops, `PopBlockAction` fires `NextAction` on the parent. The parent runs:

| Order | Behavior | What it checks / does |
|------:|----------|----------------------|
| 1 | `RoundAdvanceBehavior` | If `allChildrenCompleted` → `round.current += 1` |
| 2 | `RoundCompletionBehavior` | If `round.current > round.total` → `markComplete`, return `PopBlockAction` |
| 3 | `ChildLoopBehavior` | If `allChildrenExecuted` && `shouldLoop()` → `childIndex = 0` (reset) |
| 4 | `ChildRunnerBehavior` | If `childIndex < children.length` → compile & push next child, `childIndex += 1` |

**Key state variables per parent block:**
- `round.current` / `round.total` — round counter
- `childIndex` — pointer to next child to push (0-based)
- `allChildrenExecuted` — `childIndex >= children.length`
- `allChildrenCompleted` — `allChildrenExecuted && !dispatchedThisCall`

Fill in the **Expected?** column as you validate each step.

---

## 1. Fran — `(21-15-9) Thrusters 95lb / Pullups`

**Pattern**: Descending rep-scheme loop (3 rounds: 21, 15, 9) with child exercises
**Blocks**: `WorkoutRoot > Loop(21-15-9) > [Thrusters, Pullups]`
**State**: Loop has `round={current, total:3}`, `repScheme=[21,15,9]`, `childIndex` over 2 children

| Step | Event   | Block         | Depth | Output       | Fragments                             | State Changes                                                                                   | Expected?            |
| ---: | ------- | ------------- | ----: | ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
|    1 | mount   | WorkoutRoot   |     0 | `segment`    | label: "Fran"                         | Root.childIndex: 0→1, push Loop                                                                 |                      |
|    2 | mount   | Loop(21-15-9) |     1 | `milestone`  | rounds: 1/3, reps: 21                 | round={1,3}, childIndex: 0→1, push Thrusters                                                    | reps:21 published as |
|    3 | mount   | Thrusters     |     2 | `segment`    | effort: "Thrusters", 95lb, reps: 21   | _(leaf)_                                                                                        |                      |
|    4 | next    | Thrusters     |     2 | —            | _(user clicks next)_                  | PopOnNext → pop Thrusters                                                                       |                      |
|    5 | unmount | Thrusters     |     2 | `completion` | effort: "Thrusters", timeSpan: closed |                                                                                                 |                      |
|   →6 | →next   | Loop(21-15-9) |     1 | —            | _(parent receives control)_           | RoundAdv: skip (childIdx<2). ChildRunner: childIndex 1→2, push Pullups                          |                      |
|    7 | mount   | Pullups       |     2 | `segment`    | effort: "Pullups", reps: 21           | _(leaf)_                                                                                        |                      |
|    8 | next    | Pullups       |     2 | —            | _(user clicks next)_                  | PopOnNext → pop Pullups                                                                         |                      |
|    9 | unmount | Pullups       |     2 | `completion` | effort: "Pullups", timeSpan: closed   |                                                                                                 |                      |
|  →10 | →next   | Loop(21-15-9) |     1 | `milestone`  | rounds: 2/3, reps: 15                 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Thrusters |                      |
|   11 | mount   | Thrusters     |     2 | `segment`    | effort: "Thrusters", 95lb, reps: 15   | _(leaf)_                                                                                        |                      |
|   12 | unmount | Thrusters     |     2 | `completion` | effort: "Thrusters", timeSpan: closed |                                                                                                 |                      |
|  →13 | →next   | Loop(21-15-9) |     1 | —            | _(parent receives control)_           | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pullups                                       |                      |
|   14 | mount   | Pullups       |     2 | `segment`    | effort: "Pullups", reps: 15           | _(leaf)_                                                                                        |                      |
|   15 | unmount | Pullups       |     2 | `completion` | effort: "Pullups", timeSpan: closed   |                                                                                                 |                      |
|  →16 | →next   | Loop(21-15-9) |     1 | `milestone`  | rounds: 3/3, reps: 9                  | RoundAdv: round 2→3. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Thrusters |                      |
|   17 | mount   | Thrusters     |     2 | `segment`    | effort: "Thrusters", 95lb, reps: 9    | _(leaf)_                                                                                        |                      |
|   18 | unmount | Thrusters     |     2 | `completion` | effort: "Thrusters", timeSpan: closed |                                                                                                 |                      |
|  →19 | →next   | Loop(21-15-9) |     1 | —            | _(parent receives control)_           | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pullups                                       |                      |
|   20 | mount   | Pullups       |     2 | `segment`    | effort: "Pullups", reps: 9            | _(leaf)_                                                                                        |                      |
|   21 | unmount | Pullups       |     2 | `completion` | effort: "Pullups", timeSpan: closed   |                                                                                                 |                      |
|  →22 | →next   | Loop(21-15-9) |     1 | —            | _(parent receives control)_           | RoundAdv: round 3→4. RoundCompl: 4>3 → markComplete, pop Loop                                   |                      |
|   23 | unmount | Loop(21-15-9) |     1 | `completion` | rounds: 3/3 complete                  |                                                                                                 |                      |
|  →24 | →next   | WorkoutRoot   |     0 | —            | _(root receives control)_             | ChildRunner: childIndex 1 >= 1 → no more children, workout idle                                 |                      |
|   25 | unmount | WorkoutRoot   |     0 | `completion` | label: "Fran", timeSpan: total        | history:record event                                                                            |                      |

**Total expected outputs**: ~16 (segments + completions + milestones)
**Notes**:

---

## 2. Cindy — `20:00 AMRAP / 5 Pullups / 10 Pushups / 15 Air Squats`

**Pattern**: Timed AMRAP with unbounded rounds, 3 exercises per round
**Blocks**: `WorkoutRoot > AMRAP(20:00) > [Pullups, Pushups, Squats]`
**State**: AMRAP has `round={current, total:undefined}`, `timer={countdown, 20:00}`, `childIndex` over 3 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Cindy" | Root.childIndex: 0→1, push AMRAP | |
| 2 | mount | AMRAP(20:00) | 1 | `segment` | timer: 20:00 countdown | round={1,∞}, childIndex: 0→1, push Pullups | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | _(leaf)_ | |
| 4 | next | Pullups | 2 | — | _(user clicks next)_ | PopOnNext → pop | |
| 5 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | |
| →6 | →next | AMRAP(20:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip (not all executed). ChildRunner: childIndex 1→2, push Pushups | |
| 7 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | _(leaf)_ | |
| 8 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | |
| →9 | →next | AMRAP(20:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Squats | |
| 10 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | _(leaf)_ | |
| 11 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | |
| →12 | →next | AMRAP(20:00) | 1 | `milestone` | rounds: 2 (unbounded) | RoundAdv: round 1→2. ChildLoop: allExecuted + timer running → reset childIndex=0. ChildRunner: childIndex 0→1, push Pullups | |
| _repeat 3–12 per round, round increments each cycle_ | | | | | | | |
| N | tick | AMRAP(20:00) | 1 | `milestone` | sound: completion-beep | TimerCompletion: elapsed≥20:00 → markComplete | |
| N+1 | unmount | AMRAP(20:00) | 1 | `completion` | timer: 20:00, rounds: final count | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Cindy", timeSpan: total | history:record | |

**Total expected outputs**: 2 per exercise × 3 exercises × N rounds + milestones + root
**Notes**:

---

## 3. Grace — `30 Clean & Jerk 135lb`

**Pattern**: Single exercise, fixed rep count, for time
**Blocks**: `WorkoutRoot > CleanAndJerk(30)`
**State**: Root has `childIndex` over 1 child. CleanAndJerk is a leaf (effort block).

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Grace" | Root.childIndex: 0→1, push C&J | |
| 2 | mount | CleanAndJerk | 1 | `segment` | effort: "Clean & Jerk", 135lb, reps: 30 | _(leaf, countup timer starts)_ | |
| 3 | mount | CleanAndJerk | 1 | `milestone` | sound: start-beep | SoundCue.onMount | |
| 4 | next | CleanAndJerk | 1 | — | _(user completes 30 reps)_ | PopOnNext → pop C&J | |
| 5 | unmount | CleanAndJerk | 1 | `completion` | effort: "Clean & Jerk", timeSpan: closed | SegmentOutput.onUnmount | |
| 6 | unmount | CleanAndJerk | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | |
| →7 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | |
| 8 | unmount | WorkoutRoot | 0 | `completion` | label: "Grace", timeSpan: total | history:record | |

**Total expected outputs**: ~6
**Notes**:

---

## 4. Helen — `(3) 400m Run / 21 KB Swings 53lb / 12 Pullups`

**Pattern**: Fixed-round loop (3 rounds) with 3 exercises per round
**Blocks**: `WorkoutRoot > Loop(3) > [Run, KBSwings, Pullups]`
**State**: Loop has `round={current, total:3}`, `childIndex` over 3 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Helen" | Root.childIndex: 0→1, push Loop | |
| 2 | mount | Loop(3) | 1 | `milestone` | rounds: 1/3 | round={1,3}, childIndex: 0→1, push Run | |
| 3 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | _(leaf)_ | |
| 4 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | | |
| →5 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx<3). ChildRunner: childIndex 1→2, push KBSwings | |
| 6 | mount | KBSwings | 2 | `segment` | effort: "KB Swings", 53lb, reps: 21 | _(leaf)_ | |
| 7 | unmount | KBSwings | 2 | `completion` | effort: "KB Swings", timeSpan: closed | | |
| →8 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Pullups | |
| 9 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 12 | _(leaf)_ | |
| 10 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | |
| →11 | →next | Loop(3) | 1 | `milestone` | rounds: 2/3 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Run | |
| _repeat steps 3–→11 for rounds 2 and 3_ | | | | | | | |
| →N | →next | Loop(3) | 1 | — | _(after round 3, last child)_ | RoundAdv: round 3→4. RoundCompl: 4>3 → pop Loop | |
| N+1 | unmount | Loop(3) | 1 | `completion` | rounds: 3/3 complete | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Helen", timeSpan: total | history:record | |

**Total expected outputs**: ~22 (6 per round × 3 + milestones + root)
**Notes**:

---

## 5. Chelsea — `(30) :60 EMOM / 5 Pullups / 10 Pushups / 15 Air Squats`

**Pattern**: EMOM with fixed rounds (30) and interval timer (:60)
**Blocks**: `WorkoutRoot > EMOM(30×:60) > [Pullups, Pushups, Squats]`
**State**: EMOM has `round={current, total:30}`, `timer={countdown, :60 per interval}`, `childIndex` over 3 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Chelsea" | Root.childIndex: 0→1, push EMOM | |
| 2 | mount | EMOM(30×:60) | 1 | `segment` | timer: :60, rounds: 1/30 | round={1,30}, childIndex: 0→1, push Pullups | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | _(leaf)_ | |
| 4 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | |
| →5 | →next | EMOM(30×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pushups | |
| 6 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | _(leaf)_ | |
| 7 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | |
| →8 | →next | EMOM(30×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Squats | |
| 9 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | _(leaf)_ | |
| 10 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | |
| →11 | →next | EMOM(30×:60) | 1 | `milestone` | rounds: 2/30 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Pullups | |
| _…wait for :60 timer before children can restart, or children run immediately?_ | | | | | | | |
| 12 | tick | EMOM(30×:60) | 1 | `milestone` | sound: interval-beep | TimerCompl: interval elapsed, reset timer for next interval | |
| _repeat per interval: 3 children + 3 parent→next + tick_ | | | | | | | |
| N | →next | EMOM(30×:60) | 1 | — | _(after round 30, last child)_ | RoundAdv: round 30→31. RoundCompl: 31>30 → pop EMOM | |
| N+1 | unmount | EMOM(30×:60) | 1 | `completion` | rounds: 30/30, timer: 30:00 | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Chelsea", timeSpan: total | history:record | |

**Total expected outputs**: ~8 per round × 30 + root
**Notes**:

---

## 6. Annie — `(50-40-30-20-10) Double-Unders / Situps`

**Pattern**: Descending rep-scheme loop (5 rounds: 50, 40, 30, 20, 10)
**Blocks**: `WorkoutRoot > Loop(50-40-30-20-10) > [DoubleUnders, Situps]`
**State**: Loop has `round={current, total:5}`, `repScheme=[50,40,30,20,10]`, `childIndex` over 2 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Annie" | Root.childIndex: 0→1, push Loop | |
| 2 | mount | Loop(50-40-30-20-10) | 1 | `milestone` | rounds: 1/5, reps: 50 | round={1,5}, childIndex: 0→1, push DoubleUnders | |
| 3 | mount | DoubleUnders | 2 | `segment` | effort: "Double-Unders", reps: 50 | _(leaf)_ | |
| 4 | unmount | DoubleUnders | 2 | `completion` | effort: "Double-Unders", timeSpan: closed | | |
| →5 | →next | Loop | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx<2). ChildRunner: childIndex 1→2, push Situps | |
| 6 | mount | Situps | 2 | `segment` | effort: "Situps", reps: 50 | _(leaf)_ | |
| 7 | unmount | Situps | 2 | `completion` | effort: "Situps", timeSpan: closed | | |
| →8 | →next | Loop | 1 | `milestone` | rounds: 2/5, reps: 40 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push DoubleUnders | |
| _repeat for rounds 3 (30), 4 (20), 5 (10) — same pattern_ | | | | | | | |
| →N | →next | Loop | 1 | — | _(after round 5, last child)_ | RoundAdv: round 5→6. RoundCompl: 6>5 → pop Loop | |
| N+1 | unmount | Loop | 1 | `completion` | rounds: 5/5 complete | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Annie", timeSpan: total | history:record | |

**Total expected outputs**: ~25 (4 per round × 5 + 4 milestones + root)
**Notes**:

---

## 7. Simple and Sinister — `5:00 100 KB Swings / 1:00 Rest / 10:00 10 Turkish Getups`

**Pattern**: Sequential timed segments (timer → rest → timer)
**Blocks**: `WorkoutRoot > [Timer(5:00, KBSwings), Rest(1:00), Timer(10:00, TGU)]`
**State**: Root has `childIndex` over 3 children. Each Timer/Rest is a leaf with countdown timer.

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Simple and Sinister" | Root.childIndex: 0→1, push Timer(5:00) | |
| 2 | mount | Timer(5:00) | 1 | `segment` | timer: 5:00 countdown, effort: "KB Swings", reps: 100, 70lb | timer starts, countdown from 5:00 | |
| 3 | mount | Timer(5:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | |
| 4 | tick | Timer(5:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed≥5:00 → markComplete | |
| 5 | unmount | Timer(5:00) | 1 | `completion` | timer: 5:00, effort: "KB Swings", timeSpan: closed | | |
| →6 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push Rest(1:00) | |
| 7 | mount | Rest(1:00) | 1 | `segment` | timer: 1:00 countdown, label: "Rest" | timer starts, countdown from 1:00 | |
| 8 | tick | Rest(1:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed≥1:00 → markComplete | |
| 9 | unmount | Rest(1:00) | 1 | `completion` | timer: 1:00, timeSpan: closed | | |
| →10 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2→3, push Timer(10:00) | |
| 11 | mount | Timer(10:00) | 1 | `segment` | timer: 10:00 countdown, effort: "Turkish Getups", reps: 10, 70lb | timer starts | |
| 12 | mount | Timer(10:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | |
| 13 | tick | Timer(10:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed≥10:00 → markComplete | |
| 14 | unmount | Timer(10:00) | 1 | `completion` | timer: 10:00, effort: "Turkish Getups", timeSpan: closed | | |
| →15 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 3 >= 3 → no more children, idle | |
| 16 | unmount | WorkoutRoot | 0 | `completion` | label: "S&S", timeSpan: total | history:record | |

**Total expected outputs**: ~14
**Notes**:

---

## 8. Barbara — `(5) 20 Pullups / 30 Pushups / 40 Situps / 50 Squats / 3:00 Rest`

**Pattern**: Fixed-round loop with exercises AND a rest timer inside the loop
**Blocks**: `WorkoutRoot > Loop(5) > [Pullups, Pushups, Situps, Squats, Rest(3:00)]`
**State**: Loop has `round={current, total:5}`, `childIndex` over 5 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Barbara" | Root.childIndex: 0→1, push Loop | |
| 2 | mount | Loop(5) | 1 | `milestone` | rounds: 1/5 | round={1,5}, childIndex: 0→1, push Pullups | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 20 | _(leaf)_ | |
| 4 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | |
| →5 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pushups | |
| 6 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 30 | _(leaf)_ | |
| 7 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | |
| →8 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Situps | |
| 9 | mount | Situps | 2 | `segment` | effort: "Situps", reps: 40 | _(leaf)_ | |
| 10 | unmount | Situps | 2 | `completion` | effort: "Situps", timeSpan: closed | | |
| →11 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 3→4, push Squats | |
| 12 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 50 | _(leaf)_ | |
| 13 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | |
| →14 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 4→5, push Rest(3:00) | |
| 15 | mount | Rest(3:00) | 2 | `segment` | timer: 3:00 countdown, label: "Rest" | timer starts | |
| 16 | tick | Rest(3:00) | 2 | `milestone` | sound: rest-over-beep | TimerCompl: elapsed≥3:00 → markComplete | |
| 17 | unmount | Rest(3:00) | 2 | `completion` | timer: 3:00, timeSpan: closed | | |
| →18 | →next | Loop(5) | 1 | `milestone` | rounds: 2/5 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Pullups | |
| _repeat steps 3–→18 for rounds 2–5_ | | | | | | | |
| →N | →next | Loop(5) | 1 | — | _(after round 5, last child)_ | RoundAdv: round 5→6. RoundCompl: 6>5 → pop Loop | |
| N+1 | unmount | Loop(5) | 1 | `completion` | rounds: 5/5 | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Barbara", timeSpan: total | history:record | |

**Total expected outputs**: ~16 per round × 5 + root
**Notes**:

---

## 9. Nancy — `(5) 400m Run / 15 Overhead Squats 95lb`

**Pattern**: Fixed-round loop (5 rounds) with 2 exercises
**Blocks**: `WorkoutRoot > Loop(5) > [Run, OHS]`
**State**: Loop has `round={current, total:5}`, `childIndex` over 2 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Nancy" | Root.childIndex: 0→1, push Loop | |
| 2 | mount | Loop(5) | 1 | `milestone` | rounds: 1/5 | round={1,5}, childIndex: 0→1, push Run | |
| 3 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | _(leaf)_ | |
| 4 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | | |
| →5 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx<2). ChildRunner: childIndex 1→2, push OHS | |
| 6 | mount | OHS | 2 | `segment` | effort: "Overhead Squats", 95lb, reps: 15 | _(leaf)_ | |
| 7 | unmount | OHS | 2 | `completion` | effort: "Overhead Squats", timeSpan: closed | | |
| →8 | →next | Loop(5) | 1 | `milestone` | rounds: 2/5 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Run | |
| _repeat for rounds 2–5_ | | | | | | | |
| →N | →next | Loop(5) | 1 | — | _(after round 5, last child)_ | RoundAdv: round 5→6. RoundCompl: 6>5 → pop Loop | |
| N+1 | unmount | Loop(5) | 1 | `completion` | rounds: 5/5 | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Nancy", timeSpan: total | history:record | |

**Total expected outputs**: ~25
**Notes**:

---

## 10. Karen — `150 Wall Ball Shots 20lb`

**Pattern**: Single exercise, high-rep, for time
**Blocks**: `WorkoutRoot > WallBalls(150)`
**State**: Root has `childIndex` over 1 child. WallBalls is a leaf (effort block).

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Karen" | Root.childIndex: 0→1, push WallBalls | |
| 2 | mount | WallBalls | 1 | `segment` | effort: "Wall Ball Shots", 20lb, reps: 150 | _(leaf, countup timer starts)_ | |
| 3 | mount | WallBalls | 1 | `milestone` | sound: start-beep | SoundCue.onMount | |
| 4 | next | WallBalls | 1 | — | _(user completes 150 reps)_ | PopOnNext → pop WallBalls | |
| 5 | unmount | WallBalls | 1 | `completion` | effort: "Wall Ball Shots", timeSpan: closed | SegmentOutput.onUnmount | |
| 6 | unmount | WallBalls | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | |
| →7 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | |
| 8 | unmount | WorkoutRoot | 0 | `completion` | label: "Karen", timeSpan: total | history:record | |

**Total expected outputs**: ~6
**Notes**:

---

## 11. EMOM Lifting — `(15) :60 EMOM / 3 Deadlifts 315lb / 6 Hang Cleans 185lb / 9 Front Squats 135lb`

**Pattern**: EMOM with fixed rounds (15) and multiple exercises per interval
**Blocks**: `WorkoutRoot > EMOM(15×:60) > [Deadlifts, HangCleans, FrontSquats]`
**State**: EMOM has `round={current, total:15}`, `timer={countdown, :60}`, `childIndex` over 3 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "EMOM Lifting" | Root.childIndex: 0→1, push EMOM | |
| 2 | mount | EMOM(15×:60) | 1 | `segment` | timer: :60, rounds: 1/15 | round={1,15}, childIndex: 0→1, push Deadlifts | |
| 3 | mount | Deadlifts | 2 | `segment` | effort: "Deadlifts", 315lb, reps: 3 | _(leaf)_ | |
| 4 | unmount | Deadlifts | 2 | `completion` | effort: "Deadlifts", timeSpan: closed | | |
| →5 | →next | EMOM(15×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push HangCleans | |
| 6 | mount | HangCleans | 2 | `segment` | effort: "Hang Power Cleans", 185lb, reps: 6 | _(leaf)_ | |
| 7 | unmount | HangCleans | 2 | `completion` | effort: "Hang Power Cleans", timeSpan: closed | | |
| →8 | →next | EMOM(15×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push FrontSquats | |
| 9 | mount | FrontSquats | 2 | `segment` | effort: "Front Squats", 135lb, reps: 9 | _(leaf)_ | |
| 10 | unmount | FrontSquats | 2 | `completion` | effort: "Front Squats", timeSpan: closed | | |
| →11 | →next | EMOM(15×:60) | 1 | `milestone` | rounds: 2/15 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Deadlifts | |
| 12 | tick | EMOM(15×:60) | 1 | `milestone` | sound: interval-beep | TimerCompl: interval elapsed | |
| _repeat per interval_ | | | | | | | |
| N | →next | EMOM(15×:60) | 1 | — | _(after round 15, last child)_ | RoundAdv: round 15→16. RoundCompl: 16>15 → pop EMOM | |
| N+1 | unmount | EMOM(15×:60) | 1 | `completion` | rounds: 15/15, timer: 15:00 | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "EMOM Lifting", timeSpan: total | history:record | |

**Total expected outputs**: ~10 per round × 15 + root
**Notes**:

---

## 12. ABC — `(20) 1:00 / 2 Clean / 1 Press / 3 Front Squat`

**Pattern**: EMOM barbell complex — 20 intervals at 1:00
**Blocks**: `WorkoutRoot > EMOM(20×1:00) > [Clean, Press, FrontSquat]`
**State**: EMOM has `round={current, total:20}`, `timer={countdown, 1:00}`, `childIndex` over 3 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "ABC" | Root.childIndex: 0→1, push EMOM | |
| 2 | mount | EMOM(20×1:00) | 1 | `segment` | timer: 1:00, rounds: 1/20 | round={1,20}, childIndex: 0→1, push Clean | |
| 3 | mount | Clean | 2 | `segment` | effort: "Clean", reps: 2 | _(leaf)_ | |
| 4 | unmount | Clean | 2 | `completion` | effort: "Clean", timeSpan: closed | | |
| →5 | →next | EMOM(20×1:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Press | |
| 6 | mount | Press | 2 | `segment` | effort: "Press", reps: 1 | _(leaf)_ | |
| 7 | unmount | Press | 2 | `completion` | effort: "Press", timeSpan: closed | | |
| →8 | →next | EMOM(20×1:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push FrontSquat | |
| 9 | mount | FrontSquat | 2 | `segment` | effort: "Front Squat", reps: 3 | _(leaf)_ | |
| 10 | unmount | FrontSquat | 2 | `completion` | effort: "Front Squat", timeSpan: closed | | |
| →11 | →next | EMOM(20×1:00) | 1 | `milestone` | rounds: 2/20 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Clean | |
| 12 | tick | EMOM(20×1:00) | 1 | `milestone` | sound: interval-beep | TimerCompl: interval elapsed | |
| _repeat for 20 intervals_ | | | | | | | |
| N | →next | EMOM(20×1:00) | 1 | — | _(after round 20, last child)_ | RoundAdv: round 20→21. RoundCompl: 21>20 → pop EMOM | |
| N+1 | unmount | EMOM(20×1:00) | 1 | `completion` | rounds: 20/20 | | |
| →N+2 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "ABC", timeSpan: total | history:record | |

**Total expected outputs**: ~10 per round × 20 + root
**Notes**:

---

## 13. Diane — `(21-15-9) Deadlift 225lb / Handstand Pushups`

**Pattern**: Descending rep-scheme loop (same as Fran)
**Blocks**: `WorkoutRoot > Loop(21-15-9) > [Deadlift, HSPU]`
**State**: Loop has `round={current, total:3}`, `repScheme=[21,15,9]`, `childIndex` over 2 children

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Diane" | Root.childIndex: 0→1, push Loop | |
| 2 | mount | Loop(21-15-9) | 1 | `milestone` | rounds: 1/3, reps: 21 | round={1,3}, childIndex: 0→1, push Deadlift | |
| 3 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", 225lb, reps: 21 | _(leaf)_ | |
| 4 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | | |
| →5 | →next | Loop | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx<2). ChildRunner: childIndex 1→2, push HSPU | |
| 6 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 21 | _(leaf)_ | |
| 7 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | | |
| →8 | →next | Loop | 1 | `milestone` | rounds: 2/3, reps: 15 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Deadlift | |
| 9 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", 225lb, reps: 15 | _(leaf)_ | |
| 10 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | | |
| →11 | →next | Loop | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push HSPU | |
| 12 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 15 | _(leaf)_ | |
| 13 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | | |
| →14 | →next | Loop | 1 | `milestone` | rounds: 3/3, reps: 9 | RoundAdv: round 2→3. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Deadlift | |
| 15 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", 225lb, reps: 9 | _(leaf)_ | |
| 16 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | | |
| →17 | →next | Loop | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push HSPU | |
| 18 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 9 | _(leaf)_ | |
| 19 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | | |
| →20 | →next | Loop | 1 | — | _(parent receives control)_ | RoundAdv: round 3→4. RoundCompl: 4>3 → pop Loop | |
| 21 | unmount | Loop | 1 | `completion` | rounds: 3/3 | | |
| →22 | →next | WorkoutRoot | 0 | — | | ChildRunner: no more children → idle | |
| 23 | unmount | WorkoutRoot | 0 | `completion` | label: "Diane", timeSpan: total | history:record | |

**Total expected outputs**: ~18
**Notes**:  

---

## Summary: Output Patterns by Workout Type

| Workout Type | Pattern | Parent State Variables | Key `→next()` Behavior Chain |
|---|---|---|---|
| **For Time (single)** | `Root > Exercise` | Root: `childIndex` | ChildRunner only — push child, then idle |
| **For Time (rep-scheme)** | `Root > Loop(N) > Exercises` | Loop: `round`, `childIndex`, `repScheme[]` | RoundAdv → RoundCompl → ChildLoop → ChildRunner |
| **AMRAP** | `Root > AMRAP(timer) > Exercises` | AMRAP: `round` (unbounded), `timer`, `childIndex` | RoundAdv → ChildLoop (while timer runs) → ChildRunner |
| **EMOM** | `Root > EMOM(N×interval) > Exercises` | EMOM: `round` (bounded), `timer`, `childIndex` | RoundAdv → RoundCompl → ChildLoop → ChildRunner |
| **Sequential Timers** | `Root > Timer > Timer > ...` | Root: `childIndex` | ChildRunner only — push next timer sequentially |
| **Loop + Rest** | `Root > Loop(N) > [Exercises, Rest]` | Loop: `round`, `childIndex` | Same as Loop — Rest is just another child |

### State Variable Summary Per Block Type

| Block Type | `round` | `timer` | `childIndex` | Completion Trigger |
|---|---|---|---|---|
| **Effort** (leaf) | — | countup (secondary) | — | `PopOnNextBehavior` (user advance) |
| **Timer** (countdown leaf) | — | countdown (primary) | — | `TimerCompletionBehavior` (tick) |
| **Loop/Rounds** | `{current, total}` | — | `0..N` | `RoundCompletionBehavior` (current > total) |
| **AMRAP** | `{current, ∞}` | countdown | `0..N` | `TimerCompletionBehavior` (elapsed ≥ duration) |
| **EMOM** | `{current, total}` | countdown (per interval) | `0..N` | `RoundCompletionBehavior` + `TimerCompletionBehavior` |
| **WorkoutRoot** | optional | countup | `0..N` | Children exhausted or RoundCompletion |

---

## Open Questions

- [ ] Should the WorkoutRoot always emit a `segment` output on mount, or only a `completion` on unmount?
- [ ] Should rest intervals produce `segment`/`completion` pairs, or a different output type?
- [ ] For descending rep-schemes, does the rep count fragment get updated per-round on the milestone or on the child exercise segment?
- [ ] When an AMRAP timer expires mid-exercise, does the current exercise get a `completion` output with partial time?
- [ ] Should sound cue `milestone` outputs be counted separately or are they decorative/optional?
- [ ] For EMOM workouts, is the interval beep a separate `milestone` from the round advance `milestone`?
- [ ] Do exercises inside EMOM intervals always get mount/unmount, or can they bypass when the user doesn't advance?

---

## Validation Checklist

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
