# Library / Runtime Context

Scope: everything under `src/` — the public React component library, parser,
JIT compiler, runtime stack, behaviors, metrics, dialects, and grammar.

This file only captures context that's specific to working inside `src/`.
Domain vocabulary that applies repo-wide lives in the root
[`CONTEXT.md`](../CONTEXT.md) — read that first.

## Pipeline (top-down)

```
md-timer.ts (entry)
  └─► Lezer CST (parser.terms.ts)
        └─► syntax-parser.ts → typed SyntaxPrimitive[] + indentation tree
              └─► semantic-classifier.ts → IMetric[]
                    └─► dialect stack (src/dialects/, e.g. units/fusion)
                          └─► WhiteboardScript
                                └─► JitCompiler (per-block, lazy)
                                      └─► RuntimeStack → IRuntimeBlock + IRuntimeBehavior
```

## Key seams (in order they fire)

| Seam | File | Contract |
|---|---|---|
| Grammar | `src/grammar/whiteboardscript.grammar` | Lezer LR grammar; regenerated to `parser.ts` / `parser.terms.ts` via `lezer-generator` |
| CST → primitive | `src/parser/syntax-parser.ts` | Maps the CST to typed `SyntaxPrimitive`s |
| Primitive → metric | `src/parser/semantic-classifier.ts` | Assigns `MetricType` and `MetricOrigin: 'parser'` |
| Dialect stack | `src/dialects/` | Runs base units dialect first; later dialects observe earlier (later-wins). Emits `Hint` metrics and may fuse number+text into dimensioned metrics. |
| Strategy composition | `src/runtime/compiler/strategies/` | Priority-ordered `IRuntimeBlockStrategy`s compose onto a shared `BlockBuilder` rather than one owning a block. |
| Behavior attachment | `src/runtime/behaviors/` | Composable `IRuntimeBehavior`s attached to a compiled block. |
| Output | `src/core/models/OutputStatement.ts` | The single typed emission flowing out of an executing block. |

## Where to look for…

- **A new workout metric type** — `src/core/models/Metric.ts` (the metric shape),
  then `src/parser/semantic-classifier.ts` (where it's minted), then
  `src/runtime/compiler/metrics/` (resolution / collapse).
- **A new fence tag / dialect** — `src/dialects/`, then register with the dialect
  stack. The Block Dialect seam is the single source of truth for runnable
  fences.
- **A new runtime behavior** — `src/runtime/behaviors/`, then an
  `IRuntimeBlockStrategy` that attaches it in the composition pipeline.
- **A grammar change** — `src/grammar/whiteboardscript.grammar` → regenerate
  parser tables → update CST-to-primitive mapping → update semantic
  classifier → cover with parser stories and `src/parser/*.test.ts`.

## Conventions

- **Constructor-init**: blocks initialize during construction, not on `push()`.
- **Consumer-dispose**: the caller of `pop()` is responsible for `dispose()`.
- **Performance targets**: `push`/`pop` < 1 ms, `current()` < 0.1 ms,
  `dispose()` < 50 ms.
- **No `src/fragments/`**: "fragments" were replaced by typed `IMetric`s; this
  directory must not be reintroduced.
- **No central `index.ts`**: exports are distributed (`src/index.ts`,
  `src/core-entry.ts`, `src/clock-entry.ts`, `src/editor-entry.ts`).