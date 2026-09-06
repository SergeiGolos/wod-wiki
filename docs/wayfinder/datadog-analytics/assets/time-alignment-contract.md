# Time buckets, group keys, and alignment

Status: resolved policy and implementation contract; planning only.

Owned by [Time buckets, group keys, and alignment boundaries](../issues/03-time-buckets-and-group-keys.md). Compose with [Field discovery and catalog contract](field-discovery-contract.md) and [Automatic grain selection and contribution ownership](automatic-grain-contract.md). This asset does not claim that the current engine implements these changes.

## Evaluation context and metric dates

Capture **one current instant and one system timezone per document execution**. Every named query, relative window, formula, normalization pass, and dependent calculation in that execution uses that context. Refreshing starts a new execution context. Do not let repeated clock reads split a dashboard across midnight or a Monday boundary.

Use the system timezone; no pinned-query/home-timezone setting or new timezone syntax was requested. Include the effective timezone in calendar-result identity and cache keys so a system timezone change cannot reuse incorrectly bucketed results.

A metric has its own temporal anchor, not the workout's start date:

- **Timestamped metric:** use its recorded occurrence instant, interpreted in the effective system timezone for calendar grouping.
- **Date-only metric:** preserve its recorded civil date. Do not turn it into an invented midnight instant that can change its date after a timezone change.
- A new calculated observation keeps the metric date assigned by its producing scope. Replaying or rebuilding it must not replace that date with the derivation clock.
- A substitute summary describes the temporal coverage of the observations it represents; its row timestamp does not move those observations into one workout-start bucket.

A workout spanning Sunday night and Monday morning can contribute to two days and two weeks. A recorded date without a time remains usable for day/week analysis, but cannot support a calculation requiring an exact within-day instant by inventing a time. Missing historical temporal evidence must be recovered from genuine source information or reported as a limitation where required, not guessed from the workout start or current clock.

## Calendar and duration windows

Calendar days run from local midnight to the next local midnight. Weeks start on Monday at local midnight. Use calendar arithmetic across DST, month/year boundaries, and leap days, not multiplication by 86,400,000 milliseconds.

| Requested range | Meaning |
|---|---|
| `last Nd` | N local dates including today: midnight N−1 dates before today through the captured current instant. |
| `last Nw` | Current Monday-start week plus N−1 preceding complete weeks, through the captured current instant. |
| Explicit `from` / `to` dates | Preserve the existing user-facing inclusive-date convention: include both named dates in full. |
| Explicit query range plus host default | The explicit query range wins. Host controls supply a range only when the query has none, unless explicitly referenced as a query parameter. |

`last 7d` is not a trailing 168-hour duration. `last 4w` is not a rolling 28-date window. Current days/weeks are partial through now; relative windows do not extend into the future. An explicit future date range remains explicit and must not be silently replaced by a relative window.

Retain the existing distinction between calendar grouping and explicitly fixed-duration rollups. Fixed-duration rollups use their declared elapsed width and origin; the current WQL rollup implementation uses epoch-aligned intervals. A fixed seven-day rollup is not a Monday-start calendar week. Bucket kind and origin must therefore participate in compatibility checks even when nominal widths match. Normalization offers supported target specifications; this decision does not add unrequested month/year/hour syntax or silently change existing duration rollups into calendar grouping.

### Boundary representation

Use half-open bucket membership: **bucket start included, next bucket start excluded**. A metric exactly at Monday midnight belongs only to the new week. DST days may last 23 or 25 elapsed hours.

Keep range endpoint semantics explicit rather than manufacturing an end-of-day `23:59:59.999` value:

- An inclusive `to` civil date is implemented by an exclusive bound at the following local midnight.
- A relative range includes recorded instants through the captured current instant. Preserve that inclusive current-time cutoff explicitly; never use an unbounded future endpoint for `last`.
- Intersections preserve their endpoint inclusion rules. No boundary observation belongs to two adjacent buckets.
- Date-only records compare using civil dates for calendar-date eligibility, not fabricated instants. If a requested instant-level restriction cannot be resolved from a date alone, report the temporal limitation rather than silently assigning a clock time.

Open-ended or all-history queries must not trigger infinite zero-bucket generation. For an unbounded side, use the eligible observed extent to bound the returned series; no observations means no inferred unbounded domain. Explicitly bounded calendar queries can still describe empty periods.

## Bucket identity and partial periods

Bucket identity is structural and distinct from its display label or a chart's representative timestamp. It includes calendar-versus-duration kind, unit/size, applicable timezone/origin, and canonical boundary identity. For day/week calendar grouping, the local day date or Monday date is the canonical anchor. A display timestamp such as local noon is not a join key.

The query's eligible interval clips the first/last bucket without moving the bucket's canonical boundaries. Retain effective coverage and partial-period information so a partial week is not represented as a completed week or treated as equivalent to a different slice of that week. Do not prorate sums, distribute totals evenly, or combine incompatible partial averages.

A summary is usable for a clipped bucket only when its coverage and retained statistics support the exact selected observations. Otherwise use sufficient detail or the already-agreed insufficient-evidence diagnostic.

## Formula alignment and normalization

### Compatible time buckets

Formula inputs must have compatible bucket specifications. Merely matching a displayed date, midpoint timestamp, nominal duration, or unit letter is insufficient.

If bucket specifications differ:

1. Report the mismatch and offer an explicit **Normalize** action.
2. Let the user choose the target time-bucket unit/specification; do not automatically pick the coarser input.
3. Recompute the inputs from eligible observations or sufficient summaries at that target. Do not normalize by arithmetic over displayed chart values or unsafe averages of averages.
4. If the chosen target requires unavailable detail, report the limitation.
5. Persist normalization intent in the query document, so dashboards and note rendering agree after reopening. Its syntax and editing UI are owned downstream.

Normalization does not silently rewrite requested input ranges, grouping dimensions, or physical measurement units. Nor should normalizing one formula silently mutate a shared input's meaning for unrelated consumers: the query-document ticket must give the persisted intent an explicit scope.

### Shared range

Evaluate a formula on the **intersection of its inputs' requested time ranges**. If `a` requests four calendar weeks and `b` requests twelve, the formula uses the four shared weeks. Keep both source query definitions intact.

The overlap is a real temporal domain, not merely a set of matching bucket labels. If a boundary bucket covers different portions in the two inputs, recompute each formula input over the common portion using observations or sufficient summaries. If that cannot be done, report the limitation. Do not divide a full-week aggregate by an unrelated partial-week aggregate just because both have the same Monday label.

Outside an input's requested range is **out of scope**, not missing. Do not zero-fill those dates into the formula. An empty range intersection yields no aligned domain, not a fabricated zero result. Inside the shared range, missing observations use the established zero-fill/average/undefined-operation rules.

### Compatible group dimensions

Formula inputs must resolve to the same set of grouping dimensions, excluding their already-checked time-bucket specification. Dimension order may differ without changing identity. Use the field contract's resolved typed identities, not display labels.

Report mismatched dimension sets. Do not automatically broadcast week-only values over week-and-shoe groups, drop a grouping dimension, or create Cartesian matches. Time-bucket normalization does not grant permission to change grouping dimensions. The user can explicitly make the query groupings compatible; no implicit broadcasting feature is introduced here.

## Group identity and group domain

A group key is a canonical ordered tuple of **resolved dimension identity + typed effective value**, sorted by dimension identity for equality. Preserve the user's chosen ordering separately for presentation. Display labels must not serve as identity.

- Strings remain strings; do not camelCase categorical values. Boolean `false`, numeric zero, and strings with those spellings remain distinct.
- Numeric physical grouping values follow canonical compatible-unit comparison; do not round display values to construct keys.
- Missing/unassigned is a structural value, distinct from literal text such as `"(none)"` or `"unassigned"`.
- Embedded delimiters cannot cause collisions. For example, the tuples `("a · b", "c")` and `("a", "b · c")` must remain distinct even though joining their labels with ` · ` produces the same text.
- Inheritance and explicit-null clearing happen before grouping, under the field contract. Arrays still require explicit handling; do not implicitly explode them into several group memberships.

For one query, groups come from eligible observed tuples in its selected domain. For a formula with compatible grouping dimensions, use the **union of group tuples observed in any input within the overlapping domain**. A group missing from another input follows that input's missing-value rules. An observed unassigned group remains valid.

Do not restrict to tuples present in every input, enumerate all historical/catalog categories, or take the Cartesian product of individually observed values. A field being available in the Field Catalog is not evidence that a particular group occurred in this window.

For a retained group and a bounded calendar range, generate the applicable chronological bucket domain, including missing dates between or beyond observed points within the requested bounds. Preserve absence internally; display zero-filling must not make those buckets recorded observations. The [arithmetic contract](arithmetic-contract.md) distinguishes ordinary observation averages from positional rolling averages. An ungrouped bounded query has one logical series even when values are absent; a grouped query with no observed tuples does not invent arbitrary named groups. Future buckets are not generated for relative windows ending now.

## Current-source entry points

| Responsibility | Current source and required change |
|---|---|
| Relative/explicit windows | [QueryService](../../../../packages/wql/src/QueryService.ts), `windowRange`, `effectiveTimeWindow`, and aggregate/join range handling: replace trailing N×DAY and future-unbounded relative windows with the agreed civil windows and captured context; reverse host-over-query precedence where currently implemented. Keep date-range endpoint semantics coherent across families. |
| Bucketing/group keys | [QueryService](../../../../packages/wql/src/QueryService.ts), `buildResult`/`dimValue`: existing local day/Monday grouping is the base convention. Separate structural bucket/group identity from noon/midpoint timestamps and delimiter-joined labels; enumerate bounded missing buckets without synthesizing observations. |
| Metric time projection | [Derivation](../../../../packages/wql/src/derivation.ts), `toEventRows`, `toSummaryEventRows`, and `projectEventToFacts`: the current workoutTimestamp override and record-wide timestamp projection must not replace metric-level occurrence dates. Preserve temporal kind and coverage. |
| Persisted temporal shape | [UnifiedEventRecord](../../../../packages/core/src/types/storage.ts): currently has one row timestamp plus optional timeSpan and an array of metrics. The lifecycle contract must preserve per-metric date/instant evidence and make indexed candidate selection complete even when those dates differ from the row/workout timestamp. |
| Date-only wellness | [Wellness projection](../../../../apps/playground/src/services/analytics/wellness.ts), `wellnessEventsForNote`: currently synthesizes local-midnight timestamps. Preserve the intended journal civil date explicitly instead. |
| Rollup consistency | [Workload rollup](../../../../apps/playground/src/services/analytics/rollup/workloadRollup.ts): coordinate civil-day membership with metric-date semantics; do not leave a separate workout-start calendar definition. |
| Query document and UI | [Query documents and shared-key formulas](../issues/05-query-documents-and-formulas.md) and [Shared query execution across dashboards and notes](../issues/07-shared-query-execution-and-surfaces.md): own persisted normalization syntax, user target selection, consistent diagnostics, and one shared execution context. |

A timestamp-only IndexedDB range fetch is not complete if an eligible metric's own date can lie outside its enclosing row's timestamp. The lifecycle ticket must choose the projection/index strategy; a later in-memory filter cannot recover rows that were never fetched. Cache identity must include temporal kind, range/boundary semantics, system timezone, and persisted normalization intent.

## Boundary and acceptance examples

1. In America/New_York, March 8, 2026 is a 23-hour local day and November 1 is a 25-hour local day. Both are exactly one calendar bucket.
2. At March 9, 2026 noon in that timezone, `last 7d` begins March 3 at local midnight and includes seven civil dates—not a 168-hour subtraction.
3. At Wednesday September 9, 2026 noon, `last 4w` begins Monday August 17. At January 1, 2027 noon, it begins Monday December 7, 2026.
4. Metrics at Sunday September 6, 2026 23:55 and Monday September 7 00:05 belong to week anchors August 31 and September 7 respectively, even if emitted by the same workout. A metric exactly at Monday midnight belongs only to the new week.
5. The instant September 5, 2026 00:30 UTC falls on September 4 in New York and September 5 in Tokyo. A date-only metric recorded as September 5 remains September 5 in either system timezone.
6. An explicit date range from September 5 to September 7 includes those three full local dates and excludes September 8 midnight.
7. Daily/weekly input mismatch produces a diagnostic and a user-selected normalization option. The choice survives document reload, does not change requested ranges, and fails honestly if supporting detail is absent.
8. Four-week and twelve-week inputs align only over their shared four-week range. Different partial slices of one boundary week must be recomputed consistently, not joined only by Monday label.
9. Week-and-shoe versus week-only grouping reports a mismatch. Equal grouping sets with a different dimension order align normally.
10. Groups observed as `(running, shoe-a)`, `(cycling, shoe-b)`, and `(running, shoe-b)` yield those three groups, not an invented `(cycling, shoe-a)` group. Groups present in only one input remain, with missing counterparts handled normally.
11. Separator-containing labels and typed missing values cannot collide with other structural group tuples. Zero-filled display buckets remain unobserved; reducer inclusion follows the [arithmetic contract](arithmetic-contract.md).
12. A multi-query document evaluated across a clock boundary uses one captured context; query range overrides host defaults identically in every surface and query execution path.

### Verification scope

Independent Python standard-library calendar calculations checked the DST durations, relative day/week starts, year rollover, Monday-midnight attribution, timezone-dependent instant dates, delimiter collisions, and observed-group union examples. These are checks of the planned contract, not production engine tests. The implementation tickets must turn relevant boundary cases into behavior-level verification against the actual engine.
