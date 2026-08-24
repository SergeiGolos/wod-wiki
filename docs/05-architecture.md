# Architecture

WOD Wiki is split into two repositories:

- `wod-wiki` — the application (this repo)
- `wod-wiki-engine` — the standalone Whiteboard Language & WQL engine packages

## Repository split

```text
wod-wiki/                      ← app repo
├── src/                       ← library code still in the app during migration
├── playground/src/            ← Vite React app
├── stories/                   ← Storybook catalog
├── tests/                     ← integration tests
├── e2e/                       ← Playwright acceptance tests
├── docs/                      ← this documentation
└── markdown/                  ← bundled workout collections / feeds

wod-wiki-engine/               ← engine repo
├── packages/
│   ├── core/                  ← @bitcobblers/wod-wiki-core
│   ├── lang/                  ← @bitcobblers/wod-wiki-lang
│   ├── wql/                   ← @bitcobblers/wod-wiki-wql
│   ├── ui/                    ← @bitcobblers/wod-wiki-ui
│   └── engine/                ← @bitcobblers/wod-wiki-engine (umbrella)
└── apps/storybook/            ← engine-level Storybook workbench
```

The app consumes published engine packages from GitHub Packages (`@bitcobblers/*`) and can also link against a local engine workspace via `bun run deps:engine:link`.

## Data pipeline

```text
Markdown
   │
   ▼
Lezer grammar ──▶ CST
   │
   ▼
syntax-parser ──▶ SyntaxPrimitive[] + indentation tree
   │
   ▼
semantic-classifier ──▶ IMetric[] (parser origins)
   │
   ▼
Dialect Stack ──▶ IMetric[] (dialect origins + hints)
   │
   ▼
MetricContainer on CodeStatement
   │
   ▼
Choice collapse (pre-run wizard / RuntimeFactory)
   │
   ▼
JIT Compiler + Strategies ──▶ RuntimeBlock + Behaviors
   │
   ▼
Runtime Stack + Clock ──▶ OutputStatement[]
   │
   ▼
Analytics Engine ──▶ analyzed metrics
   │
   ▼
QueryService / WQL ──▶ charts, tables, dashboards
```

## Engine package responsibilities

### `@bitcobblers/wod-wiki-core`

- `Metric`, `MetricContainer`, `MetricType`, `MetricOrigin`
- `CodeStatement`, `OutputStatement`, `TimeSpan`
- Ownership resolver / ledger
- Persistence shape interfaces (`Note`, `WorkoutResult`, `AnalyticsDataPoint`, etc.)
- Zero external runtime dependencies

### `@bitcobblers/wod-wiki-lang`

- Whiteboard grammar + Lezer parser
- `WhiteboardScript`, `parseScript`
- Dialect stack and built-in dialects
- JIT compiler, runtime stack, behaviors
- Effort registry and fuzzy matching
- Analytics engine + CalcEngine
- React hooks in `@bitcobblers/wod-wiki-lang/react`

### `@bitcobblers/wod-wiki-wql`

- WQL grammar, AST, `parseQuery`
- `QueryService` over injectable stores
- Rollup math (ACWR, monotony, strain)
- Dashboard model

### `@bitcobblers/wod-wiki-ui`

- CodeMirror editor extensions (`editorPreset`)
- WQL widgets (value, table, timeseries, bar, etc.)
- WQL composer / omni-composer
- Design tokens (`@bitcobblers/wod-wiki-ui/styles.css`)

### `@bitcobblers/wod-wiki-engine`

- Umbrella re-export of core + lang + wql
- Language Pack API (`defineLanguagePack`, `registerLanguagePack`)
- In-memory store seam
- IR helpers
- `wod` CLI runner (`wod parse`, `wod run`, `wod query`)

## Runtime stack

The runtime is a stack of `IRuntimeBlock`s.

- `pushBlock` creates and mounts a block.
- `next()` advances the current block.
- `popBlock` unmounts, emits an `OutputStatement`, and disposes the block.
- The consumer must call `dispose()` on popped blocks.

Performance targets:

- `push` / `pop` < 1ms
- `current()` < 0.1ms
- `dispose()` < 50ms

## Key seams

| Seam | Interface | How to extend |
| ------ | ----------- | --------------- |
| Parser | `extractStatements`, Lezer grammar | Edit grammar + mapper |
| Dialect | `IDialect` | Implement `analyze(statement)` and register in stack |
| Compiler strategy | `IRuntimeBlockStrategy` | Implement `match()` + `apply(builder, nodes, runtime)` |
| Behavior | `IRuntimeBehavior` | Implement lifecycle hooks and attach via strategy |
| Analytics realtime | `IRealtimeProcessor` | Derive per-segment metrics during execution |
| Analytics summary | `ISummaryProcessor` | Derive session-level metrics after execution |
| Query store | `UnifiedEventStore`, `NoteQueryStore`, etc. | Provide your own backend |
| Storage adapter | `IStorage` | IndexedDB, in-memory, or remote |
| Language pack | `defineLanguagePack` | Bundle dialect + editor + analytics slices |

## App architecture

The playground app is organized around screens in the **Plan → Track → Analyze** loop:

- `/plan` — assemble a session
- `/journal` — browse notes and entries (Library)
- `/run/:runtimeId` — execute on the clock
- `/review/:runtimeId` — review results
- `/analytics` — dashboards and explorer
- `/collections/:cat` — bundled catalogs

Core app concepts:

- **Workbench Session** — pure store holding open note, selected block, runtime, results
- **Workbench Effect** — lifecycle-bound React adapter (wake lock, runtime create/dispose)
- **Result Recorder** — single seam for persisting `WorkoutResult`
- **Cast Backend** — Chromecast or local-tab casting

## Dependency direction

```text
wod-wiki (app)
      │
      ▼
@bitcobblers/wod-wiki-engine / lang / wql / ui / core
      │
      ▼
CodeMirror, React, Tailwind, Vite
```

Engine packages themselves form a strict DAG:

```text
ui ──▶ lang, wql
engine ──▶ lang, wql
core ◀── lang, wql, ui, engine
```
