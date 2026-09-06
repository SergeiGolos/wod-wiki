# Invalidation, query reuse, and performance verification

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 14, 19
Prerequisites: [Invalidation, query reuse, and performance budgets contract](../assets/invalidation-performance-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Multi-widget dashboards share one store scan per distinct resolved range, results are cached under deterministic structural keys, mutations invalidate across tabs via generation counting and `BroadcastChannel`, and the contract's budgets are measured and recorded — no silent record-dropping to hit targets.

## Scope

1. **Scan coalescing** (in `QueryDocumentRunner`, ticket 19's module): an in-flight map of resolved-range fetch promises (`getEventsByTimeRange`) so widgets sharing an identical resolved range in one document run issue exactly one store call; ranges differ → separate scans; coalescing never merges semantically different queries beyond the shared raw fetch.
2. **Cache equivalence:** `QueryCacheKey` = normalized AST (via `serialize.ts` canonical form), resolved range instants, effective timezone, captured evaluation instant, store `generationId`, active system default units (13) — plus temporal kind/bucket semantics and persisted normalization intent where they affect results (12/17). Cached values keep full precision and lineage (never rounded chart values); formula results track input dependencies so an input's regeneration invalidates dependents.
3. **Invalidation signals:** commits to `results`, `notes`, `efforts`, and the catalog (14's atomic mutation paths) increment an in-memory `generationId` and post `ANALYTICS_MUTATION` on `BroadcastChannel('wodwiki.analytics')`; other tabs drop affected cache entries; catalog commits also invalidate typeahead providers (15's notification seam).
4. **Races:** each execution samples `generationId` at start and completion; a result computed across a mutation is discarded, never written over fresher data; user-visible refresh states distinguish stale-then-updated from unchanged.
5. **Bounded access:** table paging via indexed cursor with limit/offset (18); aggregation always runs over the full eligible dataset; explicit limits never reduce the matched population silently.
6. **Verification (reproducible benchmarks, committed as tests + recorded numbers in this ticket's Answer-notes):**
   - 12 aggregate queries sharing one range in a document run → exactly one `getEventsByTimeRange` call (instrumented store).
   - Typeahead prefix lookup over a 500-entry catalog < 16 ms with zero `events`/`results` store contact.
   - 50-row tabular page < 50 ms at the contract's scale fixture (500–1 000 workouts, 5 000–10 000 segments).
   - 12-widget dashboard < 250 ms total query execution on the same fixture.
   - A mutation during a long-running query discards the in-flight result; a save in tab A invalidates tab B's dashboard.
   - Aggregation outputs are identical whether served from cache or freshly computed (population, precision, lineage).

## Clean cutover

- No full-page refresh invalidation, no polling of IndexedDB, and no unkeyed memoization remain on the query paths this ticket touches.

## Acceptance scenarios

From the [invalidation contract](../assets/invalidation-performance-contract.md) §5 and roadmap Phase 6:

1. Scan-coalescing benchmark passes with call count exactly 1 for 12 shared-range widgets (Phase 6 acceptance).
2. Changing the system unit default or the timezone invalidates previously cached results by key; re-execution reflects the new context.
3. Saving a workout bumps `generationId`, broadcasts, and the open dashboard refetches affected widgets without a manual reload.
4. Two tabs editing tags concurrently leave both tabs' caches consistent with the committed store state (no stale classification survives a received mutation).
5. A `last 12w` formula with a persisted `(normalize 1w)` reuses cache across reloads of the same document under identical context, and recomputes when the document's normalization intent changes.
6. Budget numbers are recorded against the scale fixture; any miss is treated as a defect to fix or an explicit renegotiation with the user — never by dropping input records.
