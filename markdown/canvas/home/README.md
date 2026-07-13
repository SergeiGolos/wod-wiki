---
search: hidden
template: canvas
route: /
type: home
---

```chapter
id: basics
title: Basics
badge: trophy
quests: basics-movement, basics-reps, basics-load
sections: []
```

```chapter
id: structure
title: Structure
badge: blocks
quests: structure-rounds, structure-repscheme
sections: []
```

```chapter
id: protocols
title: Protocols
badge: timer
quests: protocols-timer, protocols-rounds, protocols-tag
sections: []
```

```chapter
id: complex
title: Complex Workouts
badge: puzzle
quests: complex-time, complex-rounds
sections: []
```

```chapter
id: custom-metrics
title: Custom Metrics
badge: activity
quests: metrics-custom, metrics-calc
sections: []
```

```chapter
id: dialects
title: Dialects
badge: file-text
quests: dialects-log, dialects-climb
sections: []
```

```quest
id: qs-arrive
label: Welcome to WOD Wiki
desc: You landed on the playground dashboard.
```

```quest
id: qs-edit
label: Change the workout
desc: Make any edit to the demo script.
```

```quest
id: qs-run
label: Run it to the finish
desc: Press Run and let the workout complete.
validation:
  type: workout-complete
```

# WOD Wiki {sticky dark full-bleed}

**Write it in Markdown. Run it as a Timer. Own the Analytics.**

WOD Wiki compiles a plain-text workout into a live `WallClock` timer, then logs every round straight back to your training journal — one file, one loop, no app-switching. Your first Quick-Start challenge is already complete: **welcome.**

```view
name:    home-demo
state:   note
source:  wods/examples/home/welcome-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## Jump Right In {sticky #jump-in theme:sky}

Skip the tour and start using the app now.

```button
label:  📓 Open Journal
pipeline:
  - navigate: /journal
```

```button
label:  🗂️ Browse Collections
pipeline:
  - navigate: /collections
```

```button
label:  ✍️ New Workout Note
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

## Learn the Syntax {sticky #learn theme:emerald}

Or keep scrolling to try the live demo and pick up the syntax as you go.

```button
label:  ▾ Try the Demo
pipeline:
  - set-source: wods/examples/home/welcome-1.md
  - set-state: note
```

```button
label:  🎓 Zero to Hero
pipeline:
  - navigate: /guide/syntax/basics
```

## What's Next {sticky full-bleed dark}

Ready to go deeper? Work through the tutorials, explore the full syntax reference, or open a new note.

```button
label:  🎓 Basics
pipeline:
  - navigate: /guide/syntax/basics
```

```button
label:  🧱 Structure & Reps
pipeline:
  - navigate: /guide/syntax/structure
```

```button
label:  ⏱️ Timers & Protocols
pipeline:
  - navigate: /guide/syntax/protocols
```

```button
label:  🧩 Complex Workouts
pipeline:
  - navigate: /guide/syntax/complex
```

```button
label:  📊 Custom Metrics
pipeline:
  - navigate: /guide/syntax/custom-metrics
```

```button
label:  📋 Dialects
pipeline:
  - navigate: /guide/syntax/dialects
```

```button
label:  ✍️ Open a New Note
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
