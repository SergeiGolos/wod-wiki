# Implementation work breakdown and acceptance coverage

Status: implementation handoff produced by [Implementation work tickets and acceptance coverage](../issues/10-implementation-work-breakdown.md). This asset is the coverage/dependency audit backing that resolution. It commits no one to code; the tickets under `../issues/` are the deliverables.

Source proposal: [Datadog-Style Analytics Engine Review & Roadmap](../../../13-datadog-analytics-engine-review-and-roadmap.md). Its defect findings 3.1–3.9 are accepted input. Its phased *candidate fixes* are not: where a decision contract superseded a candidate (for example the blanket summary-only default), the disposition below says so.

## Ticket index (dependency order)

| # | Ticket | Covers | Blocked by |
|---|---|---|---|
| 11 | [Typed field identity and custom metric key preservation](../issues/11-typed-field-identity.md) | 3.1; Phase 2 actions 1–2, acceptance (distinct custom keys) | — |
| 12 | [Calendar time alignment and metric-date anchoring](../issues/12-time-alignment.md) | time-alignment contract; 3.9 range-precedence half | — |
| 13 | [Unit normalization, output defaults, and reducer correctness](../issues/13-units-and-arithmetic.md) | 3.3, 3.4; arithmetic contract; Phase 1 actions 2–3, acceptance (mixed units) | 11, 12 |
| 14 | [DB v17 projection schema, provenance, backfill, and atomic mutations](../issues/14-db-v17-lifecycle.md) | lifecycle contract; field-discovery persistence | 11, 12, 13 |
| 15 | [Field catalog service, typeahead, and discovery surfaces](../issues/15-catalog-typeahead-and-discovery.md) | field-discovery contract consumer side; Phase 2 action 4 | 14 |
| 16 | [Contribution selection, grain integrity, and metadata resolution](../issues/16-contribution-selection.md) | 3.2, 3.5, 3.7, 3.8; automatic-grain contract; Phase 1 actions 1, 4–5, acceptance (summary total) | 11, 12, 13, 14 |
| 17 | [Query documents, formulas, and attached calculations](../issues/17-query-documents-and-formulas.md) | query-documents contract; Phase 5 actions 1–3, acceptance; map's attached-calculation consumer | 11, 12, 13, 16 |
| 18 | [Cross-workout analytical tables and drill-down](../issues/18-analytical-tables-and-drilldown.md) | 3.6; analytical-tables contract; Phase 4, acceptance | 12, 16, 17 |
| 19 | [Shared query execution and surface cutover](../issues/19-shared-query-execution.md) | 3.9; shared-execution contract; Phase 3, acceptance; Phase 5 action 4 (scatter/multi-axis rendering) | 15, 17, 18 |
| 20 | [Invalidation, query reuse, and performance verification](../issues/20-invalidation-and-performance.md) | invalidation contract; Phase 6, acceptance | 14, 19 |

Ordering rationale: 11/12 are leaf foundations (identity; temporal semantics). 13 depends on them because variant selection and chronological endpoints are inputs to reducer behavior. 14 freezes the persisted record shapes that 11–13 produce, so it lands after them and before everything that reads provenance. 16 is the semantic core (selection) and needs provenance from 14. 17 composes documents and formulas on top of selection. 18 reuses selection plus documents (typed column selectors). 19 is the surface cutover and needs every execution capability. 20 adds reuse/invalidation over the final runner.

## Graduated decision tickets and deepening gates

The [architecture deepening review](../deepening/index.md) qualified this handoff's completeness claim and surfaced questions whose shape is now clear. Three became decision tickets; the rest are named gates inside the implementation tickets they constrain:

| Deepening question | Disposition |
|---|---|
| Shared unit catalog home, dependency direction, conversion-evidence model, dialect extension propagation ([unit policy](../deepening/02-unit-policy.md)) | **Resolved** by [21](../issues/21-unit-catalog-home.md): core-owned catalog, write-time contextual snapshots, validated overlay, core-owned defaults; gates 13 (rewrite) and 14 (persisted evidence) |
| Legacy widget-body slash/positional semantics, full-body extraction, noteOps home ([dashboard note](../deepening/04-dashboard-note.md)) | **Resolved** by [22](../issues/22-dashboard-body-migration.md): documents everywhere with eager rewrite, fence-tag attribute params, strict full-body guards, noteOps in wql with structured results; gates 17 (grammar) and 19 (cutover) |
| Scalar endpoint policy and absent scatter positions ([query presentation](../deepening/05-query-presentation.md)) | **Resolved** by [23](../issues/23-widget-presentation-semantics.md): uniform last endpoints, paired-only scatter display (zero-fill scoped to time-axis charts), display-only synthetic provenance; gates 19 (widget migration, scatter renderer) |
| Run ordering versus generation-only staleness checks; receipt epochs; metric-date scan completeness; retry-loop deletion; rollup-ensure idempotence ([query freshness](../deepening/06-query-freshness.md)) | Named in 19 scopes 3, 5, and 7 and 20 scopes 2–4 |
| Storage physical-plan gates: boolean keys, per-Metric dates, durable markers, upgrade versus backfill, concurrent saves, mutation inventory, observation-identity versioning, derivation versioning, source-truth preservation ([persistence](../deepening/07-transactional-storage.md), [metric derivation](../deepening/03-metric-derivation.md)) | Named as 14 scope 6, with a characterization-tests-first cutover |
| Substitution proof without population recompute ([contribution selection](../deepening/01-contribution-selection.md)) | Named as 16 scope 7 |
| Presentation planner extraction; contract-conformance checks for named function semantics ([presentation](../deepening/05-query-presentation.md), [readiness review](../deepening/index.md)) | Named in 19 scope 4 and 17 scope 6 |

## Coverage audit — source findings 3.1–3.9

| Finding | Disposition | Where |
|---|---|---|
| 3.1 Custom JSON properties collapse in identity | Covered: typed field identity (path + kind + dimension) carried from `PropertyMetric` through fact projection. | 11 |
| 3.2 Double counting across event and summary grains | Covered: coverage-based contribution selection; the proposal's blanket `grain:'summary'` default was **rejected** by the grain decision (result-preserving selection, no universal summary-only rule). | 16 |
| 3.3 Unit conversion anomaly on mixed inputs | Covered: normalize compatible units before arithmetic; strict conversion over the Unit Registry; system default output units; first-record fallback removed. | 13 |
| 3.4 Chronological inversion in delta | Covered: metric-date chronological endpoints, ambiguity diagnostics; input-order independence. | 13 |
| 3.5 Silent degradation on unknown dimensions | Covered: discovered contextual fields for grouping/filtering; structural missing-group value replaces `'(none)'`; observed-tuple group domain. | 16 |
| 3.6 Duplicate scopes in rows queries | Covered: dedupe by stable record identity (`resultId:segmentIndex`), preserving legitimate repeats. | 18 |
| 3.7 Content join drops event-grain facts | Covered: joined and direct paths share one selection contract; `grain:event` respected. | 16 |
| 3.8 Global scope collapse in effort deduplication | Covered: result-local coverage-aware ownership; unassigned group retained. | 16 |
| 3.9 Surface parity gaps | Covered: `QueryDocumentRunner`, duplicate dashboard model deleted, tokens in editor previews, rows dispatched natively, host-range precedence fixed, per-widget error badges, kg/lb preference cutover. | 12 (precedence), 19 (rest) |

## Coverage audit — roadmap phases

| Phase (action → disposition) | Where |
|---|---|
| 1.1 default SELECT to `grain:'summary'` → **superseded** (coverage-based selection instead) | 16 |
| 1.2 normalize units pre-aggregate → covered | 13 |
| 1.3 chronological sort before delta → covered (metric-date order, stronger) | 13 |
| 1.4 per-result effort scope → covered | 16 |
| 1.5 rows event-ID dedupe → covered | 18 |
| 1 acceptance: `sum:totalVolume{}` equals summary volume; 1000 m + 1 km = 2000 m without directives | 16 / 13 |
| 2.1–2.2 PropertyMetric carries key; projection preserves identity → covered | 11 |
| 2.3 arbitrary tags copied into `metadata.tags` → **superseded** (linked metadata resolved at query time; no copying onto metrics) | 16 |
| 2.4 dynamic Field Catalog → covered | 14, 15 |
| 2 acceptance: distinct `hrv`/`sleep` keys; `avg:hrv{} by {tag}` grouping | 11 / 16 |
| 3.1–3.5 delete playground dashboard copy, shared runner, AST rollup predicate, token threading, rows dispatch → covered | 19 |
| 3 acceptance: copy removed; identical rendering in editor preview and dashboard route | 19 |
| 4.1–4.3 relaxed rows scopes, pipe suffixes, shared dataset abstraction (`TabularResult`) → covered | 18 |
| 4 acceptance: `rows:segment{discipline:running} last 4w` across sessions | 18 |
| 5.1–5.3 multi-line documents, evaluator wiring, alignment with missing-value handling → covered | 17 |
| 5.4 correlation visualizations (scatter, multi-axis) → covered | 19 |
| 5 acceptance: ratio document evaluates; dimension mismatches produce localized badges | 17 / 19 |
| 6.1–6.3 coalescing, revision-aware invalidation, bounded pagination/index slicing → covered | 20 |
| 6 acceptance: 12+ shared-range widgets, zero redundant scans | 20 |

Capability areas: discovery (11, 14, 15), formulas/relationships (17), analytical tables (18), visualization parity (19, 18), lifecycle/invalidation (14, 20), performance (20).

## Related-work reconciliation

- `apps/playground/src/lib/dashboard/*` duplicate model/parser/scaffold: removed by 19 (Phase 3.1).
- Duplicate legacy `resolveCanonicalMetricKey`/normalization copies in `apps/playground/src/services/analytics/workoutDerivation.ts`: kept only while pre-V16 upgrade backfills remain reachable (V12/V13 replay paths); 11 annotates ownership, 14 owns the eventual retirement once the minimum upgradable version rises past them.
- Dead `grain:'rollup'` legacy fact rows and the unwired `workloadRollup` driver: rollup recompute-on-open is wired through the runner's rollup-prerequisite hook in 19; legacy rows are upgrade-path-only and are not resurrected.
- Events-store `by-metric` index remains unused (ticket-001 measurement); no speculative indexes beyond the contract-required `by-metricDate` are introduced.
- The stale `InMemoryStorage` reference in `apps/playground/CONTEXT.md` is out of scope here; the verified seams are `IndexedDBService`, `NotePersistenceStorage`, and the injected `UnifiedEventStore`.

## Completeness statement

Every reported defect (3.1–3.9), every roadmap action and acceptance criterion, and every standing choice from the map has an explicit disposition above or inside the linked tickets, and each ticket cites its owning decision contract. **Qualified by the [architecture deepening review](../deepening/index.md):** the earlier claim that no design decision remained open was too strong. The review's structural questions are now tracker tickets [21](../issues/21-unit-catalog-home.md), [22](../issues/22-dashboard-body-migration.md), and [23](../issues/23-widget-presentation-semantics.md), gating tickets 13/14, 17/19, and 19 respectively; its implementation-level gates are enumerated inside tickets 14 (scope 6), 16 (scope 7), 17 (scope 6), 19 (scopes 4 and 7), and 20 (scopes 2–4). The map's "Not yet specified" provisions stay in force: genuinely new cross-package interface questions graduate to decision tickets when their shape becomes clear, and no speculative indexes, workers, or caches are introduced without measured evidence.
