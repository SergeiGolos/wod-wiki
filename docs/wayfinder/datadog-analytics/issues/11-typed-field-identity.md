# Typed field identity and custom metric key preservation

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none
Prerequisites: [Field discovery and catalog contract](../assets/field-discovery-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Distinct custom properties survive from authoring through projection as queryable, typed field identities. `PropertyMetric('hrv', 48)` and `PropertyMetric('sleep', 7.5)` no longer collapse to `custom` (source finding 3.1); numeric and text variants of the same path remain distinct metrics; nested and flat dotted forms share one identity.

## Scope

Contract changes per the [field discovery contract](../assets/field-discovery-contract.md) §§ Identity and discovery, Units and operation compatibility:

1. **Field identity module (new, `packages/core`).** Pure identity/normalization used by both `lang` and `wql` (both already depend on core):
   - lower camelCase normalization per path component; dots delimit paths; flat `{"sleep.score": 85}` ≡ nested `{sleep:{score:85}}`; no synonym inference (`heartrate` ≠ `heartRate`).
   - value kinds `number | string | boolean | array`; objects contribute nested leaves, empty objects nothing; explicit null records presence/clearing, never a value.
   - structured variant identity = normalized full path + kind + physical dimension (dimension resolved through the [Unit Registry](../../../../packages/lang/src/metrics/units/UnitRegistry.ts) for numeric kinds); source, spelling, and label are provenance, not identity.
   - unit handling: carry the observed/effective unit with the value; omitted-unit resolution policy and conversion math are owned by ticket 13's defaults module — consume, do not duplicate.
2. **Authoring side.** [`PropertyMetric`](../../../../packages/lang/src/runtime/compiler/metrics/PropertyMetric.ts) carries its key into metric metadata as a typed field reference (path + kind, original spelling as provenance). The property/metric-object branches of the [semantic classifier](../../../../packages/lang/src/parser/semantic-classifier.ts) construct it with the normalized path/kind. Existing explicitly-stamped `metadata.canonicalKey` emitters (calc seeds, runtime families) keep working unchanged.
3. **Projection side.** [`projectEventToFacts`](../../../../packages/wql/src/derivation.ts) resolves each fact's `metricKey` from the typed field identity first; the label-derived fallback (`resolveCanonicalMetricKey`) remains legacy-only. `toEventRows`/`toSummaryEventRows` fold identity extends to typed variants so two variants of one path never fold together.
4. **Filtering/grouping readiness.** `matchesFilters`/`factTagValue` keep their current fixed tag set here; discovered contextual fields arrive with ticket 16. This ticket only guarantees identity survives projection.

## Clean cutover

- Remove the first-fact `metricKey` fallbacks that invent `custom`/`reps` defaults for keyed custom properties; keep genuine legacy fallbacks only for unlabeled legacy data, annotated.
- `apps/playground/src/services/analytics/workoutDerivation.ts` duplicates `resolveCanonicalMetricKey` for pre-V16 upgrade backfills (V12/V13 replay paths). Do **not** delete while those upgrade steps remain reachable; annotate both copies as legacy with a cross-reference. Retirement belongs to the DB-v17 ticket's minimum-version decision (ticket 14).
- Extend the vocabulary sync test (`wql-calc-seeds.test.ts` pattern) so discovered-identity rules cannot silently diverge from `vocabulary.ts`.

## Acceptance scenarios

From the [field discovery contract](../assets/field-discovery-contract.md) and roadmap Phase 2:

1. Two custom properties `hrv` and `sleep` on statements without labels project to distinct queryable keys; `sum:hrv{}` and `sum:sleep{}` return their own values, never a pooled `custom`.
2. `heart rate`, `heart_rate`, `HeartRate` authors collapse to one `heartRate` identity with original spellings retained as provenance; `heartrate` stays distinct.
3. Numeric `score` and text `score` appear as separate variants; a numeric aggregation of `score` excludes the text variant without synthesizing zeros.
4. `{"sleep.score": 85}` and `{sleep:{score:85}}` on the same record are one identity (equivalent duplicate aliases do not double a contribution); conflicting values at the same typed identity surface the ambiguity diagnostic in ticket 16's selection path.
5. Arrays stay indexed as collection-valued fields; no per-element observations are projected.
6. Re-indexed/re-derived results (existing `derivation.test.ts` corpus) produce identical keys before and after this change for all built-in families.
