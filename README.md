# WOD Wiki

**Write workouts as Markdown. Run them on a clock. Analyze what actually happened.**

WOD Wiki is a TypeScript monorepo toolkit for parsing, executing, and analyzing workouts written in Whiteboard Language (`wod` / `time` blocks) embedded in ordinary Markdown. It includes CodeMirror 6 editor integrations, a Just-In-Time compiler, a reactive execution runtime, and a training-analytics engine.

> 📚 **Documentation:** [`docs/`](./docs/README.md), [`docs/domain-model/`](./docs/domain-model/), and [`docs/domain-model/WQL-Domain-Query-Composition.md`](./docs/domain-model/WQL-Domain-Query-Composition.md).

---

## The big idea: everything is a metric

```
Markdown  →  Metrics (the plan)  →  Tracking metrics (what happened)  →  Analyzed metrics (insight)
```

At each stage the system **adds metrics** — it never overwrites. A metric records its `origin` (`parser`, `dialect`, `compiler`, `runtime`, `user`, `analyzed`), and a precedence rule decides which one is shown. That single idea lets the app overlay the **planned** target, the **tracked** actual, and the **analyzed** projection in one view. See [`docs/architecture/metric-lifecycle.md`](./docs/architecture/metric-lifecycle.md).

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

The home tour starts workouts only when Run is pressed. Each run saves a fresh playground note, and Stop, completion, or leaving the timer saves its results once. Home analytics uses labelled, in-memory example data without adding sessions to your journal; select This run to inspect the current note's results. Desktop, mobile, and reduced-motion layouts share the same run and analytics behavior.

Journal, Collections, Playgrounds, Efforts, and Sessions share an icon ribbon and a filter panel. On mobile, open navigation to use the same ribbon beside the panel. Filter accordions show values supported by the current WQL results; selecting or removing a condition updates `?q=` and refreshes the available filters and result groups. Each selection adds a history entry, so browser Back restores the previous query. Selected conditions remain removable when no results match.

Each filter value has one button that cycles Off, Include, and Exclude. Expanded sections share one scroll container; the section header stays sticky so it can be collapsed while scrolling a long list. Edit `apps/playground/app/nav/panels/conditionsConfig.ts` to configure section labels, ordering, visibility, and expected values. Expected values constrain and label current-result choices; active selections stay visible even when no results match. During query execution, the previous rows remain visible with controls disabled until the new results arrive.

The mobile drawer fills the screen width. Selecting an L1 destination keeps it open for L2 filtering. Filters update immediately; Apply closes the drawer. Full-query shortcuts such as All and Feeds navigate and close it immediately.

Result-identity catalogs are hidden from their own library filters. Supported section headers have a Group checkbox that adds or removes that dimension from the current WQL. Save the query from its toolbar or the Custom navigation item with a label and icon; manage these browser-local shortcuts in Settings > Query Defaults. Unmatched queries select Custom above New shortcut. Equivalent queries select the same shortcut regardless of filter or grouping order.

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

Dialects recognize keywords like `EMOM`, `AMRAP`, `FOR TIME`, `TABATA`, `STRENGTH`, `RUN/ROW/BIKE/SWIM` and tag blocks accordingly. Full reference: [`docs/language/syntax-reference.md`](./docs/language/syntax-reference.md). Sample workout libraries live in [`markdown/collections/`](./markdown/collections).

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

Details: [`docs/app/screens-and-workflow.md`](./docs/app/screens-and-workflow.md), [`docs/language/wql-reference.md`](./docs/language/wql-reference.md), and [`docs/domain-model/WQL-Domain-Query-Composition.md`](./docs/domain-model/WQL-Domain-Query-Composition.md).

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

Full map: [`docs/architecture/overview.md`](./docs/architecture/overview.md).

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

### Deployed E2E verification

Run the production bundle locally with `bun run build:app` followed by
`E2E_TARGET=preview bun run test:e2e`. Set `E2E_APP_URL` to test a deployed build
without starting a local server. Seed-dependent tests await the bootstrap's
`data-seed-state` and `data-seed-outcome` on `<html>` before checking the route.
Derived seed rows are queued within the existing atomic chunk transaction;
a failed write rolls back both rows and the checkpoint.
Canvas commits before any library fetch; the remaining chunks fetch four at a
time and still commit in manifest order. Failed fetches preserve the committed
checkpoint so the next bootstrap resumes without reapplying completed chunks.
Playwright's pinned Chromium uses SQLite-backed IndexedDB explicitly; its
LevelDB backend took 31.5 seconds for a fresh seed versus 2.8 seconds with SQLite.

PR previews and main run the live-app suite after deployment and wait for the
deployed entry-bundle hash. Reports publish to `https://<branch-slug>.e2e.wod.wiki/`
and [the main report](https://e2e.wod.wiki/), including failed runs. CI summaries
show per-file pass, fail, flaky, and skipped counts. `e2e-run-metadata.json` beside
the report records the tested commit, build hash, deploy URL, timestamp, and run URL.
Failed-test artifacts retain the initial trace, browser console, network, and video.

Quarantines must cite an open issue: unsupported effort actions and the CI
performance budget are tracked in [#719](https://github.com/SergeiGolos/wod-wiki/issues/719);
production Chromecast round-trips in [#1067](https://github.com/SergeiGolos/wod-wiki/issues/1067);
storage-denial bootstrap recovery in [#1068](https://github.com/SergeiGolos/wod-wiki/issues/1068).
Retired routes and widgets are removed from the suite rather than silently skipped.

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
