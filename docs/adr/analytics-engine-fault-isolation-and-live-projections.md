# Analytics Engine Fault Isolation and Live Summary Projections

**Status**: accepted — 2026-07-27  

`AnalyticsEngine` coordinates realtime enrichment (`IRealtimeProcessor`) and summary processors (`ISummaryProcessor`) over segment outputs during live workout execution and replay.

## Decision

1. **Fault Isolation for Processors**: Processors execute inside `try/catch` blocks logging errors via `console.error` rather than aborting execution.
   *Rationale*: Live analytics are non-fatal enrichment feedback. A failure in one processor (e.g. an unhandled edge case in a custom metric derivation) must not abort the workout execution turn, crash the live timer, or drop output statements from `data.logs`.

2. **Live Summary Projections**: Live summary projections accumulate segment outputs into `outputHistory` per session and re-evaluate summary processors on each segment arrival.
   *Rationale*: For single workout sessions ($N < 20$ segments), the $O(N)$ re-evaluation per segment yielding $O(N^2)$ total operations across the entire session is within acceptable bounds ($<1\text{ms}$ total CPU time) while keeping live session totals reactive without maintaining complex incremental aggregation state.
