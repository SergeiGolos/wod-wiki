# Contribution selection, grain integrity, and metadata resolution

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 11, 12, 13, 14
Prerequisites: [Automatic grain selection and contribution ownership contract](../assets/automatic-grain-contract.md); [Field discovery and catalog contract](../assets/field-discovery-contract.md); [Time buckets, group keys, and alignment contract](../assets/time-alignment-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Every aggregate query consumes one complete, non-overlapping representation of its requested population. Event/summary double counting (3.2), content-join event-grain loss (3.7), global effort-scope collapse (3.8), and silent `'(none)'` degradation (3.5) are gone; filters/grouping work over discovered contextual fields with effort→note→workout→segment metadata precedence; every answer is explainable.

## Scope

1. **Selection path** ([`QueryService.run`](../../../../packages/wql/src/QueryService.ts), replacing the project-then-aggregate leg): resolve typed metric (11) → eligible scope (time from 12, content relationships, explicit `grain:` constraints) → coverage-based selection over event rows and substitute summaries using the V17 provenance (`representationKind`, `summaryCoverage`, `reducerStats` from 14). A summary substitutes only when its coverage and retained statistics answer the requested operation (13's matrix), filters, grouping, and weighting; otherwise use sufficient detail; if neither proves the population, reject the affected calculation with a diagnostic identifying the workout/scope (insufficient evidence ≠ missing value). Never combine overlapping representations; replacement (re-finalized) summaries supersede their predecessors.
2. **Effort ownership** (`applyEffortScope` rewrite): result-local coverage decisions only. Unattributed observations stay in an unassigned group; explicit effort filters filter normally; an overall summary is never relabeled unassigned; totals use either a complete overall summary or complete disjoint parts, never both.
3. **Join paths** (`runJoined`/`applyMetricJoin`/`deriveMetricFacts`): drop the `grain === 'summary'` filter so content-joined queries keep eligible event-grain observations; joined and direct execution share the identical selection contract; multiple relationship paths dedupe by stable observation identity. Explicit `grain:event`/`grain:summary` constraints are strict — limitation reported, never silent fallback to an excluded grain.
4. **Contextual metadata resolution** (new module, query-time, live values): precedence effort-definition defaults → note → workout → segment; omission inherits; explicit null clears; the resolved assignment feeds filtering, grouping (`factTagValue`/`dimValue` over discovered contextual fields, not just fixed `WQL_TAG_KEYS`), and variant selection (a cleared/overridden default never resurfaces for a preferred type). Provenance of the winning source stays inspectable. Live metadata resolution reads via the existing `NoteQueryStore`/`EffortQueryStore` seams so tag/discipline edits reclassify past workouts.
5. **Group identity:** canonical ordered tuples of resolved dimension identity + typed value (collision-free, no `' · '` label concatenation as identity); structural missing-group value distinct from literal text; observed-tuple group domain (no catalog enumeration, no Cartesian invention).
6. **Explainability:** aggregate results carry compact coverage references (contributing scopes/counts, selected summary descriptors, ignored duplicate representations, insufficient-evidence scopes); detailed lineage resolves on demand (API consumed by ticket 18's drill-down).

## Clean cutover

- Remove: the implicit both-grains projection that causes 3.2, `applyEffortScope`'s global suppression, the summary-only join filter, and `dimValue`'s `'(none)'` fallback. No legacy selection path remains behind a flag.

## Acceptance scenarios

From the [automatic grain contract](../assets/automatic-grain-contract.md) examples and roadmap Phase 1:

1. A finalized workout: `sum:totalVolume{}` equals the workout's summary volume with no `{grain:summary}` filter (Phase 1 acceptance; kills 3.2).
2. Ten `1 m/s` + two `2 m/s` observations average to 14/12 via detail or via provably sufficient disjoint summaries; one workout retaining only a count-less mean reports insufficient evidence instead of omitting it.
3. A directly recorded HRV summary-grain value counts once; a workout-level `sessionLoad` of 200 + 400 averages to 300.
4. A summary without shoe partitioning yields to shoe-tagged detail; with no detail and no partition evidence, the grouped calculation reports a limitation.
5. 5 km running + unrelated unattributed 3 km: total `8 km`; grouped: `running 5 km` + `unassigned 3 km`; running-filtered: `5 km` (kills 3.8).
6. `sum:distance{grain:event} where find:block{...}` matches the same observations as the equivalent direct content-ID query (kills 3.7).
7. Overlapping `rows:`-style multi-scope aggregate candidates contribute each observation once; re-finalization changes no totals.
8. `by {shoe}` with no shoe data groups under the structural unassigned value — no `'(none)'` rows masquerading as data (kills 3.5).
9. Segment metadata overrides workout; explicit null at workout clears the note default; provenance shows the winning source.
10. Explicit `grain:summary` selection over detail-only data reports a limitation rather than silently reading detail.
