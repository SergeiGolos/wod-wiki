# WQL analytics — deepening design review

Status: **Proposals for review, not implemented changes or new resolved decisions.**

This collection explains how the analytics work can make the codebase easier to understand, change, and verify. It supplements the [implementation handoff](../assets/implementation-work-breakdown.md) and [map](../map.md); it does not replace the agreed behavioral contracts.

## Documents

| Opportunity | Deepening document | What callers should no longer need to know | Implementation tickets |
|---|---|---|---|
| 1 | [Contribution selection](01-contribution-selection.md) | Which stored representations overlap and whether a summary preserves the requested population | [16](../issues/16-contribution-selection.md), with 12–14 |
| 2 | [Shared unit policy](02-unit-policy.md) | Separate recognition, conversion, dimensional checking, and output-default rules | [13](../issues/13-units-and-arithmetic.md), [17](../issues/17-query-documents-and-formulas.md), [19](../issues/19-shared-query-execution.md), gated by [21](../issues/21-unit-catalog-home.md) |
| 3 | [Canonical Metric derivation](03-metric-derivation.md) | How custom keys, Metric Dates, and logical observation identity survive storage copies | [11](../issues/11-typed-field-identity.md), [12](../issues/12-time-alignment.md), [14](../issues/14-db-v17-lifecycle.md), [16](../issues/16-contribution-selection.md) |
| 4 | [Dashboard Note ownership](04-dashboard-note.md) | Different parsing, token, and editing conventions for each host | [17](../issues/17-query-documents-and-formulas.md), [19](../issues/19-shared-query-execution.md), gated by [22](../issues/22-dashboard-body-migration.md) |
| 5 | [Query presentation](05-query-presentation.md) | How to reinterpret query results before drawing each widget | [18](../issues/18-analytical-tables-and-drilldown.md), [19](../issues/19-shared-query-execution.md), gated by [23](../issues/23-widget-presentation-semantics.md) |
| 6 | [Query freshness](06-query-freshness.md) | Retry delays, commit ordering, stale completions, and redundant fetch coordination | [14](../issues/14-db-v17-lifecycle.md), [19](../issues/19-shared-query-execution.md), [20](../issues/20-invalidation-and-performance.md) |
| 7 | [Transactional Persistence](07-transactional-storage.md) | Which source, event, catalog, and category stores must commit together | [14](../issues/14-db-v17-lifecycle.md), [20](../issues/20-invalidation-and-performance.md) |

Each document includes current source excerpts, current data shapes, explicitly proposed Interface and usage sketches, a before/after data example, ownership and dependency analysis, a clean cutover, behavioral verification scenarios, and unresolved decisions.

## How to read the examples

- **Current excerpts** quote source read for this review, with links to the relevant files and line ranges. They are evidence, not new Implementation.
- **Proposed sketches** explain the intended Seam. Their names and TypeScript declarations are illustrative; they are not available package exports, tested implementations, or finalized schemas.
- Sketches in different documents are **not one composable TypeScript declaration set**. Agree shared vocabulary, discriminants, ownership, and persisted identity before implementing them together.
- **Data examples** trace the same question before and after. A record-shaped excerpt may show only relevant fields; it is not necessarily a complete object satisfying the current stored type.
- The existing [domain glossary](../../../../CONTEXT.md) remains canonical. We introduce no second glossary and no approved domain names for provisional Modules.

## What “easier” means

Depth is Leverage at the Interface, not a count of lines hidden behind a function. A large Module can be deep; a small wrapper can add only ceremony.

| Design property | Evidence to seek during implementation |
|---|---|
| Locality | A change to contribution ownership is made once and affects direct queries and content-joined queries together. |
| Leverage | One supported result shape feeds several widgets without each choosing its own first/last value or missing-data policy. |
| Smaller Interface | Callers submit a query or mutation without knowing storage grain, catalog deltas, or retry sleeps. |
| Real Seam | Production and test Adapters exercise the same behavioral promises; pure computation does not acquire a needless Adapter. |
| Deletion test | Removing the Module would scatter its invariant across callers, rather than simply deleting a pass-through. |
| Test surface | Tests assert visible populations, values, diagnostics, and committed state—not private helper calls or file arrangement. |

Preserve the existing injected `UnifiedEventStore` Seam and the useful behavior tests around `QueryService`. Neither is disposable merely because `QueryService.ts` is large. Separating internal responsibilities does not automatically make tickets safe to edit concurrently; serialization at shared mutations remains necessary until ownership and shared types are settled.

## Worked thread across the documents

Consider two recorded segments with `100 m / 10 s` and `100 m / 100 s`, plus a copied summary representation:

1. **Derivation** preserves the original Metric identities, dates, and logical observation references when projecting the logs.
2. **Unit policy** normalizes compatible units without changing dimensions or reinterpreting saved values.
3. **Transactional Persistence** makes the authoritative source, projection, and catalog memberships visible together.
4. **Contribution selection** chooses the complete population once; the storage copy does not double it.
5. **Dashboard Note ownership** preserves a block-local document specifying whether the question is average segment speed (`5.5 m/s`) or total distance divided by total duration (`200/110 m/s`).
6. **Freshness** publishes only the latest eligible execution and invalidates after committed mutations.
7. **Presentation** draws the chosen answer without changing its calculation, units, grouping, or presence.

The improvements are interconnected, but they do not require a separate public Interface for every numbered step.

## Implementation readiness — qualification of the earlier handoff

The implementation tickets exist and the behavioral direction is agreed. The earlier statement that *no design decision remains* was too strong. Reading the actual code and writing concrete data examples exposes questions that the compact contracts and ticket sketches do not fully resolve.

Do not treat the following as permission to silently choose new product behavior:

| Design gate | Why it matters | Review owner |
|---|---|---|
| Coverage and observation identity | An effort slug and a count do not prove exact summary coverage or duplication. | [Selection](01-contribution-selection.md), [derivation](03-metric-derivation.md) |
| Unit ownership and conversion evidence | The recognition registry is not already a complete strict dimensional converter; placing identity in core must not create core-to-lang imports. | [Unit policy](02-unit-policy.md) |
| Query-document parsing and body framing | Named formulas introduce division alongside existing slash-separated widget parameters; document parsing and serialization must preserve both deliberately. | [Dashboard Note](04-dashboard-note.md) |
| Typed presentation and scalar meaning | Rendering must distinguish absent/synthetic/error states and must not choose a different calculation when the widget changes. | [Presentation](05-query-presentation.md) |
| Revision and execution ordering | A generation check alone does not prevent an older request at the same generation overwriting a newer request. | [Freshness](06-query-freshness.md) |
| Physical catalog/temporal schema and recovery | Raw boolean IDB keys, per-Metric dates inside one event, resumable population, and concurrent saves need a concrete coherent plan. | [Persistence](07-transactional-storage.md) |

Additional function-specific semantics required by the original decision ticket—such as correlation with insufficient pairs or zero variance, moving-average authoring syntax, and attached-calculation lifecycle—must be checked against the resolved query-document contract before coding them. A ticket cannot claim these are agreed solely by listing a function name.

These documents identify design gates; they do not silently amend the resolved tracker state. A choice that changes an agreed contract belongs in a focused decision ticket before the affected implementation task proceeds. Unrelated verified behavior-preserving extractions can proceed without a codebase-wide redesign.

The structural gates now have tracker homes: decision tickets [21](../issues/21-unit-catalog-home.md) (unit catalog home and conversion evidence), [22](../issues/22-dashboard-body-migration.md) (dashboard body migration), and [23](../issues/23-widget-presentation-semantics.md) (scalar endpoints and absent scatter positions) gate tickets 13/14, 17/19, and 19 respectively; the implementation-level gates from this review are enumerated inside tickets 14, 16, 17, 19, and 20.

## Recommended landing strategy

1. **Agree the shared representation first:** typed identity, Metric Date, observation/copy/summary provenance, units, and result presence. These connect documents 1–3 and 7.
2. **Keep pure work together:** derivation and conversion can be tested with deterministic inputs. Do not add ports merely to mock arithmetic.
3. **Make storage guarantees real:** resolve the physical-plan gates and implement coherent mutation visibility before removing reads' retry behavior.
4. **Unify Dashboard Note ownership and document execution:** preserve app-only editing behavior when deleting duplicate modules; do not delete unique `noteOps` or unrelated frontmatter features.
5. **Move semantic choices out of renderers:** implement presentation and freshness against the resulting structured query result, then validate all hosts.
6. **Measure after integration:** the existing performance budgets remain targets, not evidence that any proposed design meets them.

This is an ordering of design commitments, not a replacement numbering of implementation tickets 11–20.

## Scope of this documentation change

No production source, database schema, unit defaults, query syntax, tests, or tracker status is changed. The documents use existing contracts as constraints and label recommendations separately. The small discipline-vocabulary drift mentioned in the review belongs with catalog/composer work in ticket 15, not an eighth deepening Module or an unrelated cleanup effort.
