# WOD Wiki Documentation

This folder contains the living documentation for the WOD Wiki application and the Whiteboard Language it is built on. The docs are written for three audiences:

1. **End users** who want to write workouts, run them, and query their training journal.
2. **App contributors** working on the React/TypeScript playground in `playground/src/`.
3. **Engine contributors** working on the packages in `wod-wiki-engine`.

## Documentation index

| Doc | Audience | What it covers |
| ----- | ---------- | ---------------- |
| [`01-quick-start.md`](./01-quick-start.md) | Everyone | Install, run Storybook/playground, write your first `time` block |
| [`02-syntax-reference.md`](./02-syntax-reference.md) | End users | Full Whiteboard Language syntax: timers, rounds, reps, load, distance, rest, choice groups, comments |
| [`03-dialects.md`](./03-dialects.md) | End users / Engine | Fence tags and built-in dialects: `time`, `climb`, `cardio`, `yoga`, `habits` |
| [`04-metric-lifecycle.md`](./04-metric-lifecycle.md) | Engine / App | How a `Metric` is born in the parser, rewritten by dialects, compiled into blocks, tracked at runtime, and enriched by analytics |
| [`05-architecture.md`](./05-architecture.md) | Engine / App | Package split, pipeline seams, runtime stack, and how the app consumes the engine |
| [`06-interfaces-and-implementations.md`](./06-interfaces-and-implementations.md) | Engine | Extension seams: `IDialect`, `IRuntimeBlockStrategy`, `IRuntimeBehavior`, analytics processors, language packs |
| [`07-screens-and-workflow.md`](./07-screens-and-workflow.md) | App | Plan → Track → Analyze screens, routing, workbench session, cast, library |
| [`08-analytics.md`](./08-analytics.md) | Engine / App | Analytics metrics, WQL query language, dashboards, canonical metric keys, rollup math |
| [`09-wql-deep-dive.md`](./09-wql-deep-dive.md) | Engine | WQL grammar design, AST contract, QueryService execution plan, store seams, fact pipeline, cross-store joins |
| [`10-wql-composition-style.md`](./10-wql-composition-style.md) | Engine / App | WQL composition style, formula variations, and path to easy filters + graphs |
| [`11-routes-wql-defaults-and-library-aliases.md`](./11-routes-wql-defaults-and-library-aliases.md) | App / Engine | Complete route inventory, landing WQL defaults, Library route aliases, and future results/segments view |
| [`home-page-walkthrough.md`](./home-page-walkthrough.md) | App | The marketing home page scroll-runway, slide by slide |
| [`12-on-this-page-navigation.md`](./12-on-this-page-navigation.md) | App | On-this-page navigation, section/workout headers, and stream group sync |
| [`13-datadog-analytics-engine-review-and-roadmap.md`](./13-datadog-analytics-engine-review-and-roadmap.md) | Engine / App | Datadog-style analytics engine review, empirical probe findings, and roadmap |

> These docs are drafts. If the code and a doc disagree, the code wins until the doc is updated.

## Where things live

```
wod-wiki/                 ← the application
  src/                    ← library code consumed by the app
  playground/src/         ← the Vite app
  docs/                   ← this folder

../wod-wiki-engine/       ← the standalone engine packages
  packages/core/          ← @bitcobblers/wod-wiki-core (data shapes)
  packages/lang/          ← @bitcobblers/wod-wiki-lang (parser, runtime, analytics)
  packages/wql/           ← @bitcobblers/wod-wiki-wql (query language)
  packages/ui/            ← @bitcobblers/wod-wiki-ui (CodeMirror + widgets)
  packages/engine/        ← @bitcobblers/wod-wiki-engine (umbrella + CLI)
  apps/storybook/         ← component/workbench Storybook
```

## Editing conventions

- Use the domain vocabulary from [`CONTEXT.md`](../CONTEXT.md). Prefer **Metric**, **Statement**, **Dialect**, **Block**, **Behavior**.
- Code samples should be runnable or clearly marked as illustrative.
- When documenting the engine, mention the package name (`@bitcobblers/wod-wiki-lang`, etc.).
