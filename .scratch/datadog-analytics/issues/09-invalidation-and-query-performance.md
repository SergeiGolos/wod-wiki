# Invalidation, query reuse, and performance budgets

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 07, 08
Prerequisites: [Shared query execution across dashboards and notes](07-shared-query-execution-and-surfaces.md); [Projection lifecycle and existing-data migration](08-projection-lifecycle-and-migration.md)

## Question

What execution and freshness strategy keeps multi-year personal-journal analytics responsive without changing query meaning?

Resolve:
- Workload assumptions and measurable latency/memory/scan budgets for the proposal's multi-year histories and dashboards with twelve or more widgets. Use existing evidence before prescribing indexes or workers.
- Exact query-equivalence and cache/reuse keys, including range evaluation time, units, metadata, field/projection versions, tokens, and formula dependencies.
- Safe coalescing of identical subqueries and shared scans; interpret the proposal's zero redundant scans criterion precisely rather than requiring one scan for semantically different queries.
- Invalidation on note, result, effort, and projection changes; stale-result visibility, cancellation, and races between old and new executions.
- Timestamp slicing, bounded tabular pagination, aggregation over full eligible datasets, and appropriate limits. Do not satisfy a speed target by silently dropping input records.

Resolution must specify freshness/reuse contracts and a reproducible verification workload. If an outside-source research or concrete prototype is necessary to choose, create that prerequisite explicitly rather than claiming unmeasured performance.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
