# Session Results as WQL — Research Summary (ticket #942)

**Question:** can the Analytics Store + WQL express the per-session results table (one `resultId`) and the widened block view (one Block Content Id) as a ` ```query:table ` block today — and what are the exact query shapes and gaps?

**Verdict:** *Filtering and aggregation yes; the ReviewGrid-style wide table no.* The `result` and `block` filter keys already exist on every fact row, so session-scoped and block-widened **aggregate** queries work today with zero code changes. The **per-segment wide table** (one row per round/statement, many metric columns — what `ReviewGrid` renders) is **not expressible**: WQL aggregates one metric per query, and the fact store drops per-statement attribution at write time. Closing that gap needs a small "rows" plane; the recommended shape re-derives from raw logs through an existing seam — no schema migration, no backfill.

---

## 1. What already works (verified in code)

### Filter keys for both scopes exist on fact rows

`factTagValue` (`src/services/analytics/query/QueryService.ts:281-294`) maps WQL filter keys onto fact-row fields:

| WQL key | Fact field | Notes |
|---|---|---|
| `result` | `resultId` | **session scope** |
| `block` | `blockContentId` | **widened scope** (Block Content Id) |
| `grain` | `grain` | `summary` / `segment` / `rollup` |
| `effort` | `effortSlug` | rides segment-fact metadata (#904) |
| `discipline` | `discipline` | canonical 10-value vocabulary |
| `metric` | `metricKey` | |
| `origin`, `tags` | `origin`, note_tags | |

Grouping dims (`dimValue`, QueryService.ts:323-334): `day`, `week`, **`session` (= resultId)**, plus any tag key — multi-dim `by {a,b}` is supported (one time dim + tag dims).

### Canonical query shapes

**Session-scoped (written into the note's `query:table` block; work today, segment grain):**

```text
sum:rep{result:<resultId>,grain:segment} by {effort}          → per-effort reps
max:resistance{result:<resultId>,grain:segment} by {effort}   → top load per effort
sum:distance{result:<resultId>,grain:segment} by {effort}     → per-effort distance
sum:elapsed{result:<resultId>,grain:segment}                  → total elapsed
last:session-rpe{result:<resultId>,grain:segment}             → captured RPE (MetricType.SessionRPE = 'session-rpe', numeric → becomes a fact)
```

**Widened — all versions of the same block (Block Content Id; work today):**

```text
sum:totalVolume{block:<blockContentId>} by {session}                          → per-run volume across versions
sum:rep{block:<blockContentId>,grain:segment} by {session}                    → per-run reps
max:resistance{block:<blockContentId>,grain:segment,effort:back-squat} by {session}  → per-run top load for one lift
```

`by {session}` buckets rows per `resultId`, so the widened view is naturally a per-run comparison — the "WQL summaries" the map asks for.

### Segment-grain facts are complete and backfilled

- Write path: `IndexedDBNotePersistence` → `normalizeAllMetrics` (`src/services/analytics/workoutDerivation.ts:276`) emits one segment-grain row per **numeric** metric per output statement, tagged with `effortSlug` / `discipline` / `intensityTier` from metric metadata.
- **Pre-V13 results are covered**: the V13 store migration (`src/services/db/IndexedDBService.ts:472-515`) re-derives every stored result's logs through `normalizeAllMetrics` on upgrade. No backfill gap.
- `captureSessionRpe` → `rederiveResultAnalytics` rewrites a result's facts, so RPE edits flow into WQL results automatically.

### Explorer hosting works

`/dashboard?q=<wql>` hydrates and runs **both** WQL families in `AnalyticsExplorerPage` (find queries → the Library Entry stream; analytics queries → charts/tables, including a table shape). The composer is metrics-plane visually, but its clause parser is a *salvage* parser — unknown filters (`result:`, `block:`) round-trip verbatim and the raw text is always editable. **The retired review routes can redirect to `/dashboard?q=…` today** for any aggregate query.

## 2. The gap — the wide per-segment table is not expressible

`ReviewGrid`'s default preset shows, per output statement (round/segment): `#`, `timeSpan` (timestamp + elapsed + duration), `descriptor` (effort + text), `rep`, `distance`, `resistance`, `action`, `increment`, `metric`, `calculated`, `custom`, `volume`, `intensity`, `load`, `work` (`cdlColumnDefinitions.tsx:792-860`). Four properties of WQL/the store block this:

1. **One metric per query.** The WQL head is `agg:metric` — a single Canonical Metric Key. There is no multi-metric or wildcard head, and no row plane (`find:` returns notes/blocks/efforts, not metric rows).
2. **Aggregate-only output.** `QueryResult` is series × bucketed points (SELECT → BUCKET → GROUP → AGGREGATE). `WqlTable` renders exactly that (scalar / one-row-per-series / timeseries pivot, 12-row cap). Raw rows never reach a widget.
3. **Per-statement attribution is dropped at write time.** Every segment-grain row of a result carries the *result's* `segmentId` and a single shared `workoutTimestamp` (`IndexedDBNotePersistence.ts:182-194` always sets it). Round/statement identity and ordering exist only in `WorkoutResult.data.logs` — even a new `by {round}` dim couldn't group facts.
4. **Non-numeric metrics never become facts.** Effort *names* reach facts only as `effortSlug` metadata on numeric metrics; a row with only an Effort + Rep is representable, but statement text/round structure is not.

## 3. Options for closing it (decision belongs to a follow-up ticket)

- **A — Rows from facts (store-borne).** Add per-statement identity (round/seq) to segment facts at write time + a `rows:` WQL source; table pivots. Uniform, but needs a fact-schema change and a V14-style re-derivation pass.
- **B — Rows from logs (recommended).** A `rows:` WQL source re-derives from `WorkoutResult.data.logs` through the **existing `ResultLogStore` seam** (`QueryService.ts:166-172`) — the same "logs win" bypass the cross-store joins already use (`runJoined`, #800). No fact-schema change, no migration, automatically covers every historical result, and stays consistent with the glossary ("logs win; the store is disposable"). The pivot target already exists: `queryResultToGridRows` (`gridAdapter.ts`) flattens query results into ReviewGrid-shaped `GridRow`s, and the CDL column machinery (`ColumnSet` + presets) renders them — a rows result can carry richer rows through the same path.
- **C — Aggregate-only session views.** Write several `query:table` blocks per session (volume by effort, top load by effort, …). Zero new machinery; loses per-round detail permanently.

**Recommendation: B.** It is the only option that preserves full per-round fidelity without a schema migration, and it reuses two existing seams (`ResultLogStore`, CDL grid adapter) rather than adding a third results pipeline.

## 4. Consequences for the map

- The **redirect target** for retired review routes works today: `/dashboard?q=<aggregate WQL>`; a `rows:` plane would add one renderer branch beside the existing find/analytics branches.
- The **query written to the note on completion** depends on the plane decision: under B it is a single `rows:{result:<id>}` block; under C it is 2–3 aggregate blocks. This unblocks tickets #943 (interactions), #944 (write-on-completion), #946 (routes) once decided.
- **RPE-in-table needs no query work**: `session-rpe` is already a segment-grain fact; the table's edit affordance writes via `captureSessionRpe` and rederivation refreshes facts.
