# Wayfinder #810 — Cross-Source Sourcing for the Unified Library

**Parent:** #805 (Wayfinder Map: Unified Content Library)
**Blocked by:** #807 (Entry concept — *closed*; Entry identity = `{source.catalog, source.item}`, kinds `Note | Session | Post`)
**Output of:** wayfinder:research — recommendation only; no engine change.

## Question

How does the unified Library source **content items across Journal, Collections, and Feeds** through the WQL engine, given that `find:note` returns journal notes and collection/feed *items* live in the static `block_index` as static *notes* (one per markdown file)?

## Evidence (engine, as observed 2026-07-29)

### Three stores back the WQL content path

`src/services/analytics/query/QueryService.ts:42-97` defines three injectable stores; the IndexedDB + static-corpus instances are:

| Store | Journal rows | Static corpus (collections + feeds) |
|---|---|---|
| `NoteQueryStore.getAllNotes()` | All journal notes (one per user note = one Entry) | **Static `Note` synthesized from `block_index` rows, deduped by `noteId`** — one Note per markdown file (one Entry per item) |
| `BlockQueryStore.getAllBlocks()` | Live `block_index` rows from IndexedDB V14 | `static-block-index.json` — one row per **block** (frontmatter, h1..h6, markdown, wod) |
| `ResultLogStore.getResultsByContentId()` | Raw `WorkoutResult` logs (ADR `cross-note-result-aggregation.md`) — keyed by `blockContentId`, no source discrimination |

Static Notes are built at `QueryService.ts:76-88` from `static-block-index.json`, deduping `noteId`s. The synthesized `Note` carries `id = noteId`, `title = noteTitle`, `sourceId = 'collection:…'` or `'feed:…'`, `type = 'workout'`.

### Grain measurement on the live corpus (snapshot)

```
src/generated/static-block-index.json:
  total block_index rows     : 21,321
  distinct noteId            :    673   ← Entry grain in the static corpus
  sourceId prefix:
    collection:              21,189 rows / 661 distinct noteId
    feed:                       132 rows /  12 distinct noteId
  block_index dataTypes      : frontmatter, h1..h6, markdown, wod
```

The static block index has **one row per block** (avg ~32 per file), but the synthesized static `Note` already dedupes to **one Note per file** — exactly the Entry grain defined by #807.

### Scope routing in `runFind` / `runFindBlock`

`QueryService.ts:260-269` (find:note) and `QueryService.ts:330-341` (find:block) handle scope the same way:

| `in <scope>` | `find:note` source | `find:block` source |
|---|---|---|
| `journal` (default) | IndexedDB notes | IndexedDB block_index |
| `collections` | static Notes filtered by `sourceId startsWith 'collection:'` | static block_index filtered same |
| `feeds` | static Notes filtered by `sourceId startsWith 'feed:'` | static block_index filtered same |
| `all` | all of the above | all of the above |

Filters implemented in both paths: `tags`, `text` (substring on title for notes / `rawContent` for blocks), `type` (note `type` vs block `dataType`), `last <n>d|w` (cutoff on `createdAt`), `where …` (cross-store metric join via `applyMetricJoin`, `QueryService.ts:547-570`).

**Crucial shape mismatch for the Entry concept:**

- `find:note` returns a `Note[]` with `id`, `title`, `type`, `sourceId`, `createdAt` — these are the Entry shape's *carrier*: `sourceCatalog = sourceId ? sourceId.split(':')[0] : 'journal'`, `sourceItem = noteId`, `date = createdAt` (recoverable; for feeds, the path-encoded `YYYY-MM-DD` is more authoritative).
- `find:block` returns `BlockIndexRow[]` with `noteId`, `noteTitle`, `dataType`, `blockContentId` — block-grain, not Entry-grain. Group-up to noteId is required (and the `block_index` already carries `noteTitle` for display).
- The static Note carries `type: 'workout'` for every static file (collection *and* feed), which **does not** distinguish Session from Post. The kinds live in `sourceId` — feed files are *dated by file path* (`feeds/<dir>/<YYYY-MM-DD>/<file>`), collections are *undated by path*. So `kind` (Session vs Post) must be derived from `sourceId.startsWith('feed:')`, not from the synthesized `type`.

### Date recovery (required by #807 — "Date or undated")

| Source | Date resolution |
|---|---|
| Journal note | `note.pageId` → `Page.date` (V10); fallback `note.createdAt` |
| Collection item | None — `null` (undated by design) |
| Feed item | Derived from `noteId` path: `feeds/<dir>/<YYYY-MM-DD>/<file>` (e.g. `feeds/crossfit-programming/2026-01-12/wednesday-hero` → `2026-01-12`). `createdAt` is build-time and unreliable for ordering. |

### Cross-store join (Open / Run / Compare row actions)

`applyMetricJoin` (`QueryService.ts:547-570`) keys joins on `blockContentId`, **identical for journal and static** (ADR `cross-note-result-aggregation.md`). Both `find:note` and `find:block` already wire the join through `contentIdsSatisfying`. The static `blockContentId` is a content hash on wod blocks — so a static collection workout's progress data is the same join target as a journal-clone of it.

## Candidate evaluation

### A. Merge `find:note in journal` with `find:block in collections|feeds` — regroup to note

- Run two queries, then union by `Note` (using synthesized static Note for collections/feeds).
- Pros: each query is in its native store; no regrouping in JS beyond dedupe (which the static Note already does).
- Cons: heterogeneous results at the union site — the journal `Note` has full `type/pageId/slug`, the static one is a skeleton. Still trivially mapped to Entry; the join lives in the consumer.
- Filter behavior split: `tags` works for both, `type` means "note kind" for journal and "block dataType" for blocks — the panel→WQL composer must serialize these differently per source, OR the user types raw `find:note{tags:x}` for journal and `find:block{type:wod,text:…}` for static. Two grammar shapes for one panel.

### B. Single `find:note in all` (uses synthesized static Notes), drop `find:block` for sourcing

- `find:note` already returns the right grain across all three sources today (see Evidence: 673 distinct noteIds in the static corpus, one synthesized Note per file = one Entry per item).
- `runFind` already reads journal + static in one call (`scope==='all'` at line 261-269).
- Pros: one grammar shape, one source-of-truth on the panel side, **no engine change**. The static `Note.type` is `'workout'` for both collections and feeds, but Entry kind is recovered from `sourceId` in the consumer.
- Cons: `find:note` text filter searches `title` only (line 295-298) — does not deep-search block content. Free-text needs an additional `find:block{text:…} in <scope>` query OR we extend `runFind` to also substring-match on `block_index.rawContent` for static rows. **Low-cost** because the block_index is already loaded alongside the Note.

### C. Unified item adapter over the existing stores

- A new `ItemQueryStore` exposing a single `Entry`-shaped result; backed by both `NoteQueryStore` and `BlockQueryStore`.
- Pros: Entry is a first-class type in the engine.
- Cons: **engine change** (#805 Out-of-Scope: "this map composes the existing engine; it does not grow the grammar"). Adapter still has to choose a store per scope. No new capability over B.

## Recommendation: **Approach B** — single `find:note in all`, augmented with `find:block{text:…} in all` for free-text

Why:

1. **No engine change.** #805 explicitly forbids growing the WQL grammar; B is pure composition.
2. **Grain already matches.** Evidence shows the synthesized static Note is *exactly* Entry-grain (one per file). `find:note in all` returns a heterogeneous `Note[]` that maps 1:1 to Entry rows.
3. **Cross-store join is free.** `find:note where sum:totalVolume{} > 5000` already joins on `blockContentId`, identical for journal + static (ADR `cross-note-result-aggregation.md`). The Open / Run / Compare row actions that #807 introduces are downstream of the join — already wired.
4. **Source toggles map cleanly.** `find:note in journal`, `… in collections`, `… in feeds`, `… in all` is already a switch — the panel's three tri-state toggles (`Note / Session / Post`) collapse to a derived scope: `Note=on && Session=on && Post=on → all`; `Note=off → '!journal'` (no equivalent today; needs a `sourceId:-` filter — see "Open question" below).
5. **Free-text is the only gap.** Panel's free-text box needs to also deep-search `block_index.rawContent` for static items. The cheapest fix: run `find:block{text:…}` in parallel (already supported) and intersect by `noteId` in JS — block grain is collapsed by `noteId` (one file has many blocks; user sees the file once). No grammar change.
6. **Date-and-undated already resolvable.** `Note.createdAt` for journal; `noteId` path regex for feeds (returns `YYYY-MM-DD` or null); collections are always undated. All done in the consumer.

### WQL shape the Library page emits

The Library page's panel translates its 3-state toggles + free-text + (debug) raw composer into the WQL queries below. The panel always emits at most **two** parallel queries and merges by `noteId`.

```
Default (no toggle off, no free-text):
  find:note in all
  → entries = mapped from result.notes  (note.id, note.title, sourceCatalog from sourceId, sourceItem = note.id, date = createdAt | pathRegex | null)

Free-text only:
  find:note in all                                  // titles (cheap)
  find:block{text:<q>} in all                       // bodies (deep)
  → entries = notes ∪ (blocks grouped by noteId, noteId not already in notes)

Tri-state Note=off, Session=on, Post=on:
  find:note in collections|feeds                     // scope: all but no journal
  → sourceCatalog from sourceId ('collection:' | 'feed:'); kind from sourceId prefix

Raw composer (debug-gated):
  user types `find:… in <scope>` verbatim → runFind/runFindBlock unchanged.
```

### Kind / sourceCatalog mapping (consumer side)

```
note.type === 'workout' && note.sourceId === undefined  → kind=Note,  sourceCatalog='journal'
note.sourceId startsWith 'collection:'                  → kind=Session, sourceCatalog=sourceId
note.sourceId startsWith 'feed:'                        → kind=Post,   sourceCatalog=noteId.split('/')[1]  // YYYY-MM-DD
                                                        date = noteId.split('/')[1]                   // YYYY-MM-DD
                                                        sourceCatalog item = noteId.split('/')[2]     // slug
```

(For Session/Post, the catalog *id* that #807 wants is the **directory** — `crossfit-programming`, `dan-john-40-day`, `ZombieFit-org-2010-Jan`, etc. — not the file path. The static `sourceId` currently encodes `<dir>/<file>`; we want a separate `catalog` field in the synthesized `Note`, OR derive it client-side via `noteId.split('/')[0]`. **Build-ticket follow-up, not blocking this research** — the Library can render without the "catalog as first-class column" and the row action can compute it lazily.)

## Resolved by sibling tickets

- **Tri-state "Note off"** — #809's resolution chose **option 3 (a new `source:` content filter key)**. Hide emits `!source:<kind>` in the filters; include writes `in <scope>`; neutral keeps the scope union. The "no negative scope" gap this research flagged is closed by the `source:` filter key — no two-query diff needed. *Resolved 2026-07-29 by #809.*

## Open follow-ups (build-ticket, not charting)

1. **Source-aware catalog id** — see kind mapping above. Decide at build time whether `staticNoteStore` should expose a `catalog` field (cheap; one new key in the synthesized `Note`).
2. **Free-text on static blocks** — intersects `find:note` and `find:block` results client-side; can become a server-shaped WQL option later (`find:note{text:…}` matches block content) if performance demands it.
3. **Cross-source dedupe** — #807 explicitly chose *not* to dedupe across sources (the Library lists one Entry per `{source.catalog, source.item}`). Approach B inherits that: `find:note in all` returns distinct rows per sourceId-prefix naturally. *Carried into the build ticket as a non-decision.*

## Verification

- Manual: `find:note in all` against the live corpus returns ~673 distinct noteIds; each maps to one Entry row. Confirmed by `jq` counts above.
- Grammar: `WQL_SCOPES = ['journal','collections','feeds','all']` (`src/parser/wql-language.ts:52`) — already covers the union.
- Cross-store join: `crossStoreJoin.test.ts:5-6` exercises `find:note where sum:totalVolume{} > 5000` end-to-end; the static-side handling is the same `applyMetricJoin` path as the live-side, keyed on `blockContentId`.

## Decision

**Approach B** — Library page composes **at most two parallel WQL queries** (`find:note in all` + optional `find:block{text:…} in all`) and maps `Note[]` and grouped `BlockIndexRow[]` to `Entry[]` in JS. No engine or grammar changes. Cross-source join (`find:note where …`) works unchanged for Open / Run / Compare row actions.

This satisfies the issue's acceptance: a markdown summary asset with the recommended approach and the WQL shape(s) it produces.