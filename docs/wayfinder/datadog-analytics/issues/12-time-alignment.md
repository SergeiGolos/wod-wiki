# Calendar time alignment and metric-date anchoring

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none
Prerequisites: [Time buckets, group keys, and alignment contract](../assets/time-alignment-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Every range, bucket, and grouping decision uses system-local civil calendar arithmetic over each metric's own date, computed from one captured execution context. Trailing-duration windows, workout-start attribution, and noon/midpoint labels as identity are gone.

## Scope

Contract changes per the [time alignment contract](../assets/time-alignment-contract.md):

1. **Evaluation context.** A captured `{instant, timeZone}` context threaded through [`QueryService`](../../../../packages/wql/src/QueryService.ts) run paths (`windowRange`, `effectiveTimeWindow`, `run`, `runJoined`, `runRows`). Part of the public options so ticket 19's runner can capture once per document.
2. **Range semantics** (`windowRange`/`effectiveTimeWindow`):
   - `last Nd` = N local calendar dates including today, starting local midnight N−1 dates back, ending at the captured instant — calendar arithmetic, never N×86 400 000 ms.
   - `last Nw` = current Monday-start week plus N−1 preceding complete weeks, through the captured instant.
   - explicit `from`/`to` keeps the inclusive-civil-date convention implemented as an exclusive bound at the following local midnight; relative windows never extend into the future; an explicit future range is never silently replaced.
   - **precedence fix:** explicit query range beats host/`QueryOptions` default (reverses the current host-over-query override at the aggregate range handling); host range applies only when the query has none.
3. **Bucket identity** (`buildResult`): structural bucket key = kind (`calendar` | fixed-duration), unit/size, timezone/origin, canonical boundary (local day date / Monday date / epoch-aligned duration origin). Display timestamps (local noon for calendar buckets, midpoint for `.rollup`) become presentation-only. Half-open membership throughout. Bounded calendar queries generate the full chronological bucket domain including empty periods; unbounded sides use the observed extent; relative windows generate no future buckets.
4. **Per-metric metric date** ([`derivation.ts`](../../../../packages/wql/src/derivation.ts) `toEventRows`/`toSummaryEventRows`/`projectEventToFacts`): each metric carries its own occurrence instant or civil date; the row/workout-timestamp override no longer replaces metric-level dates. Summary rows describe the temporal coverage of the observations they represent. [`UnifiedEventRecord`](../../../../packages/core/src/types/storage.ts) gains the metric-date + temporal-kind fields (physical `by-metricDate` index lands with ticket 14).
5. **Projections.** [`wellnessEventsForNote`](../../../../apps/playground/src/services/analytics/wellness.ts) stops synthesizing local-midnight instants — date-only wellness keeps its civil date. [`workloadRollup`](../../../../apps/playground/src/services/analytics/rollup/workloadRollup.ts) day buckets adopt the same civil-day membership.

## Clean cutover

- Remove the trailing N×day window math and the workout-timestamp override in projection; no parallel old/new time paths may remain.
- Keep the existing fixed-duration `.rollup()` epoch semantics explicitly distinct from calendar grouping (contract decision — do not convert duration rollups into calendar grouping).
- Consumers of `SeriesPoint.ts` that treated noon/midpoint as join keys move to bucket identity; renderers keep receiving a display timestamp.

## Acceptance scenarios

From the [time alignment contract](../assets/time-alignment-contract.md) boundary examples:

1. A 23-hour DST day and a 25-hour DST day each form exactly one calendar bucket.
2. `last 7d` at Mar 9 2026 noon (America/New_York) begins Mar 3 local midnight — seven civil dates, not 168 hours.
3. `last 4w` at Wed Sep 9 2026 noon begins Mon Aug 17; at Jan 1 2027 noon it begins Mon Dec 7 2026.
4. Sunday 23:55 and Monday 00:05 metrics from one workout land in week anchors Aug 31 and Sep 7; a metric exactly at Monday midnight belongs only to the new week.
5. A date-only metric recorded Sep 5 stays Sep 5 under any system timezone; no midnight instant is fabricated for it.
6. `from 2026-09-05 to 2026-09-07` includes all three full local dates and excludes Sep 8 midnight.
7. One dashboard run evaluated across a clock boundary uses the single captured context for every window resolution (context plumbed for ticket 19; assert via options).
8. A workout-start timestamp never relocates a metric observation whose own date differs; summaries carry the coverage of their represented observations, not their row timestamp.
