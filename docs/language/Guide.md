# WodScript Language Guide

This comprehensive guide explains the syntax and structure of the WOD Wiki language as implemented by the parser and lexer. WodScript is a domain-specific language for defining workout routines with precise timing, repetitions, and exercise specifications.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Token Types](#token-types)
4. [Fragment Types](#fragment-types)
5. [Grammar Rules](#grammar-rules)
6. [Syntax Patterns](#syntax-patterns)
7. [Metrics and Inheritance](#metrics-and-inheritance)
8. [Advanced Features](#advanced-features)
9. [Examples](#examples)
10. [References](#references)

## Overview

WodScript transforms human-readable workout descriptions into structured data that can be executed by the runtime system. The language supports:

- **Tokenization**: Breaking text into meaningful tokens ([src/parser/timer.tokens.ts](../../src/parser/timer.tokens.ts))
- **Grammar parsing**: Converting tokens into structured statements ([src/parser/timer.parser.ts](../../src/parser/timer.parser.ts))
- **AST traversal**: Converting parse trees into executable fragments ([src/parser/timer.visitor.ts](../../src/parser/timer.visitor.ts))
- **Runtime execution**: Executing parsed fragments with timing and metrics ([src/parser/md-timer.ts](../../src/parser/md-timer.ts))

## Core Concepts

### Statements and Fragments

A **Statement** is a complete line of workout definition that contains one or more **Fragments**. Each fragment represents a specific aspect of the exercise:

```
5 Deadlifts 225lb
│ │         │
│ │         └── ResistanceFragment (225lb)
│ └── EffortFragment (Deadlifts)  
└── RepFragment (5)
```

### Composition and Inheritance

Fragments combine to form executable blocks. Child statements inherit metrics from parent statements, allowing complex workout structures with shared parameters.

## Token Types

### Basic Tokens

| Token | Pattern | Description | Example |
|-------|---------|-------------|---------|
| `Number` | `/\d*\.?\d+/` | Numeric values | `5`, `225`, `1.5` |
| `Timer` | `/(?::\d+\|(?:\d+:){1,3}\d+)/` | Time durations | `:30`, `1:00`, `20:00` |
| `Identifier` | `/[a-zA-Z]\w*/` | Exercise names | `Deadlifts`, `AMRAP` |
| `Distance` | `/(m\|ft\|mile\|km\|miles)\b/i` | Distance units | `m`, `ft`, `km` |
| `Weight` | `/(kg\|lb\|bw)\b/i` | Weight units | `kg`, `lb`, `bw` |

### Structural Tokens

| Token | Pattern | Description | Example |
|-------|---------|-------------|---------|
| `GroupOpen` | `/\(/` | Start of rounds/grouping | `(` |
| `GroupClose` | `/\)/` | End of rounds/grouping | `)` |
| `ActionOpen` | `/\[/` | Start of action notation | `[` |
| `ActionClose` | `/\]/` | End of action notation | `]` |
| `Plus` | `/\+/` | Positive lap indicator | `+` |
| `Minus` | `/\-/` | Negative lap indicator or separator | `-` |
| `Collon` | `/:/` | Action separator | `:` |
| `AtSign` | `/@/` | Resistance prefix | `@` |

## Fragment Types

### RepFragment
Represents repetition counts.

**Syntax**: `<number>`  
**Examples**: `5`, `10`, `21`  
**Source**: [src/fragments/RepFragment.ts](../../src/fragments/RepFragment.ts)

```typescript
// Creates a RepFragment with value 5
"5 Pushups" → RepFragment(5) + EffortFragment("Pushups")
```

### EffortFragment
Represents exercise names and descriptions.

**Syntax**: `<identifier>[ <identifier>]*`  
**Examples**: `Deadlifts`, `Clean & Jerk`, `Wall Ball Shots`  
**Source**: [src/fragments/EffortFragment.ts](../../src/fragments/EffortFragment.ts)

```typescript
// Creates an EffortFragment with effort "Clean & Jerk"
"Clean & Jerk" → EffortFragment("Clean & Jerk")
```

### TimerFragment
Represents time durations in various formats.

**Syntax**: `<timer_pattern>`  
**Examples**: `:30` (30 seconds), `1:00` (1 minute), `20:00` (20 minutes)  
**Source**: [src/fragments/TimerFragment.ts](../../src/fragments/TimerFragment.ts)

```typescript
// Creates a TimerFragment with 1200000ms (20 minutes)
"20:00 AMRAP" → TimerFragment("20:00") + EffortFragment("AMRAP")
```

### ResistanceFragment
Represents weight or resistance values.

**Syntax**: `[@]<number><weight_unit>`  
**Examples**: `225lb`, `@95kg`, `1.5bw`  
**Source**: [src/fragments/ResistanceFragment.ts](../../src/fragments/ResistanceFragment.ts)

```typescript
// Creates a ResistanceFragment with load "225" and units "lb"
"Deadlifts 225lb" → EffortFragment("Deadlifts") + ResistanceFragment("225", "lb")
```

### DistanceFragment
Represents distance measurements.

**Syntax**: `[<number>]<distance_unit>`  
**Examples**: `400m`, `1km`, `mile`  
**Source**: [src/fragments/DistanceFragment.ts](../../src/fragments/DistanceFragment.ts)

```typescript
// Creates a DistanceFragment with load "400" and units "m"
"400m Run" → DistanceFragment("400", "m") + EffortFragment("Run")
```

### RoundsFragment
Represents round counts and rep schemes.

**Syntax**: `(<number>)` or `(<number>-<number>-...)`  
**Examples**: `(5)`, `(21-15-9)`, `(10-9-8-7-6-5-4-3-2-1)`  
**Source**: [src/fragments/RoundsFragment.ts](../../src/fragments/RoundsFragment.ts)

```typescript
// Creates multiple RepFragments for each round
"(21-15-9) Thrusters" → RoundsFragment(3) + RepFragment(21) + RepFragment(15) + RepFragment(9) + EffortFragment("Thrusters")
```

### LapFragment
Represents lap indicators for workout flow.

**Syntax**: `+` (positive lap) or `-` (negative lap)  
**Examples**: `+ 20 Pullups`, `- 5 Burpees`  
**Source**: [src/fragments/LapFragment.ts](../../src/fragments/LapFragment.ts)

### ActionFragment
Represents specific actions or rest periods.

**Syntax**: `[:<action_text>]`  
**Examples**: `[Rest]`, `[:Transition]`  
**Source**: [src/fragments/ActionFragment.ts](../../src/fragments/ActionFragment.ts)

## Grammar Rules

### Top Level: `wodMarkdown`
```
wodMarkdown := wodBlock (Return wodBlock)*
```
Parses complete workout definitions with multiple blocks separated by line returns.

### Block Level: `wodBlock`
```
wodBlock := lap? (rounds | trend | duration | effort | resistance | distance | reps | action)+
```
A single workout block can contain multiple fragments in any combination.

### Fragment Rules

#### Rounds
```
rounds := GroupOpen (Identifier | sequence)+ GroupClose
sequence := Number (Minus Number)*
```
Handles both simple round counts `(5)` and complex rep schemes `(21-15-9)`.

#### Resistance  
```
resistance := AtSign? Number? Weight
```
Supports optional @ prefix and optional number: `@225lb`, `95kg`, `lb`.

#### Distance
```
distance := Number? Distance
```
Supports optional number: `400m`, `m`.

#### Duration
```
duration := Timer
```
Matches timer patterns: `:30`, `1:00`, `20:00`.

#### Reps
```
reps := Number
```
Simple numeric repetition count.

#### Effort
```
effort := (Identifier | AllowedSymbol | Minus)+
```
Exercise names supporting multi-word phrases and symbols.

#### Action
```
action := ActionOpen Collon (Identifier | AllowedSymbol | Minus)+ ActionClose
```
Structured action notation like `[Rest]`.

#### Lap
```
lap := Plus | Minus
```
Lap flow indicators.

## Syntax Patterns

### Basic Exercise Definition
```
<reps> <effort> [<resistance>] [<distance>]

Examples:
10 Burpees
5 Deadlifts 225lb  
400m Run
30s Plank Hold
```

### Round-based Workouts
```
(<rounds>) 
  <exercise_line>
  <exercise_line>
  ...

Examples:
(5)
  20 Pullups
  30 Pushups
  40 Situps

(21-15-9)
  Thrusters 95lb
  Pullups
```

### Time-based Workouts  
```
<timer> <effort>
  <exercise_line>
  ...

Examples:
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats

(30) :60 EMOM
  5 Pullups
  10 Pushups
```

### Lap Indicators
```
[+ | -] <exercise_line>

Examples:
(5)
  + 20 Pullups    # Positive lap
  + 30 Pushups    # Positive lap
  3:00 Rest       # No lap indicator

(4)
  - 5 Pullups     # Negative lap
  - 10 Pushups    # Negative lap
```

### Actions and Rest
```
[:<action_text>]

Examples:
[Rest]
[:Transition]
3:00 Rest between rounds
```

## Metrics and Inheritance

The WodScript system automatically collects metrics from parsed fragments and supports inheritance between parent and child statements.

### Metric Types

| Type | Fragment Source | Description | Example Value |
|------|----------------|-------------|---------------|
| `repetitions` | RepFragment | Number of reps | `{type: 'repetitions', value: 21, unit: ''}` |
| `time` | TimerFragment | Duration in milliseconds | `{type: 'time', value: 1200000, unit: 'ms'}` |
| `resistance` | ResistanceFragment | Weight/load amount | `{type: 'resistance', value: 225, unit: 'lb'}` |
| `distance` | DistanceFragment | Distance measurement | `{type: 'distance', value: 400, unit: 'm'}` |
| `rounds` | RoundsFragment | Number of rounds | `{type: 'rounds', value: 3, unit: ''}` |

### Inheritance Strategies

**Source**: [src/runtime/MetricInheritance.ts](../../src/runtime/MetricInheritance.ts)

1. **OverrideMetricInheritance**: Child values replace parent values of same type
2. **IgnoreMetricInheritance**: Child ignores specified parent metric types  
3. **InheritMetricInheritance**: Child inherits parent values when not specified

Example:
```
(3)                    # RoundsFragment creates rounds metric
  400m Run            # Child inherits rounds=3, adds distance=400m
  21 KB Swings 53lb   # Child inherits rounds=3, adds reps=21, resistance=53lb
```

## Advanced Features

### Complex Rep Schemes
```
(10-9-8-7-6-5-4-3-2-1)
  Deadlift 225lb
  
# Generates:
# - RoundsFragment(10)  
# - RepFragment(10), RepFragment(9), ..., RepFragment(1)
# - EffortFragment("Deadlift")
# - ResistanceFragment("225", "lb")
```

### EMOM (Every Minute on the Minute)
```
(12) :60 EMOM
  5 Pullups
  10 Pushups

# Generates:
# - RoundsFragment(12)
# - TimerFragment(":60") 
# - EffortFragment("EMOM")
# - Plus child statements for each exercise
```

### Mixed Modal Training
```
20:00 AMRAP
  400m Run
  30 Wall Ball Shots 20lb
  30 KB Swings 53lb

# Generates:
# - TimerFragment("20:00")
# - EffortFragment("AMRAP") 
# - Child statements inherit time constraint
```

## Examples

### Simple Statements
```
# Rep + Effort
5 Burpees
→ RepFragment(5) + EffortFragment("Burpees")

# Timer + Effort  
30s Plank Hold
→ TimerFragment("30s") + EffortFragment("Plank Hold")

# Distance + Effort
400m Run  
→ DistanceFragment("400", "m") + EffortFragment("Run")

# Rep + Effort + Resistance
5 Deadlifts 225lb
→ RepFragment(5) + EffortFragment("Deadlifts") + ResistanceFragment("225", "lb")
```

### Complex Workouts
```
# CrossFit "Fran"
(21-15-9)
  Thrusters 95lb
  Pullups
→ RoundsFragment(3) + RepFragment(21,15,9) + 
  [EffortFragment("Thrusters") + ResistanceFragment("95", "lb")] +
  [EffortFragment("Pullups")]

# CrossFit "Cindy"  
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
→ TimerFragment("20:00") + EffortFragment("AMRAP") +
  [RepFragment(5) + EffortFragment("Pullups")] +
  [RepFragment(10) + EffortFragment("Pushups")] + 
  [RepFragment(15) + EffortFragment("Air Squats")]
```

## References

### Source Code
- **Tokenization**: [src/parser/timer.tokens.ts](../../src/parser/timer.tokens.ts) - Token definitions and patterns
- **Grammar**: [src/parser/timer.parser.ts](../../src/parser/timer.parser.ts) - Parsing rules and structure  
- **Visitor**: [src/parser/timer.visitor.ts](../../src/parser/timer.visitor.ts) - AST traversal and fragment creation
- **Runtime**: [src/parser/md-timer.ts](../../src/parser/md-timer.ts) - Execution engine
- **Fragments**: [src/fragments/](../../src/fragments/) - Fragment type definitions

### Tests and Examples  
- **Unit Tests**: [src/WodScript.test.ts](../../src/WodScript.test.ts), [src/runtime/*test.ts](../../src/runtime/) - Parser and runtime tests
- **Integration Tests**: [src/runtime/FragmentCompilationManager.test.ts](../../src/runtime/FragmentCompilationManager.test.ts) - End-to-end parsing examples
- **Story Examples**: [stories/parsing/](../../stories/parsing/) - Comprehensive workout examples
- **Workout Definitions**: [stories/workouts/](../../stories/workouts/) - Real-world CrossFit and training examples

### Documentation
- **System Overview**: [docs/Overview.md](../Overview.md) - High-level system architecture
- **Runtime Guide**: [docs/runtime/Runtime.md](../runtime/Runtime.md) - Execution model details  
- **UI Integration**: [docs/ui/Display.md](../ui/Display.md) - Editor and display components
- **Metrics System**: [docs/metrics/Metrics.md](../metrics/Metrics.md) - Metric collection and inheritance
