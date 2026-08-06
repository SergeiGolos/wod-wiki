---
search: hidden
template: canvas
route: /guide/syntax/protocols
type: syntax
---

```chapter
id: protocols
title: Protocols
badge: timer
quests: protocols-run, protocols-timer, protocols-rounds, protocols-tag
sections: []
```

```quest
id: protocols-run
label: Run the First Example
validation:
  type: run-started
```

```quest
id: protocols-timer
label: Add a rest or time cap
validation:
  type: has-timer
```

```quest
id: protocols-rounds
label: Add a 3-round cap
validation:
  type: min-rounds
  count: 3
```

```quest
id: protocols-tag
label: Add a workout tag
validation:
  type: contains-token
  value: AMRAP
```

```scroll
runway: 840vh
screen: editor
typewriter: true
stages:
  - id: timers-rest
    range: [0, 0.08]
    source: wods/examples/syntax/timers-rest.md
    caption: "A bare duration (`5:00 Run`, `:30 Plank`) counts down from that time. Movements without a time prefix count up from zero. Use `*` to mark a timer as required — the rest behavior comes from the word `Rest`, not from `*` alone."
    quest: protocols-timer
    ring:
      tag: "*:30 Rest"
  - id: timer-modifiers
    range: [0.08, 0.16]
    source: wods/examples/syntax/timer-modifiers.md
    caption: "Use `^` to force a timer to count up instead of down, `*` to mark it non-skippable, and `:?` when you want the runtime to record the actual time taken."
  - id: longer-durations
    range: [0.16, 0.23]
    source: wods/examples/syntax/longer-duration.md
    caption: "Use `H:MM:SS` format for anything over an hour. `1:30:00 Row` is a 90-minute row — the runtime preserves the longer countdown without changing syntax rules."
  - id: mixed-timers
    range: [0.23, 0.30]
    source: wods/examples/syntax/mixed-timers.md
    caption: Combine countdowns, untimed work, forced rest, and collectible timers in one note.
  - id: classic-amrap
    range: [0.30, 0.40]
    source: wods/examples/syntax/classic-amrap.md
    caption: "**As Many Rounds As Possible.** Set a time cap, mark the block `AMRAP`, and race the clock. `20:00 AMRAP` is the canonical guide form."
    quest: protocols-rounds
    toast: 20:00 AMRAP
  - id: amrap-time-cap
    range: [0.40, 0.47]
    source: wods/examples/syntax/time-cap.md
    caption: A bare time on a line without `AMRAP` creates a time cap for the work nested beneath it.
    quest: protocols-tag
  - id: multiple-amrap
    range: [0.47, 0.54]
    source: wods/examples/syntax/multiple-amrap-windows.md
    caption: Chain several AMRAP blocks in one note. Each window gets its own countdown and round count — useful for interval-style conditioning.
  - id: basic-emom
    range: [0.54, 0.62]
    source: wods/examples/syntax/basic-emom.md
    caption: "**Every Minute on the Minute.** Combine a rounds count, an interval timer, and the `EMOM` label. `(10) :60 EMOM` is the canonical guide form."
    toast: (10) :60 EMOM
  - id: longer-intervals
    range: [0.62, 0.68]
    source: wods/examples/syntax/longer-intervals.md
    caption: Use a larger interval when a heavier movement or transition needs built-in recovery. `(5) 2:00 EMOM` gives five two-minute windows.
  - id: alternating-emom
    range: [0.68, 0.74]
    source: wods/examples/syntax/alternating-emom.md
    caption: Separate branches inside the EMOM let the runtime rotate between different tasks across the interval windows.
  - id: tabata
    range: [0.74, 0.82]
    source: wods/examples/syntax/protocols-4.md
    caption: "Intervals combine a work period and a rest period, repeated for a set number of rounds. A standard Tabata is `(8 Rounds)` with `:20` work and `:10 Rest` inside."
    ring:
      tag: ":20 / :10"
  - id: custom-intervals
    range: [0.82, 0.88]
    source: wods/examples/syntax/custom-intervals.md
    caption: "Change the round count, work duration, or rest duration to any values. `:40` work / `*:20 Rest` over `(5 Rounds)` is a popular alternative."
  - id: distance-intervals
    range: [0.88, 0.93]
    source: wods/examples/syntax/distance-intervals.md
    caption: Pair a timed work interval with a distance target, then follow it with timed recovery.
  - id: next
    range: [0.93, 1.0]
    caption: Timers, caps, AMRAPs, EMOMs, Tabatas — every protocol is the same few tokens. Continue below for complex workouts.
```

# Timers & Protocols {sticky dark full-bleed}

Prefix any movement with a duration to turn it into a timed block. Timers combined with specific workout structures create powerful protocols like AMRAP, EMOM, and Tabata.

## What's Next {sticky full-bleed dark}

```button
label:  ← Core Concepts
target: ex
pipeline:
  - navigate: /guide/syntax/basics
```

```button
label:  Structure & Rep Schemes →
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```
