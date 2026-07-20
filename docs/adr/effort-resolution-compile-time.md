# Effort Resolution is Compile-Time; Predictions are Pre-Run

**Status**: accepted — 2026-07-16  
**Interacts with**: [`effort-hints-pre-compile-resolution.md`](./effort-hints-pre-compile-resolution.md), [`versioned-block-identity.md`](./versioned-block-identity.md)

Effort resolution is a compile-time concern. The runtime `TwoPassEffortResolutionProcess` stops re-resolving and instead **carries** the compile-time resolution onto output statements, preserving its origin. `analyzed` becomes exclusively the runtime annotations (power, pace); the synthetic-effort fallback is renamed **prediction** (`analyzed-estimated` in code today) and is produced at compile-time. Predictions are frozen at recording time and never re-derived in replay.

## Considered options

- **A (chosen) — consolidate to compile-time.** The runtime effort processor carries the compile-time effort-data through instead of re-resolving. `origin: 'analyzed'` = power/pace only; the replay strip rule collapses to "strip `analyzed`."
- **B (rejected) — keep runtime re-resolution, preserve predictions in replay by skipping effort resolution.** Delivers "don't update predictions" without a timing refactor, but leaves a duplicate resolution and keeps `analyzed` overloaded (effort *and* power/pace).

Rejected B because it preserves the duplicate resolution and leaves `analyzed` ambiguous. Consolidating makes the origin vocabulary honest and removes the effort resolver from the replay path entirely.

## Consequences

- `applyEffortEnrichment` stamps `origin: 'prediction'` for synthetic effort, `origin: 'compiler'` for resolved (today it stamps `compiler` for both — `EffortEnrichmentPass.ts:111`).
- `TwoPassEffortResolutionProcess` is repurposed from re-resolving to carrying the compile-time effort-data onto output statements (preserving its `compiler`/`prediction` origin). It is no longer a derivation step.
- Summary processors (`TISProcessor`, `MetMinuteProjectionEngine`) consume effort-data off output statements unchanged — they now read the carried compile-time resolution rather than a runtime re-resolution.
- **Replay does not need the effort resolver** — effort-data is part of the stored record (Tier 0). This shrinks the replay context to `{ dialect, scriptMetricTypes, vo2max }`.
- Interacts with `effort-hints-pre-compile-resolution.md`, which treats effort-data timing as settled ("no timing requirement"); this decision sharpens it — effort-data origin now distinguishes resolved (`compiler`) from predicted (`prediction`).
