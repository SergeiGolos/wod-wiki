

This document provides a comprehensive reference for the wod.wiki workout notation language, including syntax elements, composition rules, and numerous examples.

## Syntax Elements

| Element              | Syntax                                    | Description                                                     | Examples                                |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| **Timer**            | `:SS`, `MM:SS`, `HH:MM:SS`, `DD:HH:MM:SS` | Time duration                                                   | `:30`, `2:00`, `1:30:00`, `31:23:59:59` |
| **Repetitions**      | Plain numbers on a line                   | Count of repetitions                                            | `10`, `21`, `100`                       |
| **Exercise**         | Text labels                               | Exercise description                                            | `Push-ups`, `Box Jumps`, `Run`          |
| **Weight**           | Number + unit of weight                   | Resistance amount                                               | `95lb`, `40kg`, `50%`                   |
| **Distance**         | Number + unit of distance                 | Distance measure                                                | `400m`, `5km`, `1mile`                  |
| **Rounds**           | `(n)`                                     | Round scheme                                                    | `(5)`                                   |
| **Rounds with Reps** | `(n-n-n)`                                 | Each number is the reps, and the number of numbers is the reps. | `(21-15-9)`                             |
| **Group Start**      | `-` prefix                                | Full Round Effort                                               | `- 10 Push-ups`                         |
| **Group Continue**   | `+` prefix                                | Group Round Effort                                              | `+ 10 Sit-ups`<br>`+ 5 Pull`            |
| **Increment**        | `^` suffix                                | Count up (not down)                                             | `:30^`                                  |
| **Action**           | `[:text]`                                 | Special instruction                                             | `[:Rest]`, `[:Setup]`                   |

## Basic Syntax Examples

### Simple Timer

A basic countdown timer:

```
:30
```

This creates a 30-second countdown timer with no label or metrics being collected.

### Exercise with Repetitions

A rep-based exercise:

```
10 Push-ups
```

Creates a count up timer that records the time it takes to do 10 pushups.  User `[:complete]` button is implicit.

### Timed Exercise

A timed exercise:

```
1:00 Plank
```

This creates a 1-minute timer for a plank exercise.

### Exercise with Weight

An exercise with specified weight:

```
5 Deadlifts 225lb
```

This creates an exercise with 5 repetitions at 225 pounds.

### Exercise with Distance

A distance-based exercise:

```
400m Run
```

This creates a 400-meter run exercise.

## Composing Workout Elements

### Multiple Rounds

To repeat a single exercise:

```
(3) 10 Push-ups
```

This repeats 10 push-ups for 3 rounds.

To create a changing rep scheme:

```
(21-15-9)
  Push-ups
  Pull-ups
```

This creates a workout with 3 rounds: 21 reps, then 15 reps, then 9 reps of both exercises.

### Round-Robin Groups

To alternate between exercises:

```
- 10 Push-ups
- 10 Sit-ups
- 10 Squats
```

This creates a round-robin between these three exercises.

### Composed Groups

To combine exercises into a single logical unit:

```
- 10 Push-ups
+ 10 Sit-ups
```

This groups push-ups and sit-ups together as a single unit.

### Nested Structures

To create complex nested workouts:

```
(3)
  - 400m Run
  - (10)
    5 Push-ups
    5 Sit-ups
```

This creates 3 rounds of: run 400m, then do 10 rounds of 5 push-ups and 5 sit-ups.

## Advanced Syntax Features

### Count-up Timers

To create a timer that counts up instead of down:

```
1:00^
```

This creates a timer that counts up from 0 to 1 minute.

### Rest Periods

To specify rest periods:

```
10 Push-ups
:30 Rest
```

This creates an exercise followed by a 30-second rest period.

### Action Labels

To insert special instructions:

```
[:Setup] 
  Grab barbell
  Set up plates
```

This creates a setup instruction with detailed steps.

### Complex Round Schemes

For ascending/descending rep schemes:

```
(5-10-15-20-15-10-5)
  Push-ups
```

This creates a pyramid workout structure.

## Real-World Workout Examples

### "Fran" (CrossFit Benchmark)

```
(21-15-9)
  Thrusters 95lb
  Pull-ups
```

### "Helen" (CrossFit Benchmark)

```
(3)
  400m Run
  21 KB Swings 1.5pood
  12 Pull-ups
```

### Tabata Interval

```
(8)
  :20 Work
  :10 Rest
```

### EMOM (Every Minute On the Minute)

```
(10)
  - (:60)
    5 Push-ups
    (:Remainder) Rest
```

### AMRAP (As Many Rounds As Possible)

```
(20:00^)
  10 Push-ups
  10 Sit-ups
  10 Squats
```

### Strength Training Session

```
Back Squat
  5 @50%
  5 @60%
  5 @70%
  3 @80%
  3 @85%
  3 @90%
```

## Syntax Stacking Examples

Elements can be stacked in various ways to create complex workout structures:

### Timer + Exercise + Weight

```
:30 Deadlifts 225lb
```

Creates a 30-second timer for deadlifts at 225 pounds.

### Rounds + Repetitions + Exercise + Weight

```
(5) 10 Bench Press 135lb
```

Creates 5 rounds of 10 bench press repetitions at 135 pounds.

### Complex Grouping with Various Elements

```
(3)
  - 400m Run
  - 21 KB Swings 53lb
  - (5)
    + 5 Push-ups
    + 5 Box Jumps 24in
    + :10 Rest
```

Creates 3 rounds of: 400m run, 21 kettlebell swings at 53 pounds, and 5 rounds of a complex consisting of 5 push-ups, 5 box jumps at 24 inches, and a 10-second rest.

## Parser Technical Details

The wod.wiki syntax is processed through a multi-stage pipeline:

1. **Lexical Analysis**: Text is broken into tokens (numbers, identifiers, symbols)
2. **Parsing**: Tokens are assembled into a concrete syntax tree
3. **AST Creation**: A visitor pattern transforms the CST into an abstract syntax tree
4. **Compilation**: The AST is compiled into executable blocks

Each fragment type is represented by a specialized class:

- `TimerFragment`: For durations
- `RepFragment`: For repetition counts
- `EffortFragment`: For exercise descriptions
- `ResistanceFragment`: For weight specifications
- `DistanceFragment`: For distance measurements
- `RoundsFragment`: For round specifications
- `LapFragment`: For grouping relationships
- `ActionFragment`: For special instructions
- `IncrementFragment`: For direction indication (up/down)

### Statement Structure

The output of the parser is an array of `StatementNode` objects. Each `StatementNode` represents a line or a logical unit within the workout script and contains:

- `id`: A unique identifier, usually derived from the start offset in the source text.
- `fragments`: An array of `StatementFragment` objects parsed from the input for this statement.
- `meta`: `SourceCodeMetadata` detailing the line number, column, and offset in the original input string.
- `children`: An array of IDs of child statements (e.g., lines indented under this one).
- `parent`: The ID of the parent statement, if applicable.
- `next`: The ID of the next statement at the same indentation level, if applicable.
- `isLeaf`: Boolean indicating if the statement is a leaf node in the hierarchy (often determined by `LapFragment`).
- `rounds`: Number of rounds specified, typically derived from a `RoundsFragment`.

### Fragment Details

Fragments represent the individual components of a workout instruction. They are created by the `MdTimerInterpreter` (visitor) based on the CST nodes generated by the `MdTimerParse` (parser).

#### Timer Fragment (Duration)

- **Purpose:** Represents a time duration.
- **Class:** `TimerFragment`
- **Data:** `duration` (string - in `D:HH:MM:SS` or `MM:SS` or `:SS` format)
- **Example Input:** `:30`, `1:15`, `01:00:00`
- **Resulting Fragments:**
    - `TimerFragment { duration: ':30' }`
    - `TimerFragment { duration: '1:15' }`
    - `TimerFragment { duration: '01:00:00' }`

#### Rep Fragment (Reps)

- **Purpose:** Represents a number of repetitions for an action or within a sequence.
- **Class:** `RepFragment`
- **Data:** `reps` (number)
- **Example Input:** `10`, `(5-10-15)`
- **Resulting Fragments:**
    - `RepFragment { reps: 10 }`
    - From `(5-10-15)`: Three `RepFragment`s with `reps` values of 5, 10, and 15

#### Effort Fragment

- **Purpose:** Represents a subjective effort level or specific instruction not covered by other fragments. Often used for descriptive text.
- **Class:** `EffortFragment`
- **Data:** `effort` (string)
- **Example Input:** `EasyPace`, `MaxEffort!`
- **Resulting Fragments:**
    - `EffortFragment { effort: 'EasyPace' }`
    - `EffortFragment { effort: 'MaxEffort !' }`

#### Resistance Fragment (Weight)

- **Purpose:** Represents a weight or resistance level.
- **Class:** `ResistanceFragment`
- **Data:** `value` (string - numeric part), `units` (string - e.g., 'kg', 'lb', 'bw')
- **Example Input:** `50kg`, `@135lb`, `bw`
- **Resulting Fragments:**
    - `ResistanceFragment { value: '50', units: 'kg' }`
    - `ResistanceFragment { value: '135', units: 'lb' }`
    - `ResistanceFragment { value: '1', units: 'bw' }`

#### Distance Fragment

- **Purpose:** Represents a distance measurement.
- **Class:** `DistanceFragment`
- **Data:** `value` (string - numeric part), `units` (string - e.g., 'm', 'km', 'ft')
- **Example Input:** `100m`, `2miles`
- **Resulting Fragments:**
    - `DistanceFragment { value: '100', units: 'm' }`
    - `DistanceFragment { value: '2', units: 'miles' }`

#### Rounds Fragment

- **Purpose:** Specifies repetition counts, either as a simple multiplier or a sequence of reps for different rounds.
- **Class:** `RoundsFragment`
- **Data:** `count` (number - either the multiplier or the number of elements in a sequence)
- **Example Input:** `:30 (3)`, `(5-10-15)`
- **Resulting Fragments:**
    - Input `:30 (3)`: `RoundsFragment { count: 3 }`
    - Input `(5-10-15)`: `RoundsFragment { count: 3 }`

#### Lap Fragment

- **Purpose:** Defines the relationship of a statement to others, controlling grouping and execution flow.
- **Class:** `LapFragment`
- **Data:** `group` (`'round'`, `'compose'`, `'repeat'`), `image` (string - e.g., `-`, `+`)
- **Example Input:**
    - `- :30` (Start of a round/set)
    - `:15` (Indented, implies repeat/part of the above)
    - `+ :45` (Composed with the previous item at the same level)
- **Resulting Fragments:**
    - `LapFragment { group: 'round', image: '-' }`
    - `LapFragment { group: 'repeat', image: '' }` (Implicitly added)
    - `LapFragment { group: 'compose', image: '+' }`

#### Action Fragment

- **Purpose:** Represents a specific action or exercise description, typically enclosed in square brackets.
- **Class:** `ActionFragment`
- **Data:** `action` (string)
- **Example Input:** `[:PushUps]`
- **Resulting Fragment:** `ActionFragment { action: 'PushUps' }`

#### Increment Fragment (Trend)

- **Purpose:** Indicates the direction of a timer (count up or count down).
- **Class:** `IncrementFragment`
- **Data:** `image` (string - the token image, e.g., '^'), `increment` (number: `1` for up, `-1` for down)
- **Example Input:** `:30^`, `1:00`
- **Resulting Fragments:**
    - Input `:30^`: `IncrementFragment { image: '^', increment: 1 }`
    - Input `1:00`: `IncrementFragment { image: '', increment: -1 }` (implicitly added)

## Styling and Visual Representation

In the wod.wiki editor and display, different syntax elements receive visual styling:

- **Timers**: Displayed with a ⏱️ icon
- **Repetitions**: Displayed with a × symbol
- **Weights**: Displayed with a 💪 icon
- **Distances**: Displayed with a 📏 icon
- **Rounds**: Highlighted with special formatting
- **Exercises**: Displayed in emphasized text

## Common Syntax Errors

| Error | Example | Correction |
|-------|---------|------------|
| Missing units | `10 Push-ups 225` | `10 Push-ups 225lb` |
| Invalid time format | `1:0` | `1:00` |
| Mismatched parentheses | `(3` | `(3)` |
| Invalid characters | `10 Push-ups!` | `10 Push-ups` |
| Incorrect indentation | Wrong nesting | Fix indentation |

## Conclusion

The wod.wiki syntax provides a flexible, intuitive way to describe workouts of varying complexity. By combining the elements described in this document, users can create everything from simple timers to complex training programs with precise workout prescription.