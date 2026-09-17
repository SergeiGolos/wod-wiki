# Specification: Page-Centric Composition & CodeMirror Segment Architecture

**Status:** Ready for Implementation  
**Related Epics/Issues:** Wayfinder #1025, #1026, #1027, #1028, #1029, #1030, #1031, #1033  
**Target Applications/Packages:** `apps/playground`, `@bitcobblers/wod-wiki-ui`, `@bitcobblers/wod-wiki-wql`, `@bitcobblers/wod-wiki-engine`

---

## 1. System Architecture: Page vs Note vs Segment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Page (Routing & Context Home)                                                │
│ Database Store: `page`                                                       │
│ Keys: `date` (YYYY-MM-DD) OR `slug` (string)                                 │
│ Responsibilities: Route resolution, default interaction mode, layout shell   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Composes (1:1 Owned, 1:N WQL, 1:N Embeds)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Note (Content & Storage Unit)                                                │
│ Database Stores: `notes` + `segments`                                        │
│ Placement: Single `pageId` foreign key (canonical home date or slug)         │
│ Content: Ordered, versioned `NoteSegment` rows (`dataType`, `rawContent`)    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Renders via
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ CodeMirror 6 Extensions & Presentation Widgets                               │
│ Package: `@bitcobblers/wod-wiki-ui/extensions`                               │
│ Segments: Markdown, WOD (time/log), Query (WQL), Frontmatter, Widgets        │
│ Modes: Controlled by Page (Read-Only, Editable, Structured Metadata)         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Contracts

### 2.1. Page Contract (`apps/playground/src/types/storage.ts`)

`Page` represents an addressable route and layout context. It does **not** duplicate note content.

```typescript
export interface Page {
  id: string;              // UUID
  date?: string;           // YYYY-MM-DD (unique when present, calendar route)
  slug?: string;           // Named slug (unique when present, custom route)
  title?: string;          // Human-readable title
  createdAt: number;       // Timestamp ms
}
```

**Routing Rules:**
- **Calendar Route (`/journal/:date`):** Lookup `page` by `date == :date`. If absent, create on the fly.
- **Named Routes (`/collections/:slug`, `/effort/:slug`, `/guide/syntax/:slug`, `/dashboard/:slug`):** Lookup `page` by `slug == :slug`.

### 2.2. Note Placement vs. Inclusion Contract

- **Placement (Canonical Home — 1:1):**
  - Stored in `Note.pageId`.
  - For Journal notes: `note.pageId` equals the calendar `page.id`.
  - For standalone notes (Playground / Scratch): `note.pageId` is unset or points to its custom playground page.
  - **Rule:** Workout execution (`Session`), recorded results, and attachments attach strictly to the note’s canonical `pageId` (calendar day).
- **Inclusion (Cross-Page Appearance — 1:N):**
  - **Pattern A: WQL Query (`find:note{...}`)**
    Notes appear dynamically in Collections, Feeds, and Dashboards based on tags, source classification, or date range. `pageId` is **never** mutated.
  - **Pattern B: Explicit Reference / Embed (`![[slug]]` or `source: path`)**
    Teaching/Syntax pages embed specific workout notes as runnable examples without taking ownership of the note.

---

## 3. Surface Specifications & Mode Matrix

| Surface | Route Pattern | Page Lookup | Note Attachment | Default Mode | Allowed Actions |
|---|---|---|---|---|---|
| **Journal** | `/journal/:date/` | `date = :date` | Direct Owned (1:N Notes) | `edit` | Full source edit, run workout (records to `pageId`), schedule |
| **Effort** | `/effort/:slug` | `slug = :slug` | Direct Owned (1:1 Note) | `edit` (structured) | Edit frontmatter via metadata widget, edit workout blocks, run |
| **Syntax / Guide** | `/guide/syntax/:slug` | `slug = :slug` | Authored text + embedded examples | `read-only` | Browse prose, try example locally (scratchpad run/reset), copy |
| **Collection** | `/collections/:slug` | `slug = :slug` | Authored README + WQL queries | `read-only` | Browse README, execute live queries, navigate to member note |
| **Dashboard** | `/dashboard/:slug` | `slug = :slug` | Direct Owned Note (`dashboard: true`) | `read-only` / `edit` | Temporary filter adjustment, toggle edit to modify query fences |

---

## 4. CodeMirror & Extension Requirements

### 4.1. Safe Multi-Note Page Composition
- **Problem:** `JournalDatePage` previously concatenated all notes on a date into one string and split them by line index on save, dropping content if lines were inserted above.
- **Requirement:**
  - On multi-note pages (Journal), render **one distinct `NoteEditor` per note** inside the page layout.
  - Alternatively, if seamless whole-page editing is retained, line-offset slicing must be replaced by transaction-mapped document boundaries (`StateField` tracking note ranges across edits).
  - Individual note saves must write strictly to `notePersistence.mutateNote(note.id, { rawContent })`.

### 4.2. Effort Metadata Extension Binding
- **Problem:** `EffortDetailPage` currently uses custom HTML inputs and writes directly to `registry.upsert`, bypassing the `Note` store. `FrontmatterCompanion` exists in `NoteEditor` but is never mounted because `enableOverlay` is `false`.
- **Requirement:**
  - Pass `enableOverlay: true` to `NoteEditor` on effort pages.
  - Guard `FrontmatterCompanion` (`FrontmatterCompanion.tsx:271`):
    - Check `view.state.readOnly` before dispatching changes.
    - Preserve all unparsed/custom frontmatter fields and YAML tags (`tags: [...]`).
    - Validate unquoted hyphenated slugs so `documentToEffort` does not fail on subsequent parse.
  - Save pipeline: Document change in `NoteEditor` persists to `Note`/`NoteSegment`, which atomically projects into the `efforts` registry store.

### 4.3. WQL Query Fences & Navigation
- **Problem:**
  - `section-state.ts` fails to parse `query` fences with attributes (e.g. ````query:goal-rings goal=100````).
  - `QueryBlockView.tsx` `FindResultList` renders static `<li>` text with no link or click handler.
  - `find:note` accepted `note:` filter key but ignored it in `runFind`.
- **Requirement:**
  - Update `section-state.ts` regex to parse fence attributes following `query:<type> <attrs>`.
  - Wire `entryOpenHref` (`apps/playground/app/lib/entryActions.ts:25`) into `QueryBlockView.tsx`:
    - Render matching notes as clickable links/cards that navigate to `/journal/:date/` or `/collections/:cat/:item`.
  - Implement `note:` filter support in `QueryService.runFind` and `runFindBlock` to match exact note IDs.

### 4.4. Editor Mode Propagation & Reconfiguration
- **Problem:**
  - `ReactQueryBlock.eq` omits `readOnly` in equality check, preventing the edit pencil from hiding when mode toggles.
  - `WidgetCompanion` memoizes by `sectionId` and misses live document updates.
- **Requirement:**
  - Include `options.readOnly` in `ReactQueryBlock.eq`.
  - Subscribe `WidgetCompanion` to document version changes (`docVersion` from `sectionGeometry`).
  - Disable keyboard wrappers (e.g. `Mod-Shift-w` wrap in time fence) when `view.state.readOnly` is active.

---

## 5. Implementation Plan

### Phase 1: Engine & Query Grounding (WQL & Registry)
- [ ] **Task 1.1: Support `note:` filter in `QueryService.runFind`**  
  File: `packages/wql/src/QueryService.ts`  
  Add `filter.key === 'note'` handler in `runFind` and `runFindBlock` matching exact IDs.
- [ ] **Task 1.2: Fix WQL fence parsing with attributes**  
  File: `packages/ui/src/extensions/section-state.ts`  
  Update `matchContentFence` to support trailing attributes and spans.
- [ ] **Task 1.3: Populate `Entry.tags` for stream grouping**  
  File: `apps/playground/app/lib/entrySearch.ts`  
  Hydrate tags from `staticTagIndexFromBlocks` / `note_tags` so `/collections` groups by `{tag}` correctly.

### Phase 2: CodeMirror Extensions & Mode Protection
- [ ] **Task 2.1: Fix widget & query mode equality and updates**  
  Files: `packages/ui/src/extensions/query-block-preview.tsx`, `apps/playground/src/components/organisms/editor/WidgetCompanion.tsx`  
  Include `readOnly` in widget `eq` checks; update `WidgetCompanion` to re-render on doc edits.
- [ ] **Task 2.2: Guard FrontmatterCompanion & preserve custom keys**  
  File: `apps/playground/src/components/organisms/editor/FrontmatterCompanion.tsx`  
  Prevent writes when `readOnly: true`; preserve YAML comments and unparsed keys during serialisation.
- [ ] **Task 2.3: Wire interactive note navigation in `FindResultList`**  
  File: `packages/ui/src/blocks/QueryBlockView.tsx`  
  Pass `onOpenNote` callback and render navigable buttons/anchors using `entryOpenHref`.

### Phase 3: Surface Integration & Safe Persistence
- [ ] **Task 3.1: Effort detail page unification**  
  Files: `apps/playground/app/pages/EffortDetailPage.tsx`, `apps/playground/app/hooks/useEffortContent.ts`  
  Mount `NoteEditor` with `enableOverlay: true`; unify save so document updates write to `notes` store and project into `efforts` registry.
- [ ] **Task 3.2: Multi-note journal boundary isolation**  
  File: `apps/playground/app/pages/JournalDatePage.tsx`  
  Mount distinct `NoteEditor` instances per note ID on the date page to prevent boundary slicing data loss.
- [ ] **Task 3.3: Syntax & collection page query embedding**  
  Files: `apps/playground/app/canvas/CanvasProse.tsx`, `apps/playground/app/canvas/RunwayAdapter.tsx`  
  Allow collection README and syntax pages to render live, interactive query blocks via `QueryBlockView` while keeping parent page text read-only.

---

## 6. Verification & Acceptance Criteria

1. **Effort Note Verification:**
   - Open `/effort/back-squat`. Edit MET in the structured overlay.
   - Verify frontmatter source in CodeMirror updates in real-time.
   - Save and reload: verify both `notes` and `efforts` tables reflect the change without clobbering unparsed custom fields.
2. **Syntax / Guide Verification:**
   - Open `/guide/syntax/custom-metrics`.
   - Verify page text is uneditable.
   - Edit the embedded example in the runway window and click "Run": verify results record to a temporary playground note while original seed source is untouched.
3. **Collection Query Navigation:**
   - Insert ````query\nfind:note{source:journal, tags:strength}\n```` into a collection note.
   - Verify query renders a list of matched notes.
   - Click a note in the list: verify it deep-links directly to its home calendar route (`/journal/:date/`).
4. **Journal Boundary Isolation:**
   - Create two notes on the same date.
   - Add lines to the top note and save.
   - Verify neither note loses text and each maintains its own UUID and segment versions.
