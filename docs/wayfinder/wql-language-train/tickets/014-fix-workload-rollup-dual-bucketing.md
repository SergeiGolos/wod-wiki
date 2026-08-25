---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "Fix workloadRollup dual bucketing"
blocked-by: []
---

## Resolution

Implemented on app main (commit `34c26872`).

One-line answer: single truth = **LOCAL training days**, not the ticket's
stated epoch-UTC — grounding showed engine QueryService groups `day` by
`localDateString` and journal/wellness semantics are local. `dayBucket` now
returns a civil-day ordinal (`Math.round(Date.UTC(y,m,d)/DAY)`, injective per
civil date in every timezone — fixes a latent 23h-DST-day collapse in UTC±0
zones that predated this ticket); `wellnessEventsForNote` stamps facts at
component-built local midnight instead of `day * DAY` (which slipped a local
day outside UTC). Tests: TZ-proof component fixtures, dual-timezone
child-process locality probes, Europe/London spring-forward collapse leg;
suites pass under UTC / NY / Tokyo / London / Kiritimati; full app suite
2420/2420. Two review rounds: standards found the false `day*DAY`
round-trip claim + London collapse; spec re-verify caught a dropped `now`
fallback (would have silently disabled wellness capture) before commit.

## Question

`workloadRollup.ts` (app, `src/services/analytics/rollup/`) carries two
day-bucketing truths feeding wellness ACWR / monotony / strain summaries:
`dayBucket()` buckets by **local** calendar date while `dailySessionLoads()`
buckets by epoch-UTC (`Math.floor(ts / DAY)`) — and the file header claims
UTC. Found during the post-integration review (graduated fog).

Pick one truth — QueryService's `day` dimension uses epoch-UTC — align both
functions on it, and pin with a cross-timezone test that fails when run under
a non-UTC timezone.
