---
search: hidden
template: canvas
route: /
type: home
---

```chapter
id: home-tour
title: Take the Tour
badge: play
quests: qs-arrive, qs-edit, qs-run, qs-tour-timer, qs-tour-analytics
sections: []
```

```chapter
id: basics
title: Basics
badge: trophy
quests: basics-movement, basics-reps, basics-load
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
id: structure
title: Structure
badge: blocks
quests: structure-rounds, structure-repscheme
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

```chapter
id: complex
title: Complex Workouts
badge: puzzle
quests: complex-time, complex-rounds
sections: []
```

```quest
id: qs-arrive
label: Welcome to WOD Wiki
desc: You landed on the playground dashboard.
```

```quest
id: qs-tour-timer
label: See the timer run it
desc: Let the demo timer reach a running state in the WallClock stage.
validation:
  type: run-started
```

```quest
id: qs-tour-analytics
label: Review the session
desc: Scroll through the analytics stage of the home tour.
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
