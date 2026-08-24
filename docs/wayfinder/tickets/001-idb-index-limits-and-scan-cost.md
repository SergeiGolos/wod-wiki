---
state: open→closed 2026-08-24
labels: [wayfinder:research]
title: "IndexedDB index limits and scan-cost evidence"
assignee: serge   # claimed 2026-08-24 — work happening in engine worktree ~/projects/wod-wiki-engine-event-store (branch event-store)
blocked-by: []
---

## Question

Two deliverables in one markdown summary asset, feeding the record-shape
decision (ticket 002) and the final verdict:

1. **Constraints**: what IndexedDB can and cannot index on a stored record —
   keyPath must reference top-level (or statically pathable) fields; no
   indexes into arrays like `metrics[]`; compound index semantics for
   threshold ranges (`by-value` precedent, `IndexedDBService.ts:120`). Confirm
   against the current schema (`IndexedDBService.ts:105-122`) and IDB spec.
2. **Measurement**: at personal-journal scale (synthetic ~5k results × ~30
   events), compare per-widget-render cost of
   - today's path: `getAllFromIndex('analytics','by-metric',…)` +
     `by-timestamp` intersection,
   - unified-scan path: fetch result blobs, parse JSON, filter events in JS.

Method note: real-IDB timing needs a browser context — measure via the
playground dev server or a scripted page, not unit-test fake storage; document
the harness chosen and its limits. Verdict criterion to report: is the scan
path within, say, 2× of indexed latency for a dashboard-sized query set?

## Resolution

Answer: [001-idb-index-limits-and-scan-cost.md](../assets/001-idb-index-limits-and-scan-cost.md)

One-line answer: nested log fields are structurally unindexable, but at
personal-journal scale that no longer matters — the scan-based unified model
(fetch result-shaped blobs, filter in JS) measured **0.35× the latency of
today's indexed dual model** for the dashboard query family at both 2k and 5k
workouts, because IndexedDB cost tracks records materialized and blobs are
~55× fewer records than fact rows. Design constraints carried into ticket 002:
promote only timestamp/identity to record top level; do not reintroduce a
per-metric projection; specify keep-last dedupe semantics explicitly
(raw-event folding double-counts repeated efforts by ~15%).
