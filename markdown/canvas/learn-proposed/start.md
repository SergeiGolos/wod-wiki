# First Workout

> Proposed chapter 1 of 8 — see [README](./README.md). Replaces `/guide/syntax/basics` + the syntax hub. Homepage entry points: hero "Start Lesson 1" → this page; "See the full syntax" → [#reference](#reference).

WOD Wiki turns a plain Markdown note into a workout you can **run** and a journal you can **query**. This chapter gets you from an empty note to your first tracked session — the same note the homepage uses.

## Fences {#fences}

A workout lives inside a fenced code block. Two fence tags matter:

- ```` ```time ```` — a session you intend to **run** with the clock.
- ```` ```log ```` — a session you are **recording** after (or while) it happened.

````markdown
```time
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```
````

Everything else in this chapter goes *inside* the fence. (Older pages describe "a `wod` block" — the runtime actually affords `time` and `log`; see [Sessions: intent](./sessions.md#intent).)

## Three rules {#first-workout}

1. **Fences** — wrap the workout in a ```` ```time ```` (or ```` ```log ````) block.
2. **One thing per line** — a line is a movement, a time, a group header, or a note.
3. **Indentation means nesting** — anything indented under a header belongs to it.

The smallest valid workout is one line:

```time
Pushups
```

No reps, no timer — the runtime asks how many you did when you finish. Add a number and the rep count is tracked automatically:

```time
10 Pushups
```

## Measures ride along {#measurements}

Loads and distances attach directly to movement lines; the runtime records them as metrics:

| Line | What it records |
|---|---|
| `5 Back Squat 225lb` | 5 reps × 225 lb per set |
| `5 Back Squat 100kg` | kilograms work exactly the same |
| `Run 400m` | 400 m distance |
| `10 miles` | bare distances work too |
| `5 Deadlifts ?lb` | load unknown — the clock prompts for the actual weight ([Capture](./metrics.md#capture)) |
| `5 Back Squat 225lb hard` | a plain-language effort word rides along |

## Instructions and asides {#actions-comments}

- **Actions** in square brackets are cue cards in the timer: `[Setup Barbell]` appears when reached, then the clock moves on.
- **Comments** start with `//` — passive annotations that never affect the clock.

```time
// Warmup — get loose
  400m Run
[Chalk up]
  10 Air Squats
```

## The running example {#try-it}

This is `home/sample-script.md` — the homepage's edit-me note, and the example every later chapter reuses:

```time
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```

**Run & observe.** Press **Run**. The clock counts three rounds of 10 swings with a required 30-second rest between them; each `Next` locks the elapsed time as a split. When the workout completes, the review grid shows 30 total swings at 24 kg — the raw material for [Metrics](./metrics.md).

## Compact syntax reference {#reference}

One table, the whole line grammar. Chapters 2–3 expand each row.

| You write | You get |
|---|---|
| ```` ```time ```` / ```` ```log ```` | runnable / recorded fence |
| `10 Pushups` | movement + reps |
| `5 Back Squat 225lb` | movement + reps + load |
| `Run 400m` / `10 miles` | movement + distance |
| `?lb` / `?kg` / `225lb ?lb` | capture-the-load prompt |
| `5:00 Run` / `^5:00 Row` | countdown / forced count-up |
| `*:30 Rest` | required rest block |
| `:?` | collect-the-actual prompt (`5:00 Run :?`) |
| `(3)` / `(3 Rounds)` / `(5 Sets)` | repeat the indented block |
| `(21-15-9)` | rep scheme — one round per value |
| `(Warmup)` or `// Warmup` | named section ([Structure](./structure.md#named-sections)) |
| `20:00 AMRAP` / `(10) :60 EMOM` / `(8)` + `:20`/`:10` | protocols ([Timers & Protocols](./protocols.md#amrap)) |
| `{"rpe": 8}` | inline custom metric ([Metrics](./metrics.md#custom-metrics)) |
| `[Setup Barbell]` / `// note` | cue card / comment |
| `hard`, `easy` | effort words |

**Where next:** [Timers & Protocols](./protocols.md) → [Structure & Rounds](./structure.md). Prefer generating? The [/ai-first](/ai-first) page shows AI-assisted note authoring. Back to the [homepage](/).
