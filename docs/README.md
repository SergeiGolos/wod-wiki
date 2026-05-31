# WOD Wiki — Documentation

> Generated holistic documentation. This set was written from the **source code**
> and the **sample workouts in `/markdown`** — it is a fresh, ground-up description
> of the system, independent of any pre-existing docs.

WOD Wiki is a TypeScript + React toolkit for **writing, running, and analyzing
workouts written as Markdown**. A workout is plain Markdown with fenced ` ```wod `
blocks. The library parses those blocks into a structured model, executes them on a
clock-driven runtime, records what actually happened, and then derives training
analytics from the combination.

## The one-sentence mental model

```
Markdown  ──►  Metrics (the plan)
              ──►  Tracking (execution → time-based metrics)
                  ──►  Analytics (effort × metrics × tracking → compound metrics)
                      ──►  Analysis run over the compound metrics
```

Every stage **adds metrics**; nothing is thrown away. A metric carries an **origin**
that records which stage produced it, and a precedence system decides which metrics
"win" for display. This is the spine of the whole application — read
[04 — Metric Lifecycle](./04-metric-lifecycle.md) first if you only read one page.

## Reading order

| # | Document | What it covers |
|---|----------|----------------|
| 01 | [Overview](./01-overview.md) | The plan → track → analyze pipeline end to end |
| 02 | [Syntax Reference](./02-syntax-reference.md) | The `wod` block language, grounded in real samples |
| 03 | [Domain Model](./03-domain-model.md) | CodeStatement, Metric, MetricType, origins, precedence |
| 04 | [Metric Lifecycle](./04-metric-lifecycle.md) | How a metric is born, tracked, and compounded |
| 05 | [Architecture](./05-architecture.md) | Layers, modules, and data flow |
| 06 | [Interfaces & Implementations](./06-interfaces-and-implementations.md) | Conventions for the extensible seams + a full inventory |
| 07 | [Screens & Workflow](./07-screens-and-workflow.md) | The Plan / Track / Analyze views and persistence |
| 08 | [Analytics](./08-analytics.md) | Effort registry + enrichment/projection processors |

## Conventions used in these docs

- **Metric** — a typed, origin-stamped fact about a workout (a planned duration, a
  recorded span, a derived volume). The atomic currency of the system.
- **Statement** — one structural node of a parsed workout (`CodeStatement`); a `wod`
  block is a tree of statements.
- **Block** — a *runtime* execution unit (`IRuntimeBlock`) compiled from statements.
- **Behavior** — a composable capability attached to a block (`IRuntimeBehavior`).
- **Strategy** — a compiler rule that decides which behaviors a block gets
  (`IRuntimeBlockStrategy`).
- **Origin** — the stage that produced a metric (`parser`, `compiler`, `dialect`,
  `runtime`, `user`, `analyzed`).
- **Seam** — an interface with multiple implementations where behavior can be swapped
  without editing callers (see doc 06).
