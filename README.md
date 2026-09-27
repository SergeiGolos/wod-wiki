# WOD Wiki

**Write workouts as Markdown. Run them on a clock. Analyze what actually happened.**

WOD Wiki is a TypeScript monorepo toolkit for parsing, executing, and analyzing workouts written in Whiteboard Language (`wod` / `time` blocks) embedded in ordinary Markdown. It includes CodeMirror 6 editor integrations, a Just-In-Time compiler, a reactive execution runtime, and a training-analytics engine.

> 📚 **Documentation:** [`docs/`](./docs/README.md), [`docs/domain-model/`](./docs/domain-model/), and [`docs/domain-model/WQL-Domain-Query-Composition.md`](./docs/domain-model/WQL-Domain-Query-Composition.md).

---

## The big idea: everything is a metric

```
Markdown  →  Metrics (the plan)  →  Tracking metrics (what happened)  →  Analyzed metrics (insight)
```

At each stage the system **adds metrics** — it never overwrites. A metric records its `origin` (`parser`, `dialect`, `compiler`, `runtime`, `user`, `analyzed`), and a precedence rule decides which one is shown. That single idea lets the app overlay the **planned** target, the **tracked** actual, and the **analyzed** projection in one view. See [`docs/04-metric-lifecycle.md`](./docs/04-metric-lifecycle.md).

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh) (v1.4+)

```bash
bun install               # install monorepo workspace dependencies
bun run build:packages    # compile TypeScript packages (@bitcobblers/wod-wiki-*)
bun run playground        # wod.wiki app dev server  → http://localhost:5173
bun run storybook         # component workbench      → http://localhost:6006
bun run test              # packages + playground + storybook + seed suites
```

Monorepo layout: `packages/{core,lang,wql,engine,ui}` publish to npm as `@bitcobblers/wod-wiki-*`; `apps/playground` is the web app; `apps/storybook` is the component workbench. Vite source-aliasing gives instant HMR from `packages/*/src` into both apps with zero build step during development.

---

## The `wod` block syntax

A workout is plain Markdown; WOD Wiki interprets fenced ` ```time ` (and ` ```log `) blocks. Each line is a statement of `[lap] fragment fragment …`, and **indentation creates hierarchy**.

````markdown
## WOD

```time
(10) :60 EMOM      ← 10 intervals of 60 seconds (Every Minute On the Minute)
  + 2 Burpees      ← composed set performed each interval
  + 5 Push Ups
  + 7 Air Squats
```
````

### Fragments at a glance

| You write | It means |
|---|---|
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

```time
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

Dialects recognize keywords like `EMOM`, `AMRAP`, `FOR TIME`, `TABATA`, `STRENGTH`, `RUN/ROW/BIKE/SWIM` and tag blocks accordingly. Full reference: [`docs/02-syntax-reference.md`](./docs/02-syntax-reference.md). Sample workout libraries live in [`markdown/collections/`](./markdown/collections).

---

## The Plan → Track → Analyze workflow

The app is a continuous loop. The same metric flows through every phase.

### 1. PLAN — author & choose the work
- **Editor** (`/notes/:noteId`, `/playground/:id`) — write Markdown + `wod` blocks with live syntax checking, suggestions, and typed frontmatter tags.
- **Collections** (`/collections`) — browse workout libraries; pick one to run.
- **Efforts** (`/efforts`, `/effort/:slug`) — exercise definitions (MET, discipline, intensity tier) that power analytics and autocomplete.
- **Feeds** (`/feeds`) — date-indexed streams of workouts.

### 2. TRACK — execute on the clock
- **Clock / Run** (`/run/:runtimeId`) — JIT-compiled blocks run on the runtime clock: timers count, rounds advance, sound cues fire, and you log actual reps/load/RPE. Each segment emits statements recorded directly as `EventRecord` rows.

### 3. ANALYZE — review & derive insight
- **Review** (`/review/:runtimeId`, `/sessions/:sessionId`) — per-segment results + derived analytics.
- **Journal** (`/journal`, `/journal/:date`) — long-term training log grouped by date pages.
- **Dashboards** (`/dashboard`, `/dashboard/:slug`) — custom widgets and Datadog-style WQL queries (`<agg>:<metric>{filters} by {dim}`).

Details: [`docs/07-screens-and-workflow.md`](./docs/07-screens-and-workflow.md), [`docs/08-analytics.md`](./docs/08-analytics.md), and [`docs/domain-model/WQL-Domain-Query-Composition.md`](./docs/domain-model/WQL-Domain-Query-Composition.md).

---

## Architecture at a glance

```
markdown ─▶ PARSE (lezer grammar)          → CodeStatements   (parser metrics)
         ─▶ SEMANTICS (dialects)            → hints + dialect metrics
         ─▶ COMPILE (JIT strategies)        → runtime blocks + behaviors
         ─▶ RUNTIME (stack + clock)         → OutputStatements (runtime/user metrics)
         ─▶ PERSISTENCE (IndexedDB v23)     → events, sessions, notes, page_notes, tags
         ─▶ ANALYTICS (WQL QueryService)    → fact aggregations, rollups, and joins
         ─▶ PRESENTATION (editor/clock/journal/dashboard)
```

| Package / App | NPM Package | Purpose |
|---|---|---|
| `packages/core` | `@bitcobblers/wod-wiki-core` | Shared models (`Metric`, `CodeStatement`, `OutputStatement`, `EventRecord`) |
| `packages/lang` | `@bitcobblers/wod-wiki-lang` | Whiteboard Lezer grammar, dialects, compiler, effort registry |
| `packages/wql` | `@bitcobblers/wod-wiki-wql` | Wod Query Language grammar, AST, and QueryService execution engine |
| `packages/ui` | `@bitcobblers/wod-wiki-ui` | CodeMirror 6 extensions, widgets, preview decorations, themes |
| `packages/engine` | `@bitcobblers/wod-wiki-engine` | Runtime orchestration, CLI runner, and umbrella exports |
| `apps/playground` | *private* | Full React web application (journal, editor, settings, dashboards) |
| `apps/storybook` | *private* | Component workbench and visual testing workshop |

Full map: [`docs/05-architecture.md`](./docs/05-architecture.md).

---

## Monorepo scripts

| Command | Action |
|---|---|
| `bun run build:packages` | Builds ESM/CJS bundles and declaration files for all packages in `packages/*` |
| `bun run playground` | Builds packages, runs linter, and starts Vite dev server (`http://localhost:5173`) |
| `bun run storybook` | Starts Storybook workbench (`http://localhost:6006`) |
| `bun run test` | Runs all test suites: packages (Vitest) + playground (Bun) + storybook + seed |
| `bun run test:packages` | Runs package unit tests via Vitest |
| `bun run test:playground:unit` | Runs playground unit/integration tests via Bun test runner |
| `bun run test:seed` | Tests seed import compiler and manifest integrity |
| `bun run test:e2e` | Runs Playwright browser tests |
| `bun run typecheck:packages` | Type checks all packages |
| `bun run lint:playground` | Lints playground source with ESLint |
| `bun run build` | Compiles packages and production builds of both apps |

---

## Repository layout

```
packages/
  core/         Shared metric, statement, and storage contracts
  lang/         Lezer grammar, dialects, JIT compiler, and effort registry
  wql/          WQL query engine, AST, vocabulary, and document runner
  ui/           CodeMirror 6 extensions, widgets, and themes
  engine/       Execution runtime, stack, behaviors, and CLI
apps/
  playground/   Vite + React application (journal, note editor, analytics, settings)
  storybook/    Component Storybook workbench
markdown/       Corpus workout collections, feeds, and canvas guides
scripts/        Seed compiler, release stampers, and doc link checkers
docs/           Architecture specs, domain models, and WQL query guides
```

---

## License

See [`LICENSE`](./LICENSE).
