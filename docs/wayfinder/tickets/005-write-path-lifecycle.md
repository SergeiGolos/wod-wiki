---
state: closed 2026-08-24
labels: [wayfinder:grilling]
title: "Write-path lifecycle"
assignee: serge # claimed 2026-08-24
blocked-by: ["002-unified-event-record-shape"]
---

## Question

Who writes event records, when, and how dedupe survives?

1. Timing: events written live per segment/statement during a running workout,
   or batched at finalize alongside summaries? (Summaries are fixed:
   finalize-only.)
2. Finalize emission: AnalyticsEngine run/finalize double-emission and the
   keep-last signature cache (`dogfood-round3-fixes.md` N9) — replaced or kept?
3. Wellness facts (`captureWellnessFacts`) and eager rollup recompute (#877):
   how they land in the unified stream.
4. Failure semantics: partial saves, orphan results (V12's orphan-result
   precedent), store-write failures being non-load-bearing.

## Resolution

Spec: [005-write-path-lifecycle.md](../assets/005-write-path-lifecycle.md)

One-line answer: two write patterns — workout (per-statement event streaming,
result row born at start with `status:'in-progress'`, summaries once at
finalize) and wellness (user-authored grain:'summary' rows reconciled on note
save via new `deleteEvents` op). Grain = fold-ness, origin = authorship;
finalize-ownership narrows to engine-authored summaries. N9 cache deleted;
logs stay canonical (event store = derived projection, non-load-bearing);
calc.* read-time (#877 deleted); GC sweeps in-progress rows after 30 days.
Map complete — all five tickets resolved.
