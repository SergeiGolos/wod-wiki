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

- **Step** — sequential execution step number  
- **Event** — lifecycle trigger (`mount`, `next`, `tick`, `unmount`)  
- **Block** — which runtime block is active  
- **Stack** — runtime stack state `[root > child > ...]`  
- **Output Type** — expected `OutputStatementType`  
- **Fragments** — key fragments on the output  
- **Expected?** — ✅ confirmed / ❓ needs validation / ❌ known gap  

Fill in the **Expected?** column as you validate each step.

---

## 1. Fran — `(21-15-9) Thrusters 95lb / Pullups`

**Pattern**: Descending rep-scheme loop (3 rounds: 21, 15, 9) with child exercises  
**Blocks**: `WorkoutRoot > Loop(21-15-9) > [Thrusters, Pullups]`

| Step | Event   | Block         | Stack Depth | Output Type  | Fragments                                                                     | Expected? |
| ---: | ------- | ------------- | ----------: | ------------ | ----------------------------------------------------------------------------- | --------- |
|    1 | mount   | WorkoutRoot   |           0 | `segment`    | label: "Fran"                                                                 |           |
|    2 | mount   | Loop(21-15-9) |           1 | `milestone`  | rounds: 1/3, reps: 21                                                         |           |
|      |         |               |             |              |                                                                               |           |
|    3 | mount   | Thrusters     |           2 | `segment`    | effort: "Thrusters", resistance: "95lb", reps: 21<br>--next child push action |           |
|    5 | next    | Thrusters     |           2 | —            | _(user completes thrusters)_                                                  |           |
|    6 | unmount | Thrusters     |           2 | `completion` | effort: "Thrusters", timeSpan: closed                                         |           |
|      | mext    | Loop(21-15-9) |             |              | --next child push action                                                      |           |
|    7 | mount   | Pullups       |           2 | `segment`    | effort: "Pullups", reps: 21                                                   |           |
|    8 | next    | Pullups       |           2 | —            | _(user completes pullups)_                                                    |           |
|    9 | unmount | Pullups       |           2 | `completion` | effort: "Pullups", timeSpan: closed                                           |           |
|   10 | next    | Loop(21-15-9) |           1 | `milestone`  | rounds: 2/3, reps: 15<br>--next child push action                             |           |
|   11 | mount   | Thrusters     |           2 | `segment`    | effort: "Thrusters", resistance: "95lb", reps: 15                             |           |
|   12 | unmount | Thrusters     |           2 | `completion` | effort: "Thrusters", timeSpan: closed                                         |           |
|   13 | mount   | Pullups       |           2 | `segment`    | effort: "Pullups", reps: 15                                                   |           |
|   14 | unmount | Pullups       |           2 | `completion` | effort: "Pullups", timeSpan: closed                                           |           |
|   15 | next    | Loop(21-15-9) |           1 | `milestone`  | rounds: 3/3, reps: 9                                                          |           |
|   16 | mount   | Thrusters     |           2 | `segment`    | effort: "Thrusters", resistance: "95lb", reps: 9                              |           |
|   17 | unmount | Thrusters     |           2 | `completion` | effort: "Thrusters", timeSpan: closed                                         |           |
|   18 | mount   | Pullups       |           2 | `segment`    | effort: "Pullups", reps: 9                                                    |           |
|   19 | unmount | Pullups       |           2 | `completion` | effort: "Pullups", timeSpan: closed                                           |           |
|   20 | unmount | Loop(21-15-9) |           1 | `completion` | rounds: 3/3 complete                                                          |           |
|   21 | unmount | WorkoutRoot   |           0 | `completion` | label: "Fran", timeSpan: total                                                |           |

**Total expected outputs**: ~21  
**Notes**:  

---

## 2. Cindy — `20:00 AMRAP / 5 Pullups / 10 Pushups / 15 Air Squats`

**Pattern**: Timed AMRAP with unbounded rounds, 3 exercises per round  
**Blocks**: `WorkoutRoot > AMRAP(20:00) > [Pullups, Pushups, Squats]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Cindy" | |
| 2 | mount | AMRAP(20:00) | 1 | `segment` | timer: 20:00 countdown, rounds: unbounded | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | |
| 4 | next | Pullups → unmount | 2 | `completion` | effort: "Pullups", timeSpan: closed | |
| 5 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | |
| 6 | next | Pushups → unmount | 2 | `completion` | effort: "Pushups", timeSpan: closed | |
| 7 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | |
| 8 | next | Squats → unmount | 2 | `completion` | effort: "Air Squats", timeSpan: closed | |
| 9 | next | AMRAP(20:00) | 1 | `milestone` | rounds: 2 (no cap) | |
| _repeat 3–8 per round_ | | | | | | |
| N | tick (20:00 expires) | AMRAP(20:00) | 1 | `milestone` | sound: completion-beep | |
| N+1 | unmount | AMRAP(20:00) | 1 | `completion` | timer: 20:00, rounds: final count | |
| N+2 | unmount | WorkoutRoot | 0 | `completion` | label: "Cindy", timeSpan: total | |

**Total expected outputs**: 3 per round × N rounds + root overhead  
**Notes**:  

---

## 3. Grace — `30 Clean & Jerk 135lb`

**Pattern**: Single exercise, fixed rep count, for time  
**Blocks**: `WorkoutRoot > CleanAndJerk(30)`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Grace" | |
| 2 | mount | CleanAndJerk | 1 | `segment` | effort: "Clean & Jerk", resistance: "135lb", reps: 30 | |
| 3 | mount | CleanAndJerk | 1 | `milestone` | sound: start-beep | |
| 4 | next | CleanAndJerk | 1 | — | _(user completes all 30 reps)_ | |
| 5 | unmount | CleanAndJerk | 1 | `completion` | effort: "Clean & Jerk", timeSpan: closed | |
| 6 | unmount | CleanAndJerk | 1 | `milestone` | sound: completion-beep | |
| 7 | unmount | WorkoutRoot | 0 | `completion` | label: "Grace", timeSpan: total | |

**Total expected outputs**: ~7  
**Notes**:  

---

## 4. Helen — `(3) 400m Run / 21 KB Swings 53lb / 12 Pullups`

**Pattern**: Fixed-round loop (3 rounds) with 3 exercises per round  
**Blocks**: `WorkoutRoot > Loop(3) > [Run, KBSwings, Pullups]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Helen" | |
| 2 | mount | Loop(3) | 1 | `segment` | rounds: 1/3 | |
| 3 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | |
| 4 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | |
| 5 | mount | KBSwings | 2 | `segment` | effort: "KB Swings", resistance: "53lb", reps: 21 | |
| 6 | unmount | KBSwings | 2 | `completion` | effort: "KB Swings", timeSpan: closed | |
| 7 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 12 | |
| 8 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | |
| 9 | next | Loop(3) | 1 | `milestone` | rounds: 2/3 | |
| _repeat 3–8 for rounds 2 and 3_ | | | | | | |
| 20 | unmount | Loop(3) | 1 | `completion` | rounds: 3/3 complete | |
| 21 | unmount | WorkoutRoot | 0 | `completion` | label: "Helen", timeSpan: total | |

**Total expected outputs**: ~21 (7 per round × 3 + root)  
**Notes**:  

---

## 5. Chelsea — `(30) :60 EMOM / 5 Pullups / 10 Pushups / 15 Air Squats`

**Pattern**: EMOM with fixed rounds (30) and interval timer (:60)  
**Blocks**: `WorkoutRoot > EMOM(30×:60) > [Pullups, Pushups, Squats]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Chelsea" | |
| 2 | mount | EMOM(30×:60) | 1 | `segment` | timer: :60 countdown, rounds: 1/30 | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | |
| 4 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | |
| 5 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | |
| 6 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | |
| 7 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | |
| 8 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | |
| 9 | tick (:60 expires) | EMOM(30×:60) | 1 | `milestone` | sound: interval-beep | |
| 10 | next | EMOM(30×:60) | 1 | `milestone` | rounds: 2/30 | |
| _repeat 3–10 per interval_ | | | | | | |
| N | unmount | EMOM(30×:60) | 1 | `completion` | rounds: 30/30, timer: 30:00 | |
| N+1 | unmount | WorkoutRoot | 0 | `completion` | label: "Chelsea", timeSpan: total | |

**Total expected outputs**: ~8 per round × 30 + root  
**Notes**:  

---

## 6. Annie — `(50-40-30-20-10) Double-Unders / Situps`

**Pattern**: Descending rep-scheme loop (5 rounds: 50, 40, 30, 20, 10)  
**Blocks**: `WorkoutRoot > Loop(50-40-30-20-10) > [DoubleUnders, Situps]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Annie" | |
| 2 | mount | Loop(50-40-30-20-10) | 1 | `segment` | rounds: 1/5, reps: 50 | |
| 3 | mount | DoubleUnders | 2 | `segment` | effort: "Double-Unders", reps: 50 | |
| 4 | unmount | DoubleUnders | 2 | `completion` | effort: "Double-Unders", timeSpan: closed | |
| 5 | mount | Situps | 2 | `segment` | effort: "Situps", reps: 50 | |
| 6 | unmount | Situps | 2 | `completion` | effort: "Situps", timeSpan: closed | |
| 7 | next | Loop | 1 | `milestone` | rounds: 2/5, reps: 40 | |
| _repeat for rounds 3 (30), 4 (20), 5 (10)_ | | | | | | |
| 22 | unmount | Loop | 1 | `completion` | rounds: 5/5 complete | |
| 23 | unmount | WorkoutRoot | 0 | `completion` | label: "Annie", timeSpan: total | |

**Total expected outputs**: ~23 (4 per round × 5 + root + round milestones)  
**Notes**:  

---

## 7. Simple and Sinister — `5:00 100 KB Swings / 1:00 Rest / 10:00 10 Turkish Getups`

**Pattern**: Sequential timed segments (timer → rest → timer)  
**Blocks**: `WorkoutRoot > [Timer(5:00, KBSwings), Rest(1:00), Timer(10:00, TGU)]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Simple and Sinister" | |
| 2 | mount | Timer(5:00) | 1 | `segment` | timer: 5:00 countdown, effort: "KB Swings", reps: 100, resistance: "70lb" | |
| 3 | mount | Timer(5:00) | 1 | `milestone` | sound: start-beep | |
| 4 | tick (5:00 expires) | Timer(5:00) | 1 | `milestone` | sound: completion-beep | |
| 5 | unmount | Timer(5:00) | 1 | `completion` | timer: 5:00, effort: "KB Swings", timeSpan: closed | |
| 6 | mount | Rest(1:00) | 1 | `segment` | timer: 1:00 countdown, label: "Rest" | |
| 7 | tick (1:00 expires) | Rest(1:00) | 1 | `milestone` | sound: completion-beep | |
| 8 | unmount | Rest(1:00) | 1 | `completion` | timer: 1:00, timeSpan: closed | |
| 9 | mount | Timer(10:00) | 1 | `segment` | timer: 10:00 countdown, effort: "Turkish Getups", reps: 10, resistance: "70lb" | |
| 10 | mount | Timer(10:00) | 1 | `milestone` | sound: start-beep | |
| 11 | tick (10:00 expires) | Timer(10:00) | 1 | `milestone` | sound: completion-beep | |
| 12 | unmount | Timer(10:00) | 1 | `completion` | timer: 10:00, effort: "Turkish Getups", timeSpan: closed | |
| 13 | unmount | WorkoutRoot | 0 | `completion` | label: "S&S", timeSpan: total | |

**Total expected outputs**: ~13  
**Notes**:  

---

## 8. Barbara — `(5) 20 Pullups / 30 Pushups / 40 Situps / 50 Squats / 3:00 Rest`

**Pattern**: Fixed-round loop with exercises AND a rest timer inside the loop  
**Blocks**: `WorkoutRoot > Loop(5) > [Pullups, Pushups, Situps, Squats, Rest(3:00)]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Barbara" | |
| 2 | mount | Loop(5) | 1 | `segment` | rounds: 1/5 | |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 20 | |
| 4 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | |
| 5 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 30 | |
| 6 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | |
| 7 | mount | Situps | 2 | `segment` | effort: "Situps", reps: 40 | |
| 8 | unmount | Situps | 2 | `completion` | effort: "Situps", timeSpan: closed | |
| 9 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 50 | |
| 10 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | |
| 11 | mount | Rest(3:00) | 2 | `segment` | timer: 3:00 countdown, label: "Rest" | |
| 12 | tick (3:00 expires) | Rest(3:00) | 2 | `milestone` | sound: rest-over-beep | |
| 13 | unmount | Rest(3:00) | 2 | `completion` | timer: 3:00, timeSpan: closed | |
| 14 | next | Loop(5) | 1 | `milestone` | rounds: 2/5 | |
| _repeat 3–14 for rounds 2–5_ | | | | | | |
| N | unmount | Loop(5) | 1 | `completion` | rounds: 5/5 | |
| N+1 | unmount | WorkoutRoot | 0 | `completion` | label: "Barbara", timeSpan: total | |

**Total expected outputs**: ~12 per round × 5 + root  
**Notes**:  

---

## 9. Nancy — `(5) 400m Run / 15 Overhead Squats 95lb`

**Pattern**: Fixed-round loop (5 rounds) with 2 exercises  
**Blocks**: `WorkoutRoot > Loop(5) > [Run, OHS]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Nancy" | |
| 2 | mount | Loop(5) | 1 | `segment` | rounds: 1/5 | |
| 3 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | |
| 4 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | |
| 5 | mount | OHS | 2 | `segment` | effort: "Overhead Squats", resistance: "95lb", reps: 15 | |
| 6 | unmount | OHS | 2 | `completion` | effort: "Overhead Squats", timeSpan: closed | |
| 7 | next | Loop(5) | 1 | `milestone` | rounds: 2/5 | |
| _repeat for rounds 2–5_ | | | | | | |
| 22 | unmount | Loop(5) | 1 | `completion` | rounds: 5/5 | |
| 23 | unmount | WorkoutRoot | 0 | `completion` | label: "Nancy", timeSpan: total | |

**Total expected outputs**: ~23  
**Notes**:  

---

## 10. Karen — `150 Wall Ball Shots 20lb`

**Pattern**: Single exercise, high-rep, for time  
**Blocks**: `WorkoutRoot > WallBalls(150)`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Karen" | |
| 2 | mount | WallBalls | 1 | `segment` | effort: "Wall Ball Shots", resistance: "20lb", reps: 150 | |
| 3 | mount | WallBalls | 1 | `milestone` | sound: start-beep | |
| 4 | next | WallBalls | 1 | — | _(user completes 150 reps)_ | |
| 5 | unmount | WallBalls | 1 | `completion` | effort: "Wall Ball Shots", timeSpan: closed | |
| 6 | unmount | WallBalls | 1 | `milestone` | sound: completion-beep | |
| 7 | unmount | WorkoutRoot | 0 | `completion` | label: "Karen", timeSpan: total | |

**Total expected outputs**: ~7  
**Notes**:  

---

## 11. EMOM Lifting — `(15) :60 EMOM / 3 Deadlifts 315lb / 6 Hang Cleans 185lb / 9 Front Squats 135lb`

**Pattern**: EMOM with fixed rounds (15) and multiple exercises per interval  
**Blocks**: `WorkoutRoot > EMOM(15×:60) > [Deadlifts, HangCleans, FrontSquats]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "EMOM Lifting" | |
| 2 | mount | EMOM(15×:60) | 1 | `segment` | timer: :60, rounds: 1/15 | |
| 3 | mount | Deadlifts | 2 | `segment` | effort: "Deadlifts", resistance: "315lb", reps: 3 | |
| 4 | unmount | Deadlifts | 2 | `completion` | effort: "Deadlifts", timeSpan: closed | |
| 5 | mount | HangCleans | 2 | `segment` | effort: "Hang Power Cleans", resistance: "185lb", reps: 6 | |
| 6 | unmount | HangCleans | 2 | `completion` | effort: "Hang Power Cleans", timeSpan: closed | |
| 7 | mount | FrontSquats | 2 | `segment` | effort: "Front Squats", resistance: "135lb", reps: 9 | |
| 8 | unmount | FrontSquats | 2 | `completion` | effort: "Front Squats", timeSpan: closed | |
| 9 | tick (:60 expires) | EMOM | 1 | `milestone` | sound: interval-beep | |
| 10 | next | EMOM | 1 | `milestone` | rounds: 2/15 | |
| _repeat 3–10 for 15 intervals_ | | | | | | |
| N | unmount | EMOM(15×:60) | 1 | `completion` | rounds: 15/15, timer: 15:00 | |
| N+1 | unmount | WorkoutRoot | 0 | `completion` | label: "EMOM Lifting", timeSpan: total | |

**Total expected outputs**: ~10 per round × 15 + root  
**Notes**:  

---

## 12. ABC — `(20) 1:00 / 2 Clean / 1 Press / 3 Front Squat`

**Pattern**: EMOM barbell complex — 20 intervals at 1:00  
**Blocks**: `WorkoutRoot > EMOM(20×1:00) > [Clean, Press, FrontSquat]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "ABC" | |
| 2 | mount | EMOM(20×1:00) | 1 | `segment` | timer: 1:00, rounds: 1/20 | |
| 3 | mount | Clean | 2 | `segment` | effort: "Clean", reps: 2 | |
| 4 | unmount | Clean | 2 | `completion` | effort: "Clean", timeSpan: closed | |
| 5 | mount | Press | 2 | `segment` | effort: "Press", reps: 1 | |
| 6 | unmount | Press | 2 | `completion` | effort: "Press", timeSpan: closed | |
| 7 | mount | FrontSquat | 2 | `segment` | effort: "Front Squat", reps: 3 | |
| 8 | unmount | FrontSquat | 2 | `completion` | effort: "Front Squat", timeSpan: closed | |
| 9 | tick (1:00 expires) | EMOM | 1 | `milestone` | sound: interval-beep | |
| 10 | next | EMOM | 1 | `milestone` | rounds: 2/20 | |
| _repeat for 20 intervals_ | | | | | | |
| N | unmount | EMOM(20×1:00) | 1 | `completion` | rounds: 20/20 | |
| N+1 | unmount | WorkoutRoot | 0 | `completion` | label: "ABC", timeSpan: total | |

**Total expected outputs**: ~10 per round × 20 + root  
**Notes**:  

---

## 13. Diane — `(21-15-9) Deadlift 225lb / Handstand Pushups`

**Pattern**: Descending rep-scheme loop (same as Fran)  
**Blocks**: `WorkoutRoot > Loop(21-15-9) > [Deadlift, HSPU]`

| Step | Event | Block | Stack Depth | Output Type | Fragments | Expected? |
|---:|---|---|---:|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Diane" | |
| 2 | mount | Loop(21-15-9) | 1 | `segment` | rounds: 1/3, reps: 21 | |
| 3 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", resistance: "225lb", reps: 21 | |
| 4 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | |
| 5 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 21 | |
| 6 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | |
| 7 | next | Loop | 1 | `milestone` | rounds: 2/3, reps: 15 | |
| 8 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", resistance: "225lb", reps: 15 | |
| 9 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | |
| 10 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 15 | |
| 11 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | |
| 12 | next | Loop | 1 | `milestone` | rounds: 3/3, reps: 9 | |
| 13 | mount | Deadlift | 2 | `segment` | effort: "Deadlift", resistance: "225lb", reps: 9 | |
| 14 | unmount | Deadlift | 2 | `completion` | effort: "Deadlift", timeSpan: closed | |
| 15 | mount | HSPU | 2 | `segment` | effort: "Handstand Pushups", reps: 9 | |
| 16 | unmount | HSPU | 2 | `completion` | effort: "Handstand Pushups", timeSpan: closed | |
| 17 | unmount | Loop | 1 | `completion` | rounds: 3/3 | |
| 18 | unmount | WorkoutRoot | 0 | `completion` | label: "Diane", timeSpan: total | |

**Total expected outputs**: ~18  
**Notes**:  

---

## Summary: Output Patterns by Workout Type

| Workout Type | Pattern | Outputs per Round | Key Behaviors |
|---|---|---|---|
| **For Time (single)** | `Root > Exercise` | ~3 (segment + completion + sounds) | SegmentOutput, SoundCue |
| **For Time (rep-scheme)** | `Root > Loop(N) > Exercises` | 2 per exercise + 1 milestone | SegmentOutput, RoundOutput, SoundCue |
| **AMRAP** | `Root > AMRAP(timer) > Exercises` | 2 per exercise + round milestone | SegmentOutput, RoundOutput, TimerCompletion, SoundCue |
| **EMOM** | `Root > EMOM(N×interval) > Exercises` | 2 per exercise + interval beep + round | SegmentOutput, RoundOutput, TimerCompletion, SoundCue |
| **Sequential Timers** | `Root > Timer > Timer > ...` | ~3 per segment | SegmentOutput, TimerCompletion, SoundCue |
| **Loop + Rest** | `Root > Loop(N) > [Exercises, Rest]` | 2 per exercise + rest segment + milestone | SegmentOutput, RoundOutput, TimerCompletion |

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
