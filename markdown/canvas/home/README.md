---
search: hidden
template: canvas
route: /
type: home
---
```scroll
runway: 860vh
screen: editor
typewriter: true
stages:
  - id: editor-blank
    range: [0.0, 0.15]
    screen: editor
    source: wods/examples/home/welcome-1.md
    caption: "Start with a Blank Page. Freeform entry & WOD fences. WOD Wiki notes are freeform Markdown. To get live timer execution and metric tracking, open a fenced block with triple backticks — ```time for workouts or ```wql for queries."
    ring:
      key: editor.window
      tag: "Live Editor"
  - id: editor-metrics
    range: [0.15, 0.30]
    screen: editor
    source: wods/examples/home/welcome-1.md
    caption: "Every Line Collects Metrics. Reps, distance & load. Each line defines the metric types the runtime will collect: rep counts (15 Swings), distance (400m Run), load resistance (24kg, 225lb), and timed rest (*:30 Rest)."
    ring:
      key: editor.wodBlock
      tag: Line Metrics
  - id: editor-run
    range: [0.30, 0.45]
    screen: editor
    source: wods/examples/home/welcome-1.md
    caption: "Press Run to Execute. Launch the working clock. Click Run in the editor header (or keep scrolling) to launch the WallClock timer and watch the script turn into an active workout."
    ring:
      key: editor.runButton
      tag: Run Button
  - id: timer-wallclock
    range: [0.45, 0.60]
    screen: timer
    source: wods/examples/home/welcome-1.md
    caption: "What Happens When It Runs. The script becomes the clock. The WallClock runs your exact script — stepping through reps, distance, and load lines at your own pace without forced countdown caps."
    ring:
      key: timer.floor
      tag: WallClock
  - id: timer-cast
    range: [0.60, 0.72]
    screen: timer
    source: wods/examples/home/welcome-1.md
    caption: "Cast to Any Screen. Your phone stays the remote. One tap casts the active workout steps to a Chromecast or secondary monitor via zero-lag RPC transport."
    ring:
      key: timer.cast
      tag: Chromecast
  - id: analytics-scorecard
    range: [0.72, 0.86]
    screen: analytics
    source: wods/examples/home/welcome-1.md
    caption: "Explore Your Data. Query what you just did. Total reps, total distance (meters), and load volume collected from this workout are calculated and written straight into your journal."
    ring:
      key: analytics.scorecard
      tag: Scorecard
  - id: analytics-grid
    range: [0.86, 1.00]
    screen: analytics
    source: wods/examples/home/welcome-1.md
    caption: "Session Log & Review. Analyze every set and split. Drill into individual rounds, distance splits, load overrides, and WQL metrics collected during execution."
    ring:
      key: analytics.grid
      tag: Review Grid
```


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
