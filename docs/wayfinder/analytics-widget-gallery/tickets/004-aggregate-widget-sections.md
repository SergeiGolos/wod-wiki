---
state: open
labels: [wayfinder:task]
title: "Aggregate widget sections — all 8 types, live"
blocked-by: ["002-fixture-extension", "003-gallery-architecture-and-coverage-manifest"]
---

## Question

Build the aggregate-query half of the merged gallery per the locked
manifest ([003 asset](../assets/003-gallery-architecture-and-coverage-manifest.md)):

1. Auto-inference section: queries rendered purely via `useChartShape`
   (scalar → QueryValue, multi-point → WqlTimeseries, else WqlBars),
   demonstrating what WQL determines without a declared type.
2. Eight curated sections — table, value, timeseries, bar, toplist,
   stacked-bar, goal-rings, zone-distribution — each card a live
   declared type, per the manifest's aggregator/rollup assignments.
   Units axis (ticket 008): cards carry optional `preferredUnit`; the
   manifest's `sum:totalVolume{}` pair (default lb / preferredUnit kg)
   rides in the Value section.
3. Rollup variety visible across sections: unrolled group-bys, `.rollup(1d)`,
   `.rollup(1w)` all represented.
4. Every card shows its query string and journal provenance (existing
   ExampleCard pattern), so the data-source → WQL → render round trip is
   legible on the page.

Acceptance: each manifest row for the aggregate family renders in
Storybook with real corpus data; no hand-built `QueryResult` fixtures
remain in these sections.
