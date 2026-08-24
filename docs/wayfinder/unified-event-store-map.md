---
labels: [wayfinder:map]
title: "Unified event store — combine the logs/facts data models"
---

# Wayfinder Map — Unified Event Store

## Destination

A recorded decision plus written spec for unifying workout data storage into a
single event-record table: the unified record shape, the index strategy that
keeps WQL queries fast, and the migration outline — implementable without
further design debate. Scope spans both repositories: the spec names every
`wod-wiki-engine` change (core types, lang analytics/emission, wql stores +
service, umbrella IR/CLI) and its tests, plus the app-side persistence/UI code
that consumes them.

## Notes

- Domain background: [`logs-vs-facts.md`](../prototype/logs-vs-facts.md) (why
  two materializations exist today), [`wql-interface-changes.md`](../prototype/wql-interface-changes.md)
  (the rows-model language direction this must compose with),
  [`09-wql-deep-dive.md`](../09-wql-deep-dive.md) §6.
- Skills: `/grilling`, `/domain-modeling` for HITL tickets. Output style: ADHD
  mode (lead with action, numbered steps, ≤5-item lists).
- Standing decision made at charting time: **summaries are saved at finalize**
  (events written during the workout; totalVolume/tis/ACWR computed once at
  workout end and stored, marked derived). Tickets treat this as fixed.
- Engine-repo footprint (verified): `AnalyticsDataPoint` is *defined* in the
  engine (`packages/core/src/types/storage.ts:143`) and threaded through
  `packages/wql`, the umbrella `ir.ts` frozen envelope, and the CLI; analytics
  emission lives in `packages/lang` (`AnalyticsEngine`, `OutputEmitter`). Any
  shape decision is an engine-library change with engine tests by default.
- Plan, don't do: every ticket resolves a decision; assets are linked, not pasted.

## Decisions so far

- [IndexedDB index limits and scan-cost evidence](assets/001-idb-index-limits-and-scan-cost.md) —
  scan-based unified model measured 0.35× the indexed path's latency at journal
  scale; nested fields unindexable but irrelevant at this record-count asymmetry;
  dedupe semantics flagged for the shape ticket.
- [Unified event-record shape](assets/002-unified-event-record-shape.md) —
  event-grain statement rows, finalize-owns-summaries (atomic tx, deterministic
  summary keys), five indexes on promoted scalars, grain 'event'|'summary' with
  unstored rollups, open outputType vocabulary with known-values module.
- [Query service and WQL impact](assets/003-query-service-and-wql-impact.md) —
  four-store seam (UnifiedEventStore + content plane), 002 amendment promotes
  noteId/blockContentId + join index (six total), window-first hybrid SELECT,
  grain tags `summary|event` (rollup tag retired), join freshness rule moot,
  C4/C5 simpler / C6 trivial / C1-C3,C7 unchanged.
- [Migration and backfill story](assets/004-migration-and-backfill-story.md) —
  V16 (renumbered; V15 taken): re-derive from logs (events 1:1, summaries via
  normalizeSummaryFacts, segment/rollup rows dropped, legacy keys re-resolved),
  analytics store deleted, no dual-write — rollback rides the V10 replay
  doctrine; atomic versionchange + deterministic ids = replay-safe.
- [Write-path lifecycle](assets/005-write-path-lifecycle.md) —
  two write patterns: workout (per-statement streaming, result born at start
  with status field, finalize-only engine summaries) and wellness (user-authored
  summaries, reconcile-owned on note save, deleteEvents op added); N9 cache
  deleted, logs canonical / event store = derived projection, calc.* read-time,
  30-day in-progress GC. **Map complete — 5/5 tickets resolved.**

## Not yet specified

- Public-type fallout: `AnalyticsDataPoint` is defined at
  `packages/core/src/types/storage.ts:143` and consumed across
  `packages/wql` (QueryService/stores/derivation), the umbrella's frozen IR
  envelope (`packages/engine/src/ir.ts`), the CLI's `factsFromExecutionLog`,
  and core/wql test fixtures — break assessment can't be scoped until the
  record shape exists.
- `outputType` extensibility: future user-definable types; emission site is
  `packages/lang/src/analytics/AnalyticsEngine.ts:120`, vocabulary in
  `packages/wql/src/vocabulary.ts` — governance unspecifiable until the shape
  fixes what a type is.
- Live/in-flight reads: emission contracts are engine-side
  (`OutputEmitter.setLiveOutputEmitter`, `AnalyticsEngine.run`/`finalize`);
  editor display is app-side. Split of responsibility unspecified until the
  shape exists.
- Dashboard `stages` telemetry semantics (selected/buckets/aggregated/groups):
  produced by `QueryService.buildResult` (`QueryService.ts:756`), consumed by
  `@bitcobblers/wod-wiki-ui` widgets — meaning under one store unspecified.

## Out of scope

- WQL surface-syntax changes (separate effort:
  [`../prototype/wql-interface-changes.md`](../prototype/wql-interface-changes.md)).
- Storage engines beyond IndexedDB.
- Sync/multi-device concerns.
