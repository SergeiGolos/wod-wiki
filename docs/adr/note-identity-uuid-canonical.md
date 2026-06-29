# UUID-Canonical Note Identity & Journal Unification

**Status**: Accepted — 2026-06-28
**Related**: `cross-note-result-aggregation.md` (resolves its "deferred note-UUID"
consequence); `versioned-block-identity.md`.

## Context

`JournalPage` and the Workbench are the same `Note` model in the same IndexedDB
store, reached through **two divergent stacks**. `JournalPage` uses the older
`usePlaygroundContent` + `playgroundRecorder` + local component state; the
Workbench uses the `WorkbenchSessionStore` (a deep module with injected ports).
The divergence surfaces as: journal notes keyed by route id
(`journal/<date>`) while other notes are UUID-keyed; results written through two
paths (Recorder vs `completeWorkout → mutateNote`); and `CONTEXT.md`'s former
claim that `raw` is "the storage key." The split is accidental — the session is
route-driven and note-kind-agnostic, so it could serve journal today;
`JournalPage` was simply never migrated onto it.

## Decision

Make the note's **UUID its canonical storage identity**, the **slug routing
sugar**, and **migrate `JournalPage` onto the `WorkbenchSessionStore`** so there
is one note stack.

- `Note.id` = **UUID** (always). **Blocks**, **WorkoutResults**, and cross-note
  references point to the UUID.
- A `slug` field on `Note` (optional) + a unique **`by-slug`** index. Routes
  resolve slug → UUID → load. Seed-on-open for a new route = lookup-by-slug; if
  absent, mint a UUID and create with that slug.
- `JournalPage` loads via the session's `loadEntry` (by UUID) and writes via
  `completeWorkout → mutateNote → resolveResultIdentity`. The
  `playgroundRecorder` / `usePlaygroundContent` journal path dissolves.

The route-id/UUID split, the Recorder-vs-`mutateNote` fork, and three of card 1's
five write shapes collapse together. `CONTEXT.md`'s "Result Recorder is the
single seam" becomes literally true.

## Considered options

- **Keep `JournalPage` deliberately separate** (lightweight). Rejected: the
  divergence is the root cause of the identity scattering this work exists to
  fix.
- **Slug derived per kind** (journal slug from its date). Rejected: non-uniform;
  collection slugs (`category/name`) aren't derivable from a note alone.
- **A separate slug→UUID routing table.** Rejected: reinvents a `by-slug` index
  the notes store already provides.

## Consequences

- **+** One note stack; `CONTEXT.md`'s "Result Recorder is the single seam"
  becomes true; card 1's write-shape count drops sharply.
- **+** Cross-note result joins (`cross-note-result-aggregation.md`) work
  uniformly — `noteId` is always a UUID, no route-id special case.
- **−** **Data migration:** existing journal notes (`id = journal/<date>`) must
  be re-keyed to a UUID with `slug` set; their dependents — results, segments,
  analytics, attachments (all `noteId`-keyed) — re-keyed to the new UUID.
- **−** IndexedDB can't change a stored keyPath value in place, so migration is
  put-new + delete-old per affected row, in an upgrade transaction.
- **−** Resolves (closes) the cross-note ADR's deferred "UUID/route-id
  inconsistency" consequence.

## Migration ordering (resolved 2026-06-28; implementation amended in V8 commit)

**Lazy, per-note on first access** (via `IndexedDBService.findOrMigrate(slugOrId)`).
The ADR's original choice was one-shot in the `openDB` upgrade transaction.
During implementation that path proved brittle: analytics has no `by-note`
index, so a safe single-transaction re-key of analytics per legacy note would
require a full scan inside one upgrade transaction — risky to roll back on
mid-transaction failure. **The lazy form delivers the same end-state over
time** with no upgrade-transaction risk: every legacy note re-keys on its
first read by an authorized caller (currently opt-in via `findOrMigrate`;
route handlers will adopt this). Idempotent (skips UUID rows; safe under
concurrent callers via the IndexedDB transaction in `migrateNoteToUuid`).

**Net effect on the design:** same end-state (every note eventually UUID-keyed
with `slug`); the migration logic is just located at a different seam — a
read-side helper instead of an upgrade-tx. The ADR's chosen *outcome*
(uniform UUID identity, replaceable through the patch path's `findOrMigrate`)
is unchanged.
