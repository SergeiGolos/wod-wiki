# WOD Wiki Syntax

WOD Wiki uses a specialized Markdown-like syntax for defining workouts. It is designed to be human-readable while being structured enough for machine parsing.

## Basic Structure

A workout is defined by a series of statements. These can be groups (rounds), exercises, or timing instructions.

### Example: Fran

```wod
(21-15-9)
  Thrusters 95lb
  Pullups
```

## Syntax Elements

### 1. Rounds / Groups `(...)`
Parentheses are used to define a group of exercises that should be repeated or executed in a specific pattern.

- **Fixed Rounds**: `(3 rounds)`
- **Rep Scheme**: `(21-15-9)` - Implies 3 rounds where the rep count changes for each round.

### 2. Exercises
Exercises are identified by text. They can have associated metrics like weight, reps, or distance.

- `Thrusters`
- `Pullups`
- `Run`

### 3. Metrics
Metrics can be attached to exercises or stand alone.

- **Weight**: `95lb`, `135lb`, `24kg`, `bw` (bodyweight).
- **Reps**: Numbers, e.g., `10`, `21`.
- **Distance**: `400m`, `1 mile`, `5km`.
- **Duration**: `21:00` (minutes:seconds), `5:00`.

### 4. Actions `[...]`
Special actions or instructions can be enclosed in brackets.

- `[Rest]`
- `[Walk]`

### 5. Trends `^`  
The caret symbol `^` can be used to indicate an increasing trend or scale. Since default timers are decresing fromt he time value.

## Grammar Rules

- **Separators**: Newlines separate statements.
- **Indentation**: Used to nest exercises within groups (though the parser handles some flexibility). 111
- **Comments**: Standard Markdown text outside of code blocks is treated as description.

## Advanced Examples

### AMRAP (As Many Rounds As Possible)

```wod
20:00
  (AMRAP)
    5 Pullups
    10 Pushups
    15 Air Squats
```

### EMOM (Every Minute on the Minute)

```wod
10:00
  (EMOM)
    3 Clean & Jerk 135lb
```
