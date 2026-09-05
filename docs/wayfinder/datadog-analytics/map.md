# WQL analytics — from collected metrics to trustworthy answers

Labels: wayfinder:map
Status: open

## Destination

An implementation-ready specification and dependency-ordered implementation tickets for a general-purpose WQL analytics engine: workout trends, custom-property analysis, relationships between metrics, and cross-workout tables, with consistent behavior in dashboards and embedded note queries. Reaching the destination leaves no unresolved design decisions needed to implement the agreed scope; production implementation is not part of this map.

## Notes

- **Source proposal:** [Datadog-Style Analytics Engine Review & Roadmap](../../docs/13-datadog-analytics-engine-review-and-roadmap.md). Its reported defects are accepted input, not claims to re-prove before planning. Proposed fixes, abstractions, syntax, and phase ordering remain candidates until the relevant decision ticket resolves them.
- **Skills:** `/grilling` and `/domain-modeling` for every decision session; `/architecture` for module contracts and boundaries; `/prototype` only when a live human needs a concrete artifact; `/research` when evidence outside the working directory is needed.
- **Planning only:** charting creates tickets but resolves none. Work through at most one ticket per subsequent session. Do not turn reported bugs into unrequested implementation during a decision session.
- **Tracker:** local Markdown, following the setup skill's Local Markdown wayfinding operations. The map is canonical; children live in `issues/`. Query children rather than listing open tickets here. `Blocked by` stores local dependency identities; names in prose are linked titles. Unclaimed tickets have `Status: open` and `Assignee: unassigned`. Claim by setting the driving developer as assignee and `Status: claimed` before work; resolve by appending an answer under `## Answer` and setting `Status: resolved`, then add only a linked gist here.
- **Domain context:** [Shared glossary](../../CONTEXT.md). Respect Canonical Metric Key, Metric, Tag, Rows Query, and Dashboard Note terminology. Some glossary descriptions and older maps refer to earlier architecture; verify current source when choosing interfaces. This map does not introduce a second glossary.
- **Related efforts:** [Unified event store](../../docs/wayfinder/unified-event-store-map.md), [WQL language train](../../docs/wayfinder/wql-language-train.md), [Dashboard-as-Note](../../docs/wayfinder/dashboard-as-note-map.md), and [Analytics widget gallery](../../docs/wayfinder/analytics-widget-gallery.md). Check overlap before proposing implementation ownership; old status assertions are not evidence of current code behavior.
- **Standing choices made with the user during charting:**
  - All four analytics capabilities are required, not competing feature tracks. Users ask questions about metrics they create and collect; do not hardcode particular coaching questions.
  - Automatically discover custom metrics without a registration step. Include linked workout, note, and effort metadata for filtering and grouping without copying it onto every metric. Keep metadata provenance distinguishable; numeric metadata is not automatically a workout measurement.
  - Ordinary queries automatically select the appropriate level of detail, with an explicit override. Prevent event/summary double counting without excluding custom metrics that exist only at segment level. Do not assume a universal summary-only default.
  - Display missing observations as zero on graphs and treat them as zero in most calculations. Averages ignore missing observations but include recorded zeros. Preserve absence internally. Exceptions such as division by zero may produce an explained undefined result or gap rather than a fabricated number.
  - An explicit query time range wins over a dashboard range. The host range supplies a default; queries can explicitly reference a dashboard parameter to follow it.
  - Reject a calculation affected by incompatible types or units rather than silently skipping records; independent dashboard queries remain usable. Compatible-unit normalization is required. No optional exclusion syntax has been approved.
  - Relate datasets using shared time buckets and grouping keys, plus existing workout/note/effort relationships. Arbitrary user-defined joins are excluded.
- **Coverage:** every reported defect and every capability in the source proposal must receive an explicit disposition in the final implementation handoff. A disposition can be covered, already addressed with evidence, or an explicit scope decision—not silently omitted.

## Decisions so far

<!-- Empty at charting. Append one linked gist per resolved child; resolution detail lives only in that child. -->

## Not yet specified

- The detailed cross-package fallout may expose additional interface decisions once field, contribution, and result contracts are settled. The owning tickets must graduate newly precise questions rather than invent a full interface change list now.
- Concrete examples may expose additional exceptions to zero-filling or ambiguous metadata relationships. Keep the user's defaults fixed; graduate genuinely new decisions revealed by those examples.
- Performance evidence may reveal a need for a narrowly scoped experiment or an additional storage decision. Do not prescribe new indexes, workers, or caches before the execution and invalidation contracts are known.

## Out of scope

- Production implementation, deployment, and release execution. This map ends with implementable work tickets and acceptance criteria.
- Arbitrary user-defined joins between unrelated datasets; shared time/grouping alignment and existing metadata relationships are in scope.
- New external data connectors, cloud analytics infrastructure, or multi-user synchronization. This effort concerns querying collected WOD Wiki data, not expanding how external data is acquired.
