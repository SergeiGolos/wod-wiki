# Canvas Pages Inventory

A reading list of every canvas page in the playground (markdown files with
`template: canvas` frontmatter), grouped by page, with each section's prose and
the code-example blocks it references. Source files referenced via
`wods/examples/...` or `wods/...` paths resolve to the same relative path under
`markdown/canvas/` (see `playground/src/canvas/canvasUtils.ts:28-53`).

**Canvas pages (10 total):**

- `markdown/canvas/home/README.md` — `/`
- `markdown/canvas/ai-first/README.md` — `/ai-first`
- `markdown/canvas/getting-started/README.md` — `/guide/getting-started`
- `markdown/canvas/syntax/README.md` — `/guide/syntax`
- `markdown/canvas/syntax/basics.md` — `/guide/syntax/basics`
- `markdown/canvas/syntax/structure.md` — `/guide/syntax/structure`
- `markdown/canvas/syntax/protocols.md` — `/guide/syntax/protocols`
- `markdown/canvas/syntax/dialects.md` — `/guide/syntax/dialects`
- `markdown/canvas/syntax/complex.md` — `/guide/syntax/complex`
- `markdown/canvas/syntax/custom-metrics.md` — `/syntax/custom-metrics`

---

## Canvas Page: `markdown/canvas/home/README.md` — `/`

### The Whiteboard Script

The script on the right is part of this wiki, not a screenshot. Click into it, change the reps, movements, weights, or rest, and use the examples as a safe scratchpad while you learn how WOD Wiki works.

Write workouts in plain text — the parser turns notes into live timers, round counters, and session logs.

**Try it:** A single movement on one line is a complete workout statement.

```view
name:    home-demo
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

File: `markdown/canvas/getting-started/statement-1.md`

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

### Metrics

Add reps, load, and distance to any movement — the parser understands all three.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

File: `markdown/canvas/getting-started/metrics-1.md`

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

File: `markdown/canvas/getting-started/metrics-2.md`

```example
label: With distance
source: wods/examples/getting-started/metrics-3.md
```

File: `markdown/canvas/getting-started/metrics-3.md`

`10 Pushups`, `5 Deadlift 225lb`, `Run 400m` — all valid.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

### Timers

Prefix a movement with a time to run it as a countdown timer.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/timer-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/timer-1.md`

`:30` is 30 seconds. `5:00` is 5 minutes. `1:30:00` is 90 minutes.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

### Groups

Wrap movements in `(N Rounds)` to repeat them — indent everything inside the group.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/groups-1.md`

The runtime counts rounds automatically and shows your position in the sequence.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

### Protocols

AMRAP — As Many Rounds As Possible. Set a time cap and race the clock.

```command
target: home-demo
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/protocols-1.md`

When the cap hits, the runtime stops and logs completed rounds and partial reps.

```button
label:  Try This →
target: home-demo
pipeline:
  - set-state: track
```

### What's Next

Ready to go deeper? Work through the six-step guide or explore the full syntax reference.

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

---

## Canvas Page: `markdown/canvas/ai-first/README.md` — `/ai-first`

### Why Text Wins

- **Portable** — copy-paste into any chat, note, or document
- **Versionable** — diff-friendly, git-friendly, review-friendly
- **Composable** — LLMs can generate, remix, and extend scripts without special tools
- **Executable** — the same text that reads well to humans runs live in the playground

```view
name:    ai-demo
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

File: `markdown/canvas/getting-started/statement-1.md`

```command
target: ai-demo
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

```button
label:  Try It →
target: ai-demo
pipeline:
  - set-state: track
```

### Parse Skill

The canonical WOD Wiki parse skill defines the grammar, examples, and constraints the parser understands. Point any AI assistant at this file and it can generate valid workout scripts on the first try.

```button
label:  Open Parse Skill →
target: ai-demo
pipeline:
  - navigate: /ai-skills/parse.md
```

### Shared AI Apps

Collaborative workspaces and custom GPTs pre-loaded with the WOD Wiki syntax.

#### Gemini

A shared Gemini Gem with the parse skill built in.

```button
label:  Open Gemini Gem →
target: ai-demo
pipeline:
  - navigate: https://gemini.google.com/gem/1sCEfdhn2Bwg53DS6GvPgcFTRrUrJRdV-?usp=sharing
```

#### ChatGPT

Custom GPT coming soon.

```button
label:  ChatGPT (coming soon)
target: ai-demo
pipeline:
  - set-state: note
```

#### Copilot

Microsoft Copilot integration coming soon.

```button
label:  Copilot (coming soon)
target: ai-demo
pipeline:
  - set-state: note
```

#### Claude

Claude project coming soon.

```button
label:  Claude (coming soon)
target: ai-demo
pipeline:
  - set-state: note
```

### Start Building

Open a new note and generate a workout with any AI assistant.

```button
label:  New Workout Note →
target: ai-demo
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

```button
label:  ← Back to Home
target: ai-demo
pipeline:
  - navigate: /
```

---

## Canvas Page: `markdown/canvas/getting-started/README.md` — `/guide/getting-started`

### Step 1: Movements

A WOD block is a fenced code block tagged `wod`. The simplest possible workout is a single movement on one line.

```view
name:    z2h
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/getting-started/statement-1.md`

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

**Your Turn:** Click into the editor on the right and type an exercise name (e.g., `Pushups`). That's it.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

### Step 2: Metrics

Put a number before the exercise name for a rep count. Add a weight after for load tracking.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

File: `markdown/canvas/getting-started/metrics-1.md`

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

File: `markdown/canvas/getting-started/metrics-2.md`

```example
label: With distance
source: wods/examples/getting-started/metrics-3.md
```

File: `markdown/canvas/getting-started/metrics-3.md`

`10 Pushups`, `5 Deadlift 225lb`, `Run 400m` — all valid. The parser understands reps, weights, and distances.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

### Step 3: Timers

Prefix a movement with a time like `5:00` to run it as a countdown.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/timer-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/timer-1.md`

`:30` is 30 seconds. `5:00` is 5 minutes. `1:30:00` is 90 minutes. Simple.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

### Step 4: Groups

Wrap movements in `(N Rounds)` to repeat them. Indent everything inside the group.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/groups-1.md`

The runtime counts rounds automatically and shows you where you are in the sequence.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

### Step 5: Protocols

AMRAP — As Many Rounds As Possible. Set a time cap, mark the block `(AMRAP)`, and race the clock.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

File: `markdown/canvas/getting-started/protocols-1.md`

When the time is up the runtime stops and logs the number of completed rounds and any partial reps.

```button
label:  Try This →
target: z2h
pipeline:
  - set-state: track
```

### Step 6: Review

Every session you track is stored in your Journal. Open Review to see reps, times, and load side by side across sessions.

```command
target: z2h
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: review
```

File: `markdown/canvas/getting-started/protocols-1.md`

```button
label:  See the Results View
target: z2h
pipeline:
  - set-state: review
```

### What's Next

You know the fundamentals. Dive deeper into the full syntax or open a blank note and start writing your own workouts.

```button
label:  Explore the Full Syntax →
target: z2h
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Open a New Note →
target: z2h
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

---

## Canvas Page: `markdown/canvas/syntax/README.md` — `/guide/syntax`

### Core Concepts

Learn the foundational rules: creating a `wod` block, writing one statement per line, and adding measurements, effort notes, actions, comments, and timer modifiers.

```view
name:    preview
state:   note
source:  wods/examples/syntax/core-rules.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/syntax/core-rules.md`

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/core-rules.md
```

```button
label:  Open Core Concepts →
target: preview
pipeline:
  - navigate: /guide/syntax/basics
```

### Dialect Examples

Scroll through the main fence types: `wod` for workout definitions, `log` for completed sessions, `plan` for templates, and `climb` for climbing-specific logs.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-bouldering.md
```

File: `markdown/canvas/syntax/dialect-climb-bouldering.md`

```button
label:  Open Dialect Examples →
target: preview
pipeline:
  - navigate: /guide/syntax/dialects
```

### Structure & Rep Schemes

Organise movements into repeating blocks, named sections, or nested groups. Define how many reps you perform for each movement.

```command
target: preview
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
```

File: `markdown/canvas/getting-started/groups-1.md`

```button
label:  Open Structure & Reps →
target: preview
pipeline:
  - navigate: /guide/syntax/structure
```

### Timers & Protocols

Add time domains to your workouts. Learn how to structure classic protocols like AMRAP, EMOM, and Tabata.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/timers-rest.md
```

File: `markdown/canvas/syntax/timers-rest.md`

```button
label:  Open Timers & Protocols →
target: preview
pipeline:
  - navigate: /guide/syntax/protocols
```

### Complex Workouts

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/complex-nested-protocols.md
```

File: `markdown/canvas/syntax/complex-nested-protocols.md`

```button
label:  Open Complex Examples →
target: preview
pipeline:
  - navigate: /guide/syntax/complex
```

### Custom Metrics & Calculations

Attach line-local properties to a workout and derive summary values with a document-level `calculate` block.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/custom-metrics.md
```

File: `markdown/canvas/syntax/custom-metrics.md`

```button
label:  Open Custom Metrics & Calculations →
target: preview
pipeline:
  - navigate: /guide/syntax/custom-and-calculated-metrics
```

### Start Writing

Open a new note and try the syntax for yourself.

```button
label:  New Workout Note →
target: preview
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

```button
label:  ← Back to Home
target: preview
pipeline:
  - navigate: /
```

---

## Canvas Page: `markdown/canvas/syntax/basics.md` — `/guide/syntax/basics`

### A Single Movement

The simplest workout is one exercise on one line. No reps, no timer — just a movement. The runtime will ask you to log how many you did when you finish.

```view
name:    ex
state:   note
source:  wods/examples/syntax/core-rules.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/syntax/core-rules.md`

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/single-movement.md
```

File: `markdown/canvas/syntax/single-movement.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Three Core Rules

Every file follows the same three rules.

**Fences** — wrap your workout in ` ```wod ``` `.

**One thing per line** — each line is a movement, a time, or a group header.

**Indentation means nesting** — anything indented under a group belongs to that group.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/core-rules.md
```

File: `markdown/canvas/syntax/core-rules.md`

### Measurements

Add weights (`225lb`, `100kg`) and distances (`400m`, `2000m`, `10 miles`) directly to movement lines. The runtime tracks them and surfaces them in the Review grid.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/measurements.md
```

File: `markdown/canvas/syntax/measurements.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Unknown Load

Use `?lb` to indicate the load is to be determined. The runtime prompts you to enter the actual weight when you reach that movement.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-5.md
```

File: `markdown/canvas/syntax/metrics-5.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Supplemental Data

Beyond movements and measurements, you can add plain-language effort text such as `easy` or `hard`. These words enrich the log without changing the structural shape of the workout.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/effort-notes.md
```

File: `markdown/canvas/syntax/effort-notes.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Setup Actions & Comments

Wrap non-movement instructions in square brackets: `[Setup Barbell]`. These appear in the timer as cue cards — the clock pauses until you tap continue.

Prefix a line with `//` to add a passive coach annotation. Comments are notes to yourself or the athlete — they never affect the timer or generate a cue card.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/actions-comments.md
```

File: `markdown/canvas/syntax/actions-comments.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Timer Modifiers

Use `^` to force a timer to count up instead of down.

Use `*` to mark a timer as required or non-skippable. `*:30 Rest` is a common pattern, but the rest behavior comes from the word `Rest`, not from `*` alone.

Use `:?` when you want the runtime to record the actual time taken.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timer-modifiers.md
```

File: `markdown/canvas/syntax/timer-modifiers.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### What's Next

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Structure & Reps →
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```

---

## Canvas Page: `markdown/canvas/syntax/structure.md` — `/guide/syntax/structure`

### Simple Rounds

`(3 Rounds)` repeats the indented block three times. The runtime shows which round you're on and advances automatically.

```view
name:    ex
state:   note
source:  wods/examples/getting-started/groups-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/getting-started/groups-1.md`

```command
target: ex
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Named Groups

Name a group with any label in parentheses: `(Warmup)`, `(Strength)`, `(Cool-down)`. Named groups don't repeat unless you add a number — they're just for organisation.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/named-groups.md
```

File: `markdown/canvas/syntax/named-groups.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Nested Groups

Groups can nest inside groups. An outer rounds group can contain an inner interval block or another repeated section.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-4.md
```

File: `markdown/canvas/syntax/groups-4.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Mixed Sections

Chain several named groups to describe a full training session in one note: warmup, strength, conditioning, and cooldown. Sections do not need to repeat to stay useful.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/mixed-sections.md
```

File: `markdown/canvas/syntax/mixed-sections.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Rep Schemes

Rep schemes use dash-separated values inside parentheses. `(21-15-9)` creates three rounds and applies those rep targets to every movement in the block.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-2.md
```

File: `markdown/canvas/syntax/groups-2.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Descending Reps — (21-15-9)

The `(21-15-9)` syntax creates three rounds automatically — 21 reps, then 15, then 9 — for every movement in the block.
The classic "Fran" uses this format with Thrusters and Pullups nested under the same group.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Multiple Sets

`(5 Sets)` repeats the block five times with equal reps each set. Add a rest line inside the group for structured recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/multiple-sets.md
```

File: `markdown/canvas/syntax/multiple-sets.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### What's Next

```button
label:  ← Core Concepts
target: ex
pipeline:
  - navigate: /guide/syntax/basics
```

```button
label:  Timers & Protocols →
target: ex
pipeline:
  - navigate: /guide/syntax/protocols
```

---

## Canvas Page: `markdown/canvas/syntax/protocols.md` — `/guide/syntax/protocols`

### Timers and Rest

A bare duration (`5:00 Run`, `:30 Plank`) counts down from that time. Movements without a time prefix count up from zero.

Use `*` to mark a timer as required or non-skippable. `*:30 Rest` is a common pattern, but the rest behavior comes from the word `Rest`, not from `*` alone.

```view
name:    ex
state:   note
source:  wods/examples/syntax/timers-rest.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/syntax/timers-rest.md`

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-rest.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Longer Durations

Use `H:MM:SS` format for anything over an hour. `1:30:00 Row` is a 90-minute row, and the runtime preserves the longer countdown without changing syntax rules.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/longer-duration.md
```

File: `markdown/canvas/syntax/longer-duration.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Mixed Timers

Combine countdowns, untimed work, forced rest, and collectible timers in one note.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/mixed-timers.md
```

File: `markdown/canvas/syntax/mixed-timers.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Classic AMRAP

**As Many Rounds As Possible.** Set a time cap, mark the block `AMRAP`, and race the clock. `20:00 AMRAP` is the canonical guide form.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/classic-amrap.md
```

File: `markdown/canvas/syntax/classic-amrap.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### AMRAP with a Time Cap

A bare time on a line without `AMRAP` creates a time cap for the work nested beneath it.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/time-cap.md
```

File: `markdown/canvas/syntax/time-cap.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Multiple AMRAP Windows

Chain several AMRAP blocks in one note. Each window gets its own countdown and round count, which makes this format useful for interval-style conditioning.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/multiple-amrap-windows.md
```

File: `markdown/canvas/syntax/multiple-amrap-windows.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Basic EMOM

**Every Minute on the Minute.** Combine a rounds count, an interval timer, and the `EMOM` label. `(10) :60 EMOM` is the canonical guide form because it matches the runtime's interval strategy.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/basic-emom.md
```

File: `markdown/canvas/syntax/basic-emom.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Longer Intervals

Use a larger interval when a heavier movement or transition needs built-in recovery. `(5) 2:00 EMOM` gives five two-minute windows.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/longer-intervals.md
```

File: `markdown/canvas/syntax/longer-intervals.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Alternating EMOM

Separate branches inside the EMOM let the runtime rotate between different tasks across the interval windows.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/alternating-emom.md
```

File: `markdown/canvas/syntax/alternating-emom.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Standard Tabata

Intervals combine a work period and a rest period, repeated for a set number of rounds. A standard Tabata is `(8 Rounds)` with `:20` work and `:10 Rest` inside.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-4.md
```

File: `markdown/canvas/syntax/protocols-4.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Custom Intervals

Change the round count, work duration, or rest duration to any values. `:40` work / `*:20 Rest` over `(5 Rounds)` is a popular alternative.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/custom-intervals.md
```

File: `markdown/canvas/syntax/custom-intervals.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Intervals with Distance

Pair a timed work interval with a distance target, then follow it with timed recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/distance-intervals.md
```

File: `markdown/canvas/syntax/distance-intervals.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### What's Next

```button
label:  ← Structure & Rep Schemes
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```

```button
label:  Complex Workouts →
target: ex
pipeline:
  - navigate: /guide/syntax/complex
```

---

## Canvas Page: `markdown/canvas/syntax/dialects.md` — `/guide/syntax/dialects`

### `wod` — Workout Definition

Use `wod` for the session you intend to run, track, or share as the primary workout definition.

```view
name:    ex
state:   note
source:  wods/examples/syntax/dialect-wod.md
runtime: in-memory
launch:  host
align:   right
width:   50%
```

File: `markdown/canvas/syntax/dialect-wod.md`

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-wod.md
```

```button
label:  Try WOD →
target: ex
pipeline:
  - set-state: track
```

### `log` — Completed Session

Use `log` when the block records what happened. Logs preserve performed work, notes, and subjective effort without pretending to be tomorrow's prescription.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-log.md
```

File: `markdown/canvas/syntax/dialect-log.md`

### `plan` — Future Template

Use `plan` for drafts, tomorrow's session, and reusable templates. Unknown loads can stay as placeholders until execution.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-plan.md
```

File: `markdown/canvas/syntax/dialect-plan.md`

### `climb` — Indoor Bouldering

Use `climb` for route and problem logs. Grades, send types, attempts, and beta notes become explicit climbing signals while staying readable as plain Markdown.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-bouldering.md
```

File: `markdown/canvas/syntax/dialect-climb-bouldering.md`

### `climb` — Outdoor Sport Day

Outdoor entries can keep crag context, YDS grades, redpoint history, high points, and condition notes together.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-sport.md
```

File: `markdown/canvas/syntax/dialect-climb-sport.md`

### `climb` — Hangboard Training

Climbing training also belongs in the same dialect when the session is climbing-specific but not route-based.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-hangboard.md
```

File: `markdown/canvas/syntax/dialect-climb-hangboard.md`

### Syntax Reference

Return to the main syntax map when you want the lower-level grammar rules.

```button
label:  Back to Syntax →
target: ex
pipeline:
  - navigate: /guide/syntax
```

---

## Canvas Page: `markdown/canvas/syntax/complex.md` — `/guide/syntax/complex`

### Nested Protocols

An outer rounds group containing a timed conditioning block, followed by a named strength block with rest. Each group runs sequentially — the runtime handles the transitions.

```view
name:    ex
state:   note
source:  wods/examples/syntax/complex-nested-protocols.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/syntax/complex-nested-protocols.md`

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/complex-nested-protocols.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Full Training Session

Warmup → Strength → Conditioning → Cool-down. Four named groups in one note, each with its own protocol and rest pattern.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/complex-full-session.md
```

File: `markdown/canvas/syntax/complex-full-session.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Barbell Cycling

Multiple EMOM windows back-to-back with changing loads. Supplemental cues prompt plate changes between blocks.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/complex-barbell-cycling.md
```

File: `markdown/canvas/syntax/complex-barbell-cycling.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Partner Workout

Separate named AMRAP windows keep each partner's work in its own section while sharing the same document.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/complex-partner-workout.md
```

File: `markdown/canvas/syntax/complex-partner-workout.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Finish Line

You've seen the full syntax. Time to write your own.

```button
label:  ← Timers & Protocols
target: ex
pipeline:
  - navigate: /guide/syntax/protocols
```

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  New Workout Note →
target: ex
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

---

## Canvas Page: `markdown/canvas/syntax/custom-metrics.md` — `/syntax/custom-metrics`

### Intensity

Track a percentage or arbitrary scale value alongside the movement. The runtime surfaces it in the tracker and review grid.

```view
name:    ex
state:   note
source:  wods/syntax/custom-metrics-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

File: `markdown/canvas/syntax/custom-metrics-1.md`

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### RPE & RIR

Log rate of perceived exertion and reps in reserve per set. These are first-class effort dimensions that feed into calculated metrics and history search.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-2.md
```

File: `markdown/canvas/syntax/custom-metrics-2.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Heart-Rate Zone

Tag conditioning work with a target heart-rate zone. Any string or number key is accepted — unknown keys become custom metrics automatically.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-3.md
```

File: `markdown/canvas/syntax/custom-metrics-3.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Multiple Metrics on One Line

Combine as many properties as you need. The JSON object can appear anywhere on the line and every property is treated as an independent metric.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-4.md
```

File: `markdown/canvas/syntax/custom-metrics-4.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Calculated Metrics

Use a `calculate` block to derive values from custom metrics across the workout. The runtime evaluates these after completion (and live during tracking) using the collected data.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-5.md
```

File: `markdown/canvas/syntax/custom-metrics-5.md`

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

### Syntax Rules

- **Optional** — existing syntax is unchanged; JSON objects are additive.
- **Placement** — the object may appear anywhere on the line.
- **Values** — numbers, strings, booleans, or null. Nested objects and arrays are reserved for future expansion.
- **Keys** — built-in keys (`intensity`, `rpe`, `rir`, `hrZone`) map to canonical metric types. Any other key becomes a `MetricType.Custom` entry.
- **Calculations** — `calculate` blocks are document-level siblings to `wod` blocks. Each line is `identifier = expression`. Supported functions: `sum`, `mean`, `max`, `min`, `count`. Arithmetic: `+`, `-`, `*`, `/`, parentheses. The literal `duration` references timer values in seconds.

### What's Next

```button
label:  ← Core Concepts
target: ex
pipeline:
  - navigate: /syntax/basics
```

```button
label:  Structure & Reps →
target: ex
pipeline:
  - navigate: /syntax/structure
```
