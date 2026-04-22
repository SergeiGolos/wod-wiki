---
search: hidden
template: canvas
route: /syntax
---

# Syntax Reference {sticky dark full-bleed}

WOD Wiki uses a compact, readable text syntax for describing workouts.
Every concept builds on the last — start at the top and work your way through.

```view
name:    preview
state:   note
source:  wods/syntax/basics.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## The Basics {sticky}

A `wod` block is a fenced code block tagged with the word `wod`. Inside, list your exercises — one per line. The parser handles everything else.

```command
target: preview
pipeline:
  - set-source: wods/syntax/basics.md
```

The foundational rules: indentation creates groups, numbers create reps, times create timers.

```button
label:  Open Basics Guide →
target: preview
pipeline:
  - navigate: /syntax/basics
```

## Timers and Intervals {sticky}

Prefix a line with a duration to run it as a timed block. `5:00 Run`, `:30 Plank`, `1:30:00 Long Row` — all valid. Combine durations with work/rest patterns to build intervals.

```command
target: preview
pipeline:
  - set-source: wods/syntax/timers.md
```

```button
label:  Open Timers Guide →
target: preview
pipeline:
  - navigate: /syntax/timers
```

## Rep Schemes {sticky}

A number before a movement sets the rep count: `10 Pushups`. Use `(21-15-9)` repeater syntax to define descending rounds with a single block of movements.

```command
target: preview
pipeline:
  - set-source: wods/syntax/repeaters.md
```

```button
label:  Open Rep Schemes Guide →
target: preview
pipeline:
  - navigate: /syntax/repeaters
```

## Rounds and Groups {sticky}

`(3 Rounds)` wraps a block of movements and repeats it. Groups can be named (`(Warmup)`) and nested. Indentation is the key — everything inside a group must be indented.

```command
target: preview
pipeline:
  - set-source: wods/syntax/groups.md
```

```button
label:  Open Groups Guide →
target: preview
pipeline:
  - navigate: /syntax/groups
```

## AMRAP {sticky}

As Many Rounds As Possible. Set a time cap and mark the block `(AMRAP)` — the timer counts down and the runtime counts your rounds.

```command
target: preview
pipeline:
  - set-source: wods/syntax/amrap.md
```

```button
label:  Open AMRAP Guide →
target: preview
pipeline:
  - navigate: /syntax/amrap
```

## EMOM {sticky}

Every Minute on the Minute. The timer divides the total duration into fixed intervals. Finish your reps before the minute resets.

```command
target: preview
pipeline:
  - set-source: wods/syntax/emom.md
```

```button
label:  Open EMOM Guide →
target: preview
pipeline:
  - navigate: /syntax/emom
```

## Tabata and Intervals {sticky}

Alternate work and rest periods. A standard Tabata is 8 rounds of `:20 Work` and `:10 Rest`. Custom intervals work the same way — just set your own durations.

```command
target: preview
pipeline:
  - set-source: wods/syntax/tabata.md
```

```button
label:  Open Tabata Guide →
target: preview
pipeline:
  - navigate: /syntax/tabata
```

## Rest Periods {sticky}

Rest is just another line. Put it inside a group with a duration to add explicit recovery between sets. The timer counts it as part of the workout.

```command
target: preview
pipeline:
  - set-source: wods/syntax/rest.md
```

```button
label:  Open Rest Guide →
target: preview
pipeline:
  - navigate: /syntax/rest
```

## Measurements {sticky}

Add weights (`225lb`, `100kg`), distances (`400m`, `2000m`, `10 miles`), and percentages (`@75%`) directly to movement lines. The runtime tracks all of it.

```command
target: preview
pipeline:
  - set-source: wods/syntax/measurements.md
```

```button
label:  Open Measurements Guide →
target: preview
pipeline:
  - navigate: /syntax/measurements
```

## Supplemental Data {sticky}

Capture intent and effort beyond raw numbers. Log RPE, note setup actions, or mark a set as a technique focus. Supplemental lines don't affect the timer.

```command
target: preview
pipeline:
  - set-source: wods/syntax/supplemental.md
```

```button
label:  Open Supplemental Guide →
target: preview
pipeline:
  - navigate: /syntax/supplemental
```

## Complex Workouts {sticky}

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note.

```command
target: preview
pipeline:
  - set-source: wods/syntax/complex.md
```

```button
label:  Open Complex Examples →
target: preview
pipeline:
  - navigate: /syntax/complex
```

## Start Writing {sticky full-bleed dark}

Open a new note and try the syntax for yourself.

```button
label:  New Workout Note →
target: preview
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

```button
label:  ← Back to Home
target: preview
pipeline:
  - navigate: /
```
