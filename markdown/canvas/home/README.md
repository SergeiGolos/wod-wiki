---
template: canvas
route: /
---

# WOD Wiki {sticky dark full-bleed}

## Your workout — written once, run forever.
WOD Wiki is a workout studio for coaches, trainers, and home gym enthusiasts. Write your session in a simple notation, hit play, and let the timer do the rest. Every rep, every round, tracked automatically.

```button
label:  Try it Now
target: hero-demo
pipeline:
  - set-state: track
```

```button
label:  Open Journal →
pipeline:
  - navigate: /journal
```

## Pillars {full-bleed}

### ✍️ Write Like a Coach
Plan sessions in plain text, exactly the way coaches whiteboard workouts — reps, rounds, distances, rest. No forms, no dropdowns.

### ⏱ Smart Timer Runs the Show
Hit play and follow along. The timer knows when each round ends, when to rest, and what's coming next.

### 📊 Analytics That Make Sense
See your work calculated — total volume, time under load, intensity. Pre-workout estimates, post-workout totals.

## Live Demo {sticky}

### Act 1 — Write the Plan
Start with what you're going to do. WOD Wiki reads like a whiteboard — rounds, reps, load, or time. That's it.

```view
name:    write-demo
state:   note
source:  markdown/canvas/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

**Parsing**
Under the hood, each line becomes a typed statement. Reps are counted. Weights are tracked. Timers are discovered automatically.

**Dialects**
Dialects let WOD Wiki understand shorthand — CrossFit notation, swim yard totals, kettlebell volume. The same syntax works for every discipline.

### Act 2 — Track the Workout
Hit run. The smart timer counts down each block, advances automatically, and keeps you in the flow state.

```view
name:    track-demo
state:   track
source:  markdown/canvas/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

**Live Metrics**
As you work, values are collected per block. Total reps accumulate. An overlay shows your progress through the workout.

### Act 3 — Review the Results
When the last round finishes, your results appear immediately. Volume, intensity, durations — all ready without any manual entry.

```view
name:    review-demo
state:   review
source:  markdown/canvas/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

**Share or Save**
Results live in your browser's local IndexedDB — your data, your device, no account required. Export anywhere, anytime.

## Features {full-bleed dark}

### ⏱ Smart Timer
- Counts up / down / interval based on your script
- Automatic advance between blocks
- Audio and visual cues for transitions
- Full-screen mode during workouts

### 📊 Pre & Post Analytics
- **Pre-run**: estimated time, total reps, projected volume
- **Post-run**: actual vs. estimated, intensity graph, per-block breakdown

### 📺 Chromecast — Home Gym Ready
- Cast the timer to any TV in your gym with one click
- Full-screen display readable from across the room

### 🗂 Collections & Library
- Organize workouts into named collections
- Browse by category (strength, cardio, mobility)

## Browse the Library {sticky}

Hundreds of ready-to-run workouts across every discipline. Click any card to load it in the editor and run immediately.

```view
name:    browse-demo
state:   browse
source:  markdown/collections/
runtime: in-memory
launch:  host
align:   full
```

## Ready to write your own? {full-bleed dark}

The syntax takes about 10 minutes to learn. The deep-dive guide walks you from your first statement to complex interval protocols.

```button
label:  Start Zero to Hero →
pipeline:
  - navigate: /getting-started
```

## Start your training journal. {full-bleed}

Every workout you run is automatically logged. Open today's journal entry and add your notes, load records, and session intentions — all in the same syntax.

```button
label:  Open Today's Journal →
pipeline:
  - navigate: query:today-journal
```

No cloud required. Your data stays on your device. Export or import any time.
