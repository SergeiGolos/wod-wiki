# Ticket: Integrate Challenge Progress into Sticky Header and Inline Sections

Move the challenge status UI from the macOS-style editor chrome to the canvas page's sticky navigation header, and render each challenge inline inside the section that fulfills it.

## Parent

N/A — standalone ticket derived from conversation.

## What to build

### Current state

On canvas pages (`MarkdownCanvasPage`), the full set of syntax challenges is currently shown as a list at the bottom of the page using the `ChallengeBanner` component. The MacOS-style editor chrome (`MacOSChrome`) does not yet expose the challenge menu, but the intended move is: take that editor-chrome challenge menu concept and place it in the page's sticky header next to the page title (e.g. "WOD Wiki" on `/`, "Core Concepts" on `/guide/syntax/basics`).

### Target behaviour

1. **Header badge / menu**
   - The sticky canvas header shows a small challenge badge next to the page title.
   - The badge displays the number of completed challenges over the total (e.g. `2/4`).
   - The badge also shows a small check icon when all challenges are complete.
   - Clicking/interacting with the badge opens a dropdown menu listing all page challenges, each showing its label and completion state.
   - The existing subsection menu functionality that used to appear in the MacOS editor window should continue to work from this new header location.
   - The challenge badge/menu should be removed from the MacOS-style editor window if it is currently rendered there.

2. **Inline challenge widgets**
   - Instead of rendering all challenges at the end of the page, authors can place a challenge inside the section that fulfills it using a directive like `{{challenge:<id>}}` in the markdown prose.
   - When rendered, the directive becomes an inline challenge card in that section.
   - The card shows the same information as a single challenge row: icon, label, completion state, and the current validation hint.
   - Clicking an inline challenge scrolls the user to the editor section where the challenge can be completed.

3. **Validation updates**
   - As the user edits the active editor block and quests pass or fail, the header badge count and every inline challenge card update in real time.

## Acceptance criteria

- [ ] `parseCanvasMarkdown` recognises `{{challenge:<id>}}` in section prose and produces a chunk that can be rendered by the canvas prose renderer.
- [ ] `CanvasSection` renders an inline challenge widget for each `{{challenge:<id>}}` chunk, using the live quest state from `useSyntaxChallenge` / `usePageQuests`.
- [ ] The page-level sticky header (not the MacOS editor chrome) displays a challenge badge with `n/total` and a completed state, next to the page title.
- [ ] The sticky header badge opens a challenge dropdown menu that preserves the subsection navigation behaviour previously shown in the MacOS editor window.
- [ ] The challenge list is removed from the bottom of the page; the legacy bottom-of-page `ChallengeBanner` is no longer rendered for canvas pages.
- [ ] Any challenge UI is removed from the MacOS editor chrome window.
- [ ] Clicking an inline challenge widget scrolls the page/editor to the section/block where the challenge can be completed.
- [ ] The feature is covered by existing or new tests in `MarkdownCanvasPage.test.tsx` / `parseCanvasMarkdown.test.ts` / `useSyntaxChallenge.test.ts` (whichever is appropriate); the full test suite passes (`npm run test`).

## Blocked by

None — can start immediately.

## Relevant code seams

- `playground/src/canvas/parseCanvasMarkdown.ts` — add directive parsing to `splitProseForWidgets` (follow the existing `{{hero-carousel}}` / `{{workouts}}` pattern). The `Quest` interface and `extractPageQuests` already collect the page's quest definitions.
- `playground/src/canvas/CanvasProse.tsx` / `playground/src/components/molecules/CanvasSection.tsx` — render the new `{{challenge:<id>}}` chunk inside the prose body. `CanvasSection` already receives `challengeQuests`.
- `playground/src/components/molecules/ChallengeBanner.tsx` — reuse the icon, status, and hint rendering for inline cards; the header badge/menu may be a new component or a derived compact version of this.
- `playground/src/canvas/MarkdownCanvasPage.tsx` — wire the challenge state into the sticky header (via `panelHeaderActions` or a new header slot), remove the bottom-of-page challenge list, and remove the challenge element from the MacOS editor chrome.
- `playground/src/templates/SplitCanvasTemplate.tsx` / `playground/src/components/organisms/canvas/CanvasProsePanel.tsx` — own the page shell and header layout; the sticky header may be implemented here or exposed as a slot from `MarkdownCanvasPage`.

## Notes

- Prefer the existing widget-directive parser pattern; avoid inventing a new syntax.
- Keep the challenge dropdown menu fully accessible and keyboard-navigable, matching the current subsection menu behaviour.
- The MacOS editor chrome should remain focused on editor framing (traffic lights, title, reset) and not on challenge progress.
- If the existing `ChallengeBanner` component is too bulky for the inline card, extract a smaller `ChallengeCard` presentational component and use it in both `ChallengeBanner` (header dropdown) and the inline renderer.

---

# Tickets: Trustworthy WQL analytics

Build general-purpose analytics over collected workout metrics, with typed discovery, trustworthy contributions, formulas, analytical tables, and consistent dashboard/note behavior. Source: [Datadog-Style Analytics Engine Review & Roadmap](docs/13-datadog-analytics-engine-review-and-roadmap.md). Handoff context: [Implementation work tickets and acceptance coverage](docs/wayfinder/datadog-analytics/issues/10-implementation-work-breakdown.md). These are implementation deliverables, not new decision children; publication does not resolve or modify the parent.

Work the **frontier**: a ticket can start only when its blocking tickets are complete and any decision gate below is resolved. The two initial ready tickets may start independently. Work one frontier ticket per fresh implementation context. Every slice includes its actual consumer behavior, relevant persistence changes, contract migration, and regression verification. Later slices extend the shared path; they do not introduce parallel legacy implementations.

### Publication status and decision gates

The twelve-slice breakdown is approved. Tickets are published with explicit blockers; this is **not a claim that every ticket is ready for an agent**. Three decisions remain unresolved in the source contracts:

- **Migration cutover during concurrent writes** — blocks **Discover custom fields and live contextual metadata**, and therefore its dependants. Settle how saves/deletes and in-progress workouts interact with batched rebuilds, how readers distinguish incomplete projections, and how durable completion is established after interruption. Acceptance must prove no lost concurrent update, no resurrected deletion, and no partially rebuilt dataset presented as complete. The lifecycle sketch's localStorage flag alone does not establish these guarantees.
- **Rolling-function authoring syntax** — blocks **Author named queries and aligned formulas**. The arithmetic contract defines trailing positional-window semantics but the document contract does not specify the user-facing expression for invoking them. Agree the function/operator, window arguments, and parser/serializer round trip before implementation; do not invent a second syntax inside the ticket.
- **Cross-tab freshness after missed notifications** — blocks **Keep dashboards fresh and eliminate redundant work**. Agree how reopening, resuming, or missing a BroadcastChannel message re-establishes freshness, and what users see while stale data refreshes. Independent tab-local counters are not a globally ordered database revision. This decision must preserve commit-only notification and reject late obsolete query results.

Resolve these gates with the human and record their decisions before marking affected tickets ready. The questions are blockers, not permission for an implementation agent to guess. Existing parent/map statuses are intentionally unchanged.

### Common implementation and verification requirements

- Use the linked decision contracts for semantics. Their illustrative field names and schema sketches cannot override their invariants: identities must be collision-safe; coverage must prove the represented population; metric-date candidate selection must be complete; catalog support must include all applicable source kinds and null-only paths.
- Preserve authoritative measurements and archival evidence. Each slice changing a derived representation owns its versioned, idempotent re-derivation under the agreed migration protocol. Coordinate the planned database upgrade; do not independently allocate the same schema version in several tickets. Never reinterpret historical missing units using today's defaults or call editable note content immutable.
- Follow existing package boundaries: core owns shared storage/result contracts, lang owns measurement interpretation and expression evaluation, WQL owns query semantics, UI owns presentation, and the application owns IndexedDB and dependency wiring. No browser persistence inside the pure query package.
- Use existing widgets, query parsers, serializers, language support, calculation authoring, and storage transactions where applicable. Replace obsolete paths and migrate all callers; no compatibility aliases or duplicate evaluators left behind. Preserve application-only note operations when retiring duplicate dashboard modules by moving them to their appropriate owner, not into browser-independent WQL.
- Every acceptance scenario must exercise actual behavior. Keep regression tests for plausible correctness failures, repair affected existing tests, and exercise changed UI surfaces in the browser. Do not substitute source-text assertions or mock forwarding checks for results. Each ticket leaves unrelated features working.
- Latency budgets are targets, not measured results. No silent truncation, dropped populations, invented observations, or hidden diagnostics may satisfy a performance target.

## Unify query execution across surfaces

**Status:** ready-for-agent

**What to build:** One execution path for existing single-query blocks in Explorer, dashboard routes, embedded notes, and editor previews. A user can move the same query between surfaces without changing its meaning or losing parameters.

**Blocked by:** None — can start immediately.

**Integration ownership:** WQL dashboard parsing/model and QueryDocumentRunner; QueryService family entry points; QueryExecutor, DashboardView, QueryBlockView, and editor preview integration; application dashboard consumers. Reconcile the existing Dashboard-as-Note implementation rather than build another dashboard framework.

**Contract:** [Shared execution](docs/wayfinder/datadog-analytics/assets/shared-execution-contract.md). This slice establishes the common path using existing query families; subsequent tickets extend it with new semantics and document forms.

- [ ] The same saved single-query block produces equivalent results and diagnostics in all four surfaces, including frontmatter tokens in the current editor document.
- [ ] Explicit query range overrides block defaults, which override host range. Explicit token references still follow the host parameter. Capture one evaluation instant and timezone for the document run.
- [ ] Existing aggregate, find, and scoped rows queries dispatch to their native executors. Rows on dashboards show real session rows, not empty synthetic aggregates.
- [ ] Rollup prerequisites are detected from parsed query meaning, not substring matching, and run once for the document when needed. Prerequisite errors remain visible to affected consumers.
- [ ] Unknown tokens and malformed queries produce localized diagnostics; unrelated widgets remain usable. Query edits cannot be overwritten by late results from older executions.
- [ ] Remove duplicate application dashboard model/parser/runner code and migrate all consumers. Preserve note create/edit/copy operations and scaffold behavior under appropriate ownership; retain no alternate token-substitution loop.
- [ ] Demonstrate one tokenized query and one scoped rows query in both editor preview and dashboard, plus existing find and aggregate behavior.

## Make units and numerical results trustworthy

**Status:** ready-for-agent

**What to build:** Measurements retain their physical meaning from collection to displayed arithmetic. Compatible units combine correctly without a display directive; missing, invalid, and genuine-zero results remain distinguishable.

**Blocked by:** None — can start immediately.

**Integration ownership:** UnitRegistry and calc conversion/dimension machinery; WQL units, aggregate/buildResult, and result contracts; collection-time unit resolution; analytics unit preferences and consuming widgets.

**Contract:** [Arithmetic](docs/wayfinder/datadog-analytics/assets/arithmetic-contract.md). Contribution population selection is extended separately by **Count each logical observation exactly once**; this slice makes arithmetic correct over the supplied population.

- [ ] Combining 1000 m and 1 km yields 2000 m without an explicit output unit, independent of fetch order. Explicit compatible output units convert correctly.
- [ ] Cover the registered distance, mass, duration, count, energy, rate/compound, percentage, and named-scale cases specified by the contract. Unknown units and incompatible dimensions cannot pass through as valid conversions; WQL cannot bypass dimensional checks through authoritative casts.
- [ ] Omitted physical units are resolved and recorded for new measurements. Changing output defaults changes presentation, not stored quantities. Historical context-dependent units require retained context or report an evidence limitation.
- [ ] Reducers preserve observed count, absence, validity, and unrounded values. Ordinary averages exclude missing observations but include recorded zero; invalid selected inputs are not silently skipped.
- [ ] The operation matrix is honored for a supplied observation/position domain. Chronological ordering uses available genuine temporal evidence; the later metric-date ticket supplies the complete cross-record calendar domain.
- [ ] Three 0.004 km values remain 0.012 km for dependent calculations even if displayed as 0.01 km. Presentation formatting never becomes a calculation input.
- [ ] Replace first-record unit selection and kg/lb-only default assumptions across consumers with the agreed dimensional defaults. Tables and charts distinguish missingness from calculation errors.

## Discover custom fields and live contextual metadata

**Status:** blocked

**What to build:** Saving a custom metric makes it discoverable and queryable without registration. Users filter and group saved measurements by current note/workout/segment/effort context, with correct provenance and indexed suggestions.

**Blocked by:** Make units and numerical results trustworthy.

**Decision gate:** Migration cutover during concurrent writes.

**Integration ownership:** PropertyMetric and semantic property classification; event derivation and typed field resolution; WQL filtering/grouping and completion provider; IndexedDBService source/catalog transactions; note and effort metadata consumers.

**Contracts:** [Field discovery](docs/wayfinder/datadog-analytics/assets/field-discovery-contract.md), [Lifecycle](docs/wayfinder/datadog-analytics/assets/lifecycle-migration-contract.md).

- [ ] Distinct hrv and sleep properties survive save, projection, reload, and queries as distinct identities. Equivalent normalized spellings and nested/dotted paths resolve consistently while original provenance remains inspectable.
- [ ] Numeric, text, boolean, and array variants remain distinct. Compatible operations select eligible variants; ambiguity requires explicit selection. Unknown field references remain valid without creating catalog entries.
- [ ] Metadata precedence is effort defaults → note → workout → segment. Explicit null clears inherited values; numeric metadata is not manufactured into a measured contribution. Same-priority conflicts do not multiply rows.
- [ ] Editing note tags or effort classification changes historical filtering/grouping on re-execution without rewriting frozen measurements. Arrays do not expand implicitly; typed missing values cannot collide with literal category labels.
- [ ] The persistent catalog supports bounded field/category prefix lookup, original labels, types, units, and availability across retained history. Opening typeahead performs no event/result-history scan.
- [ ] Save, identical re-save, import, edit, deletion, and summary replacement maintain exact support for fields, units, aliases, and categories atomically. Removing the last support removes the suggestion; failed writes create no phantom entries.
- [ ] Populate existing data using the agreed resumable cutover protocol. Crash/restart and concurrent mutations preserve source/catalog consistency, distinguish initialization from an empty catalog, and never duplicate support. Include applicable effort and segment sources, not just notes and results.
- [ ] Reuse existing indexed tag/reference and injection patterns. Eliminate custom-key collapse and fixed-vocabulary-only discovery rather than add a separate query-specific catalog.

## Count each logical observation exactly once

**Status:** blocked

**What to build:** Ordinary aggregate queries choose complete, non-overlapping contributions automatically, regardless of whether an observation has event and summary representations. Users receive correct totals and averages or an explicit evidence limitation.

**Blocked by:** Discover custom fields and live contextual metadata.

**Integration ownership:** Core UnifiedEventRecord provenance; event and summary derivation/finalization; QueryService direct and content-joined selection, effort scoping, and reducers; IndexedDB replacement/rebuild; consumer diagnostics.

**Contracts:** [Contribution ownership](docs/wayfinder/datadog-analytics/assets/automatic-grain-contract.md), [Arithmetic](docs/wayfinder/datadog-analytics/assets/arithmetic-contract.md), [Lifecycle](docs/wayfinder/datadog-analytics/assets/lifecycle-migration-contract.md).

- [ ] A 100-unit calculated observation copied into event and summary storage contributes 100, not 200. Two distinct equal-valued observations still count twice; duplicate relationship paths do not.
- [ ] Ten readings of 1 and two readings of 2 average to 14/12 using detail or sufficient disjoint summaries. A newly calculated workout metric counts once at its producing scope, not once per input segment.
- [ ] Persist exact coverage, observation/representation identity, reducer capabilities, and source/derivation revision. An effort name plus count alone is not accepted as proof of exact population membership.
- [ ] Choose summaries only when they answer the actual filters, grouping, time coverage, and reducer. Otherwise use sufficient detail or identify the deficient scope; never silently omit known populations.
- [ ] A running workout contributing 5 km plus a separate unattributed workout contributing 3 km yields total 8 km and both groups. Overall and effort-partition summaries never overlap in the selected population.
- [ ] Event-grain content joins see the same eligible observations as direct queries over that content population. Remove summary-only join filtering and global attributed-record suppression.
- [ ] Explicit grain filters remain hard constraints and report limitations instead of silently reading excluded grains. Re-finalization replaces representations idempotently.
- [ ] Rebuild recoverable historical provenance under the shared migration protocol. Legacy averages without counts/detail remain insufficient evidence; no fabricated lineage or sample counts.

## Query the correct metric dates and calendar buckets

**Status:** blocked

**What to build:** Analytics use each metric's actual date, not workout-start or rebuild time. Calendar trends and chronological changes remain correct across midnight, timezone changes, and partial periods.

**Blocked by:** Unify query execution across surfaces; Count each logical observation exactly once.

**Integration ownership:** Metric temporal projection and wellness derivation; persisted event temporal coverage and candidate fetches; QueryService windows, buckets, structural groups, last/delta; workload rollups and query consumers.

**Contract:** [Time alignment](docs/wayfinder/datadog-analytics/assets/time-alignment-contract.md).

- [ ] A workout spanning Sunday 23:55 and Monday 00:05 contributes to two dates/weeks. Monday midnight belongs only to the new bucket. Rebuilds retain original metric dates.
- [ ] Date-only wellness records retain their civil date in different system timezones without synthetic midnight timestamps. Instant-level restrictions report insufficient temporal evidence when a civil date cannot answer them.
- [ ] Candidate fetching includes metrics whose dates lie outside the enclosing row/workout timestamp. Date-only and timestamped candidates are both complete before semantic filtering.
- [ ] Calendar day/week windows use local calendar arithmetic across 23/25-hour DST days, leap days, and year rollover. Inclusive explicit end dates and the captured relative-now cutoff have correct endpoint membership.
- [ ] Delta is last recorded minus first recorded regardless of fetch order; fewer than two observations is absent. Conflicting unresolved endpoint ties produce a diagnostic rather than an invented record-ID ordering.
- [ ] Structural group keys preserve typed values and absence without delimiter collisions. Only observed eligible tuples become groups; catalog categories do not generate Cartesian products.
- [ ] Missing buckets are bounded by the requested domain or eligible observed extent. Partial boundary coverage remains explicit, and insufficient summaries cannot be prorated into clipped periods.
- [ ] All execution surfaces and workload rollups use the same temporal rules and captured context. No separate workout-start calendar path remains.

## Author named queries and aligned formulas

**Status:** blocked

**What to build:** Users compose block-local named queries into ratios, rolling trends, and correlations, and display selected outputs without storing read-time formula measurements.

**Blocked by:** Query the correct metric dates and calendar buckets.

**Decision gate:** Rolling-function authoring syntax.

**Integration ownership:** WQL document parsing/serialization, scheduling, alignment, and language support; injected lang formula evaluator; shared runner and basic named-output rendering/editor diagnostics.

**Contracts:** [Query documents](docs/wayfinder/datadog-analytics/assets/query-documents-contract.md), [Time alignment](docs/wayfinder/datadog-analytics/assets/time-alignment-contract.md), [Arithmetic](docs/wayfinder/datadog-analytics/assets/arithmetic-contract.md).

- [ ] Existing single-query blocks remain valid. Multi-line blocks support defaults, named queries/formulas, selected named outputs, forward references, and strict block-local scope; serialization preserves meaning.
- [ ] Cycles and invalid definitions produce actionable diagnostics without crashing unrelated queries. No implicit cross-block variable lookup or stored read-time formula observations are introduced.
- [ ] A named distance/time ratio evaluates matching buckets with normalized dimensions and the requested compatible output unit. This uses the agreed named-formula/show syntax, not the proposal's superseded inline show-expression form.
- [ ] Inputs align over their real overlapping requested range and the union of observed compatible group tuples. Different grouping sets do not broadcast; partial boundary inputs are recomputed over their common coverage.
- [ ] Bucket mismatch offers explicit user-selected normalization. Its persisted, formula-local intent survives reopening without silently changing source queries or other consumers.
- [ ] Formula missingness follows the agreed provenance rules: missing-derived zero is excluded from ordinary averages, nonzero partial results participate, and invalid inputs propagate through dependencies.
- [ ] Implement and round-trip the separately approved rolling syntax. A three-position window 10, missing, 20 averages to 10; a two-position startup window 10, 20 averages to 15 and is marked partial. Do not fetch pre-range values or invent denominator positions.
- [ ] Correlation uses valid paired observations only, reports pair count, and preserves independently displayed source ranges. Use explicit diagnostics for undefined statistical results rather than non-finite values.
- [ ] Wire the evaluator through the established injection boundary without circular package dependencies or a second expression language. Demonstrate named outputs and local errors in a real query block.

## Calculate expressions within individual segments

**Status:** blocked

**What to build:** Users calculate expressions within each eligible segment and then aggregate those outputs, including explicit operations on array-valued measurements.

**Blocked by:** Query the correct metric dates and calendar buckets.

**Integration ownership:** WQL each-expression parsing/serialization and typed selectors; injected lang expression evaluation; segment field resolution, aggregation, completion, and query-block rendering.

**Contracts:** [Query documents](docs/wayfinder/datadog-analytics/assets/query-documents-contract.md), [Arithmetic](docs/wayfinder/datadog-analytics/assets/arithmetic-contract.md).

- [ ] Average segment speed is calculated from each segment's distance/duration before outer averaging, and demonstrably differs from total distance divided by total duration on unequal segments.
- [ ] Operands resolve within the same segment; no accidental cross-segment pairing or references to named aggregate series inside each expressions.
- [ ] The shared typed selector resolves ambiguous variants consistently in query heads and expressions without unsafe type casts or revival of cleared metadata defaults.
- [ ] Explicit expansion gives array elements equal observation weighting; per-array mean gives one result per segment; indexing is zero-based. Unexpanded arrays never become implicit numeric observations.
- [ ] Units, missing-derived zeros, validity, and equal output-observation weighting survive the expression/aggregation boundary. Division by zero and invalid selected data remain visible to the affected query.
- [ ] Grammar, serialization, completion, execution, and existing widget display work together for an authored expression. Reuse the same evaluator boundary as named formulas without requiring named-document grammar to be completed first.

## Record reusable effort and dialect calculations

**Status:** blocked

**What to build:** Users attach reusable calculations to efforts and Block Dialects and see their resulting recorded Metric Observations in subsequent analytics.

**Blocked by:** Calculate expressions within individual segments.

**Integration ownership:** Existing calculation authoring panel, effort/dialect definitions and registry, log/segment analytics processing, recorded metric persistence and derivation, catalog maintenance, and query consumers.

**Contract:** [Attached calculations](docs/wayfinder/datadog-analytics/assets/query-documents-contract.md).

- [ ] An authored attached calculation supports the same per-segment expression capability and validation as each expressions, and its emitted observations are saved, discoverable, and queryable after reload.
- [ ] An effort definition overrides a same-named dialect definition only for that effort. Matching data executes the winning definition once, not both definitions.
- [ ] Workout-level effort calculations aggregate only that effort's segments and emit one observation per effort per workout. They do not inherit unrelated segments or the sample count of their inputs.
- [ ] Recorded outputs retain producing definition/provenance, effective units, producing-scope metric dates, and stable replacement identity. Re-finalization does not create duplicate contributions or catalog support.
- [ ] Editing reusable definitions does not silently rewrite frozen historical measurements. Any re-derivation follows the agreed archival/recovery contract rather than treating live classification metadata as authorization to recalculate history.
- [ ] Author, run, save, reopen, and query a calculation with an effort override in the real application; existing built-in calculations continue working.

## Explore cross-workout segment tables

**Status:** blocked

**What to build:** Users browse segments across workouts with general filters, selected columns, converted units, stable sorting, and pagination, while retaining existing scoped session-log views.

**Blocked by:** Query the correct metric dates and calendar buckets.

**Integration ownership:** Rows query grammar/validation/serialization, QueryService.runRows, shared typed-selector grammar, TabularResult, RowsTable and table consumers, shared runner dispatch.

**Contract:** [Analytical tables](docs/wayfinder/datadog-analytics/assets/analytical-tables-contract.md). Use the common field-selector grammar; this ticket does not depend on implementing each-expression evaluation.

- [ ] A running-segment query over the last four weeks returns all eligible segments without requiring a result, note, or block ID. General discipline, effort, origin, and contextual filters retain their agreed meanings.
- [ ] Select, multi-column order, and limit/offset clauses parse, serialize, execute, and render. Typed columns and compatible per-column output units work with full numeric precision.
- [ ] Ties use deterministic result/segment identity ordering; pages expose an accurate total matched count and contain no duplicate or omitted rows for an unchanged dataset.
- [ ] Overlapping result/note/block scopes deduplicate by stable identity. Distinct repeated equal-valued intervals remain separate. Existing scoped all-row queries deduplicate original event identities without collapsing different output statements in one segment.
- [ ] Segment dates use metric temporal semantics. Missing column values render as absent, distinct from recorded zero; invalid values retain diagnostics.
- [ ] Limits bound presented rows, not aggregate input populations. Sorting/filtering applies to the complete eligible population before the displayed slice.
- [ ] Existing single-session all/segment queries preserve their intended log presentation. New cross-workout tables work in Explorer, dashboards, embedded notes, and editor previews through the shared runner.

## Inspect the evidence behind aggregate results

**Status:** blocked

**What to build:** Clicking an aggregate reveals the exact contributing population and explains which observations or substitute summaries produced the answer.

**Blocked by:** Explore cross-workout segment tables.

**Integration ownership:** Contribution planner coverage references, aggregate result metadata, drill-down query generation, on-demand source lookup, chart interaction and table/explanation consumers.

**Contracts:** [Contribution explainability](docs/wayfinder/datadog-analytics/assets/automatic-grain-contract.md), [Analytical drill-down](docs/wayfinder/datadog-analytics/assets/analytical-tables-contract.md), [Time alignment](docs/wayfinder/datadog-analytics/assets/time-alignment-contract.md).

- [ ] Clicking a point carries forward all original tag, metadata, content, metric, and grain constraints plus the exact typed group identity and effective clicked-bucket coverage, including partial range clipping.
- [ ] Detail shows true contributing observation counts, selected summary coverage, excluded duplicate representations, and source revision/provenance. A summary-backed mean never claims one sample merely because one row was read.
- [ ] Direct non-segment measurements and summary-only retained populations remain explainable without fabricating segment rows. Unavailable raw evidence is identified rather than replaced by unrelated rows.
- [ ] Detailed source rows are fetched only on inspection. Base result payloads carry bounded compact references, not every observation ID or raw record.
- [ ] Insufficient evidence identifies the affected scope and missing capability. Repeated relationship paths and overlapping summaries cannot inflate the evidence population.
- [ ] Demonstrate direct-detail, summary-backed, partial-period, and insufficient-evidence cases through the actual aggregate interaction and drill-down panel.

## Render analytical results consistently in every widget

**Status:** blocked

**What to build:** Users switch compatible visualizations and move analytical query documents among surfaces without changing the underlying data, calculation scope, or errors.

**Blocked by:** Author named queries and aligned formulas; Explore cross-workout segment tables.

**Integration ownership:** DocumentResult/TabularResult consumers, WidgetChart and existing chart/table/scalar components, dashboard and query-block previews, normalization controls, existing analytics widget gallery.

**Contract:** [Shared rendering](docs/wayfinder/datadog-analytics/assets/shared-execution-contract.md). Extend the existing widget set/gallery rather than create a parallel renderer inventory.

- [ ] Tables, bars, timeseries, scatter, and multi-axis views consume structured unrounded results. Switching compatible views preserves selected outputs, population, units, and grouping without silent reaggregation.
- [ ] Charts zero-fill only missing positions inside the evaluation domain; tables retain absence; errors and insufficient evidence never become valid zeros. Scalar presentation respects the actual reducer result and observation provenance.
- [ ] Correlation calculations still use real paired observations even where chart presentation displays a zero-filled missing position. The display cannot change statistical inputs.
- [ ] Named outputs retain their own units and ranges. Multi-axis views do not imply that unlike dimensions are interchangeable, and table pagination does not truncate source series.
- [ ] Normalization controls expose the mismatch and user-selected target; saved intent is identical after reopening a note or dashboard. Invalid formula/grouping/unit cases show local diagnostics while unrelated widgets remain usable.
- [ ] Verify parity across Explorer, dashboard routes, rendered notes, and live editor previews for tokens, formulas, rows, missingness, errors, and output defaults using the actual browser surfaces.

## Keep dashboards fresh and eliminate redundant work

**Status:** blocked

**What to build:** Multi-widget dashboards and suggestions refresh after data changes without redundant equivalent scans, obsolete results, unbounded retained data, or hidden truncation.

**Blocked by:** Record reusable effort and dialect calculations; Inspect the evidence behind aggregate results; Render analytical results consistently in every widget.

**Decision gate:** Cross-tab freshness after missed notifications.

**Integration ownership:** QueryDocumentRunner request/result reuse, QueryService candidate/planner work, source/catalog/projection commit signals, application BroadcastChannel lifecycle, UI request cancellation and refresh state, reproducible browser benchmarks.

**Contracts:** [Invalidation and performance](docs/wayfinder/datadog-analytics/assets/invalidation-performance-contract.md), [Temporal cache identity](docs/wayfinder/datadog-analytics/assets/time-alignment-contract.md), [Catalog lookup](docs/wayfinder/datadog-analytics/assets/field-discovery-contract.md).

- [ ] Twelve widgets with equivalent candidate fetches share one fetch in a document execution. Same endpoint numbers alone do not prove equivalence across temporal kinds, inclusion rules, stores, revisions, or candidate scopes. Semantically distinct fetches may remain distinct.
- [ ] Query-result identity includes resolved query/document semantics, parameter bindings, formula dependencies, range endpoint semantics, evaluation instant, timezone, bucket/normalization intent, source/metadata/catalog/projection revisions, effective units, and conversion policy wherever they affect results. Presentation-only formatting cannot corrupt cached calculation inputs.
- [ ] Cached values preserve validity, presence, observed counts, raw precision, reducer capabilities, compact coverage, and rolling-window denominators. Neither rounded chart values nor whole-period means substitute for insufficient evidence.
- [ ] Note, result, effort, catalog, and projection changes notify only after successful commit and invalidate affected results/suggestions. Failed transactions do not advertise successful mutations; imports, deletions, re-finalization, and rebuild completion are covered.
- [ ] Verify the separately agreed missed-notification/resume behavior with two real tabs, including simultaneous writes. A stale query or changed-token execution cannot overwrite a newer result. Cancellation of one consumer does not abort shared work still needed by another.
- [ ] Bound cache retention and evict safely; eviction changes performance, not answers. Bound zero buckets to the real evaluation domain and observed groups, avoid eager lineage arrays, and do not recompute all raw aggregates merely to validate a sufficient summary.
- [ ] Commit a reproducible fixture definition with fixed seed, timestamps/timezone, evaluation anchor, expected totals, 500 and 1,000 workouts, respectively 5,000 and 10,000 segments, and 500 catalog entries. Include mixed units, summaries/detail, custom variants, live metadata, civil dates, absent buckets, and selected invalid cases. Exercise twelve same-range widgets plus mixed-range/non-equivalent controls.
- [ ] Report cold and warm execution separately with named browser/hardware, repeat count, timing distribution, peak/retained memory, rows read, and store-scan counts. Measure query execution separately from render time. Targets: dashboard execution below 250 ms, catalog prefix lookup below 16 ms with zero event/result scans, and 50-row paging below 50 ms; also report the contract's below-50-ms single-widget refresh target. No target is claimed achieved until measured.
- [ ] Establish an explicit finite cache retention limit and report memory behavior under repeated queries/mutations. If latency or memory evidence requires a new architectural choice, stop for that decision rather than introduce speculative workers/indexes or reduce the dataset.

### Source coverage and superseded proposals

Every reported finding is assigned below; these are planned dispositions, not claims of implemented fixes.

| Source finding | Owning ticket | Disposition |
|---|---|---|
| Custom property identity loss | Discover custom fields and live contextual metadata | Preserve normalized typed identity and provenance through collection, projection, and querying. |
| Event/summary double counting | Count each logical observation exactly once | Use coverage-aware selection, not the proposed blanket summary-only default. |
| Mixed-unit normalization | Make units and numerical results trustworthy | Normalize before arithmetic even without an explicit output unit. |
| Chronological delta inversion | Query the correct metric dates and calendar buckets | Use genuine metric-date chronology and explicit ambiguity handling. |
| Unknown grouping dimensions | Discover custom fields and live contextual metadata; Query the correct metric dates and calendar buckets | Dynamic fields and typed unassigned groups replace fixed vocabulary; valid unknown references are not rejected merely for being undiscovered. |
| Duplicate row scopes | Explore cross-workout segment tables | Deduplicate stable row identities while preserving distinct observations/output statements. |
| Event-grain content joins | Count each logical observation exactly once | Apply the same eligible-population contract to joined and direct queries. |
| Global effort ownership collapse | Count each logical observation exactly once | Preserve per-result coverage and genuinely unattributed observations. |
| Surface parity gaps | Unify query execution across surfaces; Render analytical results consistently in every widget | Clean shared-runner cutover, query range precedence, tokens, native rows, and rendering parity. |

Each source roadmap acceptance criterion has an explicit owner:

| Source acceptance criterion | Owning ticket and disposition |
|---|---|
| Finalized total volume equals its actual contribution, without duplication | Count each logical observation exactly once — enforce semantic population, not unconditional trust in stored summary grain. |
| 1000 m plus 1 km equals 2000 m without directives | Make units and numerical results trustworthy — retain the criterion. |
| hrv and sleep remain distinct queryable keys | Discover custom fields and live contextual metadata — retain and extend to normalized typed variants. |
| Custom metrics group by dynamic tags | Discover custom fields and live contextual metadata — retain with provenance and live precedence. |
| Duplicate application dashboard module is removed | Unify query execution across surfaces — remove duplicates after migrating all consumers; relocate legitimate application-only note operations. |
| Rows/token blocks agree between editor preview and dashboard | Unify query execution across surfaces; Render analytical results consistently in every widget — verify both existing and new query forms. |
| Cross-workout running segments require no session ID | Explore cross-workout segment tables — retain, with complete matching and bounded presentation. |
| Distance divided by time evaluates across matching buckets | Author named queries and aligned formulas — retain behavior using the agreed named-formula/show syntax rather than the proposal's inline show expression. |
| Dimension mismatches produce local error badges | Make units and numerical results trustworthy; Author named queries and aligned formulas; Render analytical results consistently in every widget — preserve errors through evaluation and presentation. |
| Twelve same-range widgets incur zero redundant scans | Keep dashboards fresh and eliminate redundant work — require equivalent candidate semantics, not one scan for all semantically different queries. |

All six roadmap capability areas are covered: correctness by numerical results/contributions/dates; discovery by custom fields; shared architecture by unified execution; analytical tables by segment exploration/evidence inspection; relationship analytics by named and per-segment formulas/visualization; lifecycle and performance by per-slice migration plus freshness/reuse. Reusable effort/dialect calculations are additionally covered as explicitly requested during wayfinding. Arbitrary user joins, new external connectors, cloud synchronization, deployment, and production implementation during this planning session remain outside scope.
