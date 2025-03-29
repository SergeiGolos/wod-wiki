# Compile Time Syntax for wod.wiki

The **wod.wiki** platform uses a specialized markdown-like syntax for defining workouts that is parsed and compiled at runtime. This document outlines the core syntax elements and their meaning. The compiled workout definitions are used by the [Runtime](Runtime.md) component for execution and displayed in the [Editor](../Components/Editor.md) component.

## Basic Syntax Elements

The wod.wiki syntax is designed to be human-readable while providing structure for workout representation. It uses a combination of tokens that are parsed and compiled into a structured workout definition.

### Core Tokens

| Token Type | Pattern | Example | Description |
|------------|---------|---------|-------------|
| Timer | `(?::\d+\|(?:\d+:){1,3}\d+)` | `:20`, `1:30`, `0:01:30` | Represents time durations |
| Number | `\d*\.?\d+` | `21`, `95`, `0.5` | Numeric values for reps, weights, etc. |
| Distance | `(m\|ft\|mile\|km\|miles)\b` | `25m`, `5km` | Distance measurements |
| Weight | `(kg\|lb\|bw)\b` | `95lb`, `50kg` | Weight measurements |
| Identifier | `[a-zA-Z]\w*` | `Pullups`, `Thursters` | Movement or exercise names |
| GroupOpen/Close | `(` and `)` | `(21-15-9)` | Defines round structures |
| Minus | `-` | Used in round patterns like `21-15-9` or as separator |
| Plus | `+` | Prefix for exercise lines in a block |
| Return | Newline | Separates workout components |

## Workout Structure

### Round Notation
```
(21-15-9) 
  Thursters 95lb
  Pullups
```
This defines a descending rep scheme (21, then 15, then 9 reps) for two exercises.

### Fixed Rounds
```
(5)
  20 Pullups
  30 Pushups
  40 Situps
  50 Air Squats
```
This indicates 5 rounds of the listed exercises.

### Rest Periods
```
:20 Rest
```
Indicates a rest period of 20 seconds.

### Complex Patterns
More complex workouts can combine multiple elements:
```
(6) Warmup
  25m Swim
  :20 Rest

100m Kick
```

## Compile Time Processing

When a workout is defined in wod.wiki syntax:

1. The `MdTimerRuntime` class processes the input text
2. Lexer tokenizes the input using patterns defined in `timer.tokens.ts`
3. Parser (`MdTimerParse`) creates a syntax tree based on grammar rules
4. Interpreter (`MdTimerInterpreter`) transforms the syntax tree into structured workout data
5. The resulting `WodRuntimeScript` contains both the original source and structured statements

The compiled representation is then passed to the [Runtime](Runtime.md) component for execution, which enables:
- Semantic highlighting for the editor
- Intelligent autocompletion
- Runtime calculations for workout timing and metrics
- Visual representation of workout components

## Technical Integration

The compilation process integrates with other components through:

- **Input**: Text from the [Editor](../Components/Editor.md) component
- **Output**: Structured `WodRuntimeScript` consumed by the [Runtime](Runtime.md)
- **Feedback**: Errors and warnings displayed in the [Editor](../Components/Editor.md)

For details on how the editor displays and interacts with this syntax, see the [Editor](../Components/Editor.md) documentation.
For information on how compiled scripts are executed, see the [Runtime](Runtime.md) documentation.
