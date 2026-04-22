---
search: hidden
template: canvas
route: /syntax/emom
---

# EMOM {sticky dark full-bleed}

**Every Minute on the Minute.** The total duration is divided into one-minute windows.
Finish your reps before the buzzer — the timer resets regardless.

```view
name:    ex
state:   note
source:  wods/syntax/emom.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Basic EMOM {sticky}

Total duration followed by `(EMOM)`. The runtime splits it into 1-minute intervals and restarts the countdown each minute.

```command
target: ex
pipeline:
  - set-source: wods/syntax/emom.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Longer Intervals {sticky}

`Every 2:00` creates 2-minute windows instead of 1-minute. Use this for heavier work that needs more recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Alternating EMOM {sticky}

Two movement groups inside an EMOM — the runtime alternates between them each minute: odd minutes for movement A, even minutes for movement B.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← AMRAP
target: ex
pipeline:
  - navigate: /syntax/amrap
```

```button
label:  Tabata and Intervals →
target: ex
pipeline:
  - navigate: /syntax/tabata
```
