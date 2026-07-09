---
search: hidden
template: canvas
route: /
type: home
---

# WOD Wiki {sticky dark full-bleed}

**Write it in Markdown. Run it as a Timer. Own the Analytics.**

WOD Wiki compiles a plain-text workout into a live `WallClock` timer, then logs every round straight back into your training journal — one file, one loop, no app-switching.

It's local-first and open source — your workouts are markdown files you keep, not rows in someone else's database — and fully extensible with [custom dialects](/guide/syntax/dialects) when the built-in grammar doesn't fit your sport.

Scroll down for the interactive walkthrough, or jump straight in:

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

{{hero-carousel}}

```view
name:    home-demo
state:   note
source:  wods/examples/home/welcome-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## The Whiteboard Script {sticky #statement theme:violet}

This is a Whiteboard Script — the same markdown you just scrolled past, now live in the editor on the right. Edit it, then press Run.

### 1 · Plan

Write the workout and notes in free-form Markdown.

Whiteboard blocks are fenced ``` Markdown. Change `10 Pushups` to `12` — tracked effort for later analytics reflects that.

### 2 · Run

Press **Run** to fire up the WallClock — a live timer that tracks your effort.

```button
label:  Try It →
target: home-demo
pipeline:
  - set-state: track
```

### 3 · Analytics

The result lands in the same table shape.
A ResultsView row with the columns you already use: Date · Effort · Reps · Volume · MET-min · TIS. The Rep cell is the same metric, with a new user-origin value.



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

## Own Your Data {sticky #data theme:sky}

Every workout, note, and result is a plain markdown file on your machine — not a row locked inside someone else's database. Sync it with git, back it up yourself, or read it in any text editor, forever.

WOD Wiki is fully open source. Fork it, self-host it, or send a pull request.

```button
label:  View on GitHub ↗
target: home-demo
pipeline:
  - navigate: https://github.com/SergeiGolos/wod-wiki
```

## Custom Dialects {sticky #dialects theme:rose}

Fence types like `wod` and `log` tell the runtime what kind of note it's looking at — a workout to run, or a session to record. Don't like the defaults? Author your own dialect and the parser, tracker, and analytics all pick it up automatically.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/syntax/dialect-wod.md
  - set-state: note
```

```button
label:  Explore Dialect Examples →
target: home-demo
pipeline:
  - navigate: /guide/syntax/dialects
```

## What's Next {sticky full-bleed dark}

Ready to go deeper? Work through the six-step guide, explore the full syntax reference, or star the project on GitHub.

```button
label:  Zero to Hero →
target: home-demo
pipeline:
  - navigate: /guide/getting-started
```

```button
label:  View on GitHub ↗
target: home-demo
pipeline:
  - navigate: https://github.com/SergeiGolos/wod-wiki
```
