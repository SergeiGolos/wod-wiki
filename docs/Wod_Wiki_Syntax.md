# WOD Wiki Syntax Guide

WOD Wiki uses a specialized, human-readable syntax for defining workouts. This document provides a deep dive into the language structure, formatting rules, and available components.

## Overview

A workout definition consists of a series of **statements** (lines). Each statement describes an action, a group of exercises, or a timing instruction. The parser processes these statements to generate a structured workout plan that can be executed by the runtime engine.

## Core Structure

### Statements
Each line in the editor is treated as a separate statement. Empty lines are ignored or act as visual separators.

```wod
(3 rounds)
  Run 400m
  15 Pushups
```

### Indentation
While indentation (nesting) is supported and encouraged for readability, the parser primarily relies on the logical structure of **Groups** to determine hierarchy.

## Syntax Components

The language is built from several core components (fragments) that can be combined in flexible ways.

### 1. Groupings & Rounds `(...)`

Parentheses `(...)` define a "Group" or "Round". This is the primary mechanism for looping and organizing workout sections.

#### Fixed Rounds
Specifies that the following block of exercises should be repeated a specific number of times.

- Syntax: `(N rounds)` or just `(N)` (though `rounds` is recommended for clarity)
- Example: `(5 rounds)`

#### Rep Schemes
Defines a sequence of repetition counts. This implies the number of rounds matches the number of values in the sequence.

- Syntax: `(N-N-N...)`
- Example: `(21-15-9)`
  - This creates 3 rounds.
  - Round 1 uses 21 reps.
  - Round 2 uses 15 reps.
  - Round 3 uses 9 reps.

#### Named Groups / Strategies
Special identifiers can be used to define workout strategies.

- **AMRAP** (As Many Rounds As Possible): `(AMRAP)`
- **EMOM** (Every Minute On the Minute): `(EMOM)`
- **Tabata**: `(Tabata)` (if supported by implementation)

### 2. Exercises / Effort
Any text that isn't a reserved keyword or format is treated as an "Effort" or Exercise name.

- Examples: `Thrusters`, `Run`, `Box Jumps`
- Valid characters include letters, hyphens, and spaces.

### 3. Timers / Duration
Time durations are defined using colons.

- Format: `MM:SS` or `HH:MM:SS`
- Examples:
  - `20:00` (20 minutes)
  - `1:30` (1 minute 30 seconds)

### 4. Metrics
Metrics define the intensity or quantity of an exercise.

#### Repetitions
Plain numbers associated with an exercise are treated as repetitions.

- Example: `10 Pullups` (10 reps)

#### Weight / Resistance
Defined by a number followed by a weight unit. An optional `@` prefix is allowed.

- Units: `lb`, `kg`, `bw` (bodyweight)
- Examples:
  - `135lb`
  - `24kg`
  - `@95lb`

#### Distance
Defined by a number followed by a distance unit.

- Units: `m`, `km`, `ft`, `mile`, `miles`
- Examples:
  - `400m`
  - `5km`
  - `1 mile`

### 5. Actions / Notifications `[:...]`
Actions are special instructions or notifications that often trigger specific behaviors (like a "Rest" timer or a user prompt).

- Syntax: `[:ActionName]`
- **Important**: The colon `:` after the opening bracket is required.
- Examples:
  - `[:Rest]`
  - `[:Walk]`
  - `[:Change Station]`

### 6. Trends `^`
The caret symbol `^` indicates an increasing trend or scale. Default timers typically count down; this modifier can invert that behavior or indicate a scaling metric (like weight increasing each round).

- Example: `^`

### 7. Laps / Segments
Plus `+` and Minus `-` signs can be used to explicitly define lap segments or split points, though they are often implicit in the structure.

## Detailed Examples

### "Fran" (Rep Scheme)
Three rounds with decreasing reps (21, 15, 9).

```wod
(21-15-9)
  Thrusters 95lb
  Pullups
```

### AMRAP 20
As many rounds as possible in 20 minutes.

```wod
20:00
  (AMRAP)
    5 Pullups
    10 Pushups
    15 Air Squats
```

### EMOM 10
Every minute on the minute for 10 minutes.

```wod
10:00
  (EMOM)
    3 Clean & Jerk 135lb
```

### Intervals with Rest
Structured intervals with explicit rest actions.

```wod
(5 rounds)
  Run 400m
  [:Rest] 2:00
```

### Complex Complex
Combining weights and movements.

```wod
(5 rounds)
  7 Deadlift 225lb
  Run 200m
  [:Rest]
```
