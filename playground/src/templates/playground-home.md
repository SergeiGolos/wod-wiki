
```widget:attention
{
  "headline": "Wod.Wiki Playground",
  "subtitle": "An interactive scratchpad for whiteboard-script — a plain-text fitness language.",
  "pillars": [
    {
      "icon": "✍️",
      "label": "Write",
      "description": "Build any workout in plain text without a complex form builder."
    },
    {
      "icon": "▶",
      "label": "Run",
      "description": "Launch the timer, track rounds, and capture results from the same page."
    },
    {
      "icon": "📊",
      "label": "Analyze",
      "description": "Inspect workout structure, intensity, and completion details as you iterate."
    }
  ],
  "actions": [
    {
      "label": "Try Example",
      "action": "scroll-to-workout",
      "variant": "primary"
    },
    {
      "label": "Find a Workout",
      "action": "open-search",
      "variant": "secondary"
    }
  ]
}
```

```widget:code-example
{
  "lines": [
    {
      "code": "(3)",
      "annotation": "repeat the indented workout block 3 times"
    },
    {
      "code": "  10 Kettlebell Swings 24kg",
      "annotation": "reps · movement · load"
    },
    {
      "code": "  *:30 Rest",
      "annotation": "rest timer between rounds"
    }
  ],
  "cta": "Run this example"
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

## Syntax Reference

```widget:syntax-group
{
  "category": "rounds",
  "icon": "🔄",
  "title": "Rounds",
  "description": "Repeat a block of movements a fixed number of times for circuits and strength work.",
  "example": "(3)\n  10 Squats\n  8 Push-ups",
  "docsPath": "/syntax/structure?h=simple-rounds"
}
```

```widget:syntax-group
{
  "category": "timers",
  "icon": "⏱️",
  "title": "Timers & Rest",
  "description": "Use countdowns, rests, and time caps to control pacing and work-rest structure.",
  "example": "AMRAP 12:00\n  5 Burpees\n  *:30 Rest",
  "docsPath": "/syntax/protocols?h=timers-and-rest"
}
```

```widget:syntax-group
{
  "category": "movements",
  "icon": "🏋️",
  "title": "Movements",
  "description": "Combine reps, exercise names, and optional loads on a single readable line.",
  "example": "15 Thrusters 65lb\n20 Push-ups\n25 Air Squats",
  "docsPath": "/syntax/basics?h=measurements"
}
```

```widget:syntax-group
{
  "category": "rep-schemes",
  "icon": "📉",
  "title": "Rep Schemes",
  "description": "Model benchmark ladders and descending sets like 21-15-9 with minimal syntax.",
  "example": "21-15-9\n  Thrusters 95lb\n  Pull-ups",
  "docsPath": "/syntax/structure?h=rep-schemes"
}
```

```widget:syntax-group
{
  "category": "section-labels",
  "icon": "🏷️",
  "title": "Section Labels",
  "description": "Name warm-ups, strength blocks, and finishers with headings that show up in navigation.",
  "example": "## Warm-up\n## Strength\n## Conditioning\n## Cool-down",
  "docsPath": "/syntax/structure?h=named-groups"
}
```

---

Try editing the Morning Strength workout above — change `(3)` to `(5)` for five rounds, swap `24kg` for `32kg`, or add a new movement on a new line. Then press [▶ Run Workout]{.button action=start-workout} to start the timer.

Full reference → [/syntax](/syntax)

$CURSOR
