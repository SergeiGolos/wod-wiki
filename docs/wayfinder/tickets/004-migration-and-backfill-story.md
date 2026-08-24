---
labels: [wayfinder:grilling]
title: "Migration and backfill story"
assignee:
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
