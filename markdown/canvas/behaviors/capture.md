---
search: hidden
template: canvas
route: /guide/behaviors/capture
type: behavior
---

# Capture & Feedback {sticky dark full-bleed}

Capture behaviors ask for the data that analytics needs. The clock already knows the plan; it uses capture prompts to learn what actually happened.

## Record-actual prompts `:?` {sticky}

Append `:?` to a line to tell the runtime: "after this block, ask me for the actual result." The prompt appears when the block finishes and stores the value as a metric.

| Line | What the clock asks |
|---|---|
| `5:00 Run :?` | Actual distance covered in the 5 minutes |
| `(3 Rounds) 10 Burpees :?` | Total burpees completed, or reps per round |
| `For Time :?` | Total elapsed time |

`:?` is a **post-block feedback** behavior. It does not change the timer; it attaches a question to the end of it.

## Load prompts `?lb` {sticky}

A load with a question mark means the value is not known yet. When the movement is reached, the clock prompts you to enter the actual load.

| Line | What happens |
|---|---|
| `?lb Back Squat` | Prompt for load before the first squat |
| `225lb ?lb Deadlift` | Suggest 225 lb, but allow editing |
| `?kg Clean` | Prompt in kilograms |

The logged load feeds trendlines, estimated one-rep maxes, and PR detection. If you log the same movement across sessions, the analytics layer can show progression.

## Session RPE {sticky}

After a workout finishes, the review surface can ask for a **Rate of Perceived Exertion** (RPE) or **Reps in Reserve** (RIR). This is a session-level capture behavior. It is skippable and does not block saving the result.

The value is stored as a metric on the session, so you can query it later:

```text
avg:wod.rpe by {week}
```

## Trendline and advance {sticky}

Capture behaviors are the bridge between the clock and the analytics layer. Every captured value becomes a fact in the fact store with a declared origin: parser, compiler, runtime, or user.

Over time, the same capture produces a trendline:

- `?lb Back Squat` across weeks → volume and estimated 1RM.
- `:? For Time` on the same benchmark → time progression.
- `rpe` on every session → weekly average intensity.

The clock asks during the workout so the analytics can answer after it.

## What's Next {sticky full-bleed dark}

```button
label:  ← Rounds & Structure
target: ex
pipeline:
  - navigate: /guide/behaviors/rounds
```

```button
label:  ← Behaviors Index
target: ex
pipeline:
  - navigate: /guide/behaviors
```

```button
label:  Syntax Index →
target: ex
pipeline:
  - navigate: /guide/syntax
```
