---
template: canvas
route: /zero-to-hero
---

# Zero to Hero {sticky dark full-bleed}

Go from a blank note to a complete tracked workout in six steps.
Each section introduces one concept. Try each example before moving on.

```view
name:    z2h
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Step 1 — Your First Movement {sticky}

A WOD block is a fenced code block tagged `wod`. The simplest possible workout is a single movement on one line.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

Type an exercise name. That's it. The runtime will track how many reps you do when you hit play.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

## Step 2 — Add Reps and Load {sticky}

Put a number before the exercise name for a rep count. Add a weight after for load tracking.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: note
```

`10 Pushups`, `5 Deadlift 225lb`, `Run 400m` — all valid. The parser understands reps, weights, and distances.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

## Step 3 — Your First Timer {sticky}

Prefix a movement with a time like `5:00` to run it as a countdown. The timer starts when you hit play and stops when the time is up.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/timer-1.md
  - set-state: note
```

`:30` is 30 seconds. `5:00` is 5 minutes. `1:30:00` is 90 minutes. Simple.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

## Step 4 — Rounds and Groups {sticky}

Wrap movements in `(N Rounds)` to repeat them. Indent everything inside the group.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
  - set-state: note
```

The runtime counts rounds automatically and shows you where you are in the sequence.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

## Step 5 — Your First AMRAP {sticky}

AMRAP — As Many Rounds As Possible. Set a time cap, mark the block `(AMRAP)`, and race the clock.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

When the time is up the runtime stops and logs the number of completed rounds and any partial reps.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

## Step 6 — Save and Review {sticky}

Every session you track is stored in your notebook. Open Review to see reps, times, and load side by side across sessions.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: review
```

```button
label:  See the Results View
target: z2h
pipeline:
  - set-state: review
```

## What's Next {sticky full-bleed dark}

You know the fundamentals. Dive deeper into the full syntax or open a blank note and start writing your own workouts.

```button
label:  Explore the Full Syntax →
target: z2h
pipeline:
  - navigate: /syntax
```

```button
label:  Open a New Note →
target: z2h
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
