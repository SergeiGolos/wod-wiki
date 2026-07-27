# 05 — Architecture

WOD Wiki is organized as a set of layers, each consuming the previous layer's output
and adding metrics. This document maps the layers to source directories and describes
how data flows between them.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION   src/components/**, src/clock/**, src/views/**, src/panels/**│
│                src/app/**, playground/src/**                               │
│   editor · clock/timer · review grid · journal · collections · efforts    │
└───────────────▲───────────────────────────────────────┬──────────────────┘
                │ reads metrics / outputs                 │ user actions
┌───────────────┴───────────────────────────────────────▼──────────────────┐
│ ANALYTICS      src/core/analytics/**, src/timeline/analytics/**           │
│                src/effort-registry/**                                     │
│   realtime enrichment + summary projection → 'analyzed' metrics          │
└───────────────▲───────────────────────────────────────┬──────────────────┘
                │ OutputStatements                        │ effort coefficients
┌───────────────┴───────────────────────────────────────▼──────────────────┐
│ RUNTIME        src/runtime/**                                             │
│   ScriptRuntime · RuntimeStack · RuntimeClock · blocks · behaviors ·      │
│   JIT compiler (strategies) · memory · events · tracking → 'runtime' mets │
└───────────────▲───────────────────────────────────────┬──────────────────┘
                │ CodeStatements (+ hints)                │ IRuntimeBlock tree
┌───────────────┴───────────────────────────────────────▼──────────────────┐
│ SEMANTICS      src/dialects/**                                            │
│   pattern recognition → hints + 'dialect' metrics                        │
└───────────────▲──────────────────────────────────────────────────────────┘
                │ CodeStatements
┌───────────────┴──────────────────────────────────────────────────────────┐
│ PARSE          src/grammar/**, src/parser/**                              │
│   lezer grammar → tokens → CodeStatement tree → 'parser' metrics         │
└───────────────▲──────────────────────────────────────────────────────────┘
                │ markdown text
┌───────────────┴──────────────────────────────────────────────────────────┐
│ DOMAIN         src/core/**  (Metric, CodeStatement, OutputStatement, …)   │
│   shared types every layer speaks                                        │
└──────────────────────────────────────────────────────────────────────────┘

  PERSISTENCE  src/services/db/** (IndexedDB) · src/services/persistence/**
  INFRA        src/services/** (cast, attachments, events, content)
```

---

## 5.1 Domain layer — `src/core`

The shared vocabulary. No layer above can avoid it. Key sub-areas:

- `core/models/` — `Metric`, `CodeStatement`, `OutputStatement`, `MetricContainer`,
  `TimeSpan`, `BlockKey`, `Duration`, `Dialect`.
- `core/contracts/` — `IMetricSource`, `IMetricContainer`, `IAnalyticsEngine`,
  `RuntimeStackTracker`.
- `core/analytics/` — the analytics engine, profiles, and enrichment/projection
  processors (covered in doc 08).
- `core/utils/metricPrecedence.ts` — the origin→tier mapping that drives display
  resolution.

## 5.2 Parse layer — `src/grammar` + `src/parser`

- `grammar/whiteboardscript.grammar` — the lezer grammar (tokens, fragments, blocks).
- `parser/` — wraps the generated parser: `WhiteboardScript` (the parsed document API:
  `statements`, id→statement map, child resolution), `lezer-mapper.ts`,
  `semantic-classifier.ts`, `syntax-facts.ts`. Produces a `CodeStatement` tree with
  `origin: 'parser'` metrics and `meta` source spans.

`WhiteboardScript` is the handoff object passed into the runtime
(`IScriptRuntime.script`).

## 5.3 Semantics layer — `src/dialects`

Dialects are **read-only analyzers** that recognize domain patterns and emit hints +
dialect metrics. They are pluggable (`IDialect`); six ship in the box (CrossFit, WOD,
Cardio, Yoga, Habits, Climb). See doc 06 for the inventory and doc 03 §3.4 for metric
actions.

## 5.4 Runtime layer — `src/runtime`

The execution engine. Major pieces:

| Module | Role |
|--------|------|
| `ScriptRuntime.ts` | Top-level orchestrator (`IScriptRuntime`): owns the stack, clock, event bus, JIT, analytics context, and the `do(action)` turn loop |
| `RuntimeStack.ts` | The block execution stack; push validates & mounts, pop orchestrates unmount → dispose → release → parent.next |
| `RuntimeClock.ts` | The time source (`IRuntimeClock`); all timing reads `clock.now` |
| `compiler/JitCompiler.ts` | Converts statements → blocks via strategies + `BlockBuilder` |
| `compiler/strategies/**` | The matchable rules that assign behaviors (doc 06) |
| `blocks/**` | Concrete `IRuntimeBlock` implementations |
| `behaviors/**` | Composable `IRuntimeBehavior` capabilities (doc 06) |
| `memory/**` | Block-scoped state (`TimerState`, `RoundState`, `DisplayState` …) |
| `time/**` | `TimeSpans`, `calculateElapsed` — span math |
| `events/**` | The event bus (`IEventBus`, `IEvent`) behaviors subscribe to |
| `tracking/**` | Real-time tracker updates surfaced to the UI |
| `actions/**` | `IRuntimeAction`s (push/pop/emit) the turn loop executes |

**Turn model:** actions are processed in "turns" where the clock is frozen and nested
actions are allowed up to a recursion limit — keeping a mount→emit→advance cascade
deterministic.

## 5.5 Analytics layer — `src/core/analytics` + `src/timeline/analytics` + `src/effort-registry`

Consumes OutputStatements, produces `analyzed` metrics. Two processor kinds (realtime
enrichment, summary projection), assembled by an **analytics profile**. The effort
registry supplies physiological coefficients. Full detail in doc 08.

## 5.6 Presentation layer

- **Library components** — `src/components/**` (editor, clock, review-grid, metrics,
  workout, results, collections, command-palette, layout, ui), `src/clock/**`,
  `src/views/**`, `src/panels/**`, `src/app/**`.
- **Editor** — `src/components/Editor/**` integrates CodeMirror with the grammar for
  live syntax highlighting and suggestions.
- **Playground app** — `playground/src/**` is the full reference application
  (routing, journal, feeds, collections, efforts, wallclock, review). Screens are
  catalogued in doc 07.

## 5.7 Persistence & infrastructure — `src/services`

- `services/db/IndexedDBService.ts` — the IndexedDB schema and access. Object stores:
  `notes`, `segments`, `results`, `attachments`, `analytics`, `efforts` (see doc 07).
- `services/persistence/**`, `services/content/**` — content loading and saving.
- `services/cast/**`, `src/types/cast/**` — Chromecast / TV receiver support
  (`tv/`, `playground/receiver-rpc.html`).
- `services/events/**`, `services/attachments/**` — supporting infra.

## 5.8 Data-flow invariant

Each arrow up the stack is **"+metrics"** and each layer reads the one below through
`IMetricSource`/`OutputStatement`. No layer mutates a lower layer's metrics in place;
it *adds* metrics with its own `origin`. This is what keeps the layers independently
testable — the test harness in `src/testing/**` and `tests/harness/**` exercises a
single behavior or strategy by asserting on the metrics/outputs it emits.

➡ The extensible seams and every implementation: [06 — Interfaces & Implementations](./06-interfaces-and-implementations.md).
