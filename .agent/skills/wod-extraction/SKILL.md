---
name: wod-extraction
description: 'Extract and convert any workout description into WOD Wiki syntax. Understands workout intent to determine which metrics to collect (time, reps, distance, weight) based on the workout type and structure.'
license: MIT
---

# WOD Extraction — Converting Workouts to Whiteboard Script

## Overview

Take any workout description — from a whiteboard photo, a coach's programming post, a competition event description, or a casual text message — and produce well-formed WOD Wiki syntax that captures both the workout structure and the **implied measurements** the athlete cares about.

## When to Use

Use this skill when:

- A user provides a workout in plain English (or any natural language) and wants it converted to WOD Wiki syntax
- A user asks to "write this workout in wod syntax" or "encode this workout"
- A competition workout needs to be transcribed into the project's `wod/` library
- The user wants help understanding what metrics a workout is tracking

---

## Core Concept: What Does the Athlete Want to Measure?

Every workout implies what should be measured. Encode both the prescription AND the collectible metrics.

| Workout Intent | Athlete Measures | Syntax Signal |
|---|---|---|
| "For Time" | Time to complete | Reps/distance prescribed; time tracked automatically |
| "AMRAP in X minutes" | Rounds completed | `20:00 AMRAP` with prescribed exercises |
| "EMOM for X minutes" | Completion per interval | `(N) :60 EMOM` with `+` children |
| "Run for 20 minutes" | Distance covered | Fixed timer + `?m` |
| "Run 5K" | Time it took | `5km Run`; time tracked automatically |
| "Work up to a heavy single" | Weight achieved | `?lb` / `?kg` |
| "Max reps in 1 minute" | Reps performed | Fixed timer + `?` |

### Collectible Rule

**Prescribed** (given to athlete) → write literally. **Outcome** (athlete discovers) → use `?` placeholder.

| Symbol | Meaning |
|---|---|
| `?` | collectible reps |
| `:?` | collectible timer |
| `^:?` | collectible count-up timer |
| `?lb` / `?kg` | collectible resistance |
| `?m` / `?mile` / `?km` | collectible distance |

---

## Whiteboard Script Reference

### Statement Structure

```
[group-prefix] [rounds] [timer] [reps] [effort] [resistance] [distance] [action]
```

Indentation creates parent-child relationships.

### Fragments

**Timer**
```
5:00    → 5 min countdown      :30     → 30 sec
1:30    → 1 min 30 sec         ^5:00   → 5 min count-up
:?      → collectible timer    ^:?     → collectible count-up
```

**Reps**
```
21      → 21 reps (when preceding an effort)
?       → collectible reps
```

**Effort** — exercise name, `Rest`, `AMRAP`, `EMOM`, etc.

**Resistance**
```
95lb    32kg    bw    1.5bw    ?lb    ?kg    @135lb
```

**Distance**
```
400m    1000m    1mile    5km    ?m    ?mile    ?km
```

**Rounds**
```
(3)              → 3 rounds
(21-15-9)        → 3 rounds with rep scheme 21, 15, 9
(10-9-8-…-1)     → descending rounds
```

**Group Prefix**
```
-    → "round": children run sequentially as separate steps
+    → "compose": children bundled into one set (EMOMs, complexes, supersets)
```
No prefix = default repeat group.

**Actions**
```
[:action-name]    [:!pinned]
```

### Indentation

```wod
(3)                   ← parent: 3 rounds
  400m Run            ← child (implicit repeat)
  21 KB Swings 53lb
  12 Pullups
```

---

## Conversion Patterns

### For Time
Input: `Fran: 21-15-9 Thrusters (95lb) and Pullups, for time`
```wod
(21-15-9)
  Thrusters 95lb
  Pullups
```
Time tracked automatically; no `:?` needed.

### AMRAP
Input: `20-minute AMRAP: 5 pullups, 10 pushups, 15 air squats`
```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```

### EMOM
Input: `EMOM 30 minutes: 5 pullups, 10 pushups, 15 air squats`
```wod
(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```

### Intervals with Rest
Input: `4 rounds of 100m swim with 30 seconds rest`
```wod
(4)
  100m Swim
  :30 Rest
```

### Single Modality For Time
Input: `150 wall ball shots at 20lb, for time`
```wod
150 Wall Ball Shots 20lb
```

### Distance-Based For Time
Input: `Row 1000m, 50 thrusters 45lb, 30 pullups — for time`
```wod
1000m Row
50 Thrusters 45lb
30 Pullups
```

### Max Weight
Input: `Work up to a 1-rep max clean & jerk`
```wod
1 Clean & Jerk ?lb
```

### Max Reps in Time Domain
Input: `In 1 minute, as many pushups as possible`
```wod
1:00 ? Pushups
```

### Run for Time, Measure Distance
Input: `Run for 20 minutes, record distance`
```wod
20:00 ?m Run
```

### Run a Distance, Measure Time
Input: `Run 5K for time`
```wod
5km Run
```

### EMOM Complex
Input: `EMOM 20 minutes: 2 cleans, 1 press, 3 front squats`
```wod
(20) 1:00
  + 2 Clean
  + 1 Press
  + 3 Front Squat
```

### Descending Reps
Input: `21-15-9 deadlifts at 225lb and handstand pushups`
```wod
(21-15-9)
  Deadlift 225lb
  Handstand Pushups
```

### Multi-Section Workout
Input: `Warmup: 4x100m swim/30s rest. Main: 8x50m kick/30s rest. Cooldown: 400m easy.`
```wod
(4) Warmup
  100m Swim
  :30 Rest

(8)
  50m Kick
  :30 Rest

400m Cooldown
```

### Rest Between Rounds
Input: `5 rounds: 20 pullups, 30 pushups, 40 situps, 50 air squats. Rest 3 min between.`
```wod
(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest
```

### Bodyweight Loads
Input: `10-9-8…1 Deadlift 1.5BW, Bench BW, Clean 0.75BW`
```wod
(10-9-8-7-6-5-4-3-2-1)
  Deadlift 1.5bw
  Bench Press 1bw
  Clean 0.75bw
```

### Timed Sections
Input: `5 min: 100 KB Swings 70lb. 1 min rest. 10 min: 10 Turkish Getups 70lb.`
```wod
5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb
```

### Tabata
Input: `Tabata air squats (8 rounds: 20 sec on, 10 sec off). Record lowest round.`
```wod
(8)
  :20 ? Air Squats
  :10 Rest
```

### Left/Right Asymmetry
Write separate lines per side:
```wod
(20)
  + 1 Clean & Press Left
  + 1 Clean & Press Right
  + 2 Front Squat Right
```

---

## Decision Framework

### Step 1: Identify Workout Type

| Clue | Type | Key Syntax |
|---|---|---|
| "For time" | For Time | Reps/distance prescribed, time implicit |
| "AMRAP" | AMRAP | `XX:00 AMRAP` |
| "EMOM" | EMOM | `(N) :60 EMOM` + `+` children |
| "Max reps" | Max Reps | Fixed timer + `?` |
| "Max weight", "heavy", "1RM" | Max Weight | Exercise + `?lb`/`?kg` |
| "For distance", "run/row for X min" | For Distance | Fixed timer + `?m` |
| "Tabata" | Tabata | `(8) :20` + `:10 Rest` |

### Step 2: Prescribed vs Collected

| Element | Prescribed | Collected |
|---|---|---|
| Time | `5:00`, `20:00` | `:?`, `^:?` |
| Reps | `21`, `15` | `?` |
| Weight | `95lb`, `32kg` | `?lb`, `?kg` |
| Distance | `400m`, `5km` | `?m`, `?km` |

### Step 3: Grouping

- Sequential exercises (one at a time): no prefix
- Composed/complex/superset (done together): `+` prefix
- In rounds: indent under `(N)` parent

---

## Common Mistakes

| ❌ Don't | ✅ Do |
|---|---|
| `Warmup:` (colon = timer syntax) | `Warmup` |
| `Child's Pose` (apostrophe in name) | `Childs Pose` |
| `# Header` inside wod block | Put headers outside the code fence |
| `[Rest] 2:00` (brackets = actions) | `2:00 Rest` |
| `:?` on a for-time workout (redundant) | Omit — time tracked automatically |
| `+ 400m Run` in sequential rounds | No prefix for sequential exercises |
| `21 Thrusters` under `(21-15-9)` | Omit reps — rounds define the scheme |
| `95` with no unit | `95lb` |
| `For Time` as an effort name | Omit — time tracking is implicit |

---

## Output Format

````markdown
# Workout Name

**Category**: [CrossFit Benchmark | StrongFirst | Competition | Custom]  
**Type**: [For Time | AMRAP | EMOM | Max Weight | Intervals]  
**Difficulty**: [Beginner | Intermediate | Advanced]

## Description
[Brief description]

```wod
[WOD Wiki syntax]
```

## Collectible Metrics
- [What this workout measures and why]
````
