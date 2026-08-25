---
state: open
labels: [wayfinder:task]
title: "Release the language train"
blocked-by: ["009-ast-only-structured-interface-c6"]
---

## Question

Publish from engine **main** — the store is already merged and consumed
(app on `^0.6.36`) — as the release carrying the seven language changes
with the C2 compatibility normalizer active:

1. Engine suite green (wql, core, lang, ui, engine packages).
2. Rebuild the full dist chain before publishing — core dist was stale on
   main (ticket 004 finding: `UnifiedEventRecord` missing from core dist
   broke wql's dts build until core was rebuilt).
3. `stamp-version.ts`; publish `@bitcobblers/*` packages (next minor).
4. Storybook smoke / e2e pass on the release candidate.

5. The ui package ships with 24 pre-existing test failures (RowsRun shape
   drift, byte-identical set before/after C5) — either fix on the train or
   record as a known-broken suite at publish time.
