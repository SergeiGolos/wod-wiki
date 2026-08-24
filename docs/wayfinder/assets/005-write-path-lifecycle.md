# Ticket 005 — Write-path lifecycle (decided spec)

**Status**: decided 2026-08-24 · grilling session · **final ticket — map complete**

## The two write patterns

### 1. Workout path — per-statement streaming + finalize

```
workout start
  saveResult({ id, status: 'in-progress', … })     // result row born HERE
each statement emission (OutputEmitter.add)
  events.appendEvents([row])                        // per-statement flush
completion
  saveResult({ …, status: 'completed' })            // LOAD-BEARING write
  events.finalizeSummaries(resultId, normalizeSummaryFacts(logs))
```

- **Flush unit**: per statement. Cost accepted: ~30–60 IDB txs per workout,
  bursty. An implementation MAY coalesce statements emitted within the same
  tick into one transaction — observable semantics identical (IDB commits are
  async anyway).
- **Result birth**: at workout start, with a new optional
  `WorkoutResult.status: 'in-progress' | 'completed'` field (absent =
  `'completed'` for legacy rows). Events have identity from flush one.
- **Crash**: partial event rows under an in-progress row — the V12
  partial-save shape, now first-class and queryable. Summaries absent.
- **No current reader** for mid-run rows until crash-resume exists — accepted
  at decision time.

### 2. Wellness path — note-save reconciliation

```ts
// ```wellness fence entries, on every note save:
await events.appendEvents([{
  id: `wellness:${noteId}:${key}`,       // deterministic, upsert
  resultId: `wellness:${noteId}`,        // synthetic
  grain: 'summary',                      // decided: today's shape
  origin: 'user',
  outputType: 'wellness',                // new value, open vocabulary
  timestamp: dayStart,
  metrics: [{ type: key, value, origin: 'user' }],
}]);
await events.deleteEvents(removedIds);   // keys the block no longer carries
```

`calc.*` seeds: **read-time** derivations over wellness events (002's
standing rollup decision); `ensureStoreRollupFacts` and the #877 eager
recompute are deleted.

## Semantic refinement (from the wellness decision)

**grain answers "is this row a fold?"; origin answers "who authored it."**

- `finalize-owns-summaries` (002) narrows to **engine-authored** summaries.
- **User-authored** summaries (wellness, `origin:'user'`) are
  **reconcile-owned**: upserted/deleted on note save.
- Derived-ness / stale-ability = engine-authored summaries only.

## Interface amendment (003)

`UnifiedEventStore` gains **`deleteEvents(ids: string[])`** — serves wellness
reconciliation and GC.

## Decisions ledger

1. **Flush timing: per-statement stream** (not completion-burst, not
   throttled). Result row born at start with `status`.
2. **Wellness: grain:'summary', today's shape** — user-authored summaries,
   reconcile-owned; `outputType:'wellness'` added to the known-values module.
3. **N9 signature cache: deleted.** Summaries write once, at finalize,
   unconditionally — run/finalize double-emission into the store is
   structurally impossible; the cache would skip the only write.
4. **Logs stay canonical.** `results.data.logs` is the source of truth; the
   unified event store is the **derived queryable projection**; event writes
   are non-load-bearing. 002's "replaces StoredOutputStatement-in-logs" =
   replaces *as query surface*. 004's rollback doctrine depends on this.
5. **GC**: in-progress results older than 30 days swept (events + row).
6. **Failure semantics** (unchanged doctrine, now explicit):
   `saveResult` fails → workout lost (today's behavior; runner is
   memory-only). Event/finalize writes fail → logged, non-fatal; logs
   canonical; rows re-derivable (finalize retry or bulk re-derive).

## Lifecycle table

| Moment | Store writes |
|---|---|
| Workout start | results row (`status:'in-progress'`) |
| Each statement emission | `appendEvents` (same-tick coalescing allowed) |
| Completion | results row (`status:'completed'`) + `finalizeSummaries` |
| Note save (wellness changed) | `appendEvents` upserts + `deleteEvents` |
| Note save (any) | nothing for `calc.*` — read-time |
| Daily GC | sweep in-progress results > 30 days |
| Migration (V16, ticket 004) | same path in bulk |

## Map complete

All five tickets resolved. Suggested implementation sequencing: core record
type (002) → `UnifiedEventStore` + adapter (003/005 interface) → write path
(005) → V16 migration (004) → QueryService rewire (003) → WQL language pass
(C1–C7, `docs/prototype/wql-interface-changes.md`).
