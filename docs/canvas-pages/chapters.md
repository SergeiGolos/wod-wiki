# Chapter Pages — `/guide/syntax/*`

The old `/chapters/*` routes (`/chapters/basics`, `/chapters/sequences`, `/chapters/protocols`) have been retired and now redirect to the new tutorial pages under `/guide/syntax/*`. Each tutorial page is a standalone canvas page that teaches one concept, carries its own `chapter` block, and defines its own `quest` blocks.

The home page still tracks the six chapter badges: **Basics** (trophy), **Structure** (blocks), **Protocols** (timer), **Complex Workouts** (puzzle), **Custom Metrics** (activity), and **Dialects** (file-text). Completing every quest on a tutorial page unlocks that chapter's badge in the `OnboardingBanner`.

All six pages share the same canvas template:

- **Source:** `markdown/canvas/syntax/<page>.md`
- **Frontmatter:** `template: canvas`, `route: /guide/syntax/*`, `type: syntax`
- **Blocks:** one `chapter` block, multiple `quest` blocks, one `view` panel, and per-section `command`/`button` blocks that load example scripts.
- **Challenge validation:** `useSyntaxChallenge` parses the live editor content and checks each quest's `validation` schema. When a quest passes, it is marked complete in `wodwiki.quests.v1`; `useChapterProgress` aggregates the results across routes to light up the badge.

---

## `/guide/syntax/basics`

**Source:** `markdown/canvas/syntax/basics.md`  
**Chapter:** `basics` (badge: `trophy`)  
**Quests:** `basics-movement`, `basics-reps`, `basics-load`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Core Concepts | `wods/examples/syntax/core-rules.md` |
| A Single Movement | `wods/examples/syntax/single-movement.md` |
| Three Core Rules | `wods/examples/syntax/core-rules.md` |
| Measurements | `wods/examples/syntax/measurements.md` |
| Unknown Load | `wods/examples/syntax/metrics-5.md` |
| Supplemental Data | `wods/examples/syntax/effort-notes.md` |
| Setup Actions & Comments | `wods/examples/syntax/actions-comments.md` |
| What's Next | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `basics-movement` | Add a movement | `has-movement` | Type a line with a named exercise. |
| `basics-reps` | Add a rep count | `has-reps` | Add an integer rep count to a movement line. |
| `basics-load` | Add a load or distance | `contains-token` · value: `` `lb` `` | Include `lb` somewhere in the script. |

### Accomplishment & measurement

Unlocks the **Basics** badge (trophy).

- `has-movement` → `countMovements(statements) > 0` (a non-synthetic statement carrying an `Effort` metric).
- `has-reps` → `hasReps(statements)` (any non-synthetic statement carrying a `Rep` metric).
- `contains-token` → raw substring match on the editor content, so `lb` can appear anywhere.

---

## `/guide/syntax/structure`

**Source:** `markdown/canvas/syntax/structure.md`  
**Chapter:** `structure` (badge: `blocks`)  
**Quests:** `structure-rounds`, `structure-repscheme`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Structure & Rep Schemes | `wods/examples/getting-started/groups-1.md` |
| Simple Rounds | `wods/examples/getting-started/groups-1.md` |
| Named Groups | `wods/examples/syntax/named-groups.md` |
| Nested Groups | `wods/examples/syntax/groups-4.md` |
| Mixed Sections | `wods/examples/syntax/mixed-sections.md` |
| Rep Schemes | `wods/examples/syntax/groups-2.md` |
| Descending Reps — (21-15-9) | `wods/examples/syntax/groups-2.md` |
| Multiple Sets | `wods/examples/syntax/multiple-sets.md` |
| What's Next | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `structure-rounds` | Wrap movements in 2+ rounds | `min-rounds` · count: `2` | Type `(2 Rounds)` or higher. |
| `structure-repscheme` | Write a rep scheme | `contains-token` · value: `` `21-15-9` `` | Include the literal rep scheme `21-15-9`. |

### Accomplishment & measurement

Unlocks the **Structure** badge (blocks).

- `min-rounds` → `totalRounds(statements) >= 2` (sums every `Rounds` metric value across non-synthetic statements).
- `contains-token` → raw substring match on the editor content.

---

## `/guide/syntax/protocols`

**Source:** `markdown/canvas/syntax/protocols.md`  
**Chapter:** `protocols` (badge: `timer`)  
**Quests:** `protocols-timer`, `protocols-rounds`, `protocols-tag`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Timers & Protocols | `wods/examples/syntax/timers-rest.md` |
| Timers and Rest | `wods/examples/syntax/timers-rest.md` |
| Timer Modifiers | `wods/examples/syntax/timer-modifiers.md` |
| Longer Durations | `wods/examples/syntax/longer-duration.md` |
| Mixed Timers | `wods/examples/syntax/mixed-timers.md` |
| Classic AMRAP | `wods/examples/syntax/classic-amrap.md` |
| AMRAP with a Time Cap | `wods/examples/syntax/time-cap.md` |
| Multiple AMRAP Windows | `wods/examples/syntax/multiple-amrap-windows.md` |
| Basic EMOM | `wods/examples/syntax/basic-emom.md` |
| Longer Intervals | `wods/examples/syntax/longer-intervals.md` |
| Alternating EMOM | `wods/examples/syntax/alternating-emom.md` |
| Standard Tabata | `wods/examples/syntax/protocols-4.md` |
| Custom Intervals | `wods/examples/syntax/custom-intervals.md` |
| Intervals with Distance | `wods/examples/syntax/distance-intervals.md` |
| What's Next | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `protocols-timer` | Add a rest or time cap | `has-timer` | Add any duration line, e.g. `*:30 Rest`. |
| `protocols-rounds` | Add a 3-round cap | `min-rounds` · count: `3` | Type `(3 Rounds)` or higher. |
| `protocols-tag` | Add a workout tag | `contains-token` · value: `` `AMRAP` `` | Include the literal token `AMRAP`. |

### Accomplishment & measurement

Unlocks the **Protocols** badge (timer).

- `has-timer` → `hasTimer(statements)` (any non-synthetic statement carrying a `Duration` or `Time` metric).
- `min-rounds` → `totalRounds(statements) >= 3`.
- `contains-token` → raw substring match on the editor content.

---

## `/guide/syntax/complex`

**Source:** `markdown/canvas/syntax/complex.md`  
**Chapter:** `complex` (badge: `puzzle`)  
**Quests:** `complex-time`, `complex-rounds`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Complex Workouts | `wods/examples/syntax/complex-nested-protocols.md` |
| Nested Protocols | `wods/examples/syntax/complex-nested-protocols.md` |
| Full Training Session | `wods/examples/syntax/complex-full-session.md` |
| Barbell Cycling | `wods/examples/syntax/complex-barbell-cycling.md` |
| Partner Workout | `wods/examples/syntax/complex-partner-workout.md` |
| Finish Line | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `complex-time` | Add a timed block to the session | `has-timer` | Add any duration/timer line. |
| `complex-rounds` | Use 2+ rounds across sections | `min-rounds` · count: `2` | Type `(2 Rounds)` or higher anywhere in the script. |

### Accomplishment & measurement

Unlocks the **Complex Workouts** badge (puzzle).

- `has-timer` → `hasTimer(statements)`.
- `min-rounds` → `totalRounds(statements) >= 2`.

---

## `/guide/syntax/custom-metrics`

**Source:** `markdown/canvas/syntax/custom-metrics.md`  
**Chapter:** `custom-metrics` (badge: `activity`)  
**Quests:** `metrics-custom`, `metrics-calc`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Custom Metrics | `wods/syntax/custom-metrics-1.md` |
| Intensity | `wods/syntax/custom-metrics-1.md` |
| RPE & RIR | `wods/syntax/custom-metrics-2.md` |
| Heart-Rate Zone | `wods/syntax/custom-metrics-3.md` |
| Multiple Metrics on One Line | `wods/syntax/custom-metrics-4.md` |
| Calculated Metrics | `wods/syntax/custom-metrics-5.md` |
| Syntax Rules | — |
| What's Next | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `metrics-custom` | Add a custom metric | `contains-token` · value: `` `rpe` `` | Include the literal token `rpe`. |
| `metrics-calc` | Add a calculate block | `contains-token` · value: `` `calculate` `` | Include the literal token `calculate`. |

### Accomplishment & measurement

Unlocks the **Custom Metrics** badge (activity).

- Both quests use `contains-token` → raw substring match on the editor content.

---

## `/guide/syntax/dialects`

**Source:** `markdown/canvas/syntax/dialects.md`  
**Chapter:** `dialects` (badge: `file-text`)  
**Quests:** `dialects-log`, `dialects-climb`

### Sections and examples

| Section | Example source loaded |
|---|---|
| Dialect Examples | `wods/examples/syntax/dialect-wod.md` |
| `wod` — Workout Definition | `wods/examples/syntax/dialect-wod.md` |
| `log` — Completed Session | `wods/examples/syntax/dialect-log.md` |
| `plan` — Future Template | `wods/examples/syntax/dialect-plan.md` |
| `climb` — Indoor Bouldering | `wods/examples/syntax/dialect-climb-bouldering.md` |
| `climb` — Outdoor Sport Day | `wods/examples/syntax/dialect-climb-sport.md` |
| `climb` — Hangboard Training | `wods/examples/syntax/dialect-climb-hangboard.md` |
| Syntax Reference | — |

### Quests

| Quest id | Label | Validation | How to satisfy |
|---|---|---|---|
| `dialects-log` | Write a log block | `contains-token` · value: <code>```log</code> | Include a <code>```log</code> fence in the script. |
| `dialects-climb` | Write a climb block | `contains-token` · value: <code>```climb</code> | Include a <code>```climb</code> fence in the script. |

### Accomplishment & measurement

Unlocks the **Dialects** badge (file-text).

- Both quests use `contains-token` → raw substring match on the editor content, checking for the literal fence strings (including the backticks).

---

## How challenge completion flows (all tutorial pages)

1. **Live re-parse.** The editor emits `ScriptBlock` snapshots with `statements: undefined`; `useSyntaxChallenge` re-parses `block.content` via the runtime parser before validating.
2. **Per-quest validation.** Each quest's `validation` schema runs through `validateScriptBlock`; unknown validator types return `{ pass: false }`, so a typo never silently passes.
3. **Banner feedback.** `ChallengeBanner` renders one row per quest with a live pass/fail pill and the validator's `reason`/`detail` hint, updating per keystroke.
4. **Mark done.** When a quest passes, the hook calls `markComplete(questId)` (idempotent) → writes to `wodwiki.quests.v1` under the page's route.
5. **Badge aggregation.** `useChapterProgress` (on the home page) ORs the ledger across routes; the chapter badge lights up once all of its quest ids are done.
6. **Completed-state override.** `useSyntaxChallenge` overrides validation results to `{ pass: true, detail: 'Completed' }` for quests already marked complete, so the banner stays clean after completion.
