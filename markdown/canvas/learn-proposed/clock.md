# Run, Track & Capture (the Clock)

> Proposed chapter 5 of 8 — see [README](./README.md). Replaces `/guide/behaviors` (hub + the runtime halves of timers.md and capture.md). Homepage: the Run-section "behaviors explainer" caption and the cast caption (`#casting`) link here.

Syntax is the plan; **behaviors** are what the runtime does with it. When you press Run, the compiler turns every line into a timeline of behaviors and the clock plays them in order.

## From script to clock {#run-next}

1. **Script** — your Markdown note with fenced blocks.
2. **Parse** — the grammar turns each line into statements of metrics.
3. **Compile** — statements match to behaviors and lay out a timeline.
4. **Track** — the clock steps through the timeline: counting, prompting, logging.

Three behavior families cover every line:

| Family | What it does | Example line | On the clock |
|---|---|---|---|
| **Timers** | counts up or down, repeats, rings | `20:00 AMRAP` | countdown + round counter |
| **Rounds** | repeats, names, walks a rep scheme | `(21-15-9)` | three rounds with descending reps |
| **Capture** | asks for actuals | `225lb ?lb`, `:?` | prompt when reached or finished |

**Run** starts the current block; **Next** advances it and locks the elapsed time as a **split** — every click records where you are. Timers choose their strategy from the line ([chapter 2](./protocols.md#countdown-countup)): duration → countdown, `^` or no duration → count-up stopwatch, `EMOM`/work-rest pair → interval, the word `Rest` → rest cue.

## Pause, skip, and sound {#pause-skip}

- **Pause / resume** — countdowns stop and resume from the same elapsed time; interval timers keep round state, so an EMOM window never restarts from zero.
- **Skip** — any timer without `*` can be skipped. `*:30 Rest` cannot; required timers force the full wait.
- **Sound** — the runtime emits sound cues at timer start, the final ten seconds, and round transitions; audio surfaces subscribe to them.

A movement line without a duration is not "no timer" — it's a count-up stopwatch tracking that block while you log reps.

## Capture prompts {#capture-prompts}

Collectible placeholders (`?lb`, `:?`, `?m`, `?`) mark the values the plan doesn't know; you supply the actuals during capture, and each lands in the fact store with its block. Session RPE is captured after the workout — skippable, and never blocking a save. Every recorded value carries a declared origin — see [#provenance](#provenance).

## Casting {#casting}

The clock casts to a big screen: the timer surface — current block, round counter, countdown, cue cards — renders on a paired display while the controls stay on your device. Timers, cue cards (`[Change Plates]`), and round indicators all cross over; pauses on the device pause the cast.

## Provenance {#provenance}

Every recorded fact carries its origin, which later tells analytics what to trust:

| Origin | Producer | Example |
|---|---|---|
| `parser` / `compiler` | from your text | planned `24kg`, rep scheme values |
| `runtime` | the clock | elapsed spans, splits, round counts |
| `user` | you, at a prompt | captured loads, `:?` results, session RPE, wellness entries |
| `analyzed` | the calc engine | `calc.*` values (estimated ones are marked `analyzed-estimated`) |

**Run & observe.** Run the shared `(3) × 10 Kettlebell Swings 24kg / *:30 Rest` note and try each control: pause mid-round (elapsed freezes, resumes exactly), attempt to skip the `*` rest (refused), then `Next` through the last round — each split is locked with its timestamp. The review grid afterwards is just this provenance trail, organized. Next: [WQL](./wql.md) — querying everything the clock recorded.
