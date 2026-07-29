# Research: Block/segment indexing for WQL content surfaces (#783)

**Goal:** Decide how to make notes, markdown blocks, and workout results queryable through one WQL surface, specifically how to index the body of a note so that fenced blocks, headings, and paragraphs are addressable and joinable with `WorkoutResult` rows.

---

## 1. The block model: how note bodies are already segmented

### 1.1 Editor/runtime segmentation

The editor already parses the document into a list of typed sections on every change.

- `src/components/Editor/extensions/section-state.ts:30-70` defines `EditorSection` with:
  - `id` — position-stable (line + content hash).
  - `contentId` — **content-stable identity for `wod` blocks** (the `blockContentId`).
  - `type` — `markdown | wod | frontmatter | code | widget | embed`.
  - `subtype` — for markdown: `heading | paragraph | list | blockquote | table | unknown`.
  - `contentFrom`/`contentTo` — character offsets of the inner content.

For WOD dialect blocks, `contentId` is minted by `blockContentId`, imported from `sectionParser` at `section-state.ts:17` and computed at `section-state.ts:360`.

A coarser, UI-oriented structure is produced by `parseDocumentStructure` in `src/components/Editor/utils/documentStructure.ts:19-71`. It returns `DocumentItem` objects of type `wod | header | paragraph`, splitting markdown at blank lines and headings. This is used by `ScriptIndexPanel.tsx` and `NotePreview.tsx` to render a clickable block index, but **it is not persisted**.

### 1.2 The content-stable hash `blockContentId`

`src/components/Editor/utils/sectionParser.ts:66-71` defines:

```ts
export function blockContentId(content: string): string {
  const normalized = content.trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `bc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
```

It is a deterministic FNV-1a 32-bit hash over the **full normalized fenced content** of a block. It is written as:

- `Section.contentId` / `ScriptBlock.contentId` — `src/components/Editor/utils/sectionParser.ts:336`.
- `WorkoutResult.blockContentId` — `src/services/content/IndexedDBContentProvider.ts:493`.
- `AnalyticsDataPoint.blockContentId` — `src/services/persistence/IndexedDBNotePersistence.ts:215` and `src/services/db/IndexedDBService.ts:382-383`.

### 1.3 Persistence segmentation (the canonical source of truth)

Notes are no longer stored as a single `rawContent` blob. Since the V11 schema change:

- `src/types/storage.ts:38-60` — `NoteSegment` is the versioned content chunk.
  - `id` — positional section id (line-based, same value as `Section.id`/`ScriptBlock.id`).
  - `version` — content generation at that position.
  - `noteId` — parent note.
  - `position` — document order.
  - `dataType` — `wod | h1..h6 | markdown | frontmatter` (`src/types/storage.ts:11`).
  - `data` — for `wod`, the `ScriptBlock`; otherwise `null`.
  - `rawContent` — the markdown text of the segment.

- `src/components/Editor/utils/sectionParser.ts:parseDocumentSections` is the function that turns a full markdown body into `Section[]` and is called by `IndexedDBContentProvider.saveEntry` (`src/services/content/IndexedDBContentProvider.ts:280`) and `updateEntry` (`src/services/content/IndexedDBContentProvider.ts:369`) to write the segment rows.

- `src/services/content/IndexedDBContentProvider.ts:369-456` already performs the full segment diff/retire lifecycle: it re-parses on every save, writes new versions, and marks superseded versions as `isHistory: true`. This is the exact place to hook a block index.

### 1.4 Workout result identity

The result row already carries the keys we need for joins:

- `src/types/storage.ts:82-105` — `WorkoutResult` has `segmentId`, `segmentVersion`, `blockContentId`, `blockId`, `origin`, `pageId`.
- The cross-note join key is `blockContentId` (per `docs/adr/cross-note-result-aggregation.md:22-37`).
- The per-note/incarnation join is `[segmentId, segmentVersion]` (per `docs/adr/versioned-block-identity.md:3-4` and `docs/adr/data-lifecycle/02-database-schema.md:80-81`).

The existing IndexedDB indexes already support block-level reads:

- `results.by-content` and `analytics.by-content` are keyed by `blockContentId` (`src/services/db/IndexedDBService.ts:92,110,560`).
- `results.by-segment` and `segments` compound key `[id, version]` support the positional version join.

### 1.5 Gap for headings and paragraphs

The persisted model stores headings and paragraphs together as `dataType: 'markdown'` segments (only the first heading becomes a `title`/`h1` segment). The editor’s live model and `documentStructure.ts` split them into separate `header`/`paragraph` items. For a block index we should therefore **derive** the finer-grained header/paragraph split from the stored `markdown` segment at index time rather than change the storage schema. The IDs can be positional (`header-${line}`, `paragraph-${line}`) and scoped by the parent `segmentId + version`, which is stable enough for a derived index.

---

## 2. Index strategy options

We need an index that can answer:

- “Which notes contain block `bc-abcdef12`?”
- “Which blocks contain the text `thruster`?”
- “What are all results for the block with this `blockContentId`?” (already answered by `results.by-content` / `analytics.by-content`).
- “What blocks are in the static collection `crossfit-girls/fran`?”

Three options were evaluated.

### 2.1 Option A — parse-on-query

On every `listNotes` or WQL content query, run `parseDocumentSections` or `documentStructure.ts` over the reconstructed `rawContent` of every candidate note and match the predicate in memory.

- **Pros:** No schema change, no migration, reuses existing parser.
- **Cons:** `IndexedDBContentProvider.getEntries` already reconstructs all note content from every segment on every list call (`src/services/content/IndexedDBContentProvider.ts:72-126`), and `listNotes` then scans every title + raw body for a substring (`src/services/persistence/IndexedDBNotePersistence.ts:114-117`). Adding block-level parsing would make each query O(total note content). Acceptable for a small corpus, but it scales poorly for repeated WQL queries and large personal journals.

### 2.2 Option B — persistent block index over `NoteSegment` versions (recommended)

Add a new derived `block_index` object store (or a dedicated projection of the `segments` store) keyed by `[noteId, segmentId, version]` with a secondary index on `blockContentId`. Each row projects one segment into queryable fields:

- `noteId`, `pageId`, `sourceId`
- `segmentId`, `segmentVersion`, `position`, `startLine`
- `dataType` (`wod`, `h1..h6`, `markdown`, `frontmatter`)
- `blockContentId` (for `wod` blocks; null for prose)
- `rawContent` (searchable snippet)
- `isStatic` (false for user notes)

Maintenance is hooked into the existing segment lifecycle:

- `IndexedDBContentProvider.updateEntry` already re-parses and retires segments at `src/services/content/IndexedDBContentProvider.ts:369-456`. For each written/retired segment we write or delete the corresponding `block_index` row in the same transaction.
- `IndexedDBContentProvider.saveEntry` at `src/services/content/IndexedDBContentProvider.ts:280` writes the initial segments; index rows are written there too.

- **Pros:** Block-level lookups become indexed, the same `blockContentId` can join directly to `results`/`analytics`, and the schema change is additive (mirrors how `analytics` was added as a derived fact store).
- **Cons:** Requires a DB version bump, a one-time backfill from existing segments, and extra storage (one small row per segment version — comparable to the existing segments store).

This follows the same derived-store pattern as the analytics store: `src/services/db/IndexedDBService.ts:backfillV12` clears `analytics` and regenerates it from `result.data.logs` (documented in `docs/adr/analytics-store-summary-only.md`). The canonical source is the `segments` store; the block index is disposable and can be rebuilt from it.

### 2.3 Option C — unified fact table for content

Force note/block rows into the existing `AnalyticsDataPoint` store with a `grain: 'block'` or `metric: 'text'` row, then reuse the existing `QueryService` four-stage executor (`src/services/analytics/query/QueryService.ts:44-...`).

- **Rejection:** `AnalyticsDataPoint` is designed for numeric workout metrics (`value: number`, `metricKey`, `effortSlug`, `discipline`, `origin`, etc.) per `src/types/storage.ts:178-211`. Treating prose blocks as numeric facts would stretch the schema and pollute every WQL trend query. The query engine should treat content as a separate source joined by `blockContentId`, not as another metric row.

---

## 3. How static build-time markdown (collections/feeds) participates

Static workout content is bundled at build time via Vite:

- `src/repositories/script-groupings.ts:45-56` uses `import.meta.glob` over `markdown/collections/**/*.md` and `markdown/feeds/**/*.md` to load raw content as strings.
- `src/repositories/script-collections.ts` and `src/repositories/script-feeds.ts` adapt those `Grouping` objects into public `ScriptCollection` / `ScriptFeed` shapes, sorting and caching in memory.
- The static corpus is small enough to pre-process: a workspace scan found **726** collection files and **14** feed files under `markdown/collections` and `markdown/feeds` (740 total static workout content files), plus canvas/syntax examples. Each file is a small markdown document.

### 3.1 Option A — parse at runtime

Call `parseDocumentSections` / `documentStructure` on the first `getScriptCollections`/`getScriptFeeds` load. Simple, but re-parses the entire static corpus on every new session and browser.

### 3.2 Option B — build-time generated index (recommended)

Run the same block segmentation during the build (a Node script that imports `parseDocumentSections` and `documentStructure`) and emit a JSON file such as `generated/static-block-index.json`. Each row uses the same shape as the user `block_index` store but with a synthetic `sourceId` (e.g., `collection:crossfit-girls/fran`) and `noteId` that identifies the static file.

- **Pros:** Static content is immutable, so the index never needs runtime invalidation; the app ships with the same index format it uses for user notes; no parse cost on first load.
- **Cons:** Requires a build-step addition. The index is regenerated on every deploy, which is exactly what static data expects.

Recommendation: **Option B**. The runtime query engine can load the static shard once and treat it as a read-only namespace alongside the user `block_index` store.

---

## 4. Text matching: how far substring gets us

### 4.1 What exists today

There is no full-text or tokenized index. Search is an in-memory substring scan:

- `IndexedDBContentProvider.getEntries` (`src/services/content/IndexedDBContentProvider.ts:72-126`) fetches every note, every segment, resolves every note’s tags, and reconstructs `rawContent` for every entry before filtering.
- `IndexedDBNotePersistence.listNotes` (`src/services/persistence/IndexedDBNotePersistence.ts:114-117`) and `ContentProviderNotePersistence.listNotes` (`src/services/persistence/ContentProviderNotePersistence.ts:112-115`) apply the same predicate:
  ```ts
  entries = entries.filter(entry =>
    entry.title.toLowerCase().includes(search) ||
    entry.rawContent.toLowerCase().includes(search)
  );
  ```
- WQL currently has no `text:` tag. The allowed tag keys are `effort`, `discipline`, `intensity`, `note`, `page`, `origin`, `grain`, `metric`, `block`, `result`, `tags` (`src/parser/wql-language.ts:36-40`).

### 4.2 Realistic scale

- The bundled static corpus is **740** workout content files, each a few kilobytes of markdown. Total static text is small (low single-digit MB).
- The user store is a local IndexedDB (`wodwiki-db`, `DB_VERSION = 12` in `src/services/db/IndexedDBService.ts:127`). There is no explicit cap in the app, but browser IndexedDB quotas are typically tens to hundreds of megabytes. For a personal journal, hundreds to a few thousand notes is realistic.
- At that scale, in-memory substring scanning over a few MB of reconstructed text is fast enough for interactive search and occasional WQL queries. It will not scale to thousands of notes with large bodies or to frequent repeated queries.

### 4.3 Does WQL need a `text:` key?

Yes, if the goal is “one query engine for notes, blocks & results.” The existing WQL keys are all metadata joins (`block`, `note`, `tags`, `effort`, etc.). Searching the body of a note requires a new `text:` predicate. It should match against the `rawContent` field of the block index, not against numeric fact rows.

The WQL `TagFilter` matcher (`src/services/analytics/query/wql.ts:23-29`) is built for exact value / wildcard equality. A `text:` filter would need a new predicate path (substring containment or token overlap) rather than being squeezed into the existing equality matcher.

### 4.4 Substring vs tokenized index

- **Substring** is sufficient for the current corpus and for a personal journal in the low hundreds/low thousands of notes. It matches the existing `listNotes` behavior and is trivial to implement over a `block_index.rawContent` column.
- **Tokenized / inverted index** becomes worthwhile when:
  - The user note count exceeds a few thousand, or
  - WQL queries run repeatedly on dashboards, or
  - Phrase search, prefix search, stemming, or ranking is required.

There is no evidence in the current code or stores that those conditions are met today. Tokenization adds complexity (word splitting, normalization, stop words, index rebuilds) and should be deferred until the block index proves too slow.

---

## Recommendation

Implement a **persistent, derived block index** plus a **build-time static index**, and expose them through a new content stage in the WQL executor.

1. **New `block_index` object store** in `wodwiki-db` (or a dedicated projection of the `segments` store), keyed by `[noteId, segmentId, segmentVersion]` and with a secondary index on `blockContentId`. Each row projects the fields needed for content queries: `noteId`, `pageId`, `sourceId`, `position`, `startLine`, `dataType`, `blockContentId`, `rawContent`, and `isStatic: false`.
2. **Maintain the index in the existing segment lifecycle.** `IndexedDBContentProvider.updateEntry` and `saveEntry` already re-parse and diff/retire `NoteSegment` rows; write and delete the corresponding `block_index` rows in the same transaction. This makes invalidation automatic and matches the derived-store pattern used for the `analytics` store (`docs/adr/analytics-store-summary-only.md`, `src/services/db/IndexedDBService.ts:backfillV12`).
3. **Backfill once.** A DB version bump should rebuild the index from the existing `segments` store, the same way V12 rebuilt `analytics` from `result.data.logs`. This keeps the new store disposable and the segments store canonical.
4. **Generate the static index at build time.** Add a build step that runs `parseDocumentSections`/`documentStructure` over `markdown/collections/**/*.md` and `markdown/feeds/**/*.md` and emits `generated/static-block-index.json` with the same row shape but `isStatic: true` and a synthetic `sourceId`/`noteId`. Load it as a read-only shard in the query engine.
5. **Extend `QueryService`** with a content-source stage. When a WQL query contains `block:` or `text:` filters, select from the `block_index` first, then join to `results`/`analytics` on `blockContentId` for the final aggregation. Treat `text:` as a substring match over `rawContent` initially; add a tokenized inverted index only if profiling shows it is necessary.
6. **Keep the editor/storage model unchanged.** The editor already produces the right segmentation and content-stable IDs; the persistence model already versions segments. The block index is a derived projection, so the risk to the editor is minimal and the rebuild precedent is well established.

This gives the project a single query engine that can resolve notes, blocks, and results through the same `blockContentId`/`segmentId` join keys while staying consistent with the existing V11/V12 derived-store architecture.
