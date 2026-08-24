---
state: closed 2026-08-24
labels: [wayfinder:grilling]
title: "Query service and WQL impact"
assignee: serge # claimed 2026-08-24
blocked-by: ["002-unified-event-record-shape"]
---

## Question

In a unified-store world, what happens to the query path?

1. Do `FactQueryStore` / `ResultLogStore` collapse into one store interface?
   What do `sum:` / `rows:` / `where` joins read?
2. Grain vocabulary (`summary | segment | rollup`) — retired, or re-expressed
   as record discrimination?
3. Does the join's freshness rule ("re-derive via normalizeSummaryFacts")
   become moot, trivially true, or still needed for rollups?
4. Interaction with the C1–C7 language plan in
   `docs/prototype/wql-interface-changes.md` — which changes get simpler or
   moot under one store?

## Resolution

Spec: [003-query-service-and-wql-impact.md](../assets/003-query-service-and-wql-impact.md)

One-line answer: the five injected stores collapse to four — FactQueryStore +
ResultLogStore become one UnifiedEventStore (window/result/note/content reads
+ 005-owned write contract), content plane unchanged; 002 amended to promote
noteId + blockContentId with a `['blockContentId','grain']` join index (six
indexes); SELECT becomes window-first hybrid (by-timestamp when windowed,
scan when all-time, by-metric never); grain tags become `summary | event`
with `grain:rollup` retired in favor of the `.rollup` suffix; the join
freshness rule is moot (store always authoritative; shape-derivation survives
as view math); C4/C5 simplify, C6 trivially satisfied, C1/C2/C3/C7 unchanged.
