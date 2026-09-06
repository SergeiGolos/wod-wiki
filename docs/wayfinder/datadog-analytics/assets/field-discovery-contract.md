# Field discovery and catalog contract

Status: agreed policy with implementation contract; planning only.

Owned by [Field discovery, identity, and metadata provenance](../issues/01-field-discovery-and-identity.md). The ticket contains the human decision history and resolution. This asset specifies the resulting contract; it is not evidence that the engine implements it.

## Identity and discovery

A metric variant is identified by **normalized full property path + value kind + physical dimension where applicable**. Source, display label, original spelling, and convertible unit spelling are provenance, not independent identity components. Built-in and custom metrics use the same identity rules.

- Normalize words to lower camelCase within each path component. Whitespace and word separators such as underscores separate words; existing camel/Pascal-case boundaries are recognized. `heart rate`, `heart_rate`, and `HeartRate` match `heartRate`; `HRV` matches `hrv`. Do not infer synonyms or invent missing word boundaries: `heartrate` does not automatically become `heartRate`.
- Dots delimit full paths. Nested objects and flat dotted keys have equivalent names: `{sleep: {score: 85}}` and `{"sleep.score": 85}` identify `sleep.score`. `sleep_quality.score_value` identifies `sleepQuality.scoreValue`. Dots are reserved path separators, not an additional literal-dot identity namespace.
- Preserve original paths/spellings and source references for explanation. A display-label change must not merge or rename an underlying canonical key. Existing explicit canonical aliases remain explicit; discovery does not guess new ones.
- Numeric, string, boolean, and array values are distinct kinds. Objects contribute nested leaves, not implicit numerical observations. Empty objects contribute no leaves. Null records presence/clearing, not a fabricated numeric or string value; it cannot determine a physical dimension by itself.
- Arrays are collections, not implicitly expanded measurements. Index their field identity/kind, not one observation per element. Element selection, expansion, and aggregation require explicit query operations, whose syntax belongs to the downstream query contracts.
- Numerical metadata can be a filter/grouping field without becoming an independent measured contribution. Catalog membership counts availability in source records, not workout volume, samples, or aggregate contributions.

Identical aliases within one source/scope can be represented as one assignment if their typed values agree (after applicable unit conversion). Conflicting assignments within the same typed identity at that scope make the affected calculation ambiguous. Retain the source evidence; do not sum or select by property order. Different source records remain separate observations. A number and a string with the same path are separate variants, not conflicting assignments to one variant.

## Units and operation compatibility

Physical numeric variants carry an effective unit. An omitted unit is resolved from applicable explicit/inherited configuration or the system default for the known metric dimension and written with the measurement. The user confirmed that units are always written. Later preference changes may convert display or change defaults for new inputs, not reinterpret stored numbers.

Convertible units share the same dimension and variant: kg/lb are mass, m/km are length. Normalize compatible values before calculations. Time, distance, and load are not interchangeable because all happen to be numeric. Genuinely dimensionless numbers remain dimensionless. An explicit but unrecognized unit is not the same as an omitted unit and must not be silently replaced with a default or passed through as a valid conversion.

Calculations select only compatible variants. `sum:score{}` includes numeric score, not text score. Excluded variants are not synthetic zeros or observations in an average. If the operation or explicit unit/dimension makes selection unique, select automatically. If multiple compatible variants remain ambiguous, require an explicit choice; typeahead shows the alternatives. Do not hide invalid values or undefined arithmetic inside a selected variant.

Syntactically valid but undiscovered field references are allowed. They have no observations and use the operation-specific [arithmetic contract](arithmetic-contract.md), including its distinction between ordinary and rolling averages. A query reference alone does not create a catalog entry. Missing group values retain absence for the grouping contract to render; lack of a discovered field is not itself a semantic error.

## Metadata resolution

Resolve the applicable field at the observation's context using this priority, lowest first:

**Effort-definition defaults → note → workout → segment.**

- Omission inherits. A supplied higher-priority value overrides the default for that context.
- Explicit null clears the path and prevents a lower default from resurfacing, including during numeric-variant selection. Null is not an observed zero.
- Resolve the contextual assignment before selecting an operation-compatible variant; do not reach around an explicit override to revive a lower-priority default of a preferred type.
- Keep the winning source and overridden/cleared provenance inspectable. Do not copy inherited metadata into additional measured contributions.
- Multiple related metadata sources at the same priority must not cause implicit row multiplication. Conflicting assignments at that priority are ambiguous; explicit array handling or a later explicit selection is required.

Whether historical queries use live edited metadata or saved snapshots is a separate lifecycle decision already owned by [Projection lifecycle and existing-data migration](../issues/08-projection-lifecycle-and-migration.md). This ticket fixes precedence and provenance regardless of that choice.

## Persistent Field Catalog

Maintain dedicated stores inside the existing application IndexedDB database. Do not add a separate database that cannot participate in source-write transactions. The catalog is a derived index of saved data, not an authoritative replacement for logs or a manual registration system.

### Logical store contract

| Store | Key and content | Required indexed access |
|---|---|---|
| `field_catalog` | One descriptor per typed field identity; canonical path, value kind, dimension, observed units/original spellings, source-role information, source-reference count. Null-only paths may have an unresolved descriptor, never a fake numeric variant. | Stable identity lookup; ordered normalized-path prefix lookup for field typeahead. |
| `field_sources` | One contribution set per stable source-record identity, including field identities and unit/category/provenance support needed to reverse that record's contribution. | Exact source lookup for replacement/deletion; reverse field lookup for supporting provenance. |
| `field_values` | Distinct observed scalar categorical values per field identity, with source-reference counts. | Bounded value-prefix lookup scoped to a field. |

Use collision-free structured identities, not delimiter concatenation that can confuse path, type, dimension, or source keys. Source identities distinguish entity kind and stable record/version identity where applicable. Physical index spelling and schema-version allocation are implementation details; the required access paths and update invariants are fixed here.

Index scalar string and boolean categories for suggestions, not every numeric measurement and not inferred array elements. Preserve categorical value spelling; camelCase normalization applies to field names, not values such as shoe names. Typeahead returns original labels as helpful context alongside canonical names, types, and units. It must not silently choose the first observed type or unit as a permanent schema.

Availability spans retained saved data, not the current query range. Removing the last supporting record removes the discovered variant/category; a null-only path may remain known without any observed typed value. Catalog-reference counts do not dictate analytics grain or deduplication: event and summary representations must still follow the contribution-selection ticket.

### Incremental write contract

1. Extract the incoming record's canonical descriptor/contribution set using the same normalization and type/dimension rules that querying uses. Retain unresolved and conflicting source evidence; semantic query ambiguity must not silently destroy archival data.
2. Load only that source record's previous contribution set and the affected catalog/category rows. Compare old versus new contributions; an identical upsert makes no count change.
3. Commit the source record mutation, source-reference replacement, and affected catalog/category deltas atomically in one IndexedDB transaction. A successful save must not leave a new field undiscoverable. Failed persistence must not leave a phantom catalog field.
4. Apply the inverse for deletions and cascading cleanup; remove rows whose support reaches zero. Units, aliases, and categories must disappear when their final support disappears, not become ever-growing historical sets.
5. Apply the same contract to imports, event upserts, summary replacement, note/workout/segment/effort changes, and deletions. A source change need not rewrite every inheriting record merely to maintain catalog availability: reference explicit source declarations and resolve precedence through relationships.
6. Notify interested consumers after commit. Typeahead uses catalog indexes with a bounded result count; it never scans event/result history. Pagination or narrower prefixes reveal further suggestions rather than silently claiming the returned page is the whole vocabulary.

Avoid both unconditional increment-on-save and append-only catalogs: either makes re-saving or deleting data inaccurate. Supporting membership records are what make changes reversible without a history scan. An index-local provenance lookup is permitted; reading all historical workouts to answer field discovery is not.

### Initial population and recovery

An initial migration/backfill reads retained source data once to build the catalog and its source references. Rebuilds are explicit migration/repair work, not a fallback on each query or typeahead open. A persisted version/completion marker distinguishes an incomplete population from a genuinely empty catalog. Re-running population must be idempotent through stable source identities; do not double-increment support.

The lifecycle ticket owns physical schema version, source enumeration, transaction/batching strategy, concurrent writes during backfill, and crash/restart behavior. It must preserve the save and availability invariants above. The performance ticket owns measured budgets and cross-tab invalidation, not a different discovery mechanism.

## Current-source entry points

These are source-grounded integration locations, not claims that the new contract exists:

| Responsibility | Current source and consequence |
|---|---|
| Custom property construction | [PropertyMetric](../../../../packages/lang/src/runtime/compiler/metrics/PropertyMetric.ts) retains `key` and scalar `value`. [Semantic classifier](../../../../packages/lang/src/parser/semantic-classifier.ts), property/metric-object branches, constructs it. Carry canonical paths/kinds through this boundary rather than replacing them with display labels. |
| Analytics projection | [Derivation](../../../../packages/wql/src/derivation.ts), `projectEventToFacts`, currently projects numeric values and resolves keys from metadata, labels, and type. Preserve typed canonical identity and provenance instead of losing custom keys; do not make numeric-only fact projection the catalog's complete discovery view. |
| Filtering/grouping | [QueryService](../../../../packages/wql/src/QueryService.ts), `factTagValue`/`dimValue`, uses fixed fields. Replace that limitation with discovered contextual fields while preserving existing filters and missingness semantics. |
| Typeahead | [WQL language support](../../../../packages/wql/src/language.ts), `WqlCompletionOptions`/`wqlCompletionSource`, currently injects effort names and uses static metric/tag vocabularies. Add a catalog-backed provider at this seam; the query package must not directly open browser IndexedDB. |
| Schema and mutation ownership | [IndexedDBService](../../../../apps/playground/src/services/db/IndexedDBService.ts), `WodWikiDB`, upgrade handling, save methods, `appendEvents`, `finalizeSummaries`, `deleteEvents`, and cascades. Existing `tags`/`note_tags` and `setNoteTags` demonstrate indexed catalog/reference and multi-store transaction patterns to reuse, not a new persistence framework. |
| Unit identity/conversion | [UnitRegistry](../../../../packages/lang/src/metrics/units/UnitRegistry.ts) defines canonical units/dimensions/aliases. [WQL units](../../../../packages/wql/src/units.ts) currently exposes mass/distance families; [analytics preference](../../../../packages/ui/src/widgets/useAnalyticsUnitPreference.tsx) exposes kg/lb. The arithmetic ticket must reconcile the full required dimensions/defaults/conversion seam rather than assume the current mass preference handles every dimension. |

Keep pure field identity/extraction separate from browser persistence. Inject catalog lookup into language/query consumers following their existing injection seams. Exact exported interfaces and all caller migrations belong in the implementation handoff after dependent contracts settle.

## Acceptance scenarios for implementation tickets

1. Saving `heart_rate` immediately makes `heartRate` discoverable. Equivalent camel/Pascal/space spellings match; original spellings remain explainable.
2. Nested and flat dotted forms of `sleep.score` yield one identity. Conflicting numeric aliases within the same source/scope reject the affected calculation; equivalent duplicate aliases do not double a contribution.
3. Numeric and text `score` appear as separate variants. A numeric calculation selects only numeric observations; text contributes neither zeros nor average observations.
4. Compatible kg/lb and m/km values convert before arithmetic. A changed default does not change previously saved physical quantities. Unrelated dimensions are not summed together accidentally.
5. A segment override wins over workout, note, and effort defaults. Omitting it inherits; explicit null clears. Type selection does not resurrect a cleared or overridden default.
6. Unknown field references remain valid. Missing observations are not confused with explicit zero or arithmetic errors.
7. Arrays remain collections without automatic sample expansion. A numeric note property is discoverable metadata, not a fabricated workout measurement.
8. Save, identical re-save, edit, deletion, and re-finalization maintain exact field/category availability. Deleting one of two supporting records retains the suggestion; deleting the final support removes it.
9. Field and categorical-value typeahead reads only catalog stores/indexes, including for fields last observed outside the selected time range. It does not enumerate events/results to discover vocabulary.
10. A failed transaction changes neither source nor catalog state. An interrupted backfill is identified as incomplete and can resume/rebuild without duplicate support or lost concurrent updates under the lifecycle contract.

## Ownership of remaining decisions

No new decision ticket is needed for an already-owned question:

- [Automatic grain selection and contribution ownership](../issues/02-automatic-grain-and-contributions.md): selection/deduplication of observations using typed field identity; catalog counts are not analytics weights.
- [Time buckets, group keys, and alignment boundaries](../issues/03-time-buckets-and-group-keys.md): missing-group representation and bucket domain, not unknown-field rejection.
- [Missing values, units, and numerical correctness](../issues/04-missing-values-units-and-arithmetic.md): complete dimension/default/conversion coverage and operation-specific compatibility/absence rules.
- [Query documents and shared-key formulas](../issues/05-query-documents-and-formulas.md) and [Cross-workout tables and aggregate drill-down](../issues/06-analytical-tables-and-drilldown.md): typed-selector and explicit collection-operation syntax plus catalog-backed editing.
- [Projection lifecycle and existing-data migration](../issues/08-projection-lifecycle-and-migration.md): backfill, live versus historical metadata, source ownership, and transactional cutover.
- [Invalidation, query reuse, and performance budgets](../issues/09-invalidation-and-query-performance.md): catalog change signals, bounded lookup budgets, and cache correctness.
