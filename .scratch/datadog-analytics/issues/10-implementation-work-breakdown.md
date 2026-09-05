# Implementation work tickets and acceptance coverage

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
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
