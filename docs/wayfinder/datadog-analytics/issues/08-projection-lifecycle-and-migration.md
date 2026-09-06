# Projection lifecycle and existing-data migration

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02, 03, 04
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md); [Time buckets, group keys, and alignment boundaries](03-time-buckets-and-group-keys.md); [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md)

## Question

How do existing and newly collected records acquire the agreed field and contribution semantics without losing archival information or producing stale analytics?

Resolve:
- What can be recovered from existing authoritative logs, including custom property keys and linked metadata, and what genuinely absent historical information cannot be reconstructed.
- Projection/schema versioning, re-derivation or backfill, idempotent finalization, and atomicity boundaries; distinguish raw source data from disposable projections.
- Persist and migrate the semantic observation identity, representation kind, summary coverage, reducer statistics, and source/derivation revisions required by [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md). Distinguish copied calculated outputs, directly recorded summary-row values, and substitute summaries. Preserve idempotent replacement; recover lineage from real source evidence rather than inventing counts for old averages.
- Apply the reducer evidence and validity requirements in [Missing values, units, and numerical correctness](../assets/arithmetic-contract.md): observed/eligible counts, unrounded sums/extrema, endpoint dates and ambiguity, and sufficient temporal partitions for rolling windows. Preserve recoverable unit/scale and contextual conversion evidence; never reinterpret historical values using today's default units or body mass. Missing archival evidence remains a limitation, not a synthetic zero.
- Implementable temporal storage/selection design from [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md): preserve per-metric occurrence instants versus civil dates, remove workout-start overrides, and stop synthesizing midnight instants for date-only wellness data. Choose complete indexed candidate selection when a metric date differs from its containing row timestamp. Recover legacy dates only from real evidence; account for rollup membership and summary time coverage.
- Implementable catalog-migration design: allocate the schema version and physical stores/indexes required by [Field discovery and catalog contract](../assets/field-discovery-contract.md); enumerate every saved-source mutation/cascade/import path. Specify initial population, completion/version markers, interrupted backfill and concurrent-save behavior, reversible membership counts, and atomic source/catalog commits. Separate catalog availability references from analytics contribution ownership.
- How edits and deletions to results, notes, efforts, and metadata affect queries. Decide live metadata versus historical snapshots where needed, building on the provenance contract.
- Existing-session compatibility and treatment of in-progress workouts; avoid unapproved dual-write stores or compatibility shims.
- Ownership and clean-cutover prerequisites across core, lang, wql, persistence, and consumers. This is a migration plan, not migration execution.

Resolution must state lifecycle transitions, recovery limits, and migration acceptance examples with verified source seams. It must provide the change signals needed by the performance and invalidation ticket.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Authoritative logs and disposable projection rebuilds — agreed during grilling

- `results.data.logs` remains the permanent, authoritative source of truth. The `events` store and `field_catalog` tables are disposable projections.
- On database schema upgrade (to `DB_VERSION = 17`), `events` and catalog stores are backfilled by scanning `results` and `notes` once in an idempotent batch.
- Recoverable information (custom properties, segment metrics, effort tags, and note tags) is extracted cleanly into the projection.
- Genuinely absent historical information is preserved as an explicit limitation: no invented sample counts for legacy averages without counts, and no fabricated midnight instants for date-only wellness records.

### Live contextual metadata and atomic catalog mutations — agreed during grilling

Historical queries resolve contextual metadata (note tags and effort disciplines) dynamically against their live values, ensuring edits to tags or efforts immediately reclassify past workouts. Physical measurements (values, units, and occurrence dates) remain permanently frozen. Saving or deleting workouts and notes updates source records, event projections, and catalog reference counts atomically in a single IndexedDB transaction, pruning unused fields and categories when their reference count drops to zero.

## Answer

Resolved through live grilling with Serge. The authoritative [Projection lifecycle and existing-data migration contract](../assets/lifecycle-migration-contract.md) establishes:

- Upgrade to `DB_VERSION = 17` allocating `field_catalog`, `field_sources`, and `field_values` stores, plus enhanced event projection fields (`metricDate`, `representationKind`, `summaryCoverage`).
- Authoritative logs (`results.data.logs`) as permanent truth; projections and catalog stores are disposable and re-derivable.
- Idempotent batched backfill with progress markers preventing double-incremented reference counts on interrupted upgrades.
- Preserved recovery limits: no invented sample counts for legacy summaries lacking counts; date-only wellness records preserve civil dates.
- Live contextual metadata resolution combined with frozen physical measurements.
- Atomic mutation transactions with automatic cascading catalog pruning when reference counts reach zero.

No production code was modified.
