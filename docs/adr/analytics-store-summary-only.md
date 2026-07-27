# Analytics Store is Summary-Only; Tier 2 Stays in `data.logs`

**Status**: accepted — 2026-07-16  
**Supersedes**: the `data.analytics` property proposal in [`../analytics-data-shapes-and-composition.md`](../analytics-data-shapes-and-composition.md) §2

The `analytics` store holds **summary facts only** — Tier 2 workout-level aggregates (`totalVolume`, `tis`, `sessionLoad`, …), one row per `result × Canonical Metric Key`. Per-segment data (Tier 0 + Tier 1) is **not** denormalized into the store; it stays in `WorkoutResult.data.logs`. Tier 2 summary statements also stay in `data.logs`, discriminated by `outputType: 'analytics'` — no separate `data.analytics` property is added to `WorkoutResults`.

## Why

The store exists for cross-workout search ("find similar workouts") and aggregate comparison graphing — workout-level questions. Per-segment cross-workout detail is out of scope for the indexed store; queries needing it load `data.logs`. Keeping Tier 2 in `data.logs` (rather than a separate property) reuses the `outputType` discrimination consumers already filter on, so the split adds no type change and no new filtering tax.

## Considered options

- **A (chosen) — summary-only store; Tier 2 in `data.logs` by `outputType`.** One source array on the record; store is its summary projection.
- **B (rejected) — both grains in the store (segment + summary).** Rejected: per-segment data belongs on the result, not denormalized into the query table.
- **C (rejected) — add `data.analytics` property, store fed from it.** Rejected (supersedes shapes doc §2): the `outputType` filter already discriminates Tier 2, so a separate property is unnecessary surface.

## Consequences

- **Inverts the current write path.** `normalizeAnalyticsSegments` today flattens *per-segment* metrics into the store. It is replaced by a summary-fact normalizer that reads the `outputType: 'analytics'` statements out of `data.logs` and emits one fact per `(result × canonical metric key)`. Existing per-segment rows are flushed (no reader consumes them today).
- **The unified derivation module produces `data.logs`** (Tier 0+1+2 mixed, as today); the store write is an extraction/projection of it. Replay refreshes `data.logs`, then re-extracts summary facts.
- **No schema change to `WorkoutResults`** — Tier 2 stays where it is. The change is to the `analytics` store shape and its write path.
- **`effortSlug` / `discipline` on summary facts** are workout-level (dominant effort / set of disciplines), not per-segment. The `by-effort` index from shapes doc §4.2 is re-evaluated: summary facts are not effort-scoped the way segment facts would be.
