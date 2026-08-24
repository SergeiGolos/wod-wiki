---
state: closed 2026-08-24
labels: [wayfinder:grilling]
title: "Migration and backfill story"
assignee: serge # claimed 2026-08-24
blocked-by: ["002-unified-event-record-shape"]
---

## Question

Design the V15 migration from today's dual stores into the unified event table.

1. Mapping: existing `analytics` rows (summary + segment + rollup grains) and
   results' embedded logs → unified records; which source wins per class.
2. Legacy keys: rows whose canonical key was name-derived during cutover —
   re-resolve or carry forward?
3. Rollup grain rows (ACWR/monotony/strain): regenerate via the rollup driver,
   or map directly?
4. Idempotency & failure: replay-safe reruns, orphan/partial-save results,
   fallback when derivation fails (V12 precedent: keep stored data, renormalize).
5. Compat window: how long the old store lingers for rollback.

## Resolution

Spec: [004-migration-and-backfill-story.md](../assets/004-migration-and-backfill-story.md)

One-line answer: it's V16 (V15 taken by #893) — re-derive, never copy:
logs → event rows 1:1, summaries via normalizeSummaryFacts for every result
with logs (presence = finalize, V12 doctrine), segment/rollup rows and
legacy name-derived keys dropped (re-resolved by current code), analytics
store deleted outright, no dual-write window (rollback rides the V10 replay
doctrine; results store untouched), atomic versionchange tx + deterministic
ids give replay safety for free.
