# Playground Routes

Reference for every route the playground front end serves. Types: **list**
(a listing surface), **editor** (an authoring or detail surface), **page**
(a curated landing). Route classification and deep-link derivation live in
`app/lib/routeView.ts`; URL builders in `app/lib/routes.tsx`; the target
scheme and its link rules in [link-crosswalk.md](./link-crosswalk.md).

Naming rules: **plural = list** for browsing surfaces; **single-letter
prefix = item** for the specialized view of a slug (`/c`, `/e`, `/d`, `/p`).
Every slug is a page and also renders generically at `/p/:slug`. Stored
notes always open in the editor at `/notes/:noteId`; note records carry both
a **note id** (editor link) and a **page id** (page-render link) so list UIs
can target either.

## Notes

### `/notes/:noteId` — single note (editor, current)
Loads one note of any kind — journal, collection item, feed, playground —
through the content provider, with a read-first Edit toggle and a guarded
save path. Missing ids render a "Note not found" state. Builder:
`noteByIdPath(noteId)`. This is the universal editor target: journal
selection and collection-scoped note routes fold into it.

Note records returned by queries and the content provider carry `noteId`
and `pageId`; lists link the editor (`/notes/:noteId`) and the page render
(`/p/:slug`) from the same row.

## Journal

### `/journal` — journal stream (list, current)
Dated list of journal notes. Stream profile `JOURNAL_STREAM_PROFILE`
(`find:note last 2w`).

### `/journal/:date` — date stack (editor, current)
All notes for one `YYYY-MM-DD`, editor-first, with the per-note chip list.
Selecting a note opens `/notes/:noteId`; the stack is the browsing view.
Builders: `journalDatePath(date)`, `journalEntryPath(identity)` for the
legacy single-segment form.

### Journal aliases (redirects, current)
`/journal/:uuid` and `/journal/:slug` resolve via `resolveJournalRoute` and
redirect to the canonical target (`/notes/:noteId`); malformed segments
redirect to `/journal`.

## Collections

### `/collections` — all collections (list, current)
The collections stream: `find:note{source:collections} by {tag}`. The
library landing (`/library`) defaults to the same query.

### `/c/:slug` — collection landing (page, current)
Curated landing for one collection; the slug's specialized page view
(`/p/:slug` renders it generically). Today `/collections/:slug`.

### `/c/:slug/:date` — collection date view (editor, current)
Journal-style day view of one collection's notes, each linking to
`/notes/:noteId`. Today `/collections/:slug/:date`. Mounts
`pages/CollectionDatePage.tsx` via the route-view classification.

### `/c/:slug/:page-slug` — named workout editor (editor, current)
Workout editor addressed by the note's page slug within the collection.
Today `/collections/:slug/:name` via `workoutPath`. Second-segment shape
disambiguates: `YYYY-MM-DD` → date view, anything else → page slug. Stored
notes skip this route and open at `/notes/:noteId`.

## Feeds (transitional)

### `/feeds/:feedSlug/:date/:item` — feed post (editor, transitional)
Slated for removal: feeds become collections with dates, and posts address
as notes (`/notes/:noteId`). The route and the `/feeds` stream stay until
feed items gain note rows and dates in the collection catalogs; then
redirect.

## Playground

### `/playgrounds` — playground list (list, current)
The list of all created playground entries — the stream profile
`PLAYGROUNDS_STREAM_PROFILE` (`find:note{source:playground} last 4w`). The
Explore nav item points here; the library `?q=` deep link remains a valid
alias.

### `/playground` — empty playground note (editor, current)
Mints a fresh empty playground note on every visit and opens it — `/playgrounds`
is the resume surface. The StrictMode dedup promise keeps double-mounts from
minting two notes.

### `/playground/:noteId` — playground note (editor, current)
The playground editor for one note. Builder: `playgroundPath(id)` — param
renamed to `:noteId` for consistency with the other note routes.

## Efforts

### `/efforts` — efforts list (list, current)
Stream profile `EFFORTS_STREAM_PROFILE` (`find:effort`).

### `/e/:slug` — effort detail (editor, current)
One effort with optional modifiers and page controls via `effortPath`.
Today `/effort/:slug`; the slug's specialized page view
(`/p/:slug` renders it generically).

## Sessions

### `/sessions` — sessions listing (list, current)
Execution sessions with an optional `?q=` WQL filter from the command line.
Today `/results` (plus `/results/segments`, which folds into this filter).

### `/sessions/:sessionId` — session detail (editor, current)
One session's execution detail — segments, metrics, results. Today
`/results/:resultId` via the session result builders; bookmarks and the
retired `/review/*` screens redirect here.

### `/session/:date` — sessions from a date (editor, current)
Loads the sessions from a given date — the session analogue of the journal
date stack.

## Dashboards

### `/dashboards` — dashboard list (list, current)
The WQL explorer landing with optional `?q=`/`?weeks=`. Today `/dashboard`;
`/analytics/*` already redirects here.

### `/dashboard/:dashboardId` — saved dashboard by id (editor, current)
A saved or prebuilt dashboard rendered by `DashboardViewPage`, addressed by
id. Today `/dashboard/:slug`.

### `/d/:slug` — dashboard by slug (editor, current)
The same dashboard addressed by its page slug — the slug's specialized page
view; `/p/:slug` renders it generically.

## Pages

### `/p/:slug` — note-built page (page, current)
The generic render for any slug: a page built from a collection of notes.
The syntax guide pages are the existing example — today they mount at their
declared corpus routes (`/guide/syntax/*`, derived from canvas page metadata
in `canvas/canvasRoutes.ts` and served by the `/syntax` redirect). The
target addresses every such page by slug without the `/syntax/` namespace.
This covers any collection of notes a user builds, not just the seeded
corpus; publishing a page and addressing it are the same mechanism. Legacy
paths redirect: `/syntax/*`, `/chapters/*`, and each declared guide route.

## Run & support routes

### `/run/:runtimeId` — wall-clock tracker (editor, current)
Fullscreen runtime consuming `pendingRuntimes`; staged by the Run action
(`entryRun`), not a link target for records.

### `/settings/*`, `/load`, `/load/journal` (support, current)
Settings panels; ZIP intake for workouts and journal archives. Post-load
redirects land on the record's canonical route (`/notes/:noteId`).

### Guide / canvas routes (page, transitional)
Seeded corpus routes (`/guide/…`) hydrate from the canvas corpus via
`useCanvasRoutes`; each guide note's `sourceItem` is its declared route.
Superseded by `/p/:slug` — see Pages above.

### Legacy redirects (current)
`/workout/:cat/:name` → `/c/:cat/:page-slug`, `/tracker/:rt` → `/run/:rt`,
`/review/*` → sessions, `/analytics/*` → dashboards, `/note/:cat/:name` →
`/notes/:noteId`, `/feed` → `/feeds`, `/effort/:slug` → `/e/:slug`,
`/collection(s)/…` → `/c/…` or `/notes/:noteId`, `/syntax/*` and
`/chapters/*` → `/p/<slug>` pages.
