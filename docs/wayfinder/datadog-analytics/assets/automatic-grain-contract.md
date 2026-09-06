# Automatic grain selection and contribution ownership

Status: resolved decision contract; planning only.

Owned by [Automatic grain selection and contribution ownership](../issues/02-automatic-grain-and-contributions.md). Use the typed identity and metadata rules from [Field discovery and catalog contract](field-discovery-contract.md). This contract specifies required behavior, not an implemented query planner.

## Observation semantics

An **observation** is one recorded value of a typed metric at the scope that produces it. Its semantic identity is independent of the number of storage rows or query paths that expose it.

Distinguish:

| Meaning | Contribution |
|---|---|
| Directly recorded measurement | One observation, even if stored in a summary-grain row. A manually recorded HRV value needs no hypothetical segment inputs. |
| Newly calculated metric | One observation at its producing scope. A workout-level `sessionLoad` is not weighted by the number of segments used to calculate it. |
| Substitute summary | A representation of an existing population of observations of the queried metric. Its contribution preserves that population's statistics and weighting; it is not automatically one new observation. |
| Duplicate representation | Another stored/query-reachable representation of the same observation or summary. It adds no observation. |

Derived provenance must distinguish producing a **new metric observation** from compressing existing observations. Following dependency lineage into different input metrics must not change the observation count of a newly calculated metric.

Each observation counts equally by default. Ten bar-velocity observations of 1 m/s plus two of 2 m/s average to 14/12 m/s. One workout-level session-load observation of 200 plus one of 400 average to 300. Equal-workout averaging of a segment-level metric requires an explicit query transformation, not an automatic grain change.

## Source identity and coverage

Two different recorded observations remain distinct even when their values, metric names, timestamps, or effort tags match. Deduplicate by stable observation identity and representation lineage, not by numeric equality or block content ID. Reaching the same observation through multiple note/block/result paths does not multiply it; different workout executions of the same block remain independent.

A substitute summary must expose enough provenance to establish:

- Typed metric identity and the producing workout/result or equivalent direct-record scope.
- The precise population it covers: stable observation references or an equivalent exact scope/partition descriptor. Whole-workout, per-effort, and partial coverage are distinct.
- Whether it is a new calculated observation, a substitute summary, or a duplicate representation of an existing observation.
- Aggregation/reducer identity and the statistics it retains, including true observed count where the operation needs it.
- Units, temporal/grouping coverage, and source revision/derivation version sufficient to verify applicability and freshness.

The contract does not require storing a large observation-ID array on every summary. Compact descriptors are acceptable when they prove membership, completeness, and overlap exactly. A metric name plus result ID, matching value, row grain, or timestamp is not such proof.

A newer valid representation replaces the older representation of the same semantic observation or summary. Re-finalization/upsert does not append another contribution. Contradictory representations without a valid revision/ownership relationship are not resolved by encounter order: use sufficient authoritative detail if available, otherwise report the limitation. Exact persisted revision and backfill mechanics are owned by the lifecycle ticket.

## Automatic selection

The semantic invariant is **one complete, non-overlapping representation of the requested population**, preserving the query's result.

1. Resolve the requested typed metric and eligible source scope, including content relationships, time range, and explicit grain constraints. Resolve contextual metadata according to the field contract.
2. Distinguish logical observations from storage copies and substitute summaries. Establish known coverage before dropping alternatives; filtering one stored representation must not erase evidence that its underlying observations still matter.
3. A summary is usable only if its coverage and retained statistics answer the requested operation, filters, grouping, time window, and observation weighting at the applicable revision.
4. Use sufficient detail where a summary cannot satisfy those requirements. A summary lacking `shoe` detail cannot answer `by {shoe}` unless its declared partition proves that detail is uniform. A summary spanning a time or value-filter boundary cannot be proportionally apportioned or assumed to match.
5. Combine only disjoint contributions. Different workouts may use different grains, and a partial summary may coexist with uncovered detail when provenance proves their populations do not overlap. Never include the detail already represented by that summary.
6. If there is no complete, provably valid representation of a relevant known population, reject the affected calculation and identify the deficient scope. Do not silently produce a partial answer, zero-fill unavailable aggregation evidence, or treat an average as one original reading.

Choosing between equally valid representations is an execution optimization, not a change in meaning. Do not recompute every detailed aggregate solely to compare it numerically with a summary; validate coverage, revision, and reducer capability. The performance ticket owns economical selection and caching. Unsupported combinations must fall back to sufficient detail or report a limitation, never approximate silently.

### Sufficient statistics

A summary containing a converted sum and observed count can preserve a pooled arithmetic average; a summary containing only an average cannot establish the required weight. Sum, count, min, max, chronological last/delta, and later calculations each require their own capability check. Do not assume every scalar summary can serve every aggregator.

The [arithmetic contract](arithmetic-contract.md) defines the full reducer/statistics matrix, missingness semantics, and unit conversion algebra. In particular, the count used for pooled observation-average weighting represents actual observations, not zero-filled buckets, stored row count, underlying input count of a different calculated metric, or Field Catalog membership count. Positional rolling-average denominators are separately defined there and are not observation counts.

## Missingness versus insufficient evidence

These are different states:

- No observation of an allowed/unknown field: follow the agreed missing-value rules; do not reject solely because the field was undiscovered.
- An operation-incompatible typed metric variant: exclude that variant under the field contract; it is not a missing numeric sample.
- A known retained population represented only by an insufficient summary: report insufficient evidence. For example, a saved average with neither sample count nor recoverable detail cannot be mixed into a pooled average.
- A selected invalid value or undefined arithmetic operation: report according to the arithmetic contract; do not disguise it as ordinary absence.

A legacy summary without adequate coverage may be bypassed using sufficient detail. If its meaning or coverage cannot be established and the complete requested population cannot be proven, report the limitation rather than inventing lineage. Migration may recover evidence from authoritative logs where it actually exists.

## Effort ownership and grouping

Choose coverage within each workout/result and typed metric; never use an `any attributed record exists` check over the whole query to discard other workouts.

- Grouping by effort retains genuinely unattributed observations in an unassigned group.
- An explicit effort filter still selects only matching observations; this is intentional filtering, not deduplication.
- An overall summary with no effort tag is not automatically an unassigned measurement. Its coverage may include several efforts and genuinely unassigned observations.
- A total query may use a complete overall summary or a complete disjoint collection of effort/other contributions, not both.
- An effort-grouped query uses detailed observations or sufficient partitioned summaries. Do not label a whole-workout total as unassigned, omit uncovered observations, or invent an unassigned residual by subtracting arbitrary summaries.

Example: one workout contributes 5 km of running and a separate workout contributes 3 km without an effort tag. The unfiltered total is 8 km; grouping shows running 5 km and unassigned 3 km. The presence of either workout never suppresses the other.

## Explicit grain and content relationships

Existing explicit grain filters are hard source constraints. `grain:event` restricts eligible stored event representations; `grain:summary` restricts eligible summary representations. Storage grain does not redefine whether a value is a direct observation, a calculated observation, or a substitute summary.

Within the requested grain, still enforce semantic identity, non-overlap, sufficient statistics, and observation weighting. If that grain cannot answer correctly, report its limitation rather than falling back to an excluded grain. No override means automatic selection may use all eligible representations under the rules above.

Content relationships constrain the eligible workout/content population; they do not impose summary grain. Joined and non-joined aggregate execution use the same selection contract. Multiple relationship paths must not duplicate observations. Raw rows queries can inspect storage records; their visual presence does not make every row an independent aggregate contribution.

## Explainability contract

An aggregate must support inspection of:

- Which workout/result scopes and typed observations contribute.
- Which summaries substitute for which populations, with reducer/statistics and covered observation counts.
- Which representations were ignored as copies or replaced by a selected summary.
- Which source revision and metadata provenance justify the selection.
- Any scope that prevented a complete answer and the missing capability or evidence.

Keep ordinary result payloads bounded: expose compact coverage references and counts, resolving detail on demand. The table/drill-down and shared-surface tickets own presentation. A summary-backed average must not claim to have used one sample merely because it read one stored row.

## Current-source changes required

| Source | Current boundary and implementation requirement |
|---|---|
| [UnifiedEventRecord](../../../../packages/core/src/types/storage.ts) | Row ID, grain, output type, metrics, and result/content identity are present. Persist semantic observation identity and adequate coverage/reducer/revision provenance rather than deriving them from grain alone. |
| [Derivation](../../../../packages/wql/src/derivation.ts), `toEventRows` | Maps every output statement into an event row, including analytics outputs. Preserve original observation/production identity across this representation. |
| [Derivation](../../../../packages/wql/src/derivation.ts), `foldSummaryOutputs` / `toSummaryEventRows` | Folds analytics outputs by key/group tags and emits another representation. Preserve whether the value is a calculated observation or a substitute summary, plus lineage; a copied analytics output is not a second contribution. |
| [Derivation](../../../../packages/wql/src/derivation.ts), `projectEventToFacts` | Preserve selected typed identity and contribution/coverage semantics through projection; do not discard information the selection or aggregation stage needs. |
| [QueryService](../../../../packages/wql/src/QueryService.ts), `run` | Currently projects candidate rows before aggregate construction. Integrate one logical contribution-selection path rather than blanket summary-only filtering. |
| [QueryService](../../../../packages/wql/src/QueryService.ts), `applyEffortScope` | Replace global attributed/unattributed suppression with result-local coverage-aware ownership and normal filtering. |
| [QueryService](../../../../packages/wql/src/QueryService.ts), `deriveMetricFacts` and joined paths | Remove the summary-only restriction as part of adopting the shared planner; a content join must retain eligible event-grain observations. |
| [IndexedDBService](../../../../apps/playground/src/services/db/IndexedDBService.ts), `appendEvents` / `finalizeSummaries` | Keep replacement idempotent and provenance consistent with the stored snapshot. Migration must recover lineage honestly and atomically; do not fabricate counts for old means. |

These locations are grounded in source reads. No implementation, runtime probe, or production behavior change is claimed by this decision.

## Acceptance examples

1. A calculated total-volume observation of 100 kg emitted as an event and copied into a summary contributes 100 kg, not 200 kg.
2. Two genuinely distinct observations each valued at 100 remain two observations even if their timestamps match. Fetching either through two scope paths does not add another copy.
3. Ten observations of 1 m/s and two of 2 m/s average to 14/12 m/s using either detail or sufficient disjoint summaries. Averaging the two means to 1.5 m/s is not equivalent.
4. If one workout retains only its mean with no count or detail, the pooled average reports that workout as insufficient rather than omitting it.
5. A directly recorded HRV value in summary storage counts once. A new workout-level session-load metric counts once at its producing scope; values 200 and 400 average to 300.
6. A summary missing shoe partitioning yields to available shoe-tagged detail. If that detail is unavailable and no valid partition evidence exists, the affected grouped calculation reports a limitation.
7. An overall workout summary and overlapping effort summaries never contribute together. A partial summary may combine with uncovered observations only with exact non-overlap and complete coverage.
8. Running 5 km plus an unrelated unattributed 3 km produces total 8 km and retains the unassigned group. Explicit running-only filtering produces 5 km.
9. Explicit summary-only selection reports a limitation when only detail can answer; it does not silently read detail as a fallback.
10. An event-only content-joined query sees the same eligible logical observations as the corresponding direct query restricted to those content IDs; no summary-only join projection or duplicate join-path counting.
11. Re-finalizing a summary replaces the existing representation, leaves the logical population unchanged, and invalidates stale coverage through the lifecycle contract.

## Downstream ownership

The source identity/coverage requirement is now concrete and belongs in the existing lifecycle ticket, not a duplicate research ticket. [Missing values, units, and numerical correctness](../issues/04-missing-values-units-and-arithmetic.md) owns reducer capability details. [Time buckets, group keys, and alignment boundaries](../issues/03-time-buckets-and-group-keys.md) owns temporal membership. [Projection lifecycle and existing-data migration](../issues/08-projection-lifecycle-and-migration.md) owns persisted provenance, source revisions, backfill, and replacement mechanics. [Cross-workout tables and aggregate drill-down](../issues/06-analytical-tables-and-drilldown.md) and [Shared query execution across dashboards and notes](../issues/07-shared-query-execution-and-surfaces.md) own selection explanations and shared execution. [Invalidation, query reuse, and performance budgets](../issues/09-invalidation-and-query-performance.md) owns efficient coverage selection and invalidation without changing this contract.
