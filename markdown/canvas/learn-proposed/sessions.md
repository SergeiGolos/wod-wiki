# Dialects & Complex Sessions

> Proposed chapter 8 of 8 — see [README](./README.md). Replaces `/guide/syntax/dialects` + `/guide/syntax/complex` and their tab pages. Homepage: the CelebrationBridge chapter row ends here.

Everything you've learned composes. This chapter covers the fence flavors and the session shapes that combine them.

## Intent and the fence {#intent}

A fence tells WOD Wiki what a block **is**, while the line grammar stays the same:

| Fence | Intent | Behavior |
|---|---|---|
| ```` ```time ```` | a session to **run** — the workout of the day, or tomorrow's plan | runnable with the clock ([the Clock](./clock.md)) |
| ```` ```log ```` | a **record** of what happened — performed work, notes, subjective effort | preserved as-is; no timer expectations |
| ```` ```log:climbing ```` | a log in a **sport dialect** — climbing signals (grades, send types, attempts, high points) become explicit metrics | same `log` semantics + the climbing dialect |

Whether a ```time block is today's workout or tomorrow's plan is your call — the syntax is identical, and unknown loads stay as `?lb` placeholders until execution either way.

> **Needs validation:** older pages speak of ```` ```wod ````/```` ```plan ````/```` ```climb ```` fences. The runtime currently affords `time` and `log` (with `:sport` suffixes); treat *wod/plan/climb* as intent vocabulary, not fence names, until the fence set changes.

The suffix is a sport name or dialect id — `climbing` maps to the `climb` dialect. An unknown suffix warns and falls back to the full dialect stack, so a typo never loses your data.

## Full session {#full-session}

Warmup → strength → conditioning → cool-down in one note ([section labeling](./structure.md#named-sections)):

```time
// Warmup
  400m Run
  10 Air Squats

// Strength
  (5 Sets)
    3 Back Squat 225lb
    *2:00 Rest

// Conditioning
  10:00 AMRAP
    5 Pullups
    10 Pushups

// Cool-down
  5:00 Walk
```

## Nested protocols {#nested}

An outer round can wrap a timed block and a strength block; groups run sequentially and the runtime handles transitions:

```time
(3)
  5:00 AMRAP
    5 Pullups
    10 Pushups
// Strength
  3 Back Squat 225lb
  *2:00 Rest
```

## Partner sessions {#partner}

Separate labeled windows keep each partner's work distinct while sharing the document:

```time
// Partner A
  5:00 AMRAP
    5 Pullups
    10 Pushups

// Partner B
  5:00 AMRAP
    10 Air Squats
    8 Burpees
```

## Swimming {#swimming}

Multi-set interval work with named sets and distance measures:

```time
(4) Power Sprints
  25m Freestyle Sprint
  1:30 Rest

(6) IM Main Set
  100m IM
  :45 Rest

150m Cooldown
```

## Barbell cycling {#barbell-cycling}

Back-to-back EMOM windows with changing loads — cue cards prompt the plate change between blocks:

```time
(5) :60 EMOM
  3 Power Clean 135lb

[Change Plates]

(5) :60 EMOM
  2 Power Clean 155lb
```

## Climbing and logging {#climbing}

A ```log fence records what happened — effort words, properties, and comments included:

```log
date: 2026-05-25
rpe: 7

5 Back Squat 225lb hard
// Bar speed slowed on set 3.
```

With the climbing suffix, plain text becomes structured signals — grades, send types, attempt counts, high points, and discipline stay readable as Markdown but queryable via `grade`, `calc.sends`, and friends ([finger-strength board](./dashboards.md#seeded-boards)):

```log
Night session. Sent "Midnight Lightning" V8, 3 attempts. High point on the 5.12a proj.
```

**Run & observe.** The full session above is the review milestone: run it end to end — four sections, required rest, an AMRAP window, a cooldown — then open [your dashboard](./dashboards.md#seeded-boards) and find the session in this week's volume. That's the whole language: [start](./start.md) → [protocols](./protocols.md) → [structure](./structure.md) → [metrics](./metrics.md) → [clock](./clock.md) → [wql](./wql.md) → [dashboards](./dashboards.md) → this.
