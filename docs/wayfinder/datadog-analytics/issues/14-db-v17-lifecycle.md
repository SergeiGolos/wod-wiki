# DB v17 projection schema, provenance, backfill, and atomic mutations

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 11, 12, 13
Prerequisites: [Projection lifecycle and existing-data migration contract](../assets/lifecycle-migration-contract.md); [Field discovery and catalog contract](../assets/field-discovery-contract.md); [Automatic grain selection and contribution ownership contract](../assets/automatic-grain-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

One schema upgrade (`DB_VERSION` 16 → 17 in [`IndexedDBService.ts`](../../../../apps/playground/src/services/db/IndexedDBService.ts)) allocates the Field Catalog stores and provenance-rich event projection; every saved record acquires metric dates, representation kinds, summary coverage, and reducer statistics — freshly written or backfilled — with atomic source+projection commits and honest recovery limits for legacy data.

## Scope

1. **Schema (versionchange transaction):**
   - `field_catalog` (keyPath `id`; index on normalized `path`), `field_sources` (keyPath `id`), `field_values` (keyPath `['fieldId','value']`; field-scoped prefix index) per the [lifecycle contract](../assets/lifecycle-migration-contract.md) §1.2.
   - `events`: new `by-metricDate` index so candidate selection stays complete when a metric's own date differs from the row timestamp (time contract requirement — a timestamp-only fetch must not miss rows).
2. **Provenance-rich projection** ([`derivation.ts`](../../../../packages/wql/src/derivation.ts) writers):
   - `representationKind: 'direct' | 'calculated' | 'substitute_summary'` on every event row; per-metric `metricDate` from ticket 12; `summaryCoverage` (workout/effort/partition scope descriptors) and `reducerStats` (retained normalized sum + true observed count, extrema, endpoint evidence as available) on substitute summaries written by `toSummaryEventRows`/`foldSummaryOutputs`; directly recorded summary-grain values (e.g. user HRV) marked `direct`, never fabricated coverage.
   - effective units written with measurements at extraction using ticket 13's system defaults; existing persisted values are never reinterpreted.
   - `appendEvents` (put-upsert) and `finalizeSummaries` keep deterministic ids so re-finalization replaces representations (no appended duplicates).
3. **Backfill:** batched re-derivation of `events` + initial catalog population from `results`/`notes` (existing patterns: `backfillV16`, integration-test precedent `backfillV16.integration.test.ts`), with a persisted progress/completion marker; resume after interruption without double-incrementing catalog reference counts (compare each source's prior `field_sources` contribution before applying deltas); concurrent-save safety per the field-discovery write contract.
4. **Atomic mutations:** result/note save, delete, and cascade paths ([`IndexedDBNotePersistence.mutateNote`](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts), `appendEvents`/`finalizeSummaries`/`deleteEvents`, wellness reconcile, effort saves) commit source row + event rows + catalog/source/value deltas in a single IndexedDB transaction; reference counts decrement on removal and rows prune at zero (fields, units, categories).
5. **Recovery limits (no invention):** legacy Tier-2 averages without retained counts are marked insufficient-evidence, never assigned synthetic counts; date-only records keep civil dates; anything not recoverable from `results.data.logs`/`notes` stays a reported limitation.
6. **Physical-plan gates** (from the [persistence deepening review](../deepening/07-transactional-storage.md) §7 — resolve inside this ticket before schema/population work; a resolution that would change agreed behavior graduates a decision ticket instead of being buried here):
   - key-safe encoding for boolean categories (booleans are not valid IndexedDB keys; `false` must stay distinct from the string `"false"`) and collision-safe, reversible descriptors for alias/unit/category support — no colon-delimited composite keys, no single field-level `refCount`;
   - per-Metric date candidate strategy: a scalar event index cannot represent one date per Metric in a `Metrics` array — select the complete-fetch strategy, keep civil dates distinct from instants, retain summary temporal coverage, and never manufacture midnight instants;
   - durable progress/revision evidence for backfill resume (a `localStorage` marker is a UI hint, not transactional proof); the `versionchange` upgrade and resumable post-open backfill remain distinct lifecycles — an interrupted versionchange is never described as a committed halfway upgrade;
   - concurrent backfill versus live saves: source revisions are rechecked inside each batch commit so an old snapshot never overwrites a newer save;
   - full mutation inventory for the atomic commits in scope 4: results, notes, effort definitions, retained segment versions, wellness edits, imports, note tags, deletion cascades, streaming writes, and stale in-progress-result sweeps;
   - identity/lineage types live in `packages/core` beside [`UnifiedEventRecord`](../../../../packages/core/src/types/storage.ts) so `lang`, `wql`, and the app adapter share them without new package edges;
   - contextual conversion evidence (e.g. recorded body mass for `bw`) persisted with the measurement and versioned per [decision ticket 21](21-unit-catalog-home.md); existing persisted values are never reinterpreted.
   - semantic observation identity (`observationRef`) allocation and re-finalization policy: when re-derivation legitimately changes content, decide preserve-versus-version of the observation reference (replacement versus genuinely new observation) — selection dedupe (16) consumes this decision, so it is made here, not assumed ([metric derivation deepening](../deepening/03-metric-derivation.md) §3);
   - `derivationVersion` stamp allocation and invalidation mechanics so a future reducer change can invalidate stale summaries ([metric derivation deepening](../deepening/03-metric-derivation.md) §7).
   - source truth: notes stay editable and re-derivation explicitly replaces analyzed logs — preserve physical Metric meaning and retained archival evidence, and never invent a literal immutable `notes.body` store field ([persistence deepening](../deepening/07-transactional-storage.md) §7).

## Clean cutover

- After V17, the legacy playground derivation copies in `workoutDerivation.ts` (V12/V13 backfill writers, incl. the dead `grain:'rollup'` `LegacyFactRow`) are retired as soon as the minimum upgradable on-disk version no longer executes those steps; until then they stay quarantined to the upgrade path (annotated by ticket 11).
- `events`/`field_catalog`/`field_sources`/`field_values` are disposable: provide one explicit rebuild entry point (repair/migration tooling), never a per-query fallback.
- Characterization tests over today's `finalizeSummaries`, cascade-delete, and GC ownership behavior land before any reorganization; V17 schema/population work starts only after the scope-6 gates are resolved.

## Acceptance scenarios

1. Fresh install on V17 and upgrade from V16 both yield identical projections for the same logs (backfill equivalence), with the completion marker set only after the final batch.
2. Interrupting the backfill mid-way and reopening resumes without duplicate reference counts or lost fields; the catalog is flagged initializing until complete.
3. A failed mutation transaction leaves source row, events, and catalog exactly as before (no phantom fields, no orphan events).
4. Save → identical re-save → edit → delete cycles leave field/category availability exactly right: deleting one of two supporting records keeps the field; deleting the last removes it.
5. A legacy summary lacking counts queries as insufficient evidence under ticket 16, never as an invented observation count; date-only wellness events keep civil dates in `metricDate`.
6. Re-finalizing an updated workout replaces its summary rows and coverage in place; stale coverage never survives beside its replacement.
