---
tags: [domain-model]
store: notes
keyPath: "id"
db: wodwiki-db (v20)
---

# Note

> [!info] Review status
> Current State describes code; Future State contains review recommendations for feedback, not implemented changes or closed decisions. See the [typed-notes review](../wayfinder/typed-notes-unification-review.md) and [[todo#Datatype review guide]].

## Current State (Implemented in Code)

- **Store:** `notes`
- **Key path:** `id` (string; UUID is the intended canonical identity, with current exceptions below)
- **Type source:** `apps/playground/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

### Domain role (Current)

A note is the owning unit of authored content. The `notes` row holds identity, routing, placement and provenance; its content lives in ordered, versioned [[NoteSegment]] rows rather than a second `Note.rawContent` field.

| Representation today | Distinction |
|---|---|
| `note`, `journal`, `playground`, `template` | The current `NoteKind` values; missing type reads as `note`. |
| Journal placement | `pageId` identifies a date-bearing [[Page]]; placement is separate from content type. |
| Bundled collection/feed content | Seed provenance and `catalog`; discovery does not imply `pageId` membership. |
| Dashboard content | Markdown with `dashboard: true` and query fences, not a stored `dashboard` kind. |
| [[Effort]] content | An effort is a note in the domain, but user effort saves currently write registry records without a linked `notes` row. |

The stored [[Page]] is a grouping/address record, not automatically a note row. Neither Page tagging nor effort-to-note tagging is established merely by calling those concepts notes; [[NoteTag]] targets a concrete note identity.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Owning storage identity; normally UUID, but current playground creation can mint timestamp IDs |
| `title` | string | Display name |
| `slug?` | string | Route/source locator; resolve to ownership identity rather than using it as a join key |
| `pageId?` | string | FK → [[Page]] — owned placement, not every page/query where the note appears |
| `createdAt` | number | Unix ms |
| `type?` | NoteKind | 'note' \| 'template' \| 'playground' \| 'journal' |
| `sourceId?` | string | Note this one was created from — template/collection source (N-10) |
| `catalog?` | string | Catalog directory id for static notes |
| `seedOrigin?` | 'seed' \| 'user' | Seed-import ownership marker; absent ≡ user-owned |
| `seedVersion?` | number | manifest.version of last seed write |
| `seedChunkId?` | string | Seed chunk provenance |

Identity is not yet uniform across sources: seed import derives an ID from its path, while static note projections expose block-index locators. Preserve those locators for Library deep links while defining canonical joins; see [[BlockIndexRow]]. `createdAt` is also not universally an authored date: seed rows use the seed-build timestamp. The journal day lives on [[Page]].

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-slug` | `slug` | yes | slug (route) → UUID (V8) |
| `by-page` | `pageId` | no | page-scoped note queries (V10) |

### Relationships (Current)

#### Outgoing (this row references)

- `pageId` → [[Page]] — owned placement, independent of query inclusion
- `sourceId` → [[Note]] — self: creation source (template/collection)

#### Incoming (referenced by)

- [[NoteSegment]].`noteId`
- [[Session]].`noteId`
- [[Attachment]].`noteId`
- [[NoteTag]].`noteId`
- [[EventRecord]].`noteId`
- [[BlockIndexRow]].`noteId`
- [[FieldSourceRecord]].`id` — polymorphic `note:<id>`

#### Relationship tables

- [[NoteTag]] — joins Note ↔ Tag
- [[FieldSourceRecord]] — field contributions of this note

---

## Future State (Proposed)

### Recommended contract

- Keep one owning note identity and one authored content representation in [[NoteSegment]]. Page composition must not copy or merge away ownership.
- Keep `Note.type` as the existing app descriptor; use type for validation/configuration and default presentation, not permission, date, provenance or responsive layout. Do not create a parallel `Page.kind` solely to duplicate it.
- Preserve `catalog` and current Library locators. Query-defined collection pages do not require replacing them with `pageId`; membership belongs in [[collection]].
- Do not add note-level `contentHash` or a `by-content` index for this effort. Block-content comparison and occurrence identity are different concerns owned by [[NoteSegment]] and [[BlockIndexRow]]. Note deduplication is not a requirement here.
- Tags classify content; they neither create page/effort ownership nor grant source-write access. Mode and write destinations belong in [[Page#Mode and write destinations]].
- **Dual-ID contract on query/provider outputs:** queries and content providers return note records carrying both `noteId` (authoring/editor target) and `pageId` (composition/page render target). This enables list surfaces to link to either the canonical editor or the containing page.
- **Universal editor route:** every stored note opens in the canonical editor at `/notes/:noteId`. Sub-selection in dates (`/journal/:date/:noteId`) and collection-scoped notes (`/collection/:slug/:noteId`) fold into `/notes/:noteId`.
- **Slugs route to pages, not notes:** note slugs resolve to ownership IDs; a slug route (`/p/:slug` or specialized `/c/:slug`, `/e/:slug`, `/d/:slug`) addresses the composed [[Page]], while the underlying authored note is addressed by UUID at `/notes/:noteId`.

### Type-specific responsibilities

These are review targets, **not a proposed closed enum** or new tables.

| Type / flavor           | Responsibility and question owner                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Ordinary note           | Default authored content; no extra projection.                                                        |
| Journal                 | Placement on a journal date; whether `journal` remains a distinct type is open.                       |
| Playground              | Runnable scratch workflow; result origin/destination belongs to [[Session]], not just the type. |
| Template                | Creation source for a new note; copies own their edits and retain provenance.                         |
| Syntax                  | Teaching configuration and local examples; see [[Page#Syntax and dashboard composition]].             |
| Collection / dated feed | Prose plus query-derived listings; see [[collection]].                                                |
| Effort                  | Authored properties plus parsed registry projection; see [[Effort]].                                  |
| Dashboard               | Existing note configuration plus query presentations; see [[Page#Syntax and dashboard composition]].  |

### Wayfinder questions and proposed answers

Owner: [Pick the note-type taxonomy and where type lives](https://github.com/SergeiGolos/wod-wiki/issues/1026).

- **What is a type, versus placement or grouping?** Recommended answer: a content/configuration descriptor. Page placement, tags, creation source and import ownership stay separate. No new supertype/tag mechanism is needed just to compose notes.
- **Where does the descriptor live and how do routes use it?** Recommended answer: consume the existing note descriptor plus relevant configuration through the host; it selects a default presentation, never authorizes a write. Keep current frontmatter-driven flavors until an explicit descriptor migration is agreed.
- **Does every candidate become a `NoteKind` value?** Still open: which of syntax, collection, effort and dashboard need explicit values, whether journal/template are types or workflows, and how persisted descriptors agree with imported frontmatter. Require one documented precedence and preservation of unknown descriptors before changing imports.
- **Does collection mean Catalog?** Recommended answer: no. Catalog retains its existing bundled-source meaning; a collection page is a query-composed presentation. The detailed distinction is in [[collection]]; glossary adoption remains part of the ticket.

**Feedback case:** a template-derived playground note appears in two collection queries and on a journal date. Which facts change its type, and which merely describe source, placement or presentation? Its owning ID and saved results must not change because another query displays it.

The earlier results-to-sessions proposal remains separate in [[Session]]; it is not a prerequisite for typed-note composition.

### Source evidence

- [Storage shapes](../../apps/playground/src/types/storage.ts); [content creation and defaults](../../apps/playground/src/services/content/IndexedDBContentProvider.ts).
- [Seed ownership](../../apps/playground/src/services/seed/SeedImporter.ts); [static-note projection](../../apps/playground/src/services/content/staticBlockIndex.ts).

## Map

![[domain-model.canvas]]
