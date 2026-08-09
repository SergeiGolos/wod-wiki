# Rows Query Plane — Session Results Table Re-Derives from Logs

**Status**: accepted — 2026-08-09 (locked under [#949](https://github.com/SergeiGolos/wod-wiki/issues/949))
**Parent map**: [#941](https://github.com/SergeiGolos/wod-wiki/issues/941); builds on [#942](https://github.com/SergeiGolos/wod-wiki/issues/942) (research: `docs/research/wayfinder/942-session-results-as-wql.md`)

The session results table is backed by a third WQL family — the **Rows Query**, `rows:{<tag filters>}` — returning raw output-statement rows re-derived from `WorkoutResult.data.logs` through the existing `ResultLogStore` seam, rather than from Analytics Store facts. Aggregate WQL (`agg:metric{…}`, `find:target{…}`) is unchanged and continues to serve cross-workout analytics.

## Why

The results table (`ReviewGrid`'s wide per-round view) is not expressible in aggregate WQL (#942): one metric per query, aggregate-only `QueryResult`, and per-statement attribution (round identity, ordering) is dropped at fact-write time — every segment-grain row of a result shares one `segmentId` and one `workoutTimestamp`. Full per-round fidelity exists only in `WorkoutResult.data.logs`, which the glossary already declares authoritative ("logs win; the store is disposable and re-derivable").

## Considered options

- **B (chosen) — rows from logs.** A `rows:` source re-derives from logs via the `ResultLogStore` seam — the same store-bypass the cross-store joins use (#800). No fact-schema change, no migration, covers every historical result automatically. Pivot rides the CDL grid machinery (`queryResultToGridRows` / `ColumnSet` precedent).
- **A (rejected) — rows from facts.** Add per-statement identity to segment-grain facts at write time, then a `rows:` source over the store. Uniform query path, but forces a fact-schema change and a V14-style re-derivation of every stored result to backfill identity the store never recorded.
- **C (rejected) — aggregate-only.** 2–3 `query:table` aggregate blocks per session (volume by effort, top load by effort). Zero new machinery; abandons per-round detail permanently — the core of the results experience.

## The locked shapes

```text
rows:{result:<resultId>}            ← written to the note on completion (```query:table)
rows:{block:<blockContentId>}       ← widen toggle target (all versions of the block)
rows:{note:<noteId>}                ← bare /note/:id/review redirect target
rows:segment{…}                     ← optional output-type narrowing (target = outputType)
```

- Filter set: `result:`, `block:`, `note:` (logs carry all three per result; `note:` was added so the bare review route has a redirect target).
- Routing consequences: `/note/:noteId/review/:sectionId/:resultId` → `/dashboard?q=rows:{result:…}`; the section URL → `rows:{block:…}`; the bare review URL → `rows:{note:…}` (#946).
- The explorer gains a rows renderer branch beside its find/analytics branches; the table widget pivots rows through the CDL column machinery.
- Aggregate session queries (`sum:rep{result:X,grain:segment} by {effort}` etc.) remain valid and useful — they are complements, not the results table.
