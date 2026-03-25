---
template: canvas
route: /
---

# WOD Wiki {sticky dark full-bleed}

Write workouts. Track them live. Review what you did.
WOD Wiki turns a simple markdown syntax into a real-time workout timer and result log — all in your browser.

```view
name:    hero-demo
state:   note
source:  wods/examples/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

```button
label:  Try It Live
target: hero-demo
pipeline:
  - set-state: track
```

```button
label:  Open Today's Workout
target: hero-demo
pipeline:
  - set-source: query:today
  - set-state: note
  - launch: dialog
```

## Write {sticky}

Describe your workout in plain text. No special app, no complicated interface — just a `wod` block inside a note.

```view
name:    write-demo
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

```command
target: write-demo
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

Add reps, timers, rounds, and weights using a readable syntax that stays out of your way.
[Learn the syntax →](/syntax)

## Track {sticky}

Hit play and WOD Wiki takes over. Your workout runs as a live timer — section by section, movement by movement.

```view
name:    track-demo
state:   track
source:  wods/examples/getting-started/timer-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

```command
target: track-demo
open:   view
pipeline:
  - set-source: wods/examples/getting-started/timer-1.md
  - set-state: track
```

```button
label:  See It Run
target: track-demo
open:   view
pipeline:
  - set-state: track
```

## Review {sticky}

After every session, your results are saved. See reps, load, and time for each movement. Compare across weeks.

```view
name:    review-demo
state:   review
source:  wods/examples/getting-started/groups-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

```command
target: review-demo
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
  - set-state: review
```

## Get Started {sticky full-bleed dark}

New to WOD Wiki? The Zero to Hero guide walks you through everything — from your first movement to a full AMRAP.

```button
label:  Zero to Hero →
target: hero-demo
pipeline:
  - navigate: /zero-to-hero
```

```button
label:  Browse the Syntax →
target: hero-demo
pipeline:
  - navigate: /syntax
```
