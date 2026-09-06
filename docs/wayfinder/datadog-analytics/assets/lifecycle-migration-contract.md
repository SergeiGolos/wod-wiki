# Projection lifecycle and existing-data migration

Status: resolved decision contract; planning only.

Owned by [Projection lifecycle and existing-data migration](../issues/08-projection-lifecycle-and-migration.md). Composes with [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), [Time buckets, group keys, and alignment](time-alignment-contract.md), [Missing values, units, and numerical correctness](arithmetic-contract.md), [Query documents and shared-key formulas](query-documents-contract.md), and [Cross-workout analytical tables and drill-down](analytical-tables-contract.md). This asset specifies required behavior; it is not production code.

## 1. Storage schema and store allocation

### 1.1 IndexedDB upgrade to `DB_VERSION = 17`

The application database `wodwiki-db` upgrades from version 16 to 17 to house the persistent Field Catalog and enhanced event projection records.

### 1.2 Catalog store schemas

Three dedicated object stores are allocated during the versionchange upgrade transaction:

1. **`field_catalog`** (`keyPath: 'id'`):
   - `id`: canonical structured identity (`path:kind:dimension`).
   - `path`: normalized dotted path.
   - `kind`: `'number' | 'string' | 'boolean' | 'array'`.
   - `dimension`: physical dimension string where applicable.
   - `units`: observed units and aliases.
   - `refCount`: number of saved source records referencing this field.
   - Index: `by-path-prefix` on `path`.
2. **`field_sources`** (`keyPath: 'id'`):
   - `id`: source record identity (`result:<id>` or `note:<id>`).
   - `fields`: list of referenced field identities.
   - `categories`: list of contributed `[fieldId, value]` pairs.
3. **`field_values`** (`keyPath: ['fieldId', 'value']`):
   - `fieldId`: reference to `field_catalog.id`.
   - `value`: distinct observed scalar categorical string or boolean.
   - `refCount`: number of source records referencing this value.
   - Index: `by-field-prefix` on `['fieldId', 'value']`.

### 1.3 Enhanced `events` store schema

The disposable `events` projection table updates to store:
- `metricDate`: individual occurrence instant or civil date string (`YYYY-MM-DD`), preventing workout-start overrides from misdating events.
- `representationKind`: `'direct' | 'calculated' | 'substitute_summary'`.
- `summaryCoverage`: exact scope/partition descriptor (e.g. `{ effortSlug: 'burpee', count: 12 }`) to support automatic grain selection.
- `reducerStats`: retained sum and count for substitute summaries.

## 2. Authoritative source of truth vs disposable projections

- **Authoritative permanent store:** `results.data.logs` and `notes.body` are immutable archival truth.
- **Disposable projections:** `events`, `field_catalog`, `field_sources`, and `field_values` are derived indexes. If corruption or schema divergence occurs, these tables can be dropped and rebuilt without data loss.

## 3. Idempotent backfill and migration

### 3.1 Migration process

On upgrade to `DB_VERSION = 17`:

1. Set migration progress marker: `localStorage.setItem('wodwiki.migration.v17', 'in_progress')`.
2. Scan existing `results` and `notes` in sequential batches (e.g. 50 records per transaction).
3. Project events and extract field/category references.
4. Write events, source references, and catalog entries atomically per batch.
5. On completion: set marker to `'complete'`.

### 3.2 Interruption and idempotency

- If the browser closes or the upgrade is interrupted, resuming migration re-processes records without double-incrementing reference counts because `field_sources` tracks prior contributions per record.
- Background migration failure logs an explicit warning and leaves catalog typeahead flagged as initializing.

## 4. Recovery limits and archival truth

- **Recoverable:**
  - Custom properties on output statements (`metadata.properties`).
  - Segment-level numeric and categorical metrics.
  - Workout-level tags and note tags.
  - Effort definitions and linked disciplines.
- **Genuinely absent:**
  - If a legacy Tier-2 summary logged an average without recording sample count, it is marked as having insufficient evidence for pooled averaging under the contribution contract. No fictitious counts are invented.
  - Date-only wellness entries preserve their recorded civil date; no midnight timestamps are fabricated.

## 5. Live metadata resolution vs frozen measurements

Queries resolve metadata dynamically:

- **Live contextual metadata:** editing a note's tags or updating an effort's discipline immediately reclassifies past workouts in WQL queries and table views.
- **Frozen physical measurements:** values, units, and timestamps recorded at the time of workout execution are permanently immutable.

## 6. Atomic mutations and cascading pruning

When a workout result or note is created, updated, or deleted:

1. The mutation applies to the primary store (`results` or `notes`).
2. Event rows in `events` are inserted or removed.
3. The previous `field_sources` entry is compared to new contributions:
   - Decrement reference counts for removed fields and categories.
   - Increment reference counts for new fields and categories.
   - If any `refCount` drops to 0, prune the row from `field_catalog` or `field_values`.
4. All updates commit atomically in a single IndexedDB transaction.
