# Time buckets, group keys, and alignment boundaries

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none

## Question

What precise keys and time boundaries make two analytics observations belong to the same bucket and group?

Resolve:
- Civil versus fixed-duration buckets, timezone source, daylight-saving transitions, week boundaries, timestamp basis, and inclusive/exclusive range endpoints. Reuse existing WQL civil-time decisions unless an explicit conflict requires reconsideration.
- Provide temporal membership and partition rules that [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md) can use to prove summary applicability. Do not apportion a summary across a time boundary without sufficient coverage information.
- Explicit query range over host defaults, including dashboard parameters and standalone embedded queries; define the evaluation clock for relative ranges shared across a document.
- Collision-free group identity, multiple grouping dimensions, and ordering. Treat field identities as opaque stable keys here; field discovery owns their provenance.
- The output bucket domain for empty periods and differing input ranges: which buckets and groups exist before missing-value filling. Do not invent every possible combination of tags.
- Rules for aligning different bucket sizes or grouping shapes: reject, require an explicit transformation, or another agreed rule. Shared time/grouping alignment is in scope; arbitrary joins are not.

Resolution must supply a bucket/group/range contract with boundary examples. It must leave arithmetic treatment of absent observations to Missing values, units, and numerical correctness rather than deciding it twice.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### System-local calendar — agreed during grilling

Use the system timezone for calendar grouping. Days are local calendar days, and calendar weeks start on Monday. Resolve boundaries with calendar arithmetic rather than assuming every day lasts 24 hours. The user did not request a pinned-timezone override; do not add timezone syntax or a separate home-timezone setting as part of this decision.

### Relative day windows — agreed during grilling

`last 7d` means seven local calendar days including today: local midnight six days ago through the captured current time. It is not an exact trailing 168-hour interval. Generalize day-count windows by calendar arithmetic so daylight-saving changes do not alter which local dates belong to the window.

### Relative week windows — agreed during grilling

`last 4w` includes the current Monday-start week plus three complete preceding calendar weeks, ending at the captured current time. More generally, `last Nw` counts the current week as one and begins at local Monday midnight N−1 weeks earlier. It is not a rolling N×7-day window; use day units for calendar-date counts instead.

### Metric date, not workout start — agreed during grilling

Use each metric's own date/time for time filtering and bucket membership, not the workout's start date. A workout spanning midnight or a Monday boundary may contribute observations to different days/weeks. This supersedes the proposed whole-workout start-date attribution and requires the current projection's workout-wide timestamp override to change. Summary applicability must respect the dates of the represented metrics; a whole-workout summary cannot erase a crossed time boundary.

### Date-only metrics — agreed during grilling

Preserve a metric recorded with only a calendar date on that date. Do not manufacture a midnight instant that can move it to another date after a timezone change. Timestamped metrics are bucketed in the system timezone; date-only metrics retain their recorded civil date. Both forms must remain distinguishable in storage and query projection.

### Bucket mismatch with normalization action — agreed during grilling

When formula inputs have incompatible bucket sizes, report the mismatch and offer an explicit option to normalize them. Do not silently regroup. Normalization must still preserve the agreed observation weighting, coverage, and sufficient-evidence rules; it cannot make an unsafe average-of-averages valid. The target bucket choice and how the action updates the underlying query document remain to be settled.

### User-selected normalization target — agreed during grilling

Offer the user a choice of target time-bucket unit and size when normalizing mismatched inputs, rather than automatically choosing the coarser input bucket. Recompute using eligible source observations or sufficient summaries; if the chosen target cannot be supported, report the limitation instead of inventing detail. This concerns time grouping, not physical measurement-unit conversion.

### Persisted normalization intent — agreed during grilling

Save the user's normalization choice with the query document rather than as a temporary display-only preference. Reopening a dashboard or rendering the same document in a note must retain the chosen time-bucket unit/size. Bucket normalization does not silently change the inputs' requested date ranges. Exact document syntax and the editing action belong to the query-document and shared-surface tickets.

### Formula range overlap — agreed during grilling

For inputs with different requested date ranges, evaluate their formula over the overlapping range. Dates outside an input's requested range are out of scope, not missing observations to zero-fill. Preserve each source query's requested range; the formula's shared evaluation domain is their intersection. Within that shared domain, ordinary missing observations still follow the agreed zero-fill and average rules.

### Mismatched grouping dimensions — agreed during grilling

Report incompatible grouping-dimension sets between formula inputs instead of implicitly broadcasting an ungrouped value across another input's groups. For example, week-and-shoe does not automatically align with week-only by repeating a whole-week denominator per shoe. The user must explicitly make the grouping compatible; no implicit repetition or Cartesian expansion.

### Observed group union — agreed during grilling

When grouping dimensions are compatible, retain group tuples observed in either formula input within the overlapping time range. If one input lacks a retained group, apply the agreed missing-value rules for that input, including arithmetic exceptions. Do not restrict to groups present in every input, enumerate every category in the Field Catalog, or invent Cartesian combinations of independently observed dimension values.

## Answer

Resolved through live grilling with Serge. The authoritative [Time buckets, group keys, and alignment contract](../assets/time-alignment-contract.md) fixes system-local civil windows, metric-date attribution, preserved date-only values, explicit persisted normalization, shared-range intersection, grouping compatibility, and observed-group union.

The linked contract includes boundary conventions, partial-period and summary applicability rules, structural group identities, source entry points, and acceptance examples. Independent calendar/group calculations checked the planned examples across DST, year rollover, and midnight boundaries; these were not production-engine tests. No production code was changed.

Existing arithmetic, query-document, table, shared-surface, lifecycle, and performance tickets now own the concrete downstream changes. In particular, lifecycle work must preserve per-metric temporal evidence and make indexed selection complete; changing only the final grouping function would be insufficient.
