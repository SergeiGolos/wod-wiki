# Cross-Note Result Aggregation by Block Content Id

**Status**: Accepted — 2026-06-28
**Extends**: `versioned-block-identity.md`

## Context

A workout cloned from a **Collection** (or re-run on different days) produces
results scattered across many notes. Today every read path joins results by
`noteId` (within one note) or filters by `blockContentId` in-memory *after* a
per-note fetch — there is no way to ask "all my results for this workout,
everywhere." Compounding this, result identity
(`noteId + blockId + blockContentId + version`) is assembled in five write
sites with five different shapes, so the join keys are not even consistently
present (one write stamps no `blockContentId` at all).

## Decision

Make **Block Content Id** the cross-note result key, and concentrate the
identity policy at a single write seam. Two query modes, cleanly separated:

- **Cross-note (Collection / progress):** join by `blockContentId`, across all
  notes. **No `version` filter** — `contentId` already captures "same workout,
  unedited" because editing changes the hash. The only edge case (content
  cycle hashA→hashB→hashA) is still the *same workout*, so it belongs in the
  set.
- **Within-note (journal history):** join by `noteId + blockId + version` — the
  per-clone history from `versioned-block-identity.md`.

One pure identity policy stamps all four keys on every write, so both indexes
are trustworthy.

### Resolved branches

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Cross-note key is `blockContentId`, **not** `blockId` | clones share content → same hash; `blockId` is positional (per ADR) |
| 2 | Add `by-content` index on `results` (+ `by-block`) | enables the cross-note query without a full scan |
| 3 | Add `by-content` on `analytics` (stamp `blockContentId`) | cross-workout derived-metric trends, same key |
| 4 | No provenance / source-collection field | "same workout everywhere" is the goal; add later only if disambiguation is needed |
| 5 | Cross-note query ignores `version` | `contentId` captures content identity; `version` is positional only |
| 6 | One identity policy at one write seam | kills the 5-shape inconsistency; guarantees the keys the indexes rely on |
| 7 | Defer Note UUID+slug identity refactor | separable; rewrites note keys; its own initiative (see Open) |

### Considered options

- **Frontmatter-UUID migration now** (make every note UUID-keyed). Rejected for
  scope: `usePlaygroundContent` seeds journal notes on open, so the write seam
  unifies without it. The UUID-vs-route-id `noteId` inconsistency is real but
  separate (see Consequences).
- **Provenance field (`sourceSlug`).** Rejected: the Collection page wants *all*
  runs of a workout, not runs-from-one-source. Add only if disambiguation is
  later needed.
- **Two write adapters (Resilient + Atomic).** Rejected: seed-on-open closes the
  note-existence gap that motivated the second path, so one write path suffices
  (pending the adapter sub-tree in Open).

## Consequences

- **+** One query (`getResultsByContentId`) powers Collection progress; one
  identity policy feeds both indexes.
- **+** Schema change is **additive** (a V6 set of `createIndex` calls) — no data
  lost. Runtime results (`results`) and derived analytics (`analytics`) are both
  preserved and now cross-queryable.
- **−** Existing `analytics` rows predate `blockContentId` → one-shot backfill
  (analytics.`resultId` → result.`blockContentId` → stamp).
- **−** The UUID-vs-route-id `noteId` inconsistency persists until the deferred
  Note-identity refactor. Benign today (note-id spaces are isolated per kind);
  must be resolved before results are ever queried across note *kinds*.
- **−** Two dead indexes surfaced during design (`results.by-segment` →
  nonexistent `segmentId`; `analytics.by-type` → field is `type`, not
  `metricType`). Fix or drop during the V6 migration.
- **−** **Current-state gap (verified):** the workbench result-write path
  (`IndexedDBNotePersistence.mutateNote` → `contentProvider.updateEntry(patch)`
  → `IndexedDBContentProvider.patch`) forwards only `blockContentId + resultId +
  data` and **drops `blockId` and `version`** — so workbench/canvas results are
  persisted without them, breaking this ADR's within-note query and the
  `versioned-block-identity` data model on the main completion path. The
  `JournalPage` / `WalClockPage` Recorder path is unaffected (writes the full
  shape). Implementation must widen the `NotePatch` type and the patch
  result-builder to carry all four keys.

## Relationship to `versioned-block-identity.md`

That ADR scoped *journal* display to `blockId + version` (per-clone history,
deliberately avoiding cross-clone conflation). This ADR adds the *cross-note*
query on `blockContentId`. The two joins coexist on the same rows; neither
re-litigates the other.

## Write seam & adapters (resolved 2026-06-28)

The two `INotePersistence` adapters are a **real seam, kept**:
`IndexedDBNotePersistence` (full — content + analytics-trend rows + attachments,
on IndexedDB) vs `ContentProviderNotePersistence` (provider-delegated for
localStorage / static / mock backends, no analytics). The backend genuinely
varies, so two adapters justify the seam — they are **not** unified.

**Identity-policy placement — option A (chosen):** a deepened **Result Recorder**
sits *above* the adapters and owns `resolveResultIdentity` (stamps
`noteId + blockId + blockContentId + version`). It resolves the full identity
from the intent, then calls
`notePersistence.mutateNote(noteRef, { workoutResult: fullyShaped, rawContent?, analytics? })`.
The workbench stops calling `mutateNote` directly and routes through the Recorder
— the same write-seam collapse the rest of this ADR implies. The patch path
(see Consequences) must carry all four keys to storage. `CONTEXT.md`'s "Result
Recorder is the single seam" becomes literally true.

## Note UUID+slug identity (resolved)

Resolved by `note-identity-uuid-canonical.md` (2026-06-28): `Note.id` becomes
UUID-canonical, the slug is routing sugar, and `JournalPage` migrates onto the
`WorkbenchSessionStore`. That closes the `noteId` route-id/UUID inconsistency
this ADR flagged as benign-while-isolated — `noteId` is now uniformly a UUID, so
cross-note joins need no route-id special case.
