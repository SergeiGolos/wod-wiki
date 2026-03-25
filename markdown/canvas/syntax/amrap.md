---
template: canvas
route: /syntax/amrap
---

# AMRAP {sticky dark full-bleed}

**As Many Rounds As Possible.** Set a time cap, mark the block `(AMRAP)`, and race the clock.
The timer counts down. The runtime counts your rounds. Log your score when the buzzer sounds.

```view
name:    ex
state:   note
source:  wods/examples/getting-started/protocols-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Classic AMRAP {sticky}

A time followed by `(AMRAP)` on the next indented level. Write your movements below that.

```command
target: ex
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## AMRAP with a Time Cap {sticky}

A bare time on a line without `(AMRAP)` creates a time cap — the runtime stops the workout when the clock runs out, even if you haven't finished.

```command
target: ex
pipeline:
  - set-source: wods/syntax/amrap.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Multiple AMRAPs {sticky}

Chain several AMRAP blocks in one note. Each gets its own countdown and round count. Useful for partner or team workouts with alternating windows.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Rounds and Groups
target: ex
pipeline:
  - navigate: /syntax/groups
```

```button
label:  EMOM →
target: ex
pipeline:
  - navigate: /syntax/emom
```
