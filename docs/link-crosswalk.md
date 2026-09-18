# Link Crosswalk — Record → Route, by Context

Every link to a training record should resolve to the route that matches the
organization unit the user is working in. Today each call site hand-builds a
URL, so the same record opens in different places depending on which file
built the link. This document inventories every link-generation site, states
the current target, proposes the consistent target, and leaves an alignment
column for decisions.

The target scheme follows one naming rule: **plural = list, singular = item**
(`/collections` lists, `/collection/:slug` lands; `/sessions` lists,
`/session/:date` edits). Per-route reference: [playground-routes.md](./playground-routes.md).

## 1. Canonical link-target routes

| Route | Loads | Update | Type |
| --- | --- | --- | --- |
| `/notes/:noteId` | One note, any kind | | editor |
| `/journal` | Journal stream (dated list) | | list |
| `/journal/:date` | Date stack (all notes on the date) | | editor |
| `/journal/:date/:noteId` | Date stack with one note selected | replaces `?note=<uuid>` param | editor |
| `/collections` | A list of all the collections | add | list |
| `/collection/:slug` | Collection landing | rename from `/collections/:slug` | page |
| `/collection/:slug/:date` | Date view of one collection | rename | editor |
| `/collection/:slug/:noteId` | One note, collection-scoped | rename | editor |
| `/collection/:slug/:name` | Workout editor by name | rename from `/collections/:slug/:name` | editor |
| `/feeds/:feedSlug/:date/:item` | One feed post | remove — feeds are collections with dates on them | |
| `/playgrounds` | The library link for the list of all playground entries created | add | list |
| `/playground` | Empty playground note | add | editor |
| `/playground/:noteId` | Playground note | param renamed to `:noteId` | editor |
| `/efforts` | Efforts list | | list |
| `/effort/:slug` | Effort detail | | editor |
| `/sessions` | Sessions listing; optional `?q=` WQL filter from the command line | rename from `/results` | list |
| `/sessions/:sessionId` | Session execution detail | rename from `/results/:resultId` | editor |
| `/session/:date` | Loads the sessions from a given date | add | editor |
| `/dashboards` | Dashboard list (WQL explorer landing, optional `?q=`) | rename from `/dashboard` | list |
| `/dashboard/:noteId` | A saved or prebuilt dashboard, built in the editor | current as `/dashboard/:slug` | editor |
| `/p/:slug` | A page built from notes — syntax guides today, any user-built note collection | new — syntax routes re-address here | page |

Second-segment ambiguity in `/collection/:slug/:x` resolves by shape, same as
today: a note UUID → note, `YYYY-MM-DD` → date view, anything else → workout
name.

## 2. Link-generation sites (survey)

| # | Site (file → consumer) | Record | Current target | Proposed target | Alignment notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `app/lib/entryActions.ts` → `entryOpenHref` (LibraryRow, PropertyTable, StreamFeed) | journal note | `/journal/:date/` | unchanged (journal context) | |
| 2 | same | collection item | `/collections/:cat/:workout-name` | `/collection/:cat/:noteId` in a collection context; `/notes/:noteId` from library | |
| 3 | same | feed post | `/feeds/:slug/:date/:item` | transitional — unchanged until feeds unify into collections, then the date-scoped collection target | |
| 4 | same | playground note | `/playground/:id` | `/playground/:noteId` (builder rename only) | |
| 5 | same | effort | `/effort/:slug` | unchanged | |
| 6 | same | result / segment | `/results/:resultId` | `/sessions/:sessionId` | |
| 7 | `app/lib/entryActions.ts` → `entryCompareHref` | any with blockContentId | `/analytics/explorer?q=<id>` (redirects to `/dashboard?q=`) | emit `/dashboard?q=` directly; literal moves to the builder in `routes.tsx` | explorer literal still hand-built here |
| 8 | `app/lib/entryRun.ts` (Run action) | journal note created by Run | `/journal/:date/?autoStart=<rt>` | unchanged | |
| 9 | `app/lib/noteIdentity.ts` → `noteRefToPath` (back-route rule) | journal note | `/journal/:id` | unchanged | |
| 10 | same | workout note | `/collections/:cat/:name` | note-id form once notes carry ids (see #2); name form moves to `/collection/:cat/:name` | file's own comment flags effort mis-routing; fix with this pass |
| 11 | same | playground note | `/playground/:id` | `/playground/:noteId` | |
| 12 | `App.tsx` → `LIBRARY_SECONDARY.toEntry` | journal note | `/journal/:date?note=<id>` | `/journal/:date/:noteId` (library side panel keeps journal context) | |
| 13 | `JournalDatePage.tsx` (note chips + titles) | journal note | `/notes/:noteId` | unchanged (new) | |
| 14 | `CollectionDatePage.tsx` (date list) | collection item | `/collections/:slug/:noteId` | `/collection/:slug/:noteId` (new) | |
| 15 | `JournalPage.tsx` (uuid-alias resolve) | journal note | `/journal/:date?note=<id>` | `/journal/:date/:noteId` | |
| 16 | `useJournalZipProcessor.ts` (post-load redirect) | journal note | `/journal/:date/:uuid` | unchanged — already the target shape | |
| 17 | `FeedDetailPage` / `FeedItemPage` / `PlaygroundNotePage` / `WorkoutEditorPage` "Open journal" toasts | journal note | `/journal/:date?note=<id>` | `/journal/:date/:noteId` | |
| 18 | `useSelectWorkout.ts` (nav onRun, page onSelect) | collection item | `/collections/:cat/:name` | note-id form when the item is a stored note; name form for corpus items without rows | |
| 19 | `appNavTree.ts` → `PLAYGROUND_LIBRARY_HREF` | playground stream | `/library?q=find:note{source:playground}…` | `/playgrounds` once the list route exists | |
| 20 | `QueriableStreamView.tsx` (stream rows) | playground note | `/playground/:id` via `playgroundPath` | `/playground/:noteId` | |
| 21 | `routes.tsx` redirect matrix (`/workout/:cat/:name`, `/tracker/:rt`) | legacy aliases | canonical targets | re-point at renamed targets | |
| 22 | Stream view rows, non-playground kinds (via `entryOpenHref`) | journal / collection / feed | see #1–#3 | context-aware per the matrix below | |
| 23 | `entryOpenHref` guides case; canvas page links | page note (guide / user-built) | the note's declared route (`/${entry.sourceItem}`, e.g. `/guide/syntax/basics`) | `/p/:slug` | |

## 3. Context matrix (the consistency rule)

Read: record kind × where the link is generated → target. "Context" is the
surface the link lives on, not the record's home.

| Record | Journal context | Collection context (`:slug`) | Library / global | Playground context |
| --- | --- | --- | --- | --- |
| Journal note | `/journal/:date/:noteId` | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Collection item | `/notes/:noteId` | `/collection/:slug/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Feed post | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) |
| Playground note | `/playground/:noteId` | `/playground/:noteId` | `/playground/:noteId` | `/playground/:noteId` |
| Page note (guides, user-built) | `/p/:slug` | `/p/:slug` | `/p/:slug` | `/p/:slug` |
| Effort | `/effort/:slug` | `/effort/:slug` | `/effort/:slug` | `/effort/:slug` |
| Session (result) | `/sessions/:sessionId` | `/sessions/:sessionId` | `/sessions/:sessionId` | `/sessions/:sessionId` |
| Dashboard | `/dashboard/:noteId` | `/dashboard/:noteId` | `/dashboard/:noteId` | `/dashboard/:noteId` |
| Block | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` |

Rule of thumb: feeds (transitional), playground, pages, efforts, sessions,
and dashboards have one home each. Notes differ: journal notes stay inside
their date stack in the journal, collection items stay inside their
collection in a collection, and everywhere else both resolve to
`/notes/:noteId`.

## 4. Proposed implementation seam

One pure builder owns the matrix; call sites declare context instead of
splicing URLs.

```ts
// app/lib/entryActions.ts (extends the existing seam)
export type LinkContext = 'journal' | 'collection' | 'library' | 'playground';

export function entryOpenHref(entry: Entry, context: LinkContext = 'library'): string
```

- Journal context emits `/journal/:date/:noteId` when the entry has a date;
  otherwise `/notes/:noteId`.
- Collection context receives the slug from the page (the route already has
  it) and emits `/collection/:slug/:noteId` for collection items.
- Library context emits `/notes/:noteId` for every stored note kind.
- Block entries keep the `#<segmentId>` anchor appended by today's builder.
- Builders gain the renamed set: `journalNotePath(date, noteId)` → path
  segment form, `collectionNotePath` / `collectionDatePath` / `workoutPath`
  re-point at `/collection/…`, new `sessionsPath`, `sessionDetailPath`,
  `sessionDatePath`, `dashboardsPath`, `playgroundsPath`.

Call-site changes are then mechanical: `LibraryRow` (library → `'library'`),
collection pages (`'collection'`), journal pages (`'journal'`), and the
stream view passes the profile's context.

## 5. Migration notes

- Redirects absorb the renames: `/collections/:slug…` → `/collection/:slug…`,
  `/results/:resultId` → `/sessions/:sessionId`, `/results` → `/sessions`,
  `/dashboard` → `/dashboards`, and the `?note=<uuid>` query form →
  `/journal/:date/:noteId` (the alias resolver already owns that rewrite).
- Page addressing: `/p/:slug` becomes the single home for note-built pages.
  The syntax corpus re-addresses from its declared namespace routes
  (`/guide/syntax/*`, served by the `/syntax` redirect) to
  `/p/<slug>` — the slug replaces the `/syntax/` prefix. Legacy paths
  (`/syntax/*`, `/chapters/*`, each declared guide route) redirect. Any
  user-built note collection publishes the same way. The seeded corpus keeps
  working as today until the rewrite lands.
- Feed removal depends on feed items gaining note rows and dates as
  collection items (open domain-model question); `/feeds/*` routes stay until
  that lands, then redirect.
- `/results/segments` folds into `/sessions` as a `?q=` filter; decide at
  rename time.
- `workoutPath(collection, name)` stays canonical for corpus workout names
  that have no note row; the note-id forms apply to stored notes.
- `noteRefToPath`'s flagged effort mis-routing should be fixed in the same
  pass that adds context-awareness.
