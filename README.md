# WOD Wiki

**Write workouts as Markdown. Run them on a clock. Analyze what actually happened.**

WOD Wiki is a TypeScript + React toolkit (`@bitcobblers/wod-wiki-library`) for parsing,
executing, and analyzing workouts written in a compact `wod` block syntax embedded in
ordinary Markdown. It ships a Monaco/CodeMirror editor integration, a Just-In-Time
compiler, a clock-driven execution runtime, and a training-analytics engine.

> 📚 **Full documentation:** [`new-docs/`](./new-docs/README.md) — architecture, domain
> model, the metric lifecycle, syntax reference, the extensible interfaces, the
> screens/workflow, and analytics.

---

## The big idea: everything is a metric

```
Markdown  →  Metrics (the plan)  →  Tracking metrics (what happened)  →  Analyzed metrics (insight)
```

At each stage the system **adds metrics** — it never overwrites. A metric records its
`origin` (`parser`, `dialect`, `compiler`, `runtime`, `user`, `analyzed`), and a
precedence rule decides which one is shown. That single idea lets the app overlay the
**planned** target, the **tracked** actual, and the **analyzed** projection in one view.
See [`new-docs/04-metric-lifecycle.md`](./new-docs/04-metric-lifecycle.md).

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh) (the package manager and test runner — *not*
npm/yarn).

```bash
bun install            # install dependencies
bun run playground     # run the reference app (Vite)  → http://localhost:5173
bun run storybook      # browse components in isolation → http://localhost:6006
bun run test           # unit tests (src/)
```

---

## The `wod` block syntax

A workout is plain Markdown; WOD Wiki only interprets fenced ` ```wod ` blocks. Each
line is a statement of `[lap] fragment fragment …`, and **indentation creates
hierarchy**.

````markdown
## WOD

```wod
(10) :60 EMOM      ← 10 intervals of 60 seconds (Every Minute On the Minute)
  + 2 Burpees      ← composed set performed each interval
  + 5 Push Ups
  + 7 Air Squats
```
````

### Fragments at a glance

| You write | It means |
|-----------|----------|
| `5:00`, `1:00`, `:60`, `:30` | **Duration** — a planned timer |
| `(3)`, `(10)` | **Rounds** — repeat the child block N times |
| `(21-15-9)`, `(100-80-60-40-20)` | **Rep ladder** — a sequence of round sizes |
| `10`, `50` | **Reps** for the effort on the line |
| `400m`, `1000m`, `0.5mile` | **Distance** (units: `m`, `km`, `ft`, `mile`) |
| `16kg`, `225lb`, `bw` | **Load** (units: `kg`, `lb`, `bw` = bodyweight) |
| `Burpees`, `KB Deadlift` | **Effort** — the movement name |
| `?` | an athlete-chosen value to fill in (`10:00 ? KB Snatch 16kg`) |
| `:?` | a **collectible** timer (value recorded, not counted down) |
| `+` / `-` | **lap** markers (compose / superset siblings) |
| `@` | binds a quantity as resistance |
| `*` | a **rest** marker (Tabata-style) |
| `// note` | a comment |

### A few real shapes

```wod
(3)                        # 3 rounds of…
  10 Air Squats
  10 Push Ups

10:00 AMRAP                # as many rounds as possible in 10:00
  5 Pull Ups
  10 Push Ups
  15 Air Squats

(8) Power Sprints          # 8 rounds: sprint then rest
  25m Freestyle Sprint
  1:30 Rest

(5)                        # 5×8 kettlebell deadlifts @16kg
  8 KB Deadlift 16kg
  :30 Rest
```

Dialects recognize keywords like `EMOM`, `AMRAP`, `FOR TIME`, `TABATA`, `STRENGTH`,
`RUN/ROW/BIKE/SWIM` and tag blocks accordingly. Full reference:
[`new-docs/02-syntax-reference.md`](./new-docs/02-syntax-reference.md). Sample workout
libraries live in [`markdown/collections/`](./markdown/collections).

---

## The Plan → Track → Analyze workflow

The app is a continuous loop. The same metric flows through every phase.

### 1. PLAN — author & choose the work
- **Editor** (`/note/:category/:name`, `/playground/:id`) — write Markdown + `wod`
  blocks with live highlighting and suggestions.
- **Plan** (`/plan`) — assemble a session.
- **Collections** (`/collections`) — browse workout libraries; pick one to run.
- **Efforts** (`/efforts`, `/effort/:slug`) — define exercises (MET, discipline,
  aliases) that power analytics and autocomplete.
- **Feeds** (`/feeds`) — date-indexed streams of sessions.

### 2. TRACK — execute on the clock
- **Tracker / Run** (`/run/:runtimeId`) — the JIT-compiled blocks run on the runtime
  clock: timers count, rounds advance, sound cues fire, and you log actual
  reps/load/RPE. Each segment emits results recorded as `runtime`/`user` metrics.

### 3. ANALYZE — review & derive insight
- **Review** (`/review/:runtimeId`) — per-segment results + derived analytics.
- **Review grid** — sort/filter/chart your results.
- **Journal** (`/journal`) — long-term history that informs the next plan.

Analytics combine your tracked metrics with effort physiology to compute **volume**,
**pace**, **power**, **MET-minutes**, **session-load**, and a composite **Training
Intensity Score (TIS)** — all stored as `analyzed` metrics you can chart.
Details: [`new-docs/07-screens-and-workflow.md`](./new-docs/07-screens-and-workflow.md),
[`new-docs/08-analytics.md`](./new-docs/08-analytics.md).

---

## How it works (architecture in one screen)

```
markdown ─▶ PARSE (lezer grammar)          → CodeStatements   (parser metrics)
         ─▶ SEMANTICS (dialects)            → hints + dialect metrics
         ─▶ COMPILE (JIT strategies)        → runtime blocks + behaviors
         ─▶ RUNTIME (stack + clock)         → OutputStatements (runtime/user metrics)
         ─▶ ANALYTICS (enrich + project)    → compound metrics (analyzed)
         ─▶ PRESENTATION (editor/clock/grid/journal)
```

| Layer | Source | Adds |
|-------|--------|------|
| Domain | `src/core/**` | shared `Metric` / `CodeStatement` / `OutputStatement` types |
| Parse | `src/grammar/**`, `src/parser/**` | `parser` metrics |
| Semantics | `src/dialects/**` | hints + `dialect` metrics |
| Runtime | `src/runtime/**` | JIT compiler, blocks, behaviors → `runtime` metrics |
| Analytics | `src/core/analytics/**`, `src/effort-registry/**` | `analyzed` metrics |
| UI | `src/components/**`, `src/clock/**`, `playground/src/**` | screens |
| Persistence | `src/services/db/**` | IndexedDB: `notes`, `segments`, `results`, `analytics`, `efforts` |

Full map: [`new-docs/05-architecture.md`](./new-docs/05-architecture.md).

### Extensible seams

Most extension is "add an implementation and register it":

| Interface | Implementations | Add a… |
|-----------|-----------------|--------|
| `IRuntimeBehavior` | 15+ behaviors (timer, rounds, sound, report…) | block capability |
| `IRuntimeBlockStrategy` | 13 strategies (priority-banded) | compiler rule |
| `IDialect` | CrossFit, WOD, Cardio, Yoga, Habits, Climb | pattern recognizer |
| `IRealtimeProcessor` / `ISummaryProcessor` | pace, power, volume, MET-min, session-load, TIS | analytics metric |
| `IEffortRegistry` | InMemory, IndexedDB, Composite | effort source |

Conventions + full inventory: [`new-docs/06-interfaces-and-implementations.md`](./new-docs/06-interfaces-and-implementations.md).

---

## Development

```bash
bun install                  # ~15s
bun run playground           # reference app (Vite)
bun run storybook            # component workshop
bun run test                 # unit tests (src/)
bun run test:playground      # reference-app tests (isolated per file)
bun run test:components      # integration tests (tests/)
bun run test:e2e             # Playwright acceptance tests (needs Storybook running)
bun x tsc --noEmit           # type check
bun run build-storybook      # static Storybook build
```

See [`AGENTS.md`](./AGENTS.md) for the full development guide (test harness, e2e
patterns, code style, and validation requirements).

---

## Repository layout

```
src/            Library source (domain, parser, dialects, runtime, analytics, UI)
  core/         Shared metric & statement model + analytics
  grammar/      lezer grammar for the wod language
  parser/       Parser wrapper (WhiteboardScript)
  dialects/     Semantic pattern recognizers
  runtime/      JIT compiler, blocks, behaviors, stack, clock, memory
  effort-registry/  Exercise definitions (MET/discipline) + fuzzy resolver
  components/   React components (editor, clock, review-grid, …)
  services/     Persistence (IndexedDB), cast, content
playground/     Reference application (routing, journal, tracker, review)
markdown/       Sample workout collections (ZombieFit, Steve Cotter, swimming…)
stories/        Storybook stories
tests/, e2e/    Integration & acceptance tests
new-docs/       📚 Holistic documentation (start here)
```

---

## License

See [`LICENSE`](./LICENSE).
