# Link Crosswalk — Record → Route, by Context

Every link to a training record should resolve to the route that matches the
organization unit the user is working in. Today each call site hand-builds a
URL, so the same record opens in different places depending on which file
built the link. This document inventories every link-generation site, states
the current target, proposes the consistent target, and leaves an alignment
column for decisions.

## 1. Canonical link-target routes

| Route | Loads | Scope |
|---|---|---|
| `/journal` | Journal stream (dated list) | global |
| `/journal/:date` | Date stack (all notes on the date) | journal |
| `/journal/:date?note=<uuid>` | Date stack with one note selected | journal |
| `/notes/:noteId` | One note, any kind | global |
| `/collections/:slug` | Collection landing | collection |
| `/collections/:slug/:noteId` | One note, collection-scoped | collection |
| `/collections/:slug/:date` | Date view of one collection | collection |
| `/collections/:slug/:workout-name` | Workout editor by name | collection |
| `/feeds/:feedSlug/:date/:item` | One feed post | feed |
| `/playground/:id` | Playground note | playground |
| `/effort/:slug` | Effort detail | effort |
| `/results/:resultId` | Session execution detail | global |

## 2. Link-generation sites (survey)

| # | Site (file → consumer) | Record | Current target | Proposed target | Alignment notes |
|---|---|---|---|---|---|
| 1 | `app/lib/entryActions.ts` → `entryOpenHref` (LibraryRow, PropertyTable, StreamFeed) | journal note | `/journal/:date/` | unchanged (journal context) | |
| 2 | same | collection item | `/collections/:cat/:workout-name` | `/collections/:cat/:noteId` when opened from a collection context; `/notes/:noteId` from library | |
| 3 | same | feed post | `/feeds/:slug/:date/:item` | unchanged | |
| 4 | same | playground note | `/playground/:id` | unchanged | |
| 5 | same | effort | `/effort/:slug` | unchanged | |
| 6 | same | result / segment | `/results/:resultId` | unchanged | |
| 7 | `app/lib/entryActions.ts` → `entryCompareHref` | any with blockContentId | `/analytics/explorer?q=<id>` (redirects to `/dashboard?q=`) | unchanged; route literal moves to the builder in `routes.tsx` | explorer literal still hand-built here |
| 8 | `app/lib/entryRun.ts` (Run action) | journal note created by Run | `/journal/:date/?autoStart=<rt>` | unchanged | |
| 9 | `app/lib/noteIdentity.ts` → `noteRefToPath` (back-route rule) | journal note | `/journal/:id` | unchanged | |
| 10 | same | workout note | `/collections/:cat/:name` | note-id form once notes carry ids (see #2) | file's own comment flags effort mis-routing; fix with this pass |
| 11 | same | playground note | `/playground/:id` | unchanged | |
| 12 | `App.tsx` → `LIBRARY_SECONDARY.toEntry` | journal note | `/journal/:date?note=<id>` | unchanged (library side panel keeps journal context) | |
| 13 | `JournalDatePage.tsx` (note chips + titles) | journal note | `/notes/:noteId` | unchanged (new) | |
| 14 | `CollectionDatePage.tsx` (date list) | collection item | `/collections/:slug/:noteId` | unchanged (new) | |
| 15 | `JournalPage.tsx` (uuid-alias resolve) | journal note | `/journal/:date?note=<id>` | unchanged | |
| 16 | `useJournalZipProcessor.ts` (post-load redirect) | journal note | `/journal/:date/:uuid` | unchanged | |
| 17 | `FeedDetailPage` / `FeedItemPage` / `PlaygroundNotePage` / `WorkoutEditorPage` "Open journal" toasts | journal note | `/journal/:date?note=<id>` | unchanged | |
| 18 | `useSelectWorkout.ts` (nav onRun, page onSelect) | collection item | `/collections/:cat/:name` | note-id form when the item is a stored note; name form for corpus items without rows | |
| 19 | `appNavTree.ts` → `PLAYGROUND_LIBRARY_HREF` | playground stream | `/library?q=find:note{source:playground}…` | unchanged | |
| 20 | `QueriableStreamView.tsx` (stream rows) | playground note | `/playground/:id` via `playgroundPath` | unchanged | |
| 21 | `routes.tsx` redirect matrix (`/workout/:cat/:name`, `/tracker/:rt`) | legacy aliases | canonical targets | unchanged | |
| 22 | Stream view rows, non-playground kinds (via `entryOpenHref`) | journal / collection / feed | see #1–#3 | context-aware per the matrix below | |

## 3. Context matrix (the consistency rule)

Read: record kind × where the link is generated → target. "Context" is the
surface the link lives on, not the record's home.

| Record | Journal context | Collection context (`:slug`) | Library / global | Playground context |
|---|---|---|---|---|
| Journal note | `/journal/:date?note=<id>` | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Collection item | `/notes/:noteId` | `/collections/:slug/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Feed post | `/feeds/:slug/:date/:item` | `/feeds/:slug/:date/:item` | `/feeds/:slug/:date/:item` | `/feeds/:slug/:date/:item` |
| Playground note | `/playground/:id` | `/playground/:id` | `/playground/:id` | `/playground/:id` |
| Guide / canvas note | its canvas route | its canvas route | its canvas route | its canvas route |
| Effort | `/effort/:slug` | `/effort/:slug` | `/effort/:slug` | `/effort/:slug` |
| Session (result) | `/results/:resultId` | `/results/:resultId` | `/results/:resultId` | `/results/:resultId` |
| Block | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` |

Rule of thumb: feeds, playground, guides, efforts, and results have one home
each. Notes differ: journal notes stay inside their date stack in the journal,
collection items stay inside their collection in a collection, and everywhere
else both resolve to `/notes/:noteId`.

## 4. Proposed implementation seam

One pure builder owns the matrix; call sites declare context instead of
splicing URLs.

```ts
// app/lib/entryActions.ts (extends the existing seam)
export type LinkContext = 'journal' | 'collection' | 'library' | 'playground';

export function entryOpenHref(entry: Entry, context: LinkContext = 'library'): string
```

- Journal context falls back to `/journal/:date?note=<id>` when the entry has
  a date; otherwise `/notes/:noteId`.
- Collection context receives the slug from the page (the route already has
  it) and emits `/collections/:slug/:noteId` for collection items.
- Library context emits `/notes/:noteId` for every stored note kind.
- Block entries keep the `#<segmentId>` anchor appended by today's builder.

Call-site changes are then mechanical: `LibraryRow` (library → `'library'`),
collection pages (`'collection'`), journal pages (`'journal'`), and the
stream view passes the profile's context.

## 5. Migration notes

- `workoutPath(collection, name)` stays canonical for corpus workout names
  that have no note row; the note-id forms apply to stored notes.
- `entryCompareHref` keeps hand-building `/analytics/explorer?q=` until the
  explorer literal moves into `routes.tsx`; harmless but inconsistent.
- `noteRefToPath`'s flagged effort mis-routing should be fixed in the same
  pass that adds context-awareness.
