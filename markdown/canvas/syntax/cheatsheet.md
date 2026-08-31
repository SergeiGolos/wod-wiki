---
search: hidden
template: canvas
route: /guide/syntax/cheatsheet
type: syntax
---

# Syntax Cheat Sheet {sticky dark full-bleed}

One page, every construct. Copy the pattern, fill in your movements, and run it.

## Protocols {sticky}

### AMRAP {#amrap}

As Many Rounds as Possible. The clock counts down; you count completed rounds.

```time
10:00 AMRAP
  10 Pull-ups
  15 Push-ups
  20 Air Squats
```

### EMOM {#emom}

Every Minute On the Minute. `(n)` rounds, each one minute long. A bell starts every window.

```time
(10) 1:00 EMOM
  5 Power Cleans
```

### Tabata {#tabata}

Eight rounds of `:20 Work / :10 Rest`. The colon prefix is required for sub-minute timers.

```time
(8)
  :20 Air Squats
  :10 Rest
```

## Structure {sticky}

### Rounds {#rounds}

A parenthesized header repeats every indented line beneath it.

```time
(3)
  10 Push-ups
  15 Air Squats
```

### Ladders {#ladders}

A dash-separated rep scheme becomes one round per value. Every movement in the block inherits the current value.

```time
(21-15-9) Thruster / Pull-up
```

| Scheme | Rounds | Reps per round |
|---|---|---|
| `(5 Sets)` | 5 | same each set |
| `(10-8-6-4-2)` | 5 | descending ladder |
| `(21-15-9)` | 3 | 21, 15, 9 |

### Supersets {#supersets}

Nest rounds to alternate movements or group intervals. Ownership is indentation.

```time
(5)
  (3)
    5 Deadlift
    10 Push-up
```

## Rest modifiers {sticky}

### Rest {#rest}

A rest block waits the declared time. `*` makes it non-skippable.

```time
*:30 Rest
```

| Pattern | Behavior |
|---|---|
| `1:00 Rest` | Optional one-minute rest |
| `*:30 Rest` | Required 30-second rest |
| `^5:00 Rest` | Count up to 5:00 instead of down |

## Capture modifiers {sticky}

### Actual result `:?` {#actual}

Ask for the real result after a block finishes.

```time
5:00 Run :?
(3) 10 Burpees :?
For Time :?
```

### Load prompt `?lb` {#load-prompt}

Prompt for the load when the movement is reached. Works with `lb` or `kg`.

```time
?lb Back Squat
225lb ?lb Deadlift
?kg Clean
```

## Metric vocabulary {sticky}

### Metrics {#metrics}

The runtime derives these metrics from your text. Use them in queries and trendlines.

| Metric | Source | Example |
|---|---|---|
| **rounds** | Round header | `(3 Rounds)` → 3 |
| **reps** | Numeric prefix | `10 Push-ups` → 10 |
| **load** | Weight suffix | `225lb`, `100kg` |
| **effort** | Descriptive word | `easy`, `hard`, `moderate` |
| **discipline** | Movement name | `Run`, `Back Squat`, `Pull-up` |

To query, filter, and aggregate these metrics across your journal, see the [Analytics Query Guide](/guide/analytics).

## Finish Line {sticky full-bleed dark}

Return to the Syntax index or open a new note and try it out.

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  New Workout Note →
target: ex
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
