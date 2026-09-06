# Implementation work tickets and acceptance coverage

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 04, 05, 06, 07, 08, 09
Prerequisites: [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md); [Query documents and shared-key formulas](05-query-documents-and-formulas.md); [Cross-workout tables and aggregate drill-down](06-analytical-tables-and-drilldown.md); [Shared query execution across dashboards and notes](07-shared-query-execution-and-surfaces.md); [Projection lifecycle and existing-data migration](08-projection-lifecycle-and-migration.md); [Invalidation, query reuse, and performance budgets](09-invalidation-and-query-performance.md)

## Question

How should the settled design be divided into independently implementable work tickets with complete acceptance coverage and no remaining design guesses?

Resolve:
- Produce the implementation-ready handoff as linked assets and publish dependency-ordered implementation issues in the same local tracker, distinct from this map's decision children. Implementation issues are deliverables, not additional wayfinder decisions.
- For each issue name the observable outcome, exact current source owners/callers, prerequisites, contract changes, clean-cutover/removal requirements, and acceptance scenarios. Reuse or reconcile existing related work instead of duplicating it.
- Cover all source findings 3.1 through 3.9: custom identity loss, mixed-grain double counting, unit normalization, chronological delta, unknown dimensions, row-scope duplicates, event-grain content joins, per-result effort ownership, and every surface-parity gap.
- Cover all six proposed roadmap capability areas, including discovery, formulas/relationships, analytical tables, visualization parity, lifecycle/invalidation, and performance. Record an explicit disposition for every source acceptance criterion; do not inherit unsafe candidate fixes as settled design.
- Preserve every standing user choice and ticket resolution. Keep remaining design questions as new decision tickets rather than implementation TODOs or scope reductions.

Resolution requires a coverage/dependency audit, links to the resulting work tickets, and an explicit statement that no decision needed for implementation remains. Do not execute the implementation tickets in this session or close this decision while any required design question is still open.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Answer

Resolved through live planning with Serge (scope confirmed: produce the handoff, no production implementation). The authoritative result is the [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md) asset: the dependency rationale, the coverage audit dispositioning every source finding 3.1–3.9, every roadmap Phase 1–6 action and acceptance criterion, and every standing map choice, plus reconciliation of related/duplicated work.

The handoff publishes ten dependency-ordered implementation issues, distinct from this map's decision children:

- [Typed field identity and custom metric key preservation](11-typed-field-identity.md) — finding 3.1; Phase 2 identity work.
- [Calendar time alignment and metric-date anchoring](12-time-alignment.md) — civil windows, evaluation context, metric dates.
- [Unit normalization, output defaults, and reducer correctness](13-units-and-arithmetic.md) — findings 3.3/3.4; arithmetic contract.
- [DB v17 projection schema, provenance, backfill, and atomic mutations](14-db-v17-lifecycle.md) — lifecycle contract, catalog stores.
- [Field catalog service, typeahead, and discovery surfaces](15-catalog-typeahead-and-discovery.md) — catalog consumers, zero history scans.
- [Contribution selection, grain integrity, and metadata resolution](16-contribution-selection.md) — findings 3.2/3.5/3.7/3.8; grain contract.
- [Query documents, formulas, and attached calculations](17-query-documents-and-formulas.md) — document grammar, `each(...)`, attached effort/dialect calculations.
- [Cross-workout analytical tables and drill-down](18-analytical-tables-and-drilldown.md) — finding 3.6; pipes, `TabularResult`, drill-down.
- [Shared query execution and surface cutover](19-shared-query-execution.md) — finding 3.9; `QueryDocumentRunner`, duplicate-model removal.
- [Invalidation, query reuse, and performance verification](20-invalidation-and-performance.md) — coalescing, cache keys, measured budgets.

No decision required for the agreed implementation scope remains open. Candidate fixes from the source proposal that decisions superseded (blanket summary-only default, metadata copied onto metrics, inline `show a / b` form) are explicitly dispositioned rather than inherited. The map's "Not yet specified" provisions stay in force for genuinely new questions surfaced during implementation. Implementation itself is deliberately not executed here, per this ticket's own constraint and the map's planning-only scope.
