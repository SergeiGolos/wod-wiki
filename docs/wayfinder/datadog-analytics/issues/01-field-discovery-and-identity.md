# Field discovery, identity, and metadata provenance

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none

## Question

What makes an automatically discovered field the same field across records, and how do linked metadata fields become safe query dimensions?

Resolve:
- Canonical custom keys versus labels and raw metric types, including the PropertyMetric key-loss defect in source sections 3.1 and 5 Phase 2.
- Supported JSON shapes: scalar values, nested paths, arrays, nulls, and absent properties; distinguish discoverable dimensions from numeric measures without redefining every numeric metadata property as a measurement.
- Discovery scope and catalog lifetime; inferred types and unit metadata; conflicts within a field and collisions between built-in fields, metric properties, and linked metadata.
- Metadata lookup and precedence across segment, workout, note, and effort; missing or multi-valued relationships; namespace/provenance visible to query authors. Do not duplicate contributions when metadata has multiple values.
- Query behavior for unknown fields versus fields known to the catalog but absent on some records. Address unsupported grouping dimensions from source section 3.5.
- Dedicated IndexedDB catalog tables and indexes for available metrics and typeahead; incremental maintenance when records introduce or remove fields; no full-history scan to serve discovery or typeahead. Specify initial population and consistency boundaries without implementing the migration.

Resolution must name the field contract, lookup/precedence rules, and consumer-observable examples, with verified source entry points for the eventual changes. It must not implement the catalog or select a new abstraction solely because the proposal names one.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Shared-name identity — agreed during grilling

The user's rule is **same name, same metric**, not separate identities by source. Built-in and discovered metrics with the same name share identity; source provenance remains available but does not namespace that identity. The previously agreed rejection of incompatible types or units still applies. Name normalization, nested-path naming, and precedence between overlapping values remain unresolved. This is a partial decision, not the ticket's resolution.

### Metadata defaults — agreed during grilling

For the same field on a note, workout, and segment, the most specific supplied value wins: segment overrides workout, which overrides note defaults. Inherited metadata does not create additional measurement contributions. Placement of effort metadata, explicit null behavior, and repeated values within the same scope remain unresolved.

### Nested property names — agreed during grilling

Use the full property path as a nested field's name: `sleep.score` and `recovery.score` are distinct; the same full path across workouts and sources denotes the same metric. Do not flatten to the final property name. Escaping literal dots and other path delimiters, name normalization, and arrays remain unresolved.

### Arrays — agreed during grilling

Preserve arrays as collections and handle them explicitly in queries. Discovery must not silently expand array elements into independent measurements or choose an aggregation for the user. Exact query operations and syntax belong to the downstream query/table contracts.

### Explicit null and omission — agreed during grilling

An omitted field inherits its applicable default. An explicitly supplied `null` clears the inherited value and remains missing; it does not fall back to a broader scope. Numeric missingness follows the map's agreed zero-fill and average rules without erasing the distinction from a recorded zero.

### CamelCase name matching — agreed during grilling

Normalize metric names with spaces and word separators such as underscores to lower camelCase for matching, rather than using exact case-sensitive source spellings. `heart rate`, `heart_rate`, and `heartRate` share the canonical name `heartRate`. Retain original spellings as provenance. Apply normalization within each full-path component without flattening the nested path; normalization does not infer semantic synonyms. Exact delimiter escaping and acronym edge cases must be specified before this ticket closes.

### Unknown field references — agreed during grilling

Do not reject a syntactically valid field reference merely because the field has not been discovered. Unknown fields yield no observed value and follow the agreed missing-value rules rather than a mandatory unknown-field diagnostic. This does not relax rejection of incompatible observed types or units, or turn a query reference into evidence that a field has been collected. Catalog discovery scope and retention remain to be settled.

### Effort defaults in metadata precedence — agreed during grilling

The full precedence order, lowest to highest, is effort-definition defaults → note → workout → segment. A higher-priority supplied value overrides lower-priority defaults; explicit `null` at the higher priority clears the inherited value. Reusable effort metadata does not override explicit recorded context.

### Persistent discovery catalog — required during grilling

The user approved discovery across saved history and the proposed lifecycle (last occurrence deleted means the field leaves discovery, while unknown-field queries remain valid), and required a tracked catalog in dedicated IndexedDB tables. Saving a metric absent from the catalog must update those tables. Discovery and typeahead read the catalog instead of scanning history. Edits, deletes, imports, initial population, and consistency need an explicit incremental-maintenance contract; no engine or database changes are being executed in this planning ticket.

### Catalog maintenance and categorical suggestions — agreed during grilling

Use catalog entries with indexed record-to-field references so availability can be updated incrementally for saves, edits, and deletions. Existing saved data needs an initial backfill; discovery/typeahead reads do not scan history. Typeahead includes normalized field names, observed types and units, and previously observed categorical values (for example, shoe names), but does not index every numeric measurement as a suggestion. Arrays remain explicitly handled; indexing must not turn their elements into implicit measurements.

### Conflicting normalized assignments — agreed during grilling

If different source properties in one record at the same scope normalize to the same canonical field but supply conflicting values, reject the affected calculation with an ambiguity diagnostic. Do not sum them or use property order as precedence. Separate records remain separate observations; the agreed scope-override rules still apply across effort, note, workout, and segment.

### Different value types distinguish metrics — agreed during grilling

The user refined the shared-name rule: numeric `score` and text `score` are different metrics, not one mixed-type metric. Identity therefore includes the normalized full property path and observed value type, while source provenance still does not create a separate identity. Catalog/typeahead must retain these typed variants separately. This supersedes treating cross-type variants as a field-wide conflict; conflicting assignments within the same typed identity at the same scope still reject. Unit compatibility and unqualified query selection among typed variants remain to be specified; this decision does not by itself split identities by unit.

### Operation-compatible metric variants — agreed during grilling

A calculation includes only metric variants whose value types it can accept. For example, `sum:score{}` selects numeric score and excludes the separate text-score metric; excluded variants are not synthesized numeric zeros or average observations. Select the variant automatically when the operation is unambiguous; require an explicit choice when multiple compatible variants remain ambiguous. Typeahead exposes the typed variants. This is variant selection, not permission to silently discard invalid values within a selected variant or suppress undefined arithmetic.

### Physical dimensions and convertible units — agreed during grilling

Numeric metric variants distinguish physical dimensions. Compatible units within a dimension (for example, kg/lb or m/km) represent the same typed metric identity and must be converted to compatible units before calculations. Time, distance, and load are not interchangeable merely because all values are numeric. The exact stored/display unit and handling of absent or unrecognized units must be explicit in the contract; do not infer a physical dimension from a field's name alone.

### Required units with system defaults — agreed during grilling

Physical metric types such as time, distance, and load require an effective unit. When a unit is not specified, use the system default for that metric type/dimension rather than treating the value as unitless. This supersedes the proposed unitless fallback for physical metrics; genuinely dimensionless numeric metrics remain distinct. Unit selection must use the metric's known physical type, not a previously encountered record's unit. Timing of default resolution and persistence of the effective unit remain to be settled.

### Effective units are always written — confirmed during grilling

The user confirms that units are always written for physical measurements. Resolve an omitted unit from the applicable system default before persistence and store the effective unit with the value. Later preference changes affect new defaults or display conversion, never reinterpret the physical meaning of saved numbers. The field catalog reads persisted unit information; it does not infer historical units from current display settings.

### Flat dotted and nested forms — agreed during grilling

Flat dotted keys and equivalent nested objects identify the same full path: `{"sleep.score": 85}` and `{sleep: {score: 85}}` both identify `sleep.score`. Dots are path separators. Conflicting same-scope assignments remain subject to the agreed typed-identity collision rule.

## Answer

Resolved through live grilling with Serge. The authoritative result is the [Field discovery and catalog contract](../assets/field-discovery-contract.md), including normalized typed identities, metadata precedence/provenance, persisted units, explicit collection handling, and the incrementally maintained IndexedDB catalog for field and categorical-value typeahead.

The discussion above is chronological: later choices supersede earlier proposals about exact-name matching, cross-type rejection, and missing units. The linked contract consolidates the final rules and records source entry points and observable acceptance scenarios. No production implementation was performed.

Remaining syntax, arithmetic, migration, and performance decisions already have owners in this map; their questions were updated rather than creating duplicate tickets. This resolution does not claim the entire analytics design is finished.
