---
search: hidden
template: canvas
route: /
type: home
---

# WOD Wiki {sticky dark full-bleed}

```view
name:    home-demo
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## The Whiteboard Script {sticky #statement theme:violet}

The script on the right is part of this wiki, not a screenshot. Click into it, change the reps, movements, weights, or rest, and use the examples as a safe scratchpad while you learn how WOD Wiki works.

Write workouts in plain text — the parser turns notes into live timers, round counters, and session logs.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

**Try it:** A single movement on one line is a complete workout statement.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

## Metrics {sticky #metrics density:compact theme:emerald}

Add reps, load, and distance to any movement — the parser understands all three.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

```example
label: With distance
source: wods/examples/getting-started/metrics-3.md
```

`10 Pushups`, `5 Deadlift 225lb`, `Run 400m` — all valid.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

## Timers {sticky #timer theme:amber}

Prefix a movement with a time to run it as a countdown timer.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/timer-1.md
  - set-state: note
```

`:30` is 30 seconds. `5:00` is 5 minutes. `1:30:00` is 90 minutes.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

## Groups {sticky #groups theme:sky}

Wrap movements in `(N Rounds)` to repeat them — indent everything inside the group.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
  - set-state: note
```

The runtime counts rounds automatically and shows your position in the sequence.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

## Protocols {sticky #protocols theme:rose}

AMRAP — As Many Rounds As Possible. Set a time cap and race the clock.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

When the cap hits, the runtime stops and logs completed rounds and partial reps.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

Ready to go deeper? Work through the six-step guide or explore the full syntax reference.

```button
label:  Zero to Hero →
target: home-demo
pipeline:
  - navigate: /guide/getting-started
```

```button
label:  Explore Full Syntax →
target: home-demo
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Open a New Note →
target: home-demo
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
