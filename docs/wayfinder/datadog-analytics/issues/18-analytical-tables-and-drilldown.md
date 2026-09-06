# Cross-workout analytical tables and drill-down

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 12, 16, 17
Prerequisites: [Cross-workout analytical tables and drill-down contract](../assets/analytical-tables-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

`rows:segment` explores segments across workouts with pipe-projected tabular presentation, stable row identity, scope dedupe (finding 3.6), bounded pagination, and click-through drill-down that inherits an aggregate point's exact filters, civil bucket boundaries, and group tuple.

## Scope

1. **Scope relaxation** ([`validateRowsFilters`](../../../../packages/wql/src/wql.ts) + `parseRowsQuery`): `rows:segment{<tag/metadata filters>} [window]` valid without `result:`/`block:`/`note:` scope. Single-session `rows:all{result:…}` and scoped `rows:segment{result:…}` keep their existing behavior and Session Results Table presentation — the relaxation applies to the unscoped/cross-workout form only.
2. **Pipe clauses** parsed at the suffix boundary and represented in the AST/serializer: `| select <col> [in <unit>] [, …]` (columns: metric date, effort, discipline, discovered fields via 17's `field(...)` selector, canonical families), `| order by <col> [asc|desc] [, …]` (deterministic tie-break by `resultId`, `segmentIndex`), `| limit <n> [offset <m>]`. Pipes govern presentation only — they never alter the underlying matched dataset.
3. **Execution** ([`runRows`](../../../../packages/wql/src/QueryService.ts)): cross-workout mode fetches eligible segment events via the indexed selection paths; each row is one segment observation with identity `resultId:segmentIndex`; the date column is the segment's own metric date (12). Overlapping scopes (e.g. result + note + content paths) dedupe by stable record identity; repeated same-valued measurements keep their distinct indices. Result includes `totalCount` beside the bounded page.
4. **`TabularResult` contract:** `columns[{name, type, unit?}]`, `rows[Record<string, unknown>]`, `totalCount`, `limit`, `offset` — the stable shape consumed by table widgets (19 wires widgets); compatible widget switches never reaggregate or alter columns.
5. **Presentation** ([`RowsTable`](../../../../packages/ui/src/widgets/RowsTable.tsx) cross-workout mode): missing column values render as absent (`—`), strictly distinct from recorded `0`; display-only unit formatting from full-precision values; metric-date display keeps date-only entries as civil dates.
6. **Drill-down:** from an aggregate point (explorer chart or dashboard widget), construct `rows:segment{…}` inheriting the parent's tag/metadata filters, the clicked bucket's exact half-open civil boundaries (12's structural identity, not display timestamps), and the clicked group tuple as exact filters; the lineage panel fetches on-demand detail via ticket 16's explainability API (contributing counts, substitute-summary coverage, insufficient-evidence flags) instead of bloating aggregate payloads.

## Clean cutover

- The mandatory single-session scope validation error for `rows:segment` is removed for the cross-workout form; normalization advisories updated so legacy `rows:` strings keep their meaning.
- `rowsQueryResultToEntries` ([`entryMapper.ts`](../../../../apps/playground/app/lib/entryMapper.ts)) keeps session-level mapping for scoped queries and gains the tabular path for cross-workout queries — no synthetic aggregate stubs.

## Acceptance scenarios

From the [analytical tables contract](../assets/analytical-tables-contract.md) and roadmap Phase 4:

1. `rows:segment{discipline:running} last 4w` returns running segments across all workouts in the window without any session id (Phase 4 acceptance).
2. The contract's pipe example returns columns `date, effort, distance (km), elapsed (min), pace` ordered by date descending, first 50 rows, with `totalCount` reporting the full match.
3. A workout crossing midnight lists its segments under their respective civil dates.
4. Overlapping scopes (`note` feed + explicit `result:`) yield each segment exactly once; two identical 400 m intervals remain two rows.
5. A segment with no `shoe` metadata renders `—` in that column while a recorded `0` renders `0`.
6. Ordering is stable across re-fetches (ties broken by `resultId:segmentIndex`); paging at offset 50 costs one bounded indexed read and never drops matched rows from `totalCount`.
7. Clicking the Week 34 running-volume point opens a `rows:segment` query filtered to `{discipline:running}` over exactly that week's half-open boundaries; the lineage panel shows contributing observation counts and any substitute-summary coverage.
