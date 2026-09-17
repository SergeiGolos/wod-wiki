---
tags: [domain-model]
store: segments
keyPath: "[id, version]"
db: wodwiki-db (v20)
---

# NoteSegment

> [!info] Review status
> Current State describes persistence; Future State proposes the source/rendering contract for feedback. No new segment enum, V20 migration or ticket resolution is implied. See [[todo#Datatype review guide]].

## Current State (Implemented in Code)

- **Store:** `segments`
- **Key path:** `[id, version]`
- **Type source:** `apps/playground/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

Versioned chunk of an owning [[Note]]'s content. Content changes create new incarnations keyed `[id, version]`; superseded rows are flagged `isHistory`. This storage unit is not interchangeable with an editor section, a runtime output grain, or a canvas Page Block.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Section occurrence identity; generated using position/content unless supplied by metadata |
| `version` | number | 1, 2, 3… bumps on content change; key part 2 |
| `noteId` | string | FK → [[Note]] |
| `position?` | number | Ordinal within parent note, document order (V11) |
| `pageId?` | string | FK → [[Page]] — copied from parent note (V10) |
| `dataType` | SegmentDataType | 'script' \| 'youtube' \| 'markdown' \| 'header' \| 'frontmatter' \| 'wod' \| 'title' \| 'h1'…'h6' |
| `data` | ScriptBlock \| null | Structured JSON payload for WOD sections |
| `rawContent` | string | Stored source fragment; workout/frontmatter delimiters are reconstructed on read, so not a byte-exact original |
| `createdAt` | number | When this version was saved |
| `updatedAt?` | number | Last touch of this incarnation (V10) |
| `isHistory?` | boolean | true for superseded versions; false for latest per id |

The normal content provider writes `wod`, `markdown`, `frontmatter` and `h1`–`h6`; the enum still admits legacy values. It stores query/widget fences within markdown. Seed import initially stores an entire note as one markdown segment, so editor section count is not necessarily stored row count.

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-note` | `noteId` | no | segments of a note |
| `by-type` | `dataType` | no | filter by kind |
| `by-page` | `pageId` | no | page-scoped queries (V10) |
| `by-history` | `isHistory` | no | live vs superseded |

### Relationships (Current)

#### Outgoing (this row references)

- `noteId` → [[Note]] — parent
- `pageId` → [[Page]] — copied from parent note

#### Incoming (referenced by)

- [[Session]].`segmentId + segmentVersion` — recorded occurrence/version, distinct from a same-content join
- [[EventRecord]].`segmentId + segmentVersion`
- [[BlockIndexRow]].`segmentId + segmentVersion` — derived projection

---

## Future State (Proposed)

### Taxonomy questions and proposed answers

Owner: [Name and bound the segment taxonomy](https://github.com/SergeiGolos/wod-wiki/issues/1027).

- **What does segment mean here?** Proposed answer: an ordered piece of authored note content. Qualify the other representations: stored NoteSegment, editor section, derived [[BlockIndexRow]], runtime output grain and canvas Page Block. No global rename is required to describe their mapping.
- **Where does kind live?** Proposed answer: source syntax determines meaning; editor recognition and storage classification serve different jobs. Keep existing storage kinds; a query presentation suffix is not a new stored type. `script`, `header`, `title` and `youtube` enum compatibility does not make them required new domain kinds.
- **What qualifies as a new kind?** Proposed answer: distinct source semantics plus a real consumer, valid/invalid/unknown handling, editing interaction and read presentation. Reuse the existing registry/extensions. Add a storage classification only if persistence/query semantics cannot use the current mapping.
- **What about scrolling content?** Proposed answer: page layout unless it has independent authored semantics; [[Page#Syntax and dashboard composition]] owns that choice. Headings remain content, not a parallel hierarchy of page records.

### Source and rendering crosswalk

Owner: [Map every segment kind to edit and read-only rendering](https://github.com/SergeiGolos/wod-wiki/issues/1029).

The source/storage column records current mappings; the interaction columns are **recommended behavior**, not a claim of implemented parity. One presentation may serve both modes with source-authoring controls enabled only when allowed.

| Content | Current source / storage | Edit interaction | Read presentation and recovery |
|---|---|---|---|
| Prose, headings, lists, tables | Markdown; provider stores `markdown` or `h1`–`h6` | Text/structural editing with shared previews | Same formatted content, links and heading navigation |
| Workout | `time` / `log` fences → `wod` | Edit source; run through the host's existing runtime | Run/results when supported, with explicit destination; invalid source remains inspectable |
| Frontmatter | Delimited metadata → `frontmatter` | Validate supported properties; preserve unrelated keys and draft on error | Apply valid configuration without making metadata another independently writable record |
| Query / WQL | `query` fence + presentation suffix → stored within `markdown` | Shared query composer/source patch and result presentation | Inspect, navigate results, use temporary controls; no source save; display query errors |
| Registered widget | `widget:<name>` fence → stored within `markdown` | Shared config interpretation and authoring interaction | Same content without source-authoring controls; unknown widget/invalid config retains original source |
| Image, link, video embed | Markdown/link recognized by editor → stored within `markdown` | Edit source with existing URL/content validation | Shared safe embed/link; fallback keeps source recoverable |
| Generic / unknown code fence | Generic code → stored within `markdown` | Ordinary source editing, not silent coercion to a known widget | Code/source fallback; do not discard unknown tags or malformed drafts |

Query tables/charts are presentation variants of a Query Document, whose definitions stay local to that block. `find:` note listings need navigable results; they are not chart widgets just because both execute WQL. Dashboard layout and spans remain in the existing shared dashboard model.

### Widget authoring and lifecycle

Evidence: [Research: CodeMirror 6 patterns for mode-aware block widgets](https://github.com/SergeiGolos/wod-wiki/issues/1032#issuecomment-5705340117) is already closed research, not an implementation.

- Carry forward its explicit read-only option/prop precedent. Mode policy is owned by [[Page#Mode and write destinations]], not inferred from a widget name.
- Gate every authoring entry point and the source-write operation. A hidden pencil does not stop Enter/blur/save or a direct CodeMirror transaction; trusted content loads and allowed Run/inspection are different operations.
- Consolidate overlapping `NoteEditor`/`editorPreset` recipes and in-flow/overlay parsing semantics using existing modules. Do not create a second universal renderer or silently substitute empty config for malformed source.
- Require mode changes to preserve valid drafts, focus and allowed runtime/query state, or explicitly explain the reset. Reconfiguration is not proof of that behavior; widget equality/update handling must include behavior-bearing inputs.

### Identity and round-trip questions

- **Which identity owns state/results?** Recommended answer: occurrence plus version for a specific run; block-content identity for intentional same-content history. Two identical blocks still need distinct edit targets. See [[Session]].
- **Is source preserved byte-for-byte?** Not today: delimiters are reconstructed and sections can be matched by position/type. Recommended minimum: preserve unknown fences, metadata, query attributes, ordering and recoverable drafts. Exact whitespace/delimiter normalization and occurrence preservation across edits remain open acceptance decisions.
- **Do we need `contentHash` on every segment?** Not for this map. Retain existing workout content IDs; require a concrete prose/query deduplication use before adding a field/index. The previous V20 proposal is not a prerequisite or adopted migration.
- **Are content IDs already consistent across editor and persistence?** Source inspection shows different functions: editor normalization emits `wblk-…`; persistence's trimmed FNV-1a emits `bc-…`. Do not assume cross-path equivalence from the shared name; establish the canonical contract before migration or cross-source joins. No runtime compatibility test was performed for this documentation update.

**Feedback case:** two identical workouts surround an unknown widget and a query with extra attributes. Edit above them, switch mode, save/reopen and run the second workout. Which normalizations are acceptable? Source must stay recoverable and the run/edit target must remain the second occurrence.

### Source evidence

- [Editor sections and identity](../../packages/ui/src/extensions/section-state.ts); [persistence parsing and identity](../../apps/playground/src/components/Editor/utils/sectionParser.ts).
- [Stored kind conversion and source reconstruction](../../apps/playground/src/services/content/IndexedDBContentProvider.ts); [seed segmentation](../../apps/playground/src/services/seed/SeedImporter.ts).
- [Shared editor preset](../../packages/ui/src/extensions/editorPreset.ts); [note host](../../apps/playground/src/components/organisms/editor/NoteEditor.tsx); [widget adapter](../../packages/ui/src/extensions/widget-block-preview.tsx); [query adapter](../../packages/ui/src/extensions/query-block-preview.tsx).

## Map

![[domain-model.canvas]]
