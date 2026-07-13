# Syntax Reference Pages — `/guide/syntax/*`

**Sources:** `markdown/canvas/syntax/{README,basics,structure,protocols,complex,dialects}.md`
**Frontmatter type:** `syntax`
**Template:** canvas (split-canvas: sticky prose left, live editor right)

The syntax pages are the **reference / showcase** layer. They are read-first
documentation: each section loads a curated example into the side editor and
offers a "Try It →" button that switches the panel to `track` mode (runs the
WallClock). They ship **no quests** and unlock **no badges** — they exist to
teach grammar by live demonstration.

> These are distinct from the **chapter pages** (`/chapters/*`), which are
> quest-driven and badge-unlocking, and from the standalone **challenge page**
> (`/challenge`).

---

## Page inventory

| Route | File | Title | # sections |
|---|---|---|---|
| `/guide/syntax` | `syntax/README.md` | Syntax Reference (index) | 7 |
| `/guide/syntax/basics` | `syntax/basics.md` | Core Concepts | 8 |
| `/guide/syntax/structure` | `syntax/structure.md` | Structure & Rep Schemes | 8 |
| `/guide/syntax/protocols` | `syntax/protocols.md` | Timers & Protocols | 13 |
| `/guide/syntax/complex` | `syntax/complex.md` | Complex Workouts | 5 |
| `/guide/syntax/dialects` | `syntax/dialects.md` | Dialect Examples | 7 |

*Section counts include the final navigation CTA ("What's Next" / "Start Writing"
/ "Finish Line" / "Syntax Reference") present on every page.*

---

## Shared example model

Every syntax page uses the same two-block pattern per section:

1. **`command` block** — swaps the editor source to a specific example file
   (`set-source: wods/examples/...`). The panel is a single shared `view`
   (`name: ex` / `name: preview`) declared once at the top of the page.
2. **`button` block ("Try It →")** — fires `set-state: track` to start the timer
   on the loaded example. Some reference-only sections (e.g. `log`, `plan`,
   `climb` dialects) omit the Try-It button because there's nothing to *run*.

There are **no `example` tab blocks** and **no `quest` blocks** on any syntax
page. The example is always a single source-swap followed by an optional run.

---

## `/guide/syntax` — Index

**Content:** The map. Every concept builds on the last; this page orients and
links into the deep-dive sub-pages. Persistent `preview` panel loads
`wods/examples/syntax/core-rules.md`.

| Section | Loads example | Button |
|---|---|---|
| Core Concepts | `syntax/core-rules.md` | → `/guide/syntax/basics` |
| Dialect Examples | `syntax/dialect-climb-bouldering.md` | → `/guide/syntax/dialects` |
| Structure & Rep Schemes | `getting-started/groups-1.md` | → `/guide/syntax/structure` |
| Timers & Protocols | `syntax/timers-rest.md` | → `/guide/syntax/protocols` |
| Advanced · Complex Workouts | `syntax/complex-nested-protocols.md` | → `/guide/syntax/complex` |
| Custom Metrics & Calculations | `syntax/custom-metrics-1.md` | → `/guide/syntax/custom-and-calculated-metrics` |
| Start Writing (full-bleed) | — | New Workout Note (opens a blank dialog) |

**Challenges:** none. **Accomplishment:** none directly (running may mark the
global onboarding `ranWorkout` step).

---

## `/guide/syntax/basics` — Core Concepts

**Content:** Foundational rules — `wod` fences, one statement per line,
indent-to-nest, and the full set of line decorators.

| Section | Example source | Try It? |
|---|---|---|
| A Single Movement | `syntax/single-movement.md` | ✓ track |
| Three Core Rules | `syntax/core-rules.md` | — |
| Measurements | `syntax/measurements.md` | ✓ track |
| Unknown Load (`?lb`) | `syntax/metrics-5.md` | ✓ track |
| Supplemental Data | `syntax/effort-notes.md` | ✓ track |
| Setup Actions & Comments | `syntax/actions-comments.md` | ✓ track |
| Timer Modifiers (`^`, `*`, `:?`) | `syntax/timer-modifiers.md` | ✓ track |
| What's Next | — | nav to index / structure |

**Examples by type:** each is a single curated `.md` showing exactly one concept.
The "Three Core Rules" section is the only pure-read one (no run).

---

## `/guide/syntax/structure` — Structure & Rep Schemes

**Content:** Grouping movements — rounds, named sections, nesting, and rep
schemes.

| Section | Example source | Try It? |
|---|---|---|
| Simple Rounds `(3 Rounds)` | `getting-started/groups-1.md` | ✓ |
| Named Groups `(Warmup)` | `syntax/named-groups.md` | ✓ |
| Nested Groups | `syntax/groups-4.md` | ✓ |
| Mixed Sections | `syntax/mixed-sections.md` | ✓ |
| Rep Schemes `(21-15-9)` | `syntax/groups-2.md` | ✓ |
| Descending Reps — 21-15-9 (Fran) | `syntax/groups-2.md` | ✓ |
| Multiple Sets `(5 Sets)` | `syntax/multiple-sets.md` | ✓ |

---

## `/guide/syntax/protocols` — Timers & Protocols

**Content:** Time domains and classic protocols — countdowns, rest, AMRAP, EMOM,
Tabata, custom intervals, distance intervals. The largest reference page.

| Section | Example source | Try It? |
|---|---|---|
| Timers and Rest | `syntax/timers-rest.md` | ✓ |
| Longer Durations (`H:MM:SS`) | `syntax/longer-duration.md` | ✓ |
| Mixed Timers | `syntax/mixed-timers.md` | ✓ |
| Classic AMRAP | `syntax/classic-amrap.md` | ✓ |
| AMRAP with a Time Cap | `syntax/time-cap.md` | ✓ |
| Multiple AMRAP Windows | `syntax/multiple-amrap-windows.md` | ✓ |
| Basic EMOM | `syntax/basic-emom.md` | ✓ |
| Longer Intervals `(5) 2:00 EMOM` | `syntax/longer-intervals.md` | ✓ |
| Alternating EMOM | `syntax/alternating-emom.md` | ✓ |
| Standard Tabata `(8) :20 / :10` | `syntax/protocols-4.md` | ✓ |
| Custom Intervals `:40 / *:20` `(5)` | `syntax/custom-intervals.md` | ✓ |
| Intervals with Distance | `syntax/distance-intervals.md` | ✓ |

---

## `/guide/syntax/complex` — Complex Workouts

**Content:** Putting it all together — nested protocols, full multi-section
sessions, barbell-cycling EMOMs, partner workouts. Uses every concept above.

| Section | Example source | Try It? |
|---|---|---|
| Nested Protocols | `syntax/complex-nested-protocols.md` | ✓ |
| Full Training Session | `syntax/complex-full-session.md` | ✓ |
| Barbell Cycling | `syntax/complex-barbell-cycling.md` | ✓ |
| Partner Workout | `syntax/complex-partner-workout.md` | ✓ |
| Finish Line | — | New Workout Note dialog |

---

## `/guide/syntax/dialects` — Dialect Examples

**Content:** Fence types as intent signals. Same line grammar, different
runtime/review/analytics behavior. Note: dialect sections that are *records*
(`log`, `plan`, `climb`) intentionally **omit** the Try-It run button.

| Section | Example source | Try It? |
|---|---|---|
| `wod` — Workout Definition | `syntax/dialect-wod.md` | ✓ track |
| `log` — Completed Session | `syntax/dialect-log.md` | — |
| `plan` — Future Template | `syntax/dialect-plan.md` | — |
| `climb` — Indoor Bouldering | `syntax/dialect-climb-bouldering.md` | — |
| `climb` — Outdoor Sport Day | `syntax/dialect-climb-sport.md` | — |
| `climb` — Hangboard Training | `syntax/dialect-climb-hangboard.md` | — |

---

## Challenges · Accomplishment · Measurement

| Attribute | Syntax pages |
|---|---|
| **Quests defined** | **None.** No `quest` blocks on any page. |
| **Chapter blocks** | **None.** No `chapter` blocks. |
| **Accomplishment on completion** | None directly — these are reference pages, not gated challenges. |
| **Indirect signal** | Pressing "Try It →" runs the timer, which can satisfy the global onboarding step `ranWorkout` (`wodwiki.onboarding.v1`). |
| **How measured** | N/A for quests. The onboarding `ranWorkout` boolean is set at the run action site. |
