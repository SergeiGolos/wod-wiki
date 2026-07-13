# Canvas Pages — Complete Reference

> **Source of truth.** Every playground canvas page, its route, sections,
> examples (with the actual WOD Wiki code blocks), challenges, badges, and
> measurement hooks. Generated from the live markdown under `markdown/canvas/`.

---

## Route map

| Route | File | Type | Chapter badge | Quests |
|---|---|---|---|---|
| `/` | `home/README.md` | home | *(declares all 6)* | 3 |
| `/guide/syntax` | `syntax/README.md` | syntax | — | — |
| `/guide/syntax/basics` | `syntax/basics.md` | syntax | 🏆 basics | 3 |
| `/guide/syntax/structure` | `syntax/structure.md` | syntax | 🧱 structure | 2 |
| `/guide/syntax/protocols` | `syntax/protocols.md` | syntax | ⏱️ protocols | 3 |
| `/guide/syntax/complex` | `syntax/complex.md` | syntax | 🧩 complex | 2 |
| `/guide/syntax/custom-metrics` | `syntax/custom-metrics.md` | syntax | 📊 custom-metrics | 2 |
| `/guide/syntax/dialects` | `syntax/dialects.md` | syntax | 📋 dialects | 2 |
| `/ai-first` | `ai-first/README.md` | ai-first | — | — |

### Retired routes (redirect)

| Old route | Redirects to | Reason |
|---|---|---|
| `/getting-started` | `/` | Content folded into home |
| `/guide/getting-started` | *(no redirect — 404)* | Retired |
| `/chapters/basics` | `/guide/syntax/basics` | Merged with syntax page |
| `/chapters/sequences` | `/guide/syntax` | Split into structure + protocols |
| `/chapters/protocols` | `/guide/syntax/protocols` | Merged with syntax page |
| `/challenge` | `/` | Quick-start chain now lives on home |
| `/syntax/*` | `/guide/syntax/*` | Prefix normalized |

---

## Home — `/`

**File:** `markdown/canvas/home/README.md`
**Editor panel:** `home-demo` view, source `wods/examples/home/welcome-1.md`,
hidden during hero + Jump-In, sticky from Learn the Syntax onward.

### Sections

| # | Section id | Heading | Content |
|---|---|---|---|
| 0 | `wod-wiki` | WOD Wiki | Hero pitch. Editor panel hidden. |
| 1 | `jump-in` | Jump Right In | Navigation hub — open journal, browse collections, new note. Editor panel hidden. |
| 2 | `learn` | Learn the Syntax | Try the demo or go to Basics tutorial. **Editor panel appears here (sticky).** |
| 3 | `whats-next` | What's Next | Links to all six tutorial pages + new note. |

### Demo source

`wods/examples/home/welcome-1.md` → resolves to `markdown/canvas/home/welcome-1.md`:

```wod
(3 Rounds)
  10 Pushups
  15 Air Squats
  *:30 Rest
```

### Challenges

| Quest id | Label | Validation | Fires when |
|---|---|---|---|
| `qs-arrive` | Welcome to WOD Wiki | *(mount event)* | `useQuickStartAutoComplete` marks complete on page mount (endowed progress). |
| `qs-edit` | Change the workout | *(edit event)* | `useQuickStartAutoComplete` marks complete when editor content diverges from initial source. |
| `qs-run` | Run it to the finish | `workout-complete` | `useCompletionChallenge` fires when fullscreen review reaches `completed === true`. |

### Chapter declarations (cross-route badges)

| Chapter | Badge | Quests (completed on tutorial pages) |
|---|---|---|
| `basics` | 🏆 trophy | `basics-movement`, `basics-reps`, `basics-load` |
| `structure` | 🧱 blocks | `structure-rounds`, `structure-repscheme` |
| `protocols` | ⏱️ timer | `protocols-timer`, `protocols-rounds`, `protocols-tag` |
| `complex` | 🧩 puzzle | `complex-time`, `complex-rounds` |
| `custom-metrics` | 📊 activity | `metrics-custom`, `metrics-calc` |
| `dialects` | 📋 file-text | `dialects-log`, `dialects-climb` |

### Measurement

- `qs-arrive` / `qs-edit` — `useQuickStartAutoComplete` (mount + content-divergence).
- `qs-run` — `useCompletionChallenge` (runtime review state).
- Chapter badges — `useChapterProgress` reads `wodwiki.quests.v1` across all routes.

---

## Syntax Index — `/guide/syntax`

**File:** `markdown/canvas/syntax/README.md`
**Editor panel:** `preview` view, source `wods/examples/syntax/core-rules.md`.
No quests, no chapter badge.

### Sections

| # | Section id | Heading | Example source | Links to |
|---|---|---|---|---|
| 0 | `syntax-reference` | Syntax Reference | *(default view)* | — |
| 1 | `core-concepts` | Core Concepts | `syntax/core-rules.md` | `/guide/syntax/basics` |
| 2 | `dialect-examples` | Dialect Examples | `syntax/dialect-climb-bouldering.md` | `/guide/syntax/dialects` |
| 3 | `structure-rep-schemes` | Structure & Rep Schemes | `getting-started/groups-1.md` ⚠️ | `/guide/syntax/structure` |
| 4 | `timers-protocols` | Timers & Protocols | `syntax/timers-rest.md` | `/guide/syntax/protocols` |
| 5 | `advanced` | Advanced | — | — |
| 6 | `complex-workouts` | Complex Workouts | `syntax/complex-nested-protocols.md` | `/guide/syntax/complex` |
| 7 | `custom-metrics-calculations` | Custom Metrics & Calculations | `syntax/custom-metrics-1.md` | `/guide/syntax/custom-metrics` |
| 8 | `start-writing` | Start Writing | — | New note dialog |

> ⚠️ Section 3 references `wods/examples/getting-started/groups-1.md`, which
> resolves to `markdown/canvas/getting-started/groups-1.md` — a directory that
> was retired. The file exists at `markdown/canvas/syntax/groups-1.md`. This is
> a known broken reference.

### Default example

`wods/examples/syntax/core-rules.md` → `markdown/canvas/syntax/core-rules.md`:

```wod
(3 Rounds)
  10 Pushups
  15 Air Squats
```

---

## Basics — `/guide/syntax/basics` · 🏆

**File:** `markdown/canvas/syntax/basics.md`
**Editor panel:** `ex` view, source `wods/examples/syntax/core-rules.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `core-concepts` | Core Concepts | `syntax/core-rules.md` | — |
| 1 | `a-single-movement` | A Single Movement | `syntax/single-movement.md` | ✓ track |
| 2 | `three-core-rules` | Three Core Rules | `syntax/core-rules.md` | — |
| 3 | `measurements` | Measurements | `syntax/measurements.md` | ✓ track |
| 4 | `unknown-load` | Unknown Load | `syntax/metrics-5.md` | ✓ track |
| 5 | `supplemental-data` | Supplemental Data | `syntax/effort-notes.md` | ✓ track |
| 6 | `setup-actions-comments` | Setup Actions & Comments | `syntax/actions-comments.md` | ✓ track |
| 7 | `whats-next` | What's Next | — | nav |

### WOD code blocks by section

**A Single Movement** (`single-movement.md`):

```wod
Pushups
```

**Three Core Rules** (`core-rules.md`):

```wod
(3 Rounds)
  10 Pushups
  15 Air Squats
```

**Measurements** (`measurements.md`):

```wod
5 Back Squat 225lb
400m Run
2000m Row
```

**Unknown Load** (`metrics-5.md`):

```wod
5 Deadlifts ?lb
3 Back Squat ?kg
```

**Supplemental Data** (`effort-notes.md`):

```wod
5 Back Squat 225lb hard
400m Run easy
```

**Setup Actions & Comments** (`actions-comments.md`):

```wod
[Setup Barbell]
5 Back Squat ?lb
// Add weight each set
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `basics-movement` | Add a movement | `has-movement` | Type a line with a named exercise + rep count. |
| `basics-reps` | Add a rep count | `has-reps` | Any integer on a movement line. |
| `basics-load` | Add a load or distance | `contains-token` · `lb` | Include `lb` (or `kg`, `m`) in the script. |

### Measurement

- `has-movement` → `countMovements(statements) > 0` (non-synthetic Effort metric).
- `has-reps` → any non-synthetic `Rep` metric.
- `contains-token` → raw substring match on editor text.

---

## Structure — `/guide/syntax/structure` · 🧱

**File:** `markdown/canvas/syntax/structure.md`
**Editor panel:** `ex` view, source `wods/examples/getting-started/groups-1.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `structure-rep-schemes` | Structure & Rep Schemes | `getting-started/groups-1.md` | — |
| 1 | `simple-rounds` | Simple Rounds | `getting-started/groups-1.md` | ✓ |
| 2 | `named-groups` | Named Groups | `syntax/named-groups.md` | ✓ |
| 3 | `nested-groups` | Nested Groups | `syntax/groups-4.md` | ✓ |
| 4 | `mixed-sections` | Mixed Sections | `syntax/mixed-sections.md` | ✓ |
| 5 | `rep-schemes` | Rep Schemes | `syntax/groups-2.md` | ✓ |
| 6 | `descending-reps-21-15-9` | Descending Reps — (21-15-9) | `syntax/groups-2.md` | ✓ |
| 7 | `multiple-sets` | Multiple Sets | `syntax/multiple-sets.md` | ✓ |
| 8 | `whats-next` | What's Next | — | nav |

### WOD code blocks by section

**Simple Rounds** (`groups-1.md`):

```wod
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
```

**Named Groups** (`named-groups.md`):

```wod
// Warmup
  400m Run
  10 Air Squats

// Strength
  5 Back Squat 225lb
```

**Nested Groups** (`groups-4.md`):

```wod
(3 Rounds)
  (4)
    :20 Work
    :10 Rest
    Burpees
  1:00 Rest
```

**Mixed Sections** (`mixed-sections.md`):

```wod
// Warmup
  500m Row
  10 Lunges

// Strength
  5 Back Squat 225lb
  *2:00 Rest

// Conditioning
  10:00 AMRAP
    5 Pullups
    10 Pushups
```

**Rep Schemes / Descending Reps** (`groups-2.md`):

```wod
(21-15-9)
  Thrusters 95lb
  Pullups
```

**Multiple Sets** (`multiple-sets.md`):

```wod
(5 Sets)
  3 Back Squat 225lb
  *2:00 Rest
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `structure-rounds` | Wrap movements in 2+ rounds | `min-rounds` · `count: 2` | Type `(2 Rounds)` or higher. |
| `structure-repscheme` | Write a rep scheme | `contains-token` · `21-15-9` | Include the literal `21-15-9` in the script. |

### Measurement

- `min-rounds` → `totalRounds(statements) >= 2`.
- `contains-token` → raw substring match on editor text.

---

## Timers & Protocols — `/guide/syntax/protocols` · ⏱️

**File:** `markdown/canvas/syntax/protocols.md`
**Editor panel:** `ex` view, source `wods/examples/syntax/timers-rest.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `timers-protocols` | Timers & Protocols | `syntax/timers-rest.md` | — |
| 1 | `timers-and-rest` | Timers and Rest | `syntax/timers-rest.md` | ✓ |
| 2 | `timer-modifiers` | Timer Modifiers | `syntax/timer-modifiers.md` | ✓ |
| 3 | `longer-durations` | Longer Durations | `syntax/longer-duration.md` | ✓ |
| 4 | `mixed-timers` | Mixed Timers | `syntax/mixed-timers.md` | ✓ |
| 5 | `classic-amrap` | Classic AMRAP | `syntax/classic-amrap.md` | ✓ |
| 6 | `amrap-with-a-time-cap` | AMRAP with a Time Cap | `syntax/time-cap.md` | ✓ |
| 7 | `multiple-amrap-windows` | Multiple AMRAP Windows | `syntax/multiple-amrap-windows.md` | ✓ |
| 8 | `basic-emom` | Basic EMOM | `syntax/basic-emom.md` | ✓ |
| 9 | `longer-intervals` | Longer Intervals | `syntax/longer-intervals.md` | ✓ |
| 10 | `alternating-emom` | Alternating EMOM | `syntax/alternating-emom.md` | ✓ |
| 11 | `standard-tabata` | Standard Tabata | `syntax/protocols-4.md` | ✓ |
| 12 | `custom-intervals` | Custom Intervals | `syntax/custom-intervals.md` | ✓ |
| 13 | `intervals-with-distance` | Intervals with Distance | `syntax/distance-intervals.md` | ✓ |
| 14 | `whats-next` | What's Next | — | nav |

### WOD code blocks by section

**Timers and Rest** (`timers-rest.md`):

```wod
5:00 Run
*:30 Rest
10 Burpees
```

**Timer Modifiers** (`timer-modifiers.md`):

```wod
^5:00 Row
*:30 Rest
:? Bike
```

**Longer Durations** (`longer-duration.md`):

```wod
1:30:00 Long Row
```

**Mixed Timers** (`mixed-timers.md`):

```wod
5:00 Run
10 Burpees
*:30 Rest
:? Max Effort Pushups
```

**Classic AMRAP** (`classic-amrap.md`):

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```

**AMRAP with a Time Cap** (`time-cap.md`):

```wod
20:00
  (21-15-9)
    Thrusters 95lb
    Pullups
```

**Multiple AMRAP Windows** (`multiple-amrap-windows.md`):

```wod
10:00 AMRAP
  5 Pullups
  10 Pushups

5:00 AMRAP
  10 Burpees
  15 Air Squats
```

**Basic EMOM** (`basic-emom.md`):

```wod
(10) :60 EMOM
  3 Clean & Jerk 135lb
```

**Longer Intervals** (`longer-intervals.md`):

```wod
(5) 2:00 EMOM
  5 Deadlifts 225lb
```

**Alternating EMOM** (`alternating-emom.md`):

```wod
(6) :60 EMOM
  - 5 Pullups
  - 8 Pushups
```

**Standard Tabata** (`protocols-4.md`):

```wod
(8 Rounds)
  :20 Max Effort Burpees
  :10 Rest
```

**Custom Intervals** (`custom-intervals.md`):

```wod
(5 Rounds)
  :40 Bike
  *:20 Rest
```

**Intervals with Distance** (`distance-intervals.md`):

```wod
(4 Rounds)
  3:00 Run 800m
  2:00 Rest
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `protocols-timer` | Add a rest or time cap | `has-timer` | Any Duration line, e.g. `*:30 Rest`. |
| `protocols-rounds` | Add a 3-round cap | `min-rounds` · `count: 3` | Type `(3 Rounds)` or higher. |
| `protocols-tag` | Tag it AMRAP / EMOM / TABATA | `contains-token` · `AMRAP` | Include the literal `AMRAP` in the script. |

### Measurement

- `has-timer` → any non-synthetic `Duration`/`Time` metric.
- `min-rounds` → `totalRounds(statements) >= 3`.
- `contains-token` → raw substring match on editor text.

---

## Complex Workouts — `/guide/syntax/complex` · 🧩

**File:** `markdown/canvas/syntax/complex.md`
**Editor panel:** `ex` view, source `wods/examples/syntax/complex-nested-protocols.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `complex-workouts` | Complex Workouts | `syntax/complex-nested-protocols.md` | — |
| 1 | `nested-protocols` | Nested Protocols | `syntax/complex-nested-protocols.md` | ✓ |
| 2 | `full-training-session` | Full Training Session | `syntax/complex-full-session.md` | ✓ |
| 3 | `barbell-cycling` | Barbell Cycling | `syntax/complex-barbell-cycling.md` | ✓ |
| 4 | `partner-workout` | Partner Workout | `syntax/complex-partner-workout.md` | ✓ |
| 5 | `finish-line` | Finish Line | — | nav |

### WOD code blocks by section

**Nested Protocols** (`complex-nested-protocols.md`):

```wod
(3 Rounds)
  5:00 AMRAP
    5 Pullups
    10 Pushups
  // Strength
    3 Back Squat 225lb
    *2:00 Rest
```

**Full Training Session** (`complex-full-session.md`):

```wod
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

**Barbell Cycling** (`complex-barbell-cycling.md`):

```wod
(5) :60 EMOM
  3 Power Clean 135lb

[Change Plates]

(5) :60 EMOM
  2 Power Clean 155lb
```

**Partner Workout** (`complex-partner-workout.md`):

```wod
// Partner A
  5:00 AMRAP
    5 Pullups
    10 Pushups

// Partner B
  5:00 AMRAP
    10 Air Squats
    8 Burpees
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `complex-time` | Add a timed block to the session | `has-timer` | Add any duration/timer line. |
| `complex-rounds` | Use 2+ rounds across sections | `min-rounds` · `count: 2` | Type `(2 Rounds)` or higher. |

### Measurement

- `has-timer` → any non-synthetic `Duration`/`Time` metric.
- `min-rounds` → `totalRounds(statements) >= 2`.

---

## Custom Metrics — `/guide/syntax/custom-metrics` · 📊

**File:** `markdown/canvas/syntax/custom-metrics.md`
**Editor panel:** `ex` view, source `wods/syntax/custom-metrics-1.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `custom-metrics` | Custom Metrics | `syntax/custom-metrics-1.md` | — |
| 1 | `intensity` | Intensity | `syntax/custom-metrics-1.md` | ✓ |
| 2 | `rpe-rir` | RPE & RIR | `syntax/custom-metrics-2.md` | ✓ |
| 3 | `heart-rate-zone` | Heart-Rate Zone | `syntax/custom-metrics-3.md` | ✓ |
| 4 | `multiple-metrics-on-one-line` | Multiple Metrics on One Line | `syntax/custom-metrics-4.md` | ✓ |
| 5 | `calculated-metrics` | Calculated Metrics | `syntax/custom-metrics-5.md` | ✓ |
| 6 | `syntax-rules` | Syntax Rules | — | — |
| 7 | `whats-next` | What's Next | — | nav |

### WOD code blocks by section

**Intensity** (`custom-metrics-1.md`):

```wod
(5 Sets)
  5 Back Squat 225lb {"intensity": 80}
  *2:00 Rest
```

**RPE & RIR** (`custom-metrics-2.md`):

```wod
(3 Sets)
  8 Bench Press 185lb {"rpe": 8, "rir": 2}
  *2:00 Rest
```

**Heart Rate Zone** (`custom-metrics-3.md`):

```wod
(4 Rounds)
  400m Run {"hrZone": 4}
  *1:00 Rest
```

**Multiple Metrics on One Line** (`custom-metrics-4.md`):

```wod
(5 Sets)
  5 Deadlift 315lb {"intensity": 85, "rpe": 9, r}
  *3:00 Rest
```

**Calculated Metrics** (`custom-metrics-5.md`):

```wod
(5 Sets)
  5 Back Squat 225lb {"rpe": 8}
  *2:00 Rest

calculate
  totalLoad = sum(reps * weight)
  avgRPE = mean(rpe)
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `metrics-custom` | Add a custom metric | `contains-token` · `rpe` | Include the literal `rpe` in the script. |
| `metrics-calc` | Add a calculate block | `contains-token` · `calculate` | Include the literal `calculate` in the script. |

### Measurement

- Both use `contains-token` → raw substring match on editor text.

---

## Dialects — `/guide/syntax/dialects` · 📋

**File:** `markdown/canvas/syntax/dialects.md`
**Editor panel:** `ex` view, source `wods/examples/syntax/dialect-wod.md`.

### Sections

| # | Section id | Heading | Example source | Try It? |
|---|---|---|---|---|
| 0 | `dialect-examples` | Dialect Examples | `syntax/dialect-wod.md` | — |
| 1 | `wod-workout-definition` | `wod` — Workout Definition | `syntax/dialect-wod.md` | ✓ track |
| 2 | `log-completed-session` | `log` — Completed Session | `syntax/dialect-log.md` | — |
| 3 | `plan-future-template` | `plan` — Future Template | `syntax/dialect-plan.md` | — |
| 4 | `climb-indoor-bouldering` | `climb` — Indoor Bouldering | `syntax/dialect-climb-bouldering.md` | — |
| 5 | `climb-outdoor-sport-day` | `climb` — Outdoor Sport Day | `syntax/dialect-climb-sport.md` | — |
| 6 | `climb-hangboard-training` | `climb` — Hangboard Training | `syntax/dialect-climb-hangboard.md` | — |
| 7 | `syntax-reference` | Syntax Reference | — | nav |

### WOD code blocks by section

**`wod` — Workout Definition** (`dialect-wod.md`):

```wod
(3 Rounds)
  10 Pushups
  15 Air Squats
  :30 Rest

5:00 Run hard
```

**`log` — Completed Session** (`dialect-log.md`):

```log
date: 2026-05-25
rpe: 7

5 Back Squat 225lb hard
5 Back Squat 225lb harder
5 Back Squat 225lb max effort

// Finished all prescribed sets, bar speed slowed on set 3.
```

**`plan` — Future Template** (`dialect-plan.md`):

```plan
(Strength)
  5 Back Squat ?lb
  5 Bench Press ?lb

(Conditioning)
  12:00
    (AMRAP)
      10 Burpees
      15 Air Squats
```

**`climb` — Indoor Bouldering** (`dialect-climb-bouldering.md`):

```climb
date: 2026-05-26
location: "Sender One LAX"
discipline: bouldering
duration: 2.5
rpe: 8
energy: 7

(Warmup)
  [Slab Warmup] V0 flash @1 // quiet feet
  [Jug Ladder] V2 flash @1

(Project)
  [The Shield] V7 redpoint @12 // engage core before crux reach
```

**`climb` — Outdoor Sport Day** (`dialect-climb-sport.md`):

```climb
date: 2026-05-20
location: Red Rock Canyon
area: Calico Basin
discipline: sport
grade_system: yds
duration: 8
rpe: 7
conditions: sunny warm light wind

[The Gift] 5.10b onsight @1 // bolt 5 step-up crux
[Plumber's Crack] 5.11a redpoint @3 // stem instead of layback
[Black Magic] 5.11d redpoint @4 // crux at bolt 6
```

**`climb` — Hangboard Training** (`dialect-climb-hangboard.md`):

```climb
date: 2026-05-22
location: Home Training Setup
discipline: hangboard
protocol: max hangs
duration: 1.25
rpe: 8
energy: 8

[Open hand] 20mm +30lb 7s @3 // all reps completed
[Half crimp] 20mm +25lb 7s @3 // third rep slipped at 6s
[Wide pinch] 45mm +15lb 7s @3 // strong today
[Sloper rail] bw 7s @3 // failed reps 2 and 3
```

### Challenges

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `dialects-log` | Write a log block | `contains-token` · ` ```log ` | Include a ` ```log ` fence in the script. |
| `dialects-climb` | Write a climb block | `contains-token` · ` ```climb ` | Include a ` ```climb ` fence in the script. |

### Measurement

- Both use `contains-token` → raw substring match on editor text (including backticks).

---

## AI-First — `/ai-first`

**File:** `markdown/canvas/ai-first/README.md`
**Editor panel:** `ai-demo` view, source `wods/examples/getting-started/statement-1.md`.
No quests, no chapter badge. Not a tutorial page.

### Sections

| # | Section id | Heading | Example source | Links to |
|---|---|---|---|---|
| 0 | `ai-first-workouts` | AI-First Workouts | `getting-started/statement-1.md` | — |
| 1 | `why-text` | Why Text Wins | `getting-started/statement-1.md` | — |
| 2 | `parse-skill` | Parse Skill | — | `/ai-skills/parse.md` |
| 3 | `shared-apps` | Shared AI Apps | — | — |
| 4 | `gemini` | Gemini | — | External link |
| 5 | `chatgpt` | ChatGPT | — | *(coming soon)* |
| 6 | `copilot` | Copilot | — | *(coming soon)* |
| 7 | `claude` | Claude | — | *(coming soon)* |
| 8 | `start-building` | Start Building | — | New note / back to home |

---

## Challenge system

### Validator types (`syntaxChallengeValidator.ts`)

| Type | Logic | Required field | Operates on |
|---|---|---|---|
| `has-movement` | `countMovements > 0` | — | parsed statement tree |
| `has-reps` | any non-synthetic `Rep` metric | — | parsed statement tree |
| `has-timer` | any non-synthetic `Duration`/`Time` metric | — | parsed statement tree |
| `min-rounds` | `totalRounds >= count` | `count` | parsed statement tree |
| `contains-token` | `block.content.includes(value)` | `value` | raw editor text |
| `workout-complete` | *(not in registry)* | — | runtime review state |

**Synthetic-statement guard:** The parser injects a synthetic statement at the
top of every `wod` block. All tree-walking validators skip it via `isSynthetic()`
so an empty fence never passes `has-movement`.

**Unknown-type safety:** `validateScriptBlock` returns `{ pass: false }` for any
type not in the registry. Nothing passes by accident.

### Completion hooks

| Hook | Fires on | Quests it handles |
|---|---|---|
| `useSyntaxChallenge` | live re-parse of editor content (per keystroke) | every quest whose `validation.type` is in the registry |
| `useCompletionChallenge` | fullscreen review reaching `completed === true` | only `workout-complete` quests |
| `useQuickStartAutoComplete` | page mount + editor content divergence | `qs-arrive` and `qs-edit` (home page only) |

### Completed-state override

`useSyntaxChallenge` overrides validation results to `{ pass: true, detail:
'Completed' }` for quests already marked complete in the ledger, so event-based
quests (mount/edit) show a clean success state in the `ChallengeBanner`.

### Storage

- **Quest ledger:** `localStorage["wodwiki.quests.v1"]` — shaped as
  `Record<pageRoute, Record<questId, boolean>>`. Route-scoped so identical quest
  ids on different pages never collide. Monotonic: once true, stays true.
- **Cross-route badge aggregation:** `useChapterProgress` reads the entire
  ledger and ORs across all routes. A quest completed on any route lights the
  badge on the home page.
- **Global onboarding steps:** `localStorage["wodwiki.onboarding.v1"]` — five
  booleans (`visitedLanding`, `editedNote`, `ranWorkout`, `loggedEffort`,
  `openedReview`). Independent of quests/chapters.

### Canvas editor result behavior

On canvas pages (`forceFullscreenReview` enabled), clicking a result row opens
the `FullscreenReview` overlay directly instead of expanding the inline
`AnalyticsScorecard` + `ReviewGrid`. On `/playground` and `/journal` pages, the
default inline expand behavior is preserved.

---

## Complete quest summary

| Page | Quest id | Validation | Reward | Measured by |
|---|---|---|---|---|
| `/` | `qs-arrive` | *(mount)* | Quick-start banner | Page mount event |
| `/` | `qs-edit` | *(edit)* | Quick-start banner | Content divergence from initial source |
| `/` | `qs-run` | `workout-complete` | Quick-start banner | Review `completed === true` |
| `/guide/syntax/basics` | `basics-movement` | `has-movement` | 🏆 Basics badge | Effort metric on a non-synthetic statement |
| `/guide/syntax/basics` | `basics-reps` | `has-reps` | 🏆 Basics badge | Rep metric present |
| `/guide/syntax/basics` | `basics-load` | `contains-token` `lb` | 🏆 Basics badge | Raw text includes `lb` |
| `/guide/syntax/structure` | `structure-rounds` | `min-rounds` (2) | 🧱 Structure badge | Sum of Rounds metrics ≥ 2 |
| `/guide/syntax/structure` | `structure-repscheme` | `contains-token` `21-15-9` | 🧱 Structure badge | Raw text includes `21-15-9` |
| `/guide/syntax/protocols` | `protocols-timer` | `has-timer` | ⏱️ Protocols badge | Duration/Time metric present |
| `/guide/syntax/protocols` | `protocols-rounds` | `min-rounds` (3) | ⏱️ Protocols badge | Sum of Rounds metrics ≥ 3 |
| `/guide/syntax/protocols` | `protocols-tag` | `contains-token` `AMRAP` | ⏱️ Protocols badge | Raw text includes `AMRAP` |
| `/guide/syntax/complex` | `complex-time` | `has-timer` | 🧩 Complex badge | Duration/Time metric present |
| `/guide/syntax/complex` | `complex-rounds` | `min-rounds` (2) | 🧩 Complex badge | Sum of Rounds metrics ≥ 2 |
| `/guide/syntax/custom-metrics` | `metrics-custom` | `contains-token` `rpe` | 📊 Custom Metrics badge | Raw text includes `rpe` |
| `/guide/syntax/custom-metrics` | `metrics-calc` | `contains-token` `calculate` | 📊 Custom Metrics badge | Raw text includes `calculate` |
| `/guide/syntax/dialects` | `dialects-log` | `contains-token` ` ```log ` | 📋 Dialects badge | Raw text includes ` ```log ` |
| `/guide/syntax/dialects` | `dialects-climb` | `contains-token` ` ```climb ` | 📋 Dialects badge | Raw text includes ` ```climb ` |
| `/guide/syntax` | — | — | — | No quests |
| `/ai-first` | — | — | — | No quests |
