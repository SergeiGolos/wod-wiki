# Catalog Dashboard Seeds — Research

**Ticket:** #903 · **Map:** #898 (Dashboard-as-Note) · **Date:** 2026-08-04 · **Branch:** metrics-explorer

Question: can the existing **Catalog** pattern (bundled read-only seeds the user clones into their vault; Session/Post flavors today) carry a **dashboard-note seed**, or do prebuilt dashboards need a distinct seed mechanism?

---

## Verdict (answered up front)

**A dashboard seed fits the Catalog/Entry model as-is for declaration, listing, and identity — zero model changes.** The only blocking gap is the clone step: `LibraryPage.handleAddToToday` copies just the **first block's** `rawContent`, which would clone a dashboard seed as *frontmatter-only* and drop every ` ```query:* ` block. Fix the rawContent assembly (~3 lines) and a file like `markdown/collections/dashboards/overview.md` clones into the vault as a fully live, editable dashboard note.

## (a) Catalog declaration format

Seeds are **plain markdown files**; there is no manifest — the file path IS the declaration:

- `markdown/collections/<catalogDir>/<file>.md` → **Session** (undated)
- `markdown/feeds/<catalogDir>/<YYYY-MM-DD>/<file>.md` → **Post** (dated)
- `README.md` files are skipped (`scripts/generate-static-block-index.ts:41,79`).

**Catalog id = directory name.** The generator builds `noteId = <dirName>/<fileName>` (collections, :46) or `feeds/<dirName>/<dateKey>/<fileName>` (feeds, :84) and stamps each `BlockIndexRow` with `isStatic: true` and `sourceId: 'collection:<noteId>'` (:66) / `'feed:<noteId>'` (:103). Downstream, `Note.catalog` = first path segment with the `feeds/` wrapper stripped (`QueryService.staticNotesFromBlocks:198`, `playground/src/lib/listCatalogs.ts:16-18`).

Generation: `bun scripts/generate-static-block-index.ts` → `src/generated/static-block-index.json` (~21k rows), loaded lazily via `loadStaticBlockIndex()` (`src/services/content/staticBlockIndex.ts:16-23`). Each file is split by `parseDocumentSections`; ` ```query:* ` fences index as `markdown` rows and frontmatter as a `frontmatter` row — raw text preserved.

Example: `markdown/collections/crossfit-girls/fran.md` (frontmatter `tags:`, `# Fran`, prose, a ` ```time ` fence) → rows `noteId: 'crossfit-girls/fran'`, `sourceId: 'collection:crossfit-girls/fran'`, catalog `crossfit-girls`.

## (b) Clone-into-vault call chain (Library "Add to today")

1. `LibraryPage.handleAddToToday` — `playground/src/views/library/LibraryPage.tsx:90-111`
   - static entry: `queryService.runFind('find:block{note:<entry.id>}')` → takes **`result.blocks[0]?.rawContent` only** (:96-99)
   - vault note: `journalNotes.getById(entry.sourceItem)` → full `rawContent` (:102-106)
2. `addEntryToTodayInput(entry, rawContent, today)` — `playground/src/lib/addToToday.ts:17-28` → `CreateJournalNoteInput{ journalDate, title, rawContent, sourceId, type: 'journal' }`
3. `journalNotes.create` — `playground/src/services/journalNotes.ts` → `persistence.createNote({ id: uuidv7(), ..., sourceId })`
4. `Note.sourceId` (`src/types/storage.ts:44-46`) is the traceability link back to the seed. `Note.catalog` is **not** set on clones (undefined for journal notes by design).

No frontmatter is written by the cloner — the seed's own frontmatter survives verbatim inside rawContent (it is the first parsed section).

## (c) Listing: catalog entries vs vault notes

One pipeline: `searchEntries(wql)` (`playground/src/lib/entrySearch.ts`) → `queryService.runFind` over static rows + vault block index, merged by noteId, then `toEntry` (`playground/src/lib/entryMapper.ts`): kind from `sourceId` prefix (`collection:`→Session, `feed:`→Post, else Note). LibraryPage renders the Dated Stream (Notes+Posts) + CataloguesShelf (Sessions); `+ Filter → Catalog` menu comes from `listCatalogs(blocks)`. A `dashboards` catalog appears in both automatically. Open routes: Session → `/collections/:cat/:item` (read-only viewer).

## (d) Does the seed fit the `Entry`/`source` model?

**Yes.** `markdown/collections/dashboards/overview.md` with frontmatter `dashboard: true` + ` ```query:* ` fences becomes a Session (`sourceCatalog: 'dashboards'`, `sourceItem: 'overview'`, `sourceId: 'collection:dashboards/overview'`) with no `Entry`/storage changes. Dashboard consumption is frontmatter-driven over **vault notes only** (`AnalyticsDashboardPage` scans `notePersistence.listNotes({})` for `meta['dashboard'] === 'true'`, `dashboard.active` wins) — so the seed only needs to reach the vault with its rawContent intact.

**The blocker:** `handleAddToToday`'s first-block-only copy (LibraryPage.tsx:99). For a dashboard seed the first section is the frontmatter → clone would be frontmatter-only, a valid-but-empty dashboard. (The same truncation silently afflicts multi-section Session/Post clones today.)

## (e) Recommendation — minimal extension

1. **Fix the clone rawContent assembly** (required, ~3 lines): join ALL of the note's blocks in position order — `result.blocks.map(b => b.rawContent).join('\n\n')` — instead of `blocks[0]`. No schema/model change.
2. **(Optional) undated clone flavor**: `CreateJournalNoteInput.journalDate` is now optional, so an "Add as note" action (`type: 'note'`, no journal date) is a row-action addition, not a service change. Dashboard discovery ignores note type/date. Fits the dashboard case (a dashboard isn't a journal entry).
3. **(Defer) dedicated `kind: 'dashboard'` Entry flavor**: not needed; if wanted later it's an `entryMapper.ts` branch keyed on `catalog === 'dashboards'` plus an `entryActions.ts` route.

## Verification

All file:line refs read directly 2026-08-04 (branch `metrics-explorer`); first-block truncation confirmed at `LibraryPage.tsx:96-99`; dashboard discovery at `AnalyticsDashboardPage.tsx`; catalog synthesis in the generator at :46/:66/:84/:103. Corroborating tests: `staticNotesFromBlocks.test.ts`, `entryMapper.test.ts`, `addToToday.test.ts`.
