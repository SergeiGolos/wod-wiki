# WQL analytics — from collected metrics to trustworthy answers

Labels: wayfinder:map
Status: open
Running: loop
## Destination

An implementation-ready specification and dependency-ordered implementation tickets for a general-purpose WQL analytics engine: workout trends, custom-property analysis, relationships between metrics, and cross-workout tables, with consistent behavior in dashboards and embedded note queries. Reaching the destination leaves no unresolved design decisions needed to implement the agreed scope; production implementation is not part of this map.

## Notes

- **Source proposal:** [Datadog-Style Analytics Engine Review & Roadmap](../../13-datadog-analytics-engine-review-and-roadmap.md). Its reported defects are accepted input, not claims to re-prove before planning. Proposed fixes, abstractions, syntax, and phase ordering remain candidates until the relevant decision ticket resolves them.
- **Skills:** `/grilling` and `/domain-modeling` for every decision session; `/architecture` for module contracts and boundaries; `/prototype` only when a live human needs a concrete artifact; `/research` when evidence outside the working directory is needed.
- **Planning only:** charting creates tickets but resolves none. Work through at most one ticket per subsequent session. Do not turn reported bugs into unrequested implementation during a decision session.
- **Tracker:** local Markdown, following the setup skill's Local Markdown wayfinding operations. The map is canonical; children live in `issues/`. Query children rather than listing open tickets here. `Blocked by` stores local dependency identities; names in prose are linked titles. Unclaimed tickets have `Status: open` and `Assignee: unassigned`. Claim by setting the driving developer as assignee and `Status: claimed` before work; resolve by appending an answer under `## Answer` and setting `Status: resolved`, then add only a linked gist here.
- **Domain context:** [Shared glossary](../../../CONTEXT.md). Respect Canonical Metric Key, Metric, Tag, Rows Query, and Dashboard Note terminology. Some glossary descriptions and older maps refer to earlier architecture; verify current source when choosing interfaces. This map does not introduce a second glossary.
- **Additional required consumer:** custom calculations on efforts and dialects must support the same per-segment expression capability. [Query documents and shared-key formulas](issues/05-query-documents-and-formulas.md) owns the shared authoring/evaluation contract and clarification of attachment/lifecycle semantics; this remains planning, not production implementation.
- **Related historical efforts:** Unified event store, WQL language train, Dashboard-as-Note, and Analytics widget gallery. Their previously linked map files are absent after the documentation reorganization; do not recreate them or assume their old statuses. Check current source and available tracker records for overlap before proposing implementation ownership.
- **Architecture deepening review:** [Seven before/after design studies](deepening/index.md) explain proposed Modules, source examples, data-shape changes, and implementation-readiness gaps. These are review proposals, not new resolved decisions; their design gates qualify the earlier handoff's completeness claim. Its graduated structural questions are decision tickets [21](issues/21-unit-catalog-home.md), [22](issues/22-dashboard-body-migration.md), and [23](issues/23-widget-presentation-semantics.md); the implementation-level gates are named inside tickets 14, 16, 17, 19, and 20.
- **Standing choices made with the user during charting:**
  - All four analytics capabilities are required, not competing feature tracks. Users ask questions about metrics they create and collect; do not hardcode particular coaching questions.
  - Automatically discover custom metrics without a registration step. Include linked workout, note, and effort metadata for filtering and grouping without copying it onto every metric. Keep metadata provenance distinguishable; numeric metadata is not automatically a workout measurement.
  - Ordinary queries automatically select the appropriate level of detail, with an explicit override. Prevent event/summary double counting without excluding custom metrics that exist only at segment level. Do not assume a universal summary-only default.
  - Display missing observations as zero on graphs while preserving absence internally. The initial broad arithmetic preference is refined by [Missing values, units, and numerical correctness](issues/04-missing-values-units-and-arithmetic.md); use its operation-specific rules rather than treating all averages or reducers alike.
  - An explicit query time range wins over a dashboard range. The host range supplies a default; queries can explicitly reference a dashboard parameter to follow it.
  - Calculation errors remain local to the affected query. The original broad type/unit-rejection proposal is superseded by [Field discovery, identity, and metadata provenance](issues/01-field-discovery-and-identity.md); use that resolution for metric variants and operation compatibility.
  - Relate datasets using shared time buckets and grouping keys, plus existing workout/note/effort relationships. Arbitrary user-defined joins are excluded.
- **Coverage:** every reported defect and every capability in the source proposal must receive an explicit disposition in the final implementation handoff. A disposition can be covered, already addressed with evidence, or an explicit scope decision—not silently omitted.

## Decisions so far

- [Field discovery, identity, and metadata provenance](issues/01-field-discovery-and-identity.md) — normalized typed field identities, contextual metadata precedence, and incremental IndexedDB discovery/typeahead catalog agreed.
- [Automatic grain selection and contribution ownership](issues/02-automatic-grain-and-contributions.md) — equal observation weighting, result-preserving non-overlapping coverage, strict overrides, and explicit insufficient-evidence limitations agreed.
- [Time buckets, group keys, and alignment boundaries](issues/03-time-buckets-and-group-keys.md) — metric-date local calendars, persisted user-selected normalization, overlapping time domains, and collision-safe observed-group alignment agreed.
- [Missing values, units, and numerical correctness](issues/04-missing-values-units-and-arithmetic.md) — operation-specific absence and formula rules, partial zero-filled rolling averages, strict dimensional defaults, and display-only rounding agreed.
- [Query documents and shared-key formulas](issues/05-query-documents-and-formulas.md) — block-local documents, pre/post-aggregation calculation scopes (`each`), explicit typed selectors, and attached effort/dialect calculations agreed.
- [Cross-workout tables and aggregate drill-down](issues/06-analytical-tables-and-drilldown.md) — cross-workout `rows:segment`, pipe projection syntax (`select`, `order by`, `limit`), on-demand aggregate drill-down, and scope deduplication agreed.
- [Shared query execution across dashboards and notes](issues/07-shared-query-execution-and-surfaces.md) — unified `QueryDocumentRunner`, AST rollup inspection, range precedence, decoupled widget rendering, and localized error badges agreed.
- [Projection lifecycle and existing-data migration](issues/08-projection-lifecycle-and-migration.md) — DB v17 schema, disposable projection rebuilds, recovery limits, live contextual metadata, and atomic catalog reference pruning agreed.
- [Invalidation, query reuse, and performance budgets](issues/09-invalidation-and-query-performance.md) — in-flight scan coalescing, structural cache keys, BroadcastChannel multi-tab invalidation, and < 250 ms 12-widget performance budgets agreed.
- [Implementation work tickets and acceptance coverage](issues/10-implementation-work-breakdown.md) — ten dependency-ordered implementation issues (11–20) published; every defect and capability dispositioned in the [work breakdown](assets/implementation-work-breakdown.md); no design decision remains for the agreed scope.
- [Shared unit catalog home, conversion evidence, and extension propagation](issues/21-unit-catalog-home.md) — core-owned unit catalog with conversion evidence, write-time contextual snapshots, validated dialect overlays composing one snapshot per evaluation, and core-owned output defaults with wql-owned policy.
- [Legacy dashboard bodies and authoring operations migration](issues/22-dashboard-body-migration.md) — every widget body is a Query Document with fence-tag attribute params, strict full-body guards, and noteOps beside the parser in wql; saved dashboards rewritten in a data migration.
- [Widget presentation semantics: scalar endpoints and absent scatter positions](issues/23-widget-presentation-semantics.md) — uniform last-point endpoints for scalar widgets and paired-only scatter display (explicit amendment: zero-fill applies to time-axis charts); synthetic points display-only, correlation stays paired-only.

## Not yet specified

- The remaining result contracts may expose additional cross-package interface decisions. Graduate genuinely new questions when their shape becomes clear; field identity, the discovery catalog, and contribution-selection semantics are already resolved, with persistence mechanics assigned to the lifecycle ticket.
- Performance evidence may reveal additional storage or execution decisions beyond the required discovery catalog. The catalog itself is settled; do not introduce speculative query indexes, workers, or caches without evidence.

## Out of scope

- Production implementation, deployment, and release execution. This map ends with implementable work tickets and acceptance criteria.
- Arbitrary user-defined joins between unrelated datasets; shared time/grouping alignment and existing metadata relationships are in scope.
- New external data connectors, cloud analytics infrastructure, or multi-user synchronization. This effort concerns querying collected WOD Wiki data, not expanding how external data is acquired.
