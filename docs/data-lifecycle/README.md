# Data Lifecycle Documentation

How wod-wiki pages load and save data, and how that maps to the underlying 
data structures. Built from source only (schema: `src/types/storage.ts`,
`src/services/db/IndexedDBService.ts` v11; flows: `playground/src/pages`,
`playground/src/hooks`, `playground/src/services`). Documents under `docs/`
outside this folder predate this analysis and may be stale.

## Documents

| Doc | Contents |
|---|---|
| [01 — Storage Tiers](01-storage-tiers.md) | The four places data lives: build-time markdown, IndexedDB, localStorage, in-memory. What is authoritative vs seed/fallback vs disposable. |
| [02 — Database Schema (UML)](02-database-schema.md) | `wodwiki-db` v11: nine object stores as a UML class diagram, field types, indexes, relationships, embedded shapes, design notes. |
| [03 — Page Lifecycles](03-page-lifecycles.md) | Per-page load/save flows with sequence/flow diagrams: the edit-persist pattern, journal date aggregation, zip import/export, per-page behavior table. |
| [04 — Workout Result Lifecycle](04-workout-result-lifecycle.md) | The run → record → review pipeline: runtime outputs to `WorkoutResult` + `AnalyticsDataPoint`, journal forks, identity fields, replay. |
| [05 — Crosswalks & Reference](05-crosswalks.md) | Lookup tables: page → load/save behavior, store → writers/readers, localStorage key inventory, reset semantics. |

## Visual diagrams (Excalidraw)

Open in Obsidian with the Excalidraw plugin (switch to Excalidraw view).
Each file is one focused subview:

| File | Subview |
|---|---|
| [mental-model.excalidraw.md](mental-model.excalidraw.md) | The four storage tiers and which one is authoritative — the top-level mental model. |
| [schema-stores.excalidraw.md](schema-stores.excalidraw.md) | `wodwiki-db` v11 object stores as an ER diagram: keys, fields, FK and soft-reference arrows. |
| [edit-persist-flow.excalidraw.md](edit-persist-flow.excalidraw.md) | Load → IDB-hit-or-seed → render → debounced autosave → new segment version; flush triggers. |
| [workout-result-flow.excalidraw.md](workout-result-flow.excalidraw.md) | Run → journal fork → pendingRuntimes → record → results + analytics rows → review; identity-field legend. |

## The one-paragraph mental model

Content identity is a **Note (UUID)**; its text lives as **append-only
versioned NoteSegments**; a workout run produces a **WorkoutResult** pinned
to `[segmentId, segmentVersion]` with the full replay in `data.logs`, plus
denormalized **AnalyticsDataPoint** summary rows for cross-workout trends.
Calendar grouping is a **Page** row (`date`), copied down as `pageId` on
notes/segments/results. Pages load IDB-first with bundled markdown as
seed/fallback, autosave with per-page line-idle debounce, and every result
write funnels through the single
`playgroundRecorder → notePersistence.mutateNote` seam. Build-time markdown,
localStorage flags, and in-memory maps (`pendingRuntimes`, workbench store,
canvas edits) are transport and metadata only — none are sources of truth
for user content.
