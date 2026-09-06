# Deepening the Freshness Module: committed data, visible results

Status: **Proposed architecture; not implemented or an approved amendment.**

Related work: [ticket 20 — invalidation and performance](../issues/20-invalidation-and-performance.md), [ticket 19 — shared query execution](../issues/19-shared-query-execution.md) (scope item 5: rollup driver wiring), [invalidation-performance contract](../assets/invalidation-performance-contract.md) §§3–4 (cache keys, generation counter, BroadcastChannel, race rules), [shared-execution contract](../assets/shared-execution-contract.md) §1.2 (rollup prerequisite check).

Read alongside [transactional storage](07-transactional-storage.md) — that Module owns the commit; this Module owns what happens after it — and [query presentation](05-query-presentation.md).

## 1. What improves

The useful change is not moving retry loops around. It is separating three concerns that current code conflates: **read-your-writes** (a query must see what its own tab just committed), **reuse** (concurrent widgets must share one scan and one cache), and **visibility** (other tabs and later renders must learn that data changed).

Today a rows query retries four times against empty results ([QueryBlockView.tsx:104–126](../../../../packages/ui/src/blocks/QueryBlockView.tsx#L104)); a dashboard has no data-mutation refresh path at all — its effect dependencies contain no mutation signal ([DashboardView.tsx:193–194](../../../../packages/ui/src/widgets/DashboardView.tsx#L193)); and the rollup prerequisite warmer is accepted as a prop but never passed by any production caller (verified below). Freshness is currently either absent or approximated with timers.

- **Locality:** the discard/stale-visibility rule has one Implementation.
- **Leverage:** dashboards, note blocks, explorer, and editor previews all stop hand-rolling `cancelled` flags and refresh counters.
- **Deletion test:** deleting the Module forces every surface to re-implement generation sampling, cross-tab invalidation, and stale-result discard — and the rows retry hack returns the moment commit signals are gone.

## 2. Current code and seams

### The retry hack: empty legitimate data vs uncommitted data

**Current excerpt**, [QueryBlockView.tsx:104–126](../../../../packages/ui/src/blocks/QueryBlockView.tsx#L104):

```ts
      let retryTimer: number | NodeJS.Timeout | undefined;
      const executeRows = (attemptCount: number) => {
        void executor
          .runRows(parsed)
          .then((res) => {
            if (cancelled) return;
            setRowsResult(res);
            if (res.runs.length === 0 && attemptCount < 4) {
              const delays = [50, 150, 350, 750];
              retryTimer = setTimeout(() => {
                if (!cancelled) executeRows(attemptCount + 1);
              }, delays[attemptCount] ?? 500);
            }
          })
```

The loop's structure — retrying only the empty-result case, with escalating delays, immediately after surfaces that save results — reads as compensation for save→read lag within the same session. That motivation is an inference from the code's shape: no comment, ticket, or test names the incident it defends against, and it should not be cited as one. What the code unambiguously does is retry `runs.length === 0` up to four times, which cannot distinguish "the save has not committed" from "no rows legitimately match this filter" — both look identical to the caller. The fix direction is a **commit signal from storage** ([07](07-transactional-storage.md) §3), after which this loop is deleted, not relocated. **Moving retries into `QueryDocumentRunner` would not fix anything:** the runner can own reuse, visibility, and cancellation, but only the storage commit can own read-your-writes. A retried query inside the runner still reads uncommitted data if the commit has not landed; wrapping the same sleep in a shared module just centralizes the guessing.

### The save ordering retries are compensating for

**Abridged current excerpt** (intermediate setup omitted), [IndexedDBNotePersistence.ts:169–216](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts#L169):

```ts
    if (Object.values(patch).some(value => value !== undefined)) {
      await this.contentProvider.updateEntry(note.id, patch);
    }
    // … wellness reconcile …
    if (resultId && resultLogs?.length && this.storage.appendEvents && this.storage.finalizeSummaries) {
      try {
        await this.storage.appendEvents(toEventRows(resultLogs, identity));
        await this.storage.finalizeSummaries(resultId, toSummaryEventRows(resultLogs, identity));
      } catch (err) {
        console.warn(`[IndexedDBNotePersistence] event projection failed for result ${resultId}`, err);
      }
    }
```

Content save, event append, and summary finalize are three separate awaits; projection failure is a logged warning, not an abort. Each individual store method is atomic (e.g. `appendEvents` at [IndexedDBService.ts:1207–1215](../../../../apps/playground/src/services/db/IndexedDBService.ts#L1207)), but "all three visible together" is not guaranteed, which is exactly why the rows widget polls. The commit Module in [07](07-transactional-storage.md) makes the mutation coherent; freshness makes coherence *observable* to queries.

### The query seam is real and stays

**Abridged current excerpt** (other store methods omitted), [queryService.ts:30–39](../../../../apps/playground/src/services/queryService.ts#L30):

```ts
export const indexedDbEventStore: UnifiedEventStore = {
  getEventsByTimeRange: (start, end) => indexedDBService.getEventsByTimeRange(start, end),
  // …
  appendEvents: (rows) => indexedDBService.appendEvents(rows),
  finalizeSummaries: (resultId, rows) => indexedDBService.finalizeSummaries(resultId, rows),
  deleteEvents: (ids) => indexedDBService.deleteEvents(ids),
};
```

`UnifiedEventStore` ([stores.ts:17–37](../../../../packages/wql/src/stores.ts#L17)) is a genuine Seam with production and in-memory uses — the freshness Module subscribes to commits published from the persistence side of this Seam; it does not wrap the store in another Adapter.

### No data-mutation invalidation exists on dashboard surfaces

`DashboardView`'s effect re-runs on `[resolvedKey, resolved, executor, onEnsureRollupFacts, rangeStart, rangeEnd, preferredUnit]` — nothing fires when a workout saves. `DashboardViewPage`'s `refreshKey` ([DashboardViewPage.tsx:68–69](../../../../apps/playground/app/views/dashboards/DashboardViewPage.tsx#L68)) re-resolves the dashboard *document* after clone/edit write-back, not its query *data*. An in-repo race-handling precedent already exists for a different surface: [useCanvasRuntime.ts:39–56](../../../../apps/playground/app/hooks/useCanvasRuntime.ts#L39) samples `generation.current` at request start and discards responses from older requests.

## 3. Verified wiring facts (checked against source, not prior surveys)

- **`useAnalyticsQueries` has no production caller.** Its only non-source mentions are a `dashboard.test.tsx` describe title and a header comment in [homeAnalyticsData.ts:5–6](../../../../apps/playground/app/tour/homeAnalyticsData.ts#L5) claiming the showcase runs "via `useAnalyticsQueries`" — while [HomeAnalyticsSection.tsx:46–50](../../../../apps/playground/app/tour/HomeAnalyticsSection.tsx#L46) states the opposite ("Self-contained (not `useAnalyticsQueries`)"). The stale comment confirms the hook was bypassed, not that it owns anything.
- **The actual owner of the production rollup-sniffing logic is `DashboardView`'s inline effect** ([DashboardView.tsx:167–170](../../../../packages/ui/src/widgets/DashboardView.tsx#L167)) — `runnable.some((r) => r.query.includes('calc.'))` — duplicated in the orphaned hook. Any freshness/rollup wiring must land in the runner both call sites delegate to (ticket 19), not in the hook.
- **`onEnsureRollupFacts` is never passed by a production caller** (verified across `apps/`, `stories/`, `packages/` outside tests).
- **`computeWorkloadRollups` is genuinely orphaned today** — exported from [workloadRollup.ts:56](../../../../apps/playground/src/services/analytics/rollup/workloadRollup.ts#L56) and re-exported by the rollup index, with no non-test consumer. Ticket 19's plan to wire it through `onEnsureRollupFacts` is plausible; this doc does not re-approve it, and notes the freshness constraints it must satisfy (§5).
- **No `ANALYTICS_MUTATION` BroadcastChannel exists yet**; the only BroadcastChannel uses in the repo are the cast/RPC stack — a different domain. Cross-tab invalidation is contract-only.

## 4. Proposed Interface and caller change

**Proposed sketch — names and types below do not exist.**

```ts
// Published by the storage commit Module (07) after the transaction completes.
interface MutationCommit {
  readonly generation: number;                 // bumped once per committed mutation
  readonly sources: readonly ('results' | 'notes' | 'efforts' | 'field_catalog')[];
  readonly tabId: string;                      // suppress own-echo only, never for invalidation logic
}

// Run identity is scoped PER CONSUMER (one scope per document run), never tab-global:
// the 12 widgets of one dashboard run share a scope and must not cancel each other.
interface RunCheckpoint {
  readonly scope: string;
  readonly runId: number;                      // latest-request identity within this scope only
  readonly generationAtStart: number;
}

interface Freshness {
  /** Current committed generation; sampled at execution start and completion. */
  generation(): number;
  /** Cross-tab commit feed; receipt advances the local epoch (§6), even at equal counters. */
  subscribe(listener: (commit: MutationCommit) => void): () => void;
  /** Begin a run in a consumer scope; supersedes only that scope's previous checkpoint. */
  beginRun(scope: string): RunCheckpoint;
  /** True only while this checkpoint is still its scope's latest AND the generation is unchanged. */
  isCurrent(checkpoint: RunCheckpoint): boolean;
  /** Keep run identity; capture post-warmup generation only if not superseded. */
  afterPrerequisites(checkpoint: RunCheckpoint): RunCheckpoint | undefined;
}
```

**Proposed runner sketch:**

```ts
const request = freshness.beginRun(consumerId); // allocate order when requested, before async warmup
await ensureRequiredRollups(document);         // any resulting writes finish before the generation snapshot
const checkpoint = freshness.afterPrerequisites(request);
if (!checkpoint) return { kind: 'discarded-stale' }; // a newer request may have won during warmup
const result = await executeDocument(document); // coalesced fetch plus dependent calculations
if (!freshness.isCurrent(checkpoint)) return { kind: 'discarded-stale' };
return result; // check at publication, not only immediately after the raw fetch
```

Two distinct identities, deliberately not merged: **`runId` orders in-flight executions within one consumer scope** (an old request finishing later must not overwrite a newer one's rendered state), while **`generation` orders committed mutations** (a result computed across a commit is discarded even if it is the newest request). Scoping matters: one tab-global "latest run" would let a single widget's re-range cancel the other eleven widgets of the same dashboard, so a new run supersedes only the previous checkpoint of its own scope. Conflating the identities breaks one case or the other: a pure request-ID scheme keeps a stale-result-after-save; a pure generation scheme cannot cancel a superseded run within the same generation.

## 5. Rollup prerequisite: commit before generation capture

The warmup is itself a mutation. The required ordering:

1. `consumesRollupFacts(parsed)` is true → invoke the rollup driver (`computeWorkloadRollups` wiring, ticket 19).
2. The rollup fact writes **commit as one mutation** and publish their `MutationCommit`.
3. The query run **samples its generation after that commit** — sampling before the warmup means the warmup's own generation bump would either discard the just-started run or, worse, the run reads pre-warmup rollup facts while believing itself current.

Do not write unchanged rollup values on every invalidation-triggered refresh: ensure must recognize an up-to-date prerequisite, or its own commit can cause an endless invalidate/ensure loop. Preserve a single shared evaluation instant; separate it from the post-prerequisite store generation snapshot.

Getting this from the orphaned `useAnalyticsQueries` hook is impossible — nothing passes `onEnsureRollupFacts`, so today a `calc.acwr` dashboard query can execute against stale or absent rollup facts with no signal at all.

## 6. Empty data, stale data, two tabs — the cases the design must name

- **Empty legitimate vs uncommitted.** An empty result becomes authoritative only when two conditions hold: the commit signal is the **coherent projection commit** from [07](07-transactional-storage.md) — source rows, event rows, and summary rows committed as one mutation, not a content-only save — **and** the read is issued after that commit has resolved, so read-your-writes holds. A commit signal by itself does not make empty authoritative: a signal fired after a content save but before its event projection lands would certify a lie. Once both conditions hold, `runs.length === 0` is authoritative and the QueryBlockView retry loop is deleted. Until then, retries remain as a labeled stopgap — removing them *before* the commit path lands converts a timing risk into a guaranteed stale-empty render.
- **Old request finishing later.** Two edits to a dashboard range in quick succession: run A (old range) resolves after run B. The `cancelled` flag handles the component case today; the runner needs the same rule at the data layer — a result is published only if its checkpoint is still latest **in its scope** **and** `generation` is unchanged since start. Both checks, not one; and "latest" never crosses scope boundaries, so sibling widgets are untouched.
- **Two tabs.** Tab A saves a workout, bumps `generationId`, posts `ANALYTICS_MUTATION` on `BroadcastChannel('wodwiki.analytics')` (contract §4.2). Tab B **receipt advances its local epoch** — it increments its own counter and invalidates — even when the received `generationId` equals its local counter. Equal numeric counters are expected after reloads (both tabs restart in-memory counters at the same baseline), so comparing counters and skipping on equality would silently drop real invalidations; receipt of the message is the event, and each receipt moves the local epoch forward regardless of the numbers. One nuance drives the own-commit rule: a `BroadcastChannel` object does not receive its own posted message, so the posting object's listeners never fire on its own commit — although a *different* `BroadcastChannel` object on the same channel in the same tab can. Relying on another listener object in-tab is fragile and incidental, so a tab invalidates locally on its own commit as well; correctness never depends on self-delivery.

## 7. Deletion test, Locality, Leverage

Deleting the Freshness Module forces every surface to rebuild: generation sampling, stale-result discard, cross-tab invalidation, and the commit subscription — and reintroduces the timer retries of §2 as the only recourse. Locality: the "when is a result safe to show?" rule has one Implementation. Leverage: dashboards, note blocks, explorer, and editor previews inherit identical freshness behavior from one Module instead of four ad-hoc `useEffect` loops.

## 8. Cutover and verification

1. Land the commit publication in the storage Module ([07](07-transactional-storage.md)) first. No freshness Module can work against uncommitted, unordered writes.
2. Introduce `Freshness` beside the future `QueryDocumentRunner` (ticket 19); have the runner sample generation and enforce `runId` latestness. Wire `DashboardView`'s inline effect and `QueryBlockView` through the runner rather than fixing each in place.
3. Add the BroadcastChannel feed; keep the rows retry loop until step 1 is live in production paths, then delete it in the same change that removes its reason for existing.
4. Only then wire the rollup driver (§5), with generation sampled after the warmup commit.

Behavioral acceptance examples:

- Save a workout in tab A with an open dashboard in tab B: tab B's widgets re-run and show the new result, with no reload and no counter-equality short-circuit.
- Save in tab A, then immediately re-range the dashboard in tab A: whichever response arrives, the rendered state matches the newest range over the newest generation — never the old range over the new data or vice versa.
- A `calc.acwr` widget executes only after the rollup warmup's commit is visible; sampling generation before warmup is asserted to discard.
- `rows:all{result:newId}` right after that result's save returns the run on the first attempt (no retries); an unmatched filter returns empty immediately and stays empty.
- Reload both tabs (generations equal at baseline), save in one: the other still invalidates — proving receipt, not counter comparison, drives invalidation.
- Kill event-row projection mid-save (injected failure): no commit is published, no invalidation fires, and previously cached results remain correct.

## 9. Tradeoffs and unresolved decisions

- **Generation model is agreed, not re-opened.** The contract fixes a single in-memory whole-store counter per tab (§4.1); this doc adds only the receipt-advances-local-epoch rule (§6) to make that agreed model correct across reloads and equal-counter states. Per-source generations, persisted counters, or any other granularity change would amend a resolved decision — none is a pending question here.
- **Scan completeness vs metric-date** (ticket 12 dependency): a range key is valid only if the scan that produced it covered the complete metric-date selection for every metric in the query; a cache key carrying `rangeStart/rangeEnd` instants does not by itself prove completeness. The freshness Module must not mark such a result current without that guarantee.
- **Transaction markers** (carried from [07](07-transactional-storage.md) §7): durable completion evidence for catalog/projection coherence; a `localStorage` marker is a UI hint, not an invalidation source.
- **Range key validity:** `last Nw` ends at the captured evaluation instant. The agreed cache key includes that instant, timezone, defaults, normalized document, and store generation; entries with differing semantics are not equivalent. The runner must share one captured context among coalesced widgets rather than weaken the key to force reuse.
- **Cost:** per-commit invalidation can re-run a 12-widget dashboard on every save; the contract's budgets (< 250 ms, single coalesced scan) are the agreed mitigation. No silent record-dropping to hit them.

These are inputs to tickets 19/20, not settled approvals; anything that changes contract §4 behavior graduates a decision ticket rather than being buried in implementation.
