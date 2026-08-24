---
labels: [wayfinder:grilling]
title: "Write-path lifecycle"
assignee:
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
