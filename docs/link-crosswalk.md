# Link Crosswalk — Record → Route, by Context

Every link to a training record should resolve to the route that matches the
organization unit the user is working in. Today each call site hand-builds a
URL, so the same record opens in different places depending on which file
built the link. This document inventories every link-generation site, states
the current target, proposes the consistent target, and leaves an alignment
column for decisions.

The target scheme follows two naming rules: **plural = list** for browsing
surfaces, and **single-letter prefix = item** for the specialized views of a
slug (`/c/:slug` collections, `/e/:slug` efforts, `/d/:slug` dashboards,
`/p/:slug` pages). Every slug is a page and also renders generically at
`/p/:slug`; stored notes always open in the editor at `/notes/:noteId`.
Per-route reference: [playground-routes.md](./playground-routes.md).

## 1. Canonical link-target routes

| Route                                   | Loads                                                                         | Update                                            | Type   |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| `/notes/:noteId`                        | One note, any kind                                                            |                                                   | editor |
| `/journal`                              | Journal stream (dated list)                                                   |                                                   | list   |
| `/journal/:date`                        | Date stack (all notes on the date)                                            |                                                   | editor |
| `/journal/:date/:noteId`                | Date stack with one note selected                                             | lets repalce this to `/notes/:noteId`             | editor |
| `/collections`                          | A list of all the collections                                                 | add                                               | list   |
| `/c/:slug`                              | Collection landing                                                            | rename from `/collections/:slug`                  | page   |
| `/c/:slug/:date`                        | Date view of one collection                                                   | rename                                            | editor |
| `/collection/:slug/:noteId`             | One note, collection-scoped                                                   | lets replcae this with `/notes/:noteid`           | editor |
| `/c/:collection-slug/:note-page-slug`   | Workout editor by name                                                        | rename from `/collections/:slug/:name`            | editor |
| ~~`/feeds/:feedSlug/:date/:item`~~      | One feed post                                                                 | remove — feeds are collections with dates on them |        |
| `/playgrounds`                          | The library link for the list of all playground entries created               | add                                               | list   |
| `/playground`                           | Empty playground note                                                         | add                                               | editor |
| `/playground/:noteId`                   | Playground note                                                               | param renamed to `:noteId`                        | editor |
| `/efforts`                              | Efforts list                                                                  |                                                   | list   |
| `/e/:slug`                              | Effort detail                                                                 | renamed form `/effort/:slug`                      | editor |
| `/sessions`                             | Sessions listing; optional `?q=` WQL filter from the command line             | rename from `/results`                            | list   |
| `/sessions/:sessionId`                  | Session execution detail                                                      | rename from `/results/:resultId`                  | editor |
| `/session/:date`                        | Loads the sessions from a given date                                          | add                                               | editor |
| `/dashboards`                           | Dashboard list (WQL explorer landing, optional `?q=`)                         | rename from `/dashboard`                          | list   |
| `/dashboard/:dashboardId`<br>`/d/:slug` | A saved or prebuilt dashboard, built in the editor                            | current as `/dashboard/:slug`                     | editor |
| `/p/:slug`                              | A page built from notes — syntax guides today, any user-built note collection | new — syntax routes re-address here               | page   |

Second-segment ambiguity in `/c/:slug/:x` resolves by shape: `YYYY-MM-DD` →
date view, anything else → a note's page slug (the named workout editor).
Note ids no longer route inside a collection — notes open at
`/notes/:noteId`.

**Dual ids on note records.** Queries and the content provider return notes
carrying both the **note id** (editor target, `/notes/:noteId`) and the
**page id** (page render, `/p/:slug`), so list UIs can link either. Slugs
are pages: a collection's `/c/:slug`, an effort's `/e/:slug`, and a
dashboard's `/d/:slug` all have a generic `/p/:slug` render — the typed
prefix is the specialized view, `/p` is the generic one.

## 2. Link-generation sites (survey)

| # | Site (file → consumer) | Record | Current target | Proposed target | Alignment notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `app/lib/entryActions.ts` → `entryOpenHref` (LibraryRow, PropertyTable, StreamFeed) | journal note | `/journal/:date/` | `/notes/:noteId` | |
| 2 | same | collection item | `/collections/:cat/:workout-name` | `/notes/:noteId` (stored notes); `/c/:cat/:page-slug` for corpus names without note rows | |
| 3 | same | feed post | `/feeds/:slug/:date/:item` | transitional — unchanged until feeds unify into collections, then `/notes/:noteId` (posts are notes in a dated collection) | |
| 4 | same | playground note | `/playground/:id` | `/playground/:noteId` (builder rename only) | |
| 5 | same | effort | `/effort/:slug` | `/e/:slug` | |
| 6 | same | result / segment | `/results/:resultId` | `/sessions/:sessionId` | |
| 7 | `app/lib/entryActions.ts` → `entryCompareHref` | any with blockContentId | `/analytics/explorer?q=<id>` (redirects to `/dashboard?q=`) | emit `/dashboard?q=` directly; literal moves to the builder in `routes.tsx` | explorer literal still hand-built here |
| 8 | `app/lib/entryRun.ts` (Run action) | journal note created by Run | `/journal/:date/?autoStart=<rt>` | unchanged | |
| 9 | `app/lib/noteIdentity.ts` → `noteRefToPath` (back-route rule) | journal note | `/journal/:id` | unchanged | |
| 10 | same | workout note | `/collections/:cat/:name` | `/notes/:noteId` once notes carry ids (see #2); named form moves to `/c/:cat/:page-slug` | file's own comment flags effort mis-routing; fix with this pass |
| 11 | same | playground note | `/playground/:id` | `/playground/:noteId` | |
| 12 | `App.tsx` → `LIBRARY_SECONDARY.toEntry` | journal note | `/journal/:date?note=<id>` | `/notes/:noteId` | |
| 13 | `JournalDatePage.tsx` (note chips + titles) | journal note | `/notes/:noteId` | unchanged (new) | |
| 14 | `CollectionDatePage.tsx` (date list) | collection item | `/collections/:slug/:noteId` | `/notes/:noteId` | |
| 15 | `JournalPage.tsx` (uuid-alias resolve) | journal note | `/journal/:date?note=<id>` | `/notes/:noteId` | |
| 16 | `useJournalZipProcessor.ts` (post-load redirect) | journal note | `/journal/:date/:uuid` | `/notes/:noteId` | |
| 17 | `FeedDetailPage` / `FeedItemPage` / `PlaygroundNotePage` / `WorkoutEditorPage` "Open journal" toasts | journal note | `/journal/:date?note=<id>` | `/notes/:noteId` | |
| 18 | `useSelectWorkout.ts` (nav onRun, page onSelect) | collection item | `/collections/:cat/:name` | `/notes/:noteId` when the item is a stored note; `/c/:cat/:page-slug` for corpus names without rows | |
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
| Journal note | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Collection item | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` | `/notes/:noteId` |
| Feed post | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) | `/feeds/:slug/:date/:item` (transitional) |
| Playground note | `/playground/:noteId` | `/playground/:noteId` | `/playground/:noteId` | `/playground/:noteId` |
| Page note (guides, user-built) | `/p/:slug` | `/p/:slug` | `/p/:slug` | `/p/:slug` |
| Effort | `/e/:slug` | `/e/:slug` | `/e/:slug` | `/e/:slug` |
| Session (result) | `/sessions/:sessionId` | `/sessions/:sessionId` | `/sessions/:sessionId` | `/sessions/:sessionId` |
| Dashboard | `/dashboard/:dashboardId` or `/d/:slug` | `/dashboard/:dashboardId` or `/d/:slug` | `/dashboard/:dashboardId` or `/d/:slug` | `/dashboard/:dashboardId` or `/d/:slug` |
| Block | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` | parent target + `#<segmentId>` |

Rule of thumb: every stored note — journal, collection item, feed post once
unified — opens in the canonical editor `/notes/:noteId` from every surface.
Scoping is a view, not a link target: the date stack, collection date view,
and named workout editor are collection/journal browsing surfaces. Slugs are
pages (`/p/:slug` renders any of them generically; `/c`, `/e`, `/d` are the
specialized views); note records carry note id + page id so lists link
either.

## 4. Proposed implementation seam

One pure builder owns the targets; call sites stop splicing URLs. The
context axis collapsed — every stored note opens at `/notes/:noteId` from
every surface — so the real choice left is **editor vs page**, driven by the
id pair on each record:

```ts
// app/lib/entryActions.ts (simplified seam)
export function entryOpenHref(entry: Entry): string {
  // noteId present        → /notes/:noteId
  // page slug only        → /p/:pageId
  //   inside a collection → /c/:collection-slug/:page-slug (the named editor)
  // corpus name, no note  → /c/:collection-slug/:page-slug
}
```

- Queries and the content provider return `noteId` and `pageId` on every
  note record; lists render both links where both make sense.
- Block entries keep the `#<segmentId>` anchor appended by today's builder.
- Builders: `journalNotePath` and `collectionNotePath` retire in favor of
  `noteByIdPath`; `workoutPath` re-points at `/c/:collection-slug/:page-slug`;
  new `effortSlugPath` (`/e/…`), `dashboardSlugPath` (`/d/…`), and
  `pagePath` (`/p/…`).

## 5. Migration notes

- Redirects absorb the renames: `/collections/:slug…` → `/c/:slug…`,
  `/results/:resultId` → `/sessions/:sessionId`, `/results` → `/sessions`,
  `/effort/:slug` → `/e/:slug`, `/dashboard` → `/dashboards`, `/syntax/*`
  and `/chapters/*` → `/p/<slug>`, and the note-selection forms — both
  `?note=<uuid>` and `/journal/:date/:noteId` and
  `/collection/:slug/:noteId` — → `/notes/:noteId`.
- Data contract: note results (`entryMapper.toEntry`, `HistoryEntry`,
  provider `getEntries`) gain `pageId` alongside the note id; populate it
  from the note's page slug when one exists.
- Page addressing: `/p/:slug` becomes the single home for note-built pages.
  The syntax corpus re-addresses from its declared namespace routes
  (`/guide/syntax/*`, served by the `/syntax` redirect) to
  `/p/<slug>` — the slug replaces the `/syntax/` prefix. Any user-built
  note collection publishes the same way. The seeded corpus keeps working
  as today until the rewrite lands.
- Feed removal depends on feed items gaining note rows and dates as
  collection items (open domain-model question); `/feeds/*` routes stay
  until that lands, then feed posts link to `/notes/:noteId`.
- `/results/segments` folds into `/sessions` as a `?q=` filter; decide at
  rename time.
- `workoutPath(collection, name)` stays canonical for corpus workout names
  that have no note row, re-pointed at `/c/:collection-slug/:page-slug`.
- `noteRefToPath`'s flagged effort mis-routing should be fixed in the same
  pass that adds the prefix rename.
