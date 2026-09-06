# Cross-workout tables and aggregate drill-down

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02, 03, 05
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md); [Time buckets, group keys, and alignment boundaries](03-time-buckets-and-group-keys.md); [Query documents and shared-key formulas](05-query-documents-and-formulas.md)

## Question

How do cross-workout analytical tables and drill-down expose trustworthy records without breaking existing session rows queries?

Resolve:
- Row identity and grain for cross-workout segments versus current per-run output statements; exact relationships to aggregate contributions and grouped results.
- Filtering on discovered fields and linked metadata, column selection, units, deterministic ordering, limits, and pagination semantics. Treat the proposal's pipe suffixes as candidates.
- Consume the shared typed-field selectors and explicit collection operations owned by [Query documents and shared-key formulas](05-query-documents-and-formulas.md). Apply [Field discovery and catalog contract](../assets/field-discovery-contract.md) to column identity, inherited metadata, missing fields, and array handling; no implicit expansion or independent selector syntax.
- Deduplicate overlapping row scopes by record identity without dropping legitimate repeated measurements (source section 3.6).
- Preserve existing single-session row behavior where intended; define any deliberate contract changes and how aggregate drill-down carries filters, range, group, and selected source grain.
- Use [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md) for metric-date filtering, date-only display, partial-bucket drill-down, and collision-safe typed group identity. A table row or workout may contain metrics on different dates; define its filtering/display contract without reverting to workout-start attribution.
- Expose the selection explanation required by [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md): contributing observations, summary coverage/counts, duplicate representations excluded, and scopes with insufficient evidence. Fetch detailed lineage on demand rather than requiring full raw populations in every aggregate payload.
- Consume [Missing values, units, and numerical correctness](../assets/arithmetic-contract.md): distinguish recorded values, synthetic zeros, absent results, partial windows, and invalid calculations. Do not turn filled chart positions into raw source records; show actual observation counts separately from rolling-position denominators. Keep raw numeric precision separate from cell formatting.
- Shared versus distinct result shapes for rows, aggregates, and chart views; compatible widget switching must not silently reaggregate data.

Resolution must include concrete cross-workout and overlapping-scope examples, a table/drill-down contract, and affected grammar, query-service, and presentation seams. Any arithmetic requirements must reference the arithmetic ticket instead of inventing a competing policy.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Cross-workout rows:segment and pipe syntax — agreed during grilling

Support cross-workout tabular queries over segments via `rows:segment{...} [window]` with pipe clauses:

```text
rows:segment{discipline:running} last 4w
| select date, effort, distance in km, elapsed in min, pace
| order by date desc
| limit 50
```

- Row identity is the segment observation (`resultId:segmentIndex`), not an entire workout.
- Single-session `rows:all{result:...}` and `rows:segment{result:...}` queries retain their existing behavior and session log presentation.
- Pipe clauses (`select`, `order by`, `limit`) govern tabular presentation without altering the underlying dataset.

### Aggregate drill-down and on-demand lineage — agreed during grilling

Drill-down into an aggregate data point constructs a targeted `rows:segment{...}` query inheriting the parent query's tag filters, the clicked bucket's exact civil time boundaries, and the clicked group tuple. Detailed lineage explanation (contributing observation counts, substitute summary coverage descriptors, and insufficient-evidence indicators) is fetched on demand, rather than stuffing full raw records into every aggregate payload. Missing column values render as absent/empty (`—`), strictly distinct from recorded `0`.

## Answer

Resolved through live grilling with Serge. The authoritative [Cross-workout analytical tables and drill-down contract](../assets/analytical-tables-contract.md) establishes:

- Cross-workout exploration via `rows:segment` with tag/time filters, while preserving single-session `rows:all{result:...}` log behavior.
- Segment-grain row identity (`resultId:segmentIndex`) and true Metric Date timestamps.
- Pipe syntax for tabular presentation: `| select <col> [in <unit>]`, `| order by <col> [asc | desc]`, and `| limit <n> [offset <m>]`.
- Missing column values rendered as absent/empty (`—`), not synthetic `0`.
- Scope deduplication by stable record identity, preserving legitimate repeated measurements within a workout.
- Automatic drill-down query generation inheriting filters, bucket time boundaries, and clicked group tuples.
- On-demand lineage explanation without bloating base aggregate payloads.
- Decoupled `TabularResult` contract preventing silent reaggregation when switching compatible widgets.

No production code was modified.
