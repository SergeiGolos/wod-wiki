---
title: "JIT Compiler Fragment Combinations Guide"
date: 2025-06-30
tags: [jit-compiler, fragments, examples, runtime]
implements: ../Core/Runtime/JitCompiler.md
related: ["../Core/ICodeFragment.md", "./scriptruntime-stack-fix.md"]
status: complete
---

# JIT Compiler Fragment Combinations Guide

## Design Reference
This guide demonstrates the various fragment combinations that the [JIT Compiler](../Core/Runtime/JitCompiler.md) can process, based on the [ICodeFragment](../Core/ICodeFragment.md) specifications. All examples shown here are available in both the **Runtime/Overview** stories (for JIT Compiler behavior) and the **Parser/Overview** stories (for parsing behavior).

## Story Coverage
- **Runtime/Overview Stories**: Show how the JIT Compiler processes fragments and manages the runtime stack
- **Parser/Overview Stories**: Show how the parser identifies and breaks down fragments from workout script text

## Fragment Types Overview

### Core Fragment Types
- **Timer**: Time-based elements (`30s`, `20:00`, `:60`)
- **Rep**: Repetition counts (`10`, `21-15-9`, `(5)`)
- **Action**: Exercise names (`Burpees`, `Pullups`, `Deadlifts`)
- **Resistance**: Weight/load (`95lb`, `225lb`, `53lb`)
- **Distance**: Measurement (`400m`, `1 mile`)
- **Rounds**: Round structures (`(5)`, `(21-15-9)`)
- **Increment**: Rep modifiers (`+`, `-`)

## Single Statement Examples

### Basic Combinations

#### Rep + Action
```
10 Burpees
```
**Fragments**: `RepFragment(10)` + `ActionFragment(Burpees)`
**Description**: Simple rep-based exercise

#### Rep + Action + Resistance
```
5 Deadlifts 225lb
```
**Fragments**: `RepFragment(5)` + `ActionFragment(Deadlifts)` + `ResistanceFragment(225lb)`
**Description**: Weighted exercise with specific rep count

#### Timer + Action
```
30s Plank Hold
```
**Fragments**: `TimerFragment(30s)` + `ActionFragment(Plank Hold)`
**Description**: Time-based exercise

#### Distance + Action
```
400m Run
```
**Fragments**: `DistanceFragment(400m)` + `ActionFragment(Run)`
**Description**: Distance-based exercise

#### Timer + Action + Resistance
```
45s KB Swings 53lb
```
**Fragments**: `TimerFragment(45s)` + `ActionFragment(KB Swings)` + `ResistanceFragment(53lb)`
**Description**: Timed weighted exercise

#### Action Only
```
[Rest]
```
**Fragments**: `ActionFragment(Rest)`
**Description**: Special action or transition

## Grouped Workout Patterns

### Basic Round Structure
```
(5)
  20 Pullups
  30 Pushups
  40 Situps
```
**Fragments**: `RoundsFragment(5)` + Multiple statements with `RepFragment` + `ActionFragment`
**Description**: Fixed rounds with multiple exercises

### With Rest Between Rounds
```
(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  3:00 Rest
```
**Fragments**: `RoundsFragment(5)` + `IncrementFragment(+)` + Exercises + `TimerFragment(3:00)` + `ActionFragment(Rest)`
**Description**: Grouped workout with structured rest periods

## Rep Scheme Variations (x-x-x)

### Descending Rep Scheme
```
(21-15-9) 
  Thrusters 95lb
  Pullups
```
**Fragments**: `RoundsFragment(21-15-9)` + Multiple statements
**Description**: Classic CrossFit descending rep pattern

### Ascending Rep Scheme
```
(9-15-21)
  Box Jumps 24"
  Push Presses 75lb
```
**Fragments**: `RoundsFragment(9-15-21)` + Exercises with resistance
**Description**: Ascending difficulty pattern

### Pyramid Rep Scheme
```
(1-2-3-4-5)
  Muscle-ups
  Handstand Pushups
```
**Fragments**: `RoundsFragment(1-2-3-4-5)` + High-skill exercises
**Description**: Progressive pyramid structure

### Complex Rep Scheme
```
(50-40-30-20-10)
  Double-Unders
  Situps
```
**Fragments**: `RoundsFragment(50-40-30-20-10)` + High-volume exercises
**Description**: Extended descending pattern

## EMOM (Every Minute on the Minute)

### Single Exercise EMOM
```
(12) :60 EMOM
  5 Burpees
```
**Fragments**: `RoundsFragment(12)` + `TimerFragment(:60)` + `ActionFragment(EMOM)` + Exercise
**Description**: Simple EMOM structure

### Multiple Exercise EMOM
```
(15) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```
**Fragments**: EMOM structure + `IncrementFragment(+)` + Multiple exercises
**Description**: Complex EMOM with multiple movements

### Complex EMOM with Varying Reps
```
(20) :60 EMOM
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb
```
**Fragments**: EMOM + Progressive rep counts + Varying resistance
**Description**: Strength-focused EMOM with compound movements

## Rep Type Variations

### Addition (+)
```
(3)
  + 5 Pullups
  + 10 Pushups
  + 15 Squats
```
**Fragments**: `IncrementFragment(+)` before each exercise
**Description**: Additive structure indicating cumulative or sequential work

### Subtraction (-)
```
(3)
  - 20 Burpees
  - 15 Box Jumps
  - 10 Muscle-ups
```
**Fragments**: `IncrementFragment(-)` before each exercise
**Description**: Subtractive structure, often used for descending ladders

### None (Standard)
```
(5)
  10 Thrusters 95lb
  15 Pullups
  20 Box Jumps
```
**Fragments**: No increment fragments, standard rep structure
**Description**: Basic round structure without modifiers

### Mixed (+/-/none)
```
(4)
  + 5 Strict Pullups
  10 Regular Pushups
  - 15 Jumping Squats
```
**Fragments**: Mixed `IncrementFragment` types within same workout
**Description**: Complex structure with varied rep modifiers

## Timer Patterns

### Countdown Timer (AMRAP)
```
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```
**Fragments**: `TimerFragment(20:00)` + `ActionFragment(AMRAP)` + Exercises
**Description**: As Many Reps As Possible within time limit

### Countdown Timer (Tabata Style)
```
(8) 20s/10s
  Burpees
```
**Fragments**: `RoundsFragment(8)` + `TimerFragment(20s/10s)` + Exercise
**Description**: High-intensity interval training pattern

### Count Up Timer (For Time)
```
For Time:
  100 Burpees
  75 Situps
  50 Pushups
  25 Handstand Pushups
```
**Fragments**: `ActionFragment(For Time)` + High-volume exercises
**Description**: Complete workout as fast as possible

### Mixed Timing (Count Down + Count Up)
```
15:00 Time Cap
  For Time:
  (21-15-9)
  Deadlifts 225lb
  Handstand Pushups
```
**Fragments**: `TimerFragment(15:00)` + `ActionFragment(Time Cap)` + For Time structure + Rep scheme
**Description**: Time-capped workout with internal timing structure

### Interval Training
```
(5)
  4:00 Work
  + 20 Thrusters 95lb
  + 30 Pullups
  2:00 Rest
```
**Fragments**: Rounds + Work/Rest timer structure + Exercises
**Description**: Structured work-to-rest ratio training

## JIT Compiler Processing

### Fragment Compilation Order
1. **Parse Statement**: Break down text into individual fragments
2. **Identify Types**: Classify each fragment by type (Timer, Rep, Action, etc.)
3. **Create Runtime Metrics**: Convert fragments into executable metrics
4. **Apply Inheritance**: Use parent block context for metric inheritance
5. **Generate Runtime Blocks**: Create appropriate block types for execution

### Block Strategy Selection
The JIT Compiler uses different strategies based on fragment combinations:
- **Timer + Action** → `TimerRuntimeBlock`
- **Rep + Action** → `EffortRuntimeBlock`  
- **Rounds + Exercises** → `GroupRuntimeBlock`
- **EMOM Pattern** → `EMOMRuntimeBlock`
- **AMRAP Pattern** → `AMRAPRuntimeBlock`

### Runtime Stack Impact
Each fragment combination affects how blocks are pushed onto the runtime stack:
- Simple exercises create single blocks
- Grouped workouts create parent-child block hierarchies
- EMOM/AMRAP patterns create timer-controlled execution flows
- Rep schemes create iteration-based block management

## Usage in Storybook

These examples are available in both Runtime and Parser Storybook stories:

### Runtime/Overview Stories
Show JIT Compiler behavior and runtime stack management:
- `Runtime/Overview/Single Statement: [Type]`
- `Runtime/Overview/Grouped Workout: [Type]`
- `Runtime/Overview/Rep Scheme: [Type]`
- `Runtime/Overview/EMOM: [Type]`
- `Runtime/Overview/Rep Type: [Type]`
- `Runtime/Overview/Timer: [Type]`
- `Runtime/Overview/Complex: [Type]`
- `Runtime/Overview/Advanced: [Type]`

### Parser/Overview Stories
Show parsing behavior and fragment identification:
- `Parser/Overview/Single Statement: [Type]`
- `Parser/Overview/Grouped Workout: [Type]`
- `Parser/Overview/Rep Scheme: [Type]`
- `Parser/Overview/EMOM: [Type]`
- `Parser/Overview/Rep Type: [Type]`
- `Parser/Overview/Timer: [Type]`
- `Parser/Overview/Complex: [Type]`
- `Parser/Overview/Advanced: [Type]`

Each parser story shows the parsed fragments in a visual table format, displaying:
- Line numbers and column positions
- Fragment types with color coding
- Fragment values and metadata
- Interactive editor for testing variations
- `Runtime/JitCompiler/[Timer Type]`

Each story demonstrates how the runtime stack processes the specific fragment combination and shows the resulting runtime blocks and metrics.
