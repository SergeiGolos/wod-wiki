# Invalidation, query reuse, and performance budgets

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 07, 08
Prerequisites: [Shared query execution across dashboards and notes](07-shared-query-execution-and-surfaces.md); [Projection lifecycle and existing-data migration](08-projection-lifecycle-and-migration.md)

## Question

What execution and freshness strategy keeps multi-year personal-journal analytics responsive without changing query meaning?

Resolve:
- Workload assumptions and measurable latency/memory/scan budgets for the proposal's multi-year histories and dashboards with twelve or more widgets. Use existing evidence before prescribing indexes or workers.
- Exact query-equivalence and cache/reuse keys, including range evaluation time, units, metadata, field/projection versions, tokens, and formula dependencies.
- Include captured evaluation context, system timezone, temporal kind, boundary semantics, and persisted normalization intent from [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md) in reuse/cache contracts. Verify candidate-index completeness for per-metric dates, and bound zero-bucket generation to the actual evaluation domain without expanding every catalog group.
- Safe coalescing of identical subqueries and shared scans; interpret the proposal's zero redundant scans criterion precisely rather than requiring one scan for semantically different queries.
- Design efficient coverage selection and revision-aware invalidation under [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md). Prefer compact provable coverage descriptors; do not eagerly materialize all observation IDs or recompute all raw aggregates merely to validate summary equivalence. Optimization must preserve a complete, non-overlapping population.
- Preserve the validity/presence, reducer capabilities, raw precision, and rolling-window coverage from [Missing values, units, and numerical correctness](../assets/arithmetic-contract.md) through caching and coalescing. Include effective system defaults and conversion-policy revisions where they affect cached results; never reuse a rounded chart value as a calculation input or a whole-period mean as sufficient rolling evidence.
- Invalidation on note, result, effort, and projection changes; stale-result visibility, cancellation, and races between old and new executions.
- Include catalog commit/version changes in typeahead and query-cache invalidation. Specify bounded indexed field/category prefix lookup and a no-event/result-history-scan verification scenario from [Field discovery and catalog contract](../assets/field-discovery-contract.md). Initial population or explicit repair is separate from interactive discovery.
- Timestamp slicing, bounded tabular pagination, aggregation over full eligible datasets, and appropriate limits. Do not satisfy a speed target by silently dropping input records.

Resolution must specify freshness/reuse contracts and a reproducible verification workload. If an outside-source research or concrete prototype is necessary to choose, create that prerequisite explicitly rather than claiming unmeasured performance.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Query cache keys and subquery coalescing — agreed during grilling

- Coalescing shared scans: widgets in a dashboard or document requesting identical time ranges share a single in-flight IndexedDB range fetch pass, ensuring zero redundant store scans.
- Deterministic cache equivalence key: combines normalized query AST, resolved range timestamps, system timezone, evaluation instant, and store generation revision.
- Unrounded numerical caching: cached results preserve full floating-point precision; formatting and display rounding occur exclusively at presentation time.

### Invalidation signals, multi-tab sync, and performance budgets — agreed during grilling

- Any commit to `results`, `notes`, `efforts`, or `field_catalog` increments an in-memory `generationId` and broadcasts an event via `BroadcastChannel('wodwiki.analytics')` to keep all open tabs synchronized.
- In-flight queries verify `generationId` on completion and discard results if an intervening mutation occurred.
- Explicit performance budgets at personal-journal scale (500–1,000 workouts, 5,000–10,000 segments): < 250 ms for 12-widget dashboards with zero duplicate store scans; < 16 ms for catalog typeahead with zero event scans; < 50 ms for 50-row table paging.

## Answer

Resolved through live grilling with Serge. The authoritative [Invalidation, query reuse, and performance budgets contract](../assets/invalidation-performance-contract.md) establishes:

- In-flight range request coalescing via `QueryDocumentRunner`: 12 widgets sharing a time range issue exactly one store scan.
- Deterministic structural cache equivalence keys (`QueryCacheKey`) incorporating normalized AST, range, timezone, evaluation instant, and store generation.
- Unrounded numerical result caching with full observation and lineage fidelity.
- Reactive multi-tab invalidation using an in-memory `generationId` counter and `BroadcastChannel` synchronization.
- Stale result cancellation preventing write-after-newer-write race conditions.
- Measurable performance budgets (< 250 ms for 12-widget dashboards; < 16 ms for typeahead; < 50 ms for table paging) and reproducible verification scenarios.

No production code was modified.
