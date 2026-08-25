---
state: open
labels: [wayfinder:task]
title: "Fix workloadRollup dual bucketing"
blocked-by: []
---

## Question

`workloadRollup.ts` (app, `src/services/analytics/rollup/`) carries two
day-bucketing truths feeding wellness ACWR / monotony / strain summaries:
`dayBucket()` buckets by **local** calendar date while `dailySessionLoads()`
buckets by epoch-UTC (`Math.floor(ts / DAY)`) — and the file header claims
UTC. Found during the post-integration review (graduated fog).

Pick one truth — QueryService's `day` dimension uses epoch-UTC — align both
functions on it, and pin with a cross-timezone test that fails when run under
a non-UTC timezone.
