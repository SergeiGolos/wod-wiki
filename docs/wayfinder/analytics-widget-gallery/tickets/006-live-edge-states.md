---
state: closed
labels: [wayfinder:task]
title: "Live edge states — empty, error, loading"
blocked-by: ["003-gallery-architecture-and-coverage-manifest"]
---

## Question

Edge states are produced through the round trip, never from static
fixtures (charting decision). Build the edge-states section:

1. **Empty**: a well-formed query whose filters match nothing
   (e.g. `sum:totalVolume{effort:nonexistent}`) → `WqlEmptyState` via
   the normal widget path. Confirm the `stages` telemetry reads honestly
   (selected 0).
2. **Error**: malformed WQL fed through `parseQuery` → the error card /
   `useChartShape` error branch. Which queries error at parse vs at run?
3. **Loading**: what does a card show while the async query is in flight
   — is there a designed loading state or does the section demonstrate
   the natural suspense gap?
4. Empty/error per family: does rows/find get its own empty-state card?

Acceptance: edge section renders in Storybook with all states produced
live; no `emptyResult`-style static fixtures survive anywhere in the file.
