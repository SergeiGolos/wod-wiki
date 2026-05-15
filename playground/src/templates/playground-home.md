```widget:attention
{
  "headline": "Wod.Wiki Playground",
  "subtitle": "An interactive scratchpad for whiteboard-script, a plain-text fitness scripting language. Edit workouts, run them, track results — no account needed.",
  "pillars": [
    {
      "icon": "⚡",
      "label": "Edit in Plain Text",
      "description": "Write workouts in simple, readable syntax. No complex UI — just markup."
    },
    {
      "icon": "▶",
      "label": "Run & Track",
      "description": "Start the timer, execute your workout, and capture results in real-time."
    },
    {
      "icon": "📚",
      "label": "Learn Syntax",
      "description": "Explore rounds, timers, rep schemes, movements — everything in the docs."
    }
  ],
  "actions": [
    {
      "label": "Browse Workouts",
      "action": "scroll-to-workout",
      "variant": "primary"
    },
    {
      "label": "Search",
      "action": "open-search",
      "variant": "secondary"
    }
  ]
}
```

# Morning Strength

```widget:playground-run-tip
{}
```

```wod
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```

[▶ Run Workout]{.button action=start-workout} [New Note]{.button action=new-note variant=secondary}

---

## How the syntax works

```widget:code-example
{
  "lines": [
    {
      "code": "(3)",
      "annotation": "3-round circuit — repeat the indented block 3 times"
    },
    {
      "code": "10 Kettlebell Swings 24kg",
      "annotation": "10 reps · exercise name · load (optional)"
    },
    {
      "code": "*:30 Rest",
      "annotation": "30-second rest countdown between rounds"
    }
  ],
  "cta": "Run Example"
}
```

### Core Syntax Concepts

```widget:syntax-group
{
  "category": "Rounds & Repeats",
  "icon": "🔄",
  "title": "Rounds",
  "description": "Repeat the indented block a fixed number of times. Useful for circuits and strength blocks.",
  "example": "(5)\n  15 Thrusters 65lb\n  10 Pull-ups\n  5 Burpees",
  "docsPath": "/docs/syntax#rounds"
}
```

```widget:syntax-group
{
  "category": "Timed Efforts",
  "icon": "⏱",
  "title": "AMRAP (As Many Rounds As Possible)",
  "description": "Complete as many full rounds as possible within a time window. Track reps for intensity.",
  "example": "AMRAP 15:00\n  5 Deadlifts 185lb\n  10 Box Jumps 24in\n  15 Calories Row",
  "docsPath": "/docs/syntax#amrap"
}
```

```widget:syntax-group
{
  "category": "Timed Efforts",
  "icon": "⏱",
  "title": "For Time",
  "description": "Complete all reps as fast as possible and record elapsed time. Good for benchmarking.",
  "example": "21-15-9\n  Thrusters 95lb\n  Pull-ups",
  "docsPath": "/docs/syntax#rep-schemes"
}
```

```widget:syntax-group
{
  "category": "Movement Syntax",
  "icon": "💪",
  "title": "Movements",
  "description": "Specify exercise name, rep count, and optional load. Load is always optional.",
  "example": "15 Thrusters 65lb\n20 Push-ups\n25 Air Squats",
  "docsPath": "/docs/syntax#movements"
}
```

```widget:syntax-group
{
  "category": "Organization",
  "icon": "📋",
  "title": "Section Labels",
  "description": "Use headings (##, ###) to organize workouts into named sections. They appear in the navigation panel.",
  "example": "## Warm-up\n## Strength\n## Conditioning\n## Cool-down",
  "docsPath": "/docs/syntax#sections"
}
```

---

Try editing the Morning Strength workout above — change `(3)` to `(5)` for five rounds, swap `24kg` for `32kg`, or add a new movement on a new line. Then press [▶ Run Workout]{.button action=start-workout} to start the timer.

Full reference → [whiteboard-script syntax docs](https://wod.wiki/syntax)

$CURSOR
