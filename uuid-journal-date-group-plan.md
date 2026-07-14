# UUID Notes with Date-Grouped Journal Views

## Goal

Make every user-created document an independently owned, UUID-keyed Note. A journal date is a query and composite editing view over zero or more Notes; it is never a Note identity. Results always join to a Note UUID and a block inside that Note.

## Resolved decisions

- Every explicit create, clone, collection-send, feed-send, Playground-send, or shared ZIP import creates a new Note UUID.
- Re-running a block already inside a Note creates another Result on that same Note; it does not create another Note.
- `/journal/{date}/` is a composite editor projection over all Notes assigned to that logical journal date.
- `/journal/{date}/{uuid}` is the canonical single-Note URL.
- `/journal/{uuid}` and `/journal/{slug}` resolve the Note and redirect to its canonical date+UUID URL.
- A Note's logical `journalDate` (currently closest to `targetDate`) drives journal grouping. `createdAt` remains immutable audit time; `completedAt` remains Result execution time.

## Domain model

### Note

- `id: UUID` — immutable storage and join identity, minted before the first write.
- `journalDate?: YYYY-MM-DD` — logical local date used by the journal. Defaults to the local creation date; scheduling/import may set another date.
- `createdAt`, `updatedAt` — audit timestamps, not grouping keys.
- `slug?: string` — optional unique routing alias, never a storage/join key.
- `kind: 'journal' | 'playground' | 'note'` — explicit family; stop deriving family from ID prefixes.
- Optional `createdFrom` metadata records `blank | collection | feed | zip | playground` and a source reference. This is provenance only, not Result identity.

### Block and Result

- `WorkoutResult.noteId` always equals `Note.id` (UUID).
- `blockId` identifies the block position inside one Note.
- `blockContentId` identifies equivalent workout content across Notes.
- `version` identifies the block generation inside one Note.
- Within-note lookup: `noteId + blockId + version`.
- Cross-note workout lookup: `blockContentId`.
- Journal-date result view: Notes by `journalDate`, then Results by those Note UUIDs. A separate completion-history view may group directly by `completedAt`.

### Journal date projection

`JournalDateDocument` is a non-persisted projection:

```ts
type JournalDateDocument = {
  date: string
  notes: Array<{
    noteId: string
    title: string
    content: string
    createdAt: number
    updatedAt: number
  }>
}
```

The projection exposes one apparent editor but retains visible Note boundaries. Virtual editor offsets map to `{ noteId, localOffset }`; edits, autosave, blocks, runtime actions, and Results are dispatched to exactly one underlying Note. The concatenated document is never saved as one Note.

## Route contract

| Route | Meaning | Resolution |
|---|---|---|
| `/journal` | Calendar/index across dates | Existing list modes remain |
| `/journal/:date/` | Composite editor for all Notes on date | `:date` must match `YYYY-MM-DD` |
| `/journal/:date/:uuid` | Canonical single Note | Validate Note UUID and date membership; redirect if date is stale |
| `/journal/:uuid` | UUID convenience alias | Load Note, derive `journalDate`, redirect canonical |
| `/journal/:slug` | Existing slug alias | Resolve unique slug, derive date+UUID, redirect canonical |

Routing precedence must be explicit: date-group pattern, date+UUID pattern, UUID alias, then slug alias. Do not infer route kind with `startsWith`, generic `{id}`, or `decodeURIComponent(undefined)`.

Legacy `/journal/YYYY-MM-DD` links become the date-group route. A legacy date-as-slug Note remains one member of that date group; it is not silently split because block boundaries cannot recover historical creation events reliably.

## Missing or contradictory existing functionality

1. `noteIdentity.ts` still documents composite IDs as storage/result keys; this contradicts `CONTEXT.md` and the UUID ADR.
2. `ResultRecorder` currently writes `destination.raw` (slug) as `WorkoutResult.noteId`; it must resolve to a UUID first.
3. `JournalListPage` stores `Map<date, one summary>` and `JournalFeed` renders one Note per date. Both must become `Map<date, NoteSummary[]>`.
4. `JournalPage` assumes one date equals one Note and passes the date as `noteId` to the editor.
5. `appendWorkoutToJournal` mutates one date document. It must be replaced with `createJournalNoteFromWorkout`, which always mints a UUID.
6. Blank, Collection, Feed, ZIP, and Playground flows use different write seams and inconsistent IDs.
7. `targetDate` is populated with `Date.now()` in paths that actually mean a selected journal date. Introduce a date conversion seam using local-day start/end; do not use UTC string slicing for local journal dates.
8. Shared-link import and backup restore currently risk conflicting semantics. Shared/clone import mints a new UUID; explicit backup restore may preserve UUID for idempotent recovery.
9. Slug uniqueness is stated in the ADR but the IndexedDB index is created without `unique: true`; migration must detect collisions before enforcing uniqueness.
10. Lazy `findOrMigrate` is race-prone under concurrent/StrictMode callers. New data must be UUID-first; legacy migration needs a per-slug transaction/lock and duplicate reconciliation.
11. Existing duplicated UUID Notes with the same date slug need a repair path. Do not merge arbitrary Notes automatically; assign each to the date, retain UUIDs, and remove obsolete date slugs except an explicit alias target.
12. Result/date search currently parses `noteId` strings and treats UUIDs as Playground Results. Replace parsing with Note lookups or an indexed journal-date projection.
13. Autosave, flush-on-unmount, delete, move-to-date, export, import, attachments, analytics, and Result writes must all operate on UUIDs.
14. Composite editing needs deterministic ordering, Note separators, per-Note dirty/error state, focus restoration, and runtime ownership when multiple blocks exist across Notes.

## Implementation plan

### 1. Replace the identity contract

- Update `CONTEXT.md`, `playground/CONTEXT.md`, and `docs/adr/note-identity-uuid-canonical.md` to define Date Group, Journal Note, and Composite Journal Document.
- Replace `NoteRef.raw`-as-key semantics with a resolver result containing `noteId: UUID`, optional `slug`, and `journalDate`.
- Make `ResultRecorder` accept a resolved UUID destination; remove tests expecting `journal/YYYY-MM-DD` in `WorkoutResult.noteId`.

**Verify:** every new Note, Segment, Result, Attachment, and Analytics row uses the same UUID.

### 2. Make UUID-first creation the only write seam

Introduce a deep `JournalNoteRepository`/module with a small interface:

```ts
create(input): Promise<JournalNote>
getById(uuid): Promise<JournalNote>
resolveSlug(slug): Promise<JournalNote | null>
listByDate(date): Promise<JournalNote[]>
update(uuid, patch): Promise<JournalNote>
moveToDate(uuid, date): Promise<JournalNote>
```

All creation flows call `create`; no caller chooses an ID or appends to a date document. Creation mints UUID first, stamps `journalDate`, parses Blocks, and returns the canonical route data.

**Verify:** creating the same Collection workout twice creates two UUID Notes; running one Note twice creates two Results under one UUID.

### 3. Migrate storage and indexes

- Promote logical `journalDate` to a first-class persisted field (or strictly redefine/backfill `targetDate`, but do not overload it with creation timestamp).
- Add/query an index suitable for `[kind, journalDate]` or equivalent date range lookup.
- Make `by-slug` unique after collision repair.
- Backfill legacy `journal/<date>` IDs to UUIDs, re-key Segments/Results/Attachments/Analytics atomically, and retain date membership.
- Add an idempotent repair for duplicate same-slug rows created by prior races; keep every independent Note UUID, but collapse only byte-identical migration duplicates with identical dependent sets.

**Verify:** migration can run twice without creating rows; legacy Results still open their Note.

### 4. Implement deterministic route resolution

- Add explicit route patterns/builders for date group, date+UUID, UUID alias, and slug alias.
- Introduce a pure `resolveJournalRoute` classifier using date and UUID validators.
- Canonicalize UUID/slug aliases to `/journal/{journalDate}/{uuid}` with `replace` navigation.
- Preserve `/plan` redirect and `/journal?s=...` calendar links.

**Verify:** direct load, refresh, back/forward, encoded slug, stale date+UUID, missing Note, and trailing slash behavior.

### 5. Build the composite date editor projection

- Replace the single-Note `JournalPage` date assumption with a `JournalDatePage` loading `listByDate(date)`.
- Build `JournalDateDocumentModel` that maps virtual ranges to Note UUID/local offsets and emits per-Note update intents.
- Render stable separators/cards carrying title, UUID deep link, source, save state, and delete/move actions.
- Route block commands and runtime overlays through the owning Note UUID.
- Save Notes independently; one failed save must not block siblings.
- Preserve focus/selection when Notes are inserted, removed, or reordered. Default order: `createdAt`, then UUID.

**Verify:** edit two Notes in one date view, refresh, and confirm contents/results never cross Note boundaries.

### 6. Replace all creation flows

- Blank/new typed entry → create UUID Note with empty template.
- Collection/Feed “Run” → create UUID Note containing one cloned block, navigate canonical, then auto-start that block.
- Add/Schedule → create a distinct UUID Note on the selected date.
- Open in Playground → create a UUID Playground Note, not a Journal Note.
- Shared ZIP link → decode then create a fresh UUID instance; optional date selects `journalDate`.
- Backup restore → separate command that may preserve UUID and deduplicate.
- Remove `appendWorkoutToJournal` and exact-fence dedup from creation semantics.

**Verify:** each source creates one independently editable Note; repeated source actions never mutate an older Note.

### 7. Correct Result recording and lookup

- Resolve destination slug/date before runtime starts; carry UUID in `pendingRuntimes`.
- Record Results only against UUID Note IDs and note-scoped block IDs.
- Date view loads Results through its Note UUID set; collection progress continues querying `blockContentId`.
- Update palette/search labels by joining Result → Note rather than splitting `noteId` strings.
- Define date filters explicitly: journal grouping uses `journalDate`; activity history uses `completedAt`.

**Verify:** find a Result by UUID, find all Results for a date's Notes, and find all Results for a workout across dates.

### 8. Update list, navigation, portability, and lifecycle

- Change journal summaries from one Note per date to arrays with count, titles, result badges, and create-new action.
- Date card opens the composite view; individual rows open canonical single-Note URLs.
- Export/import include UUID, `journalDate`, slug, provenance, block identities, and Results.
- Delete cascades only one Note UUID; moving a Note changes date membership and canonical URL, not UUID or Results.
- Autosave/flush use the owning Note UUID; remove `activeBlockId`/date/slug as save targets.

**Verify:** date counts update after create/delete/move without reload; share/restore semantics are distinct.

### 9. Compatibility rollout and end-to-end verification

- Add read compatibility first, then UUID-first writes, then grouped UI, then retire composite-ID writes.
- Instrument migration/repair counts locally and surface unrecoverable collisions without deleting data.
- Add focused unit tests for route classification, repository queries, migration idempotency, composite offset mapping, and Result identity.
- Add browser scenarios covering Blank, Collection Run, Feed, ZIP, Playground, repeated creates, repeated runs, legacy link, UUID alias, slug alias, date group edit, move, delete, export/import, and refresh during autosave.

**Done when:** no new Note or Result stores a date/slug as identity; every date can contain multiple independent UUID Notes; the composite date editor edits them without flattening; all creation sources and deep links converge on the same repository and canonical routes.

## Critical dependency order

1. Identity contract and UUID-first repository.
2. Storage migration/indexes and Result UUID writes.
3. Route resolution.
4. Creation-flow cutover.
5. Composite date editor and list arrays.
6. Legacy repair, portability, and final removal of date-as-id code.

Do not build the composite editor before UUID-first creation and querying are proven; otherwise the projection will encode the current date-as-document mistake again.
