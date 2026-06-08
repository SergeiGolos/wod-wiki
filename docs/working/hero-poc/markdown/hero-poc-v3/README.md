---
search: hidden
template: canvas
route: /hero-poc/v3
type: hero-poc
---

# The runnable Markdown. {sticky dark full-bleed}

The same Markdown, two surfaces: an editor on the left that you can edit
freely, a Run rail on the right that you can act on. The rail is the
*entire* Phase 2 — there is no separate "WallClock screen" in the hero, the
buttons are the affordance.

```view
name:    hero-v3
state:   note
source:  wods/examples/getting-started/protocols-1.md
runtime: in-memory
launch:  host
align:   right
width:   50%
```

## The run rail {sticky #rail theme:emerald}

The rail is the real `useWodBlockCommands` set in button form. Hover or
click any of these to act on the block.

```button
label:  ▶ Run this block
target: hero-v3
pipeline:
  - set-state: track
```

```button
label:  + Add to today
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  📅 Schedule
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  ↗ Open in playground
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: track
```

```button
label:  ⤴ Share block
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

## The result row {sticky #row density:compact theme:amber}

The result row uses the real `cdlColumnDefinitions` headings: *Date · Effort
· Reps · Volume · MET-min · TIS*. Switch between the three wod lines below
to see the matching `Rep` cell light up.

```example
label: Pullups (5)
source: wods/examples/getting-started/metrics-1.md
```

```example
label: Pushups (10)
source: wods/examples/getting-started/protocols-1.md
```

```example
label: Air Squats (15)
source: wods/examples/getting-started/statement-1.md
```

```button
label:  See the row →
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: track
```

## The note {sticky #note theme:violet}

A `wod` block, a Run rail, and a result row — all in the same canvas page.
The note on the right is real Markdown; the rail is real commands; the row
is real column definitions.

```command
target: hero-v3
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

## Why this works {sticky full-bleed dark}

All three — note, run rail, row — share the same `Rep` cell. Edit the
number in the note, the row's `Rep` column updates on the next keystroke.
