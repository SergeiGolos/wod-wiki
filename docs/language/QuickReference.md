# WodScript Quick Reference

Quick syntax reference for the WOD Wiki language. For detailed explanations, see the [Language Guide](./Guide.md).

## Basic Syntax

### Exercise Definitions
```
<reps> <exercise> [<weight>] [<distance>]

Examples:
10 Burpees
5 Deadlifts 225lb
400m Run
30s Plank Hold
```

### Round Structures
```
(<rounds>)               # Simple rounds
  <exercise>
  <exercise>

(<rep_scheme>)           # Rep scheme rounds  
  <exercise>

Examples:
(5)                      # 5 rounds
  20 Pullups
  30 Pushups

(21-15-9)               # 3 rounds with descending reps
  Thrusters 95lb
  Pullups
```

### Time-based Workouts
```
<time> <workout_type>
  <exercise>

Examples:
20:00 AMRAP             # 20 minute AMRAP
  5 Pullups
  10 Pushups

(12) :60 EMOM           # 12 rounds, every minute
  5 Burpees
```

### Lap Indicators
```
+ <exercise>            # Positive lap
- <exercise>            # Negative lap
<exercise>              # No indicator

Example:
(3)
  + 20 Pullups
  + 30 Pushups  
  40 Situps
  3:00 Rest
```

### Actions
```
[<action>]              # Special actions
[:action]               # Action with colon

Examples:
[Rest]
[:Transition]
```

## Fragment Types Quick Reference

| Fragment | Syntax | Example | Creates Metric |
|----------|--------|---------|----------------|
| **Rep** | `<number>` | `21` | `repetitions: 21` |
| **Timer** | `<time>` | `20:00`, `:30` | `time: 1200000ms` |
| **Effort** | `<text>` | `Thrusters`, `Clean & Jerk` | `effort: "Thrusters"` |
| **Resistance** | `[@]<number><unit>` | `225lb`, `@95kg` | `resistance: 225lb` |
| **Distance** | `[<number>]<unit>` | `400m`, `mile` | `distance: 400m` |
| **Rounds** | `(<count>)` | `(5)`, `(21-15-9)` | `rounds: 5` |
| **Lap** | `+` or `-` | `+ 20 Pullups` | Execution flow |
| **Action** | `[:<text>]` | `[Rest]` | Special behavior |

## Common Patterns

### CrossFit Workouts
```
# Named WODs
(21-15-9) Thrusters 95lb, Pullups    # Fran
20:00 AMRAP 5 Pullups, 10 Pushups    # Cindy  
(5) 400m Run, 21 KB Swings 53lb      # Helen

# EMOM
(12) :60 EMOM
  5 Pullups
  10 Pushups

# Tabata  
(8) 20s/10s
  Burpees
```

### Strength Training
```
# Simple sets
5 Back Squats 225lb

# Complex schemes
(10-9-8-7-6-5-4-3-2-1)
  Deadlift 1.5BW
  Bench Press 1BW
```

### Cardio/Endurance
```
# Distance
5000m Row
10 x 100m Sprints

# Time-based
45:00 LSD Run
(5) 4:00 On, 2:00 Off
```

## Units Reference

### Time
- `:30` = 30 seconds
- `1:00` = 1 minute
- `1:30:00` = 1 hour 30 minutes
- `20:00` = 20 minutes

### Weight  
- `lb` = pounds
- `kg` = kilograms  
- `bw` = bodyweight (multiplier)

### Distance
- `m` = meters
- `ft` = feet
- `km` = kilometers
- `mile` = miles

## Parsing Priority

When multiple fragments appear in one line, they are processed in this order:
1. **Lap** (`+`, `-`) - always first if present
2. **Rounds** (`(5)`, `(21-15-9)`) - grouping structures  
3. **Timer** (`:30`, `20:00`) - time constraints
4. **Reps** (`21`) - repetition counts
5. **Distance** (`400m`) - distance measurements
6. **Resistance** (`225lb`, `@95kg`) - weight/load
7. **Effort** (`Thrusters`, `Clean & Jerk`) - exercise names
8. **Action** (`[Rest]`) - special actions

## Error Handling

Common syntax errors and fixes:

```
# Missing units
"5 Deadlifts 225" → "5 Deadlifts 225lb"

# Invalid time format  
"5:30:30:30" → Use max 3 colons: "1:30:30"

# Unmatched parentheses
"(5 Pullups" → "(5) Pullups" 

# Invalid characters in effort
"Push-ups&Sit-ups" → "Push-ups Sit-ups"
```

## See Also

- [Complete Language Guide](./Guide.md) - Detailed syntax explanation
- [System Overview](../Overview.md) - High-level architecture
- [Parser Examples](../../stories/parsing/) - Real workout examples
- [Runtime Documentation](../runtime/Runtime.md) - Execution details