# Playground Routes

Reference for every route the playground front end serves. Types: **list**
(a listing surface), **editor** (an authoring or detail surface), **page**
(a curated landing). Route classification and deep-link derivation live in
`app/lib/routeView.ts`; URL builders in `app/lib/routes.tsx`; the target
scheme and its link-by-context rules in [link-crosswalk.md](./link-crosswalk.md).

Status markers: **current** (serves traffic today), **new** (agreed target,
not built), **rename** (exists under a different path), **transitional**
(stays until a dependency lands).

## Notes

### `/notes/:noteId` — single note (editor, current)
Loads one note of any kind — journal, collection item, feed, playground —
through the content provider, with a read-first Edit toggle and a guarded
save path. Missing ids render a "Note not found" state. Builder:
`noteByIdPath(noteId)`. This is the canonical global target for stored notes.

## Journal

### `/journal` — journal stream (list, current)
Dated list of journal notes. Stream profile `JOURNAL_STREAM_PROFILE`
(`find:note last 2w`). Builder: `/journal`.

### `/journal/:date` — date stack (editor, current)
All notes for one `YYYY-MM-DD`, editor-first, with the per-note chip list.
Builders: `journalDatePath(date)` (canonical, with trailing slash),
`journalEntryPath(identity)` for the legacy single-segment form. Multiple
notes on one date stack vertically; each chip links to `/notes/:noteId`.

### `/journal/:date/:noteId` — date stack with selection (editor, new)
Replaces the `?note=<uuid>` query form. The date context stays in the URL
while one note is selected — journal links from journal surfaces target
this. The alias resolver (`resolveJournalRoute`) rewrites UUID and slug
aliases into this shape.

### Journal aliases (redirects, current)
`/journal/:uuid` and `/journal/:slug` resolve via `resolveJournalRoute`:
uuid-alias fetches the note and redirects to its date stack; slug-alias
loads the linked note; malformed segments redirect to `/journal`.

## Collections

### `/collections` — all collections (list, current)
The collections stream: `find:note{source:collections} by {tag}`. The
library landing (`/library`) defaults to the same query.

### `/collection/:slug` — collection landing (page, rename)
Curated landing for one collection. Today `/collections/:slug`; the singular
form marks the item surface per the plural-list/singular-item rule.

### `/collection/:slug/:date` — collection date view (editor, rename)
Journal-style day view of one collection's notes, each linking to the
collection-scoped note route. Today `/collections/:slug/:date`. Mounts
`pages/CollectionDatePage.tsx` via the route-view classification.

### `/collection/:slug/:noteId` — collection-scoped note (editor, rename)
One collection item inside its collection. Today
`/collections/:slug/:noteId`. Mounts the single-note page. Builder:
`collectionNotePath(slug, noteId)`.

### `/collection/:slug/:name` — workout editor (editor, rename)
Workout editor addressed by corpus name. Today
`/collections/:slug/:name` via `workoutPath`. Segment shape disambiguates:
UUID → note, `YYYY-MM-DD` → date, else name.

## Feeds (transitional)

### `/feeds/:feedSlug/:date/:item` — feed post (editor, transitional)
Slated for removal: feeds become collections with dates, and posts address
as dated collection items. The route and the `/feeds` stream stay until feed
items gain note rows and dates in the collection catalogs; then redirect.

## Playground

### `/playgrounds` — playground list (list, new)
The list of all created playground entries — today expressed as the library
query `find:note{source:playground}`; becomes a first-class list route
replacing `PLAYGROUND_LIBRARY_HREF`.

### `/playground` — empty playground note (editor, new)
Starts a fresh playground note. Today `/playground` redirects to a default
created page (`PlaygroundRedirect`); the target is an empty editor.

### `/playground/:noteId` — playground note (editor, current)
The playground editor for one note. Builder: `playgroundPath(id)` — param
renamed to `:noteId` for consistency with the other note routes.

## Efforts

### `/efforts` — efforts list (list, current)
Stream profile `EFFORTS_STREAM_PROFILE` (`find:effort`).

### `/effort/:slug` — effort detail (editor, current)
One effort with optional modifiers and page controls via `effortPath`.

## Sessions

### `/sessions` — sessions listing (list, rename)
Execution sessions with an optional `?q=` WQL filter from the command line.
Today `/results` (plus `/results/segments`, which folds into this filter).

### `/sessions/:sessionId` — session detail (editor, rename)
One session's execution detail — segments, metrics, results. Today
`/results/:resultId` via `sessionResultPath` builders; bookmarks and the
retired `/review/*` screens redirect here.

### `/session/:date` — sessions from a date (editor, new)
Loads the sessions from a given date — the session analogue of the journal
date stack.

## Dashboards

### `/dashboards` — dashboard list (list, rename)
The WQL explorer landing with optional `?q=`/`?weeks=`. Today `/dashboard`;
`/analytics/*` already redirects here.

### `/dashboard/:noteId` — saved dashboard (editor, current)
A saved or prebuilt dashboard rendered by `DashboardViewPage`. Today
`/dashboard/:slug`; becomes a note id once dashboards are stored as notes
(they are built in the editor like any note).

## Run & support routes

### `/run/:runtimeId` — wall-clock tracker (editor, current)
Fullscreen runtime consuming `pendingRuntimes`; staged by the Run action
(`entryRun`), not a link target for records.

### `/settings/*`, `/load`, `/load/journal` (support, current)
Settings panels; ZIP intake for workouts and journal archives. Post-load
redirects land on the record's canonical route.

### Guide / canvas routes (page, current)
Seeded corpus routes (`/guide/…`) hydrate from the canvas corpus via
`useCanvasRoutes`; each guide note's `sourceItem` is its declared route.

### Legacy redirects (current)
`/workout/:cat/:name` → collection workout, `/tracker/:rt` → `/run/:rt`,
`/review/*` → sessions, `/analytics/*` → dashboards, `/note/:cat/:name` →
collection note, `/feed` → `/feeds`.
