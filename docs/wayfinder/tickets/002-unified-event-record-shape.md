---
state: closed 2026-08-24
labels: [wayfinder:grilling]
title: "Unified event-record shape"
assignee: serge # claimed 2026-08-24
blocked-by: ["001-idb-index-limits-and-scan-cost"]
---

## Question

Define THE single stored record for all workout data — the shape that replaces
both `StoredOutputStatement`-in-logs and `AnalyticsDataPoint`-in-analytics.

Must resolve:

1. Wide vs narrow: one row per event carrying columns for each unique metric
   family (user's stated model: "a table of events with columns for unique
   metric values"), or one row per metric value (today's segment grain)?
2. Identity & idempotency: row key rules replacing keep-last dedupe
   (`metricKey + sorted group tags`, live-vs-finalize double emission).
3. Top-level indexed fields: what gets promoted out of `metrics[]` so IDB can
   index it (`metricKey`, `effortSlug`, `timestamp`, …) — informed by ticket
   001's keyPath findings.
4. Summary records: how finalize-written summaries are marked derived and
   discriminated from raw events (outputType? grain-like field?).
5. `outputType` vocabulary: closed set now, user-extensible later?

Fixed constraint: summaries are saved at finalize (map Notes).

## Resolution

Spec: [002-unified-event-record-shape.md](../assets/002-unified-event-record-shape.md)

One-line answer: THE unified record is an event-grain statement row —
`metrics` stays a typed array (no per-metric columns), timestamp / resultId /
grain / outputType / effortSlug promoted top-level under five indexes;
live emissions never touch the store (finalize-owns-summaries, one atomic tx,
deterministic summary keys); `grain: 'event' | 'summary'` discriminates
derived rows, rollups are never stored; outputType stays an open string with
a known-values vocabulary module. All five decisions grilled and recorded
with accepted tradeoffs.
