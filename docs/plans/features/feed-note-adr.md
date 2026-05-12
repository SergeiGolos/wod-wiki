# ADR: FeedNote — Composing Journal List + Collection Canvas as a New Note Subtype

**Status**: Proposed  
**Date**: 2026-04-30  
**Refs**: `feed-note-prd.md`, `note-editor-adr.md`

---

## Context

wod-wiki has four distinct page contexts for rendering markdown content, each implemented as a named subtype:

| Subtype | Category Key | Source | Editable | List View |
|---|---|---|---|---|
| PlaygroundNote | `playground` | IndexedDB | ✓ | ✗ |
| JournalNote | `journal` | IndexedDB | ✓ | ✓ (date scroll) |
| CollectionNote | `collections` | Bundled `.md` | ✗ | ✓ (folder list) |
| WorkoutNote | `<category>` | Bundled `.md` | ✓ | ✗ |

The request is to add a fifth subtype — **FeedNote** — that reads bundled markdown files with a date-stamped naming convention and presents them with the Journal's chronological scroll UI and the Collection's read-only canvas renderer.

The constraint is: **no new reusable UI components**. Everything must be assembled from what already exists.

---

## Decision

### 1. New Category Key: `feeds`

FeedNote uses `category: 'feeds'` as its type discriminator, parallel to `journal`, `playground`, etc. This is consistent with how `NON_COLLECTION_CATEGORIES` and `INLINE_RUNTIME_CATEGORIES` sets gate behavior in `pageUtils.ts`.

### 2. File Convention

Files live in `markdown/feeds/` and are named:

```
YYYY-MM-DD-HHMM-{slug}.md
```

This prefix is parsed (not stored in front matter) to produce the date key used by `JournalDateScroll`. The slug is title-cased for display. Files not matching the pattern are ignored at parse time.

### 3. List View: `FeedsListPage`

A new view file at `playground/src/views/FeedsListPage.tsx` wraps `JournalDateScroll` — the same component used by `JournalWeeklyPage`. Instead of populating it from IndexedDB results, it populates it from the statically parsed `feedItems` array (derived from `import.meta.glob`). No new scroll/date infrastructure is required.

### 4. Detail View: `FeedNotePage`

A new page file at `playground/src/pages/FeedNotePage.tsx`. Because feed files are:
- Bundled (not user-editable)
- Markdown canvas documents (may contain wod blocks for display)
- Read-only

...the correct renderer is `MarkdownCanvasPage` (already used for `/collections/:slug` entries), wrapped in `CanvasPage` shell (already used for `/collections`). The only work is routing the slug param to the right file and passing the parsed `CanvasPage` data structure.

### 5. Routes

Two new routes added to `App.tsx`:

```
/feeds              → FeedsListPage (wrapped in CanvasPage shell)
/feeds/:slug        → FeedNotePage  (wrapped in CanvasPage shell)
```

The `:slug` parameter is the full filename stem (`YYYY-MM-DD-HHMM-{slug}`), URL-encoded. This avoids ambiguity if two entries share the same slug on different dates.

### 6. Navigation

A new L1 nav item added to `appNavTree.ts` immediately after `collections`:

```ts
{
  id: 'feeds',
  label: 'Feeds',
  level: 1,
  icon: NewspaperIcon,  // from @heroicons/react/20/solid
  action: { type: 'route', to: '/feeds' },
  isActive: isRouteActive('/feeds'),
}
```

No L2 panel needed for MVP.

### 7. Data Pipeline

```ts
// In App.tsx or a dedicated feedFiles.ts
const feedFiles = import.meta.glob('../../markdown/feeds/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

// parseFeedFiles() — pure function, returns FeedItem[]
interface FeedItem {
  slug: string         // full filename stem (used as route param)
  dateKey: string      // 'YYYY-MM-DD' (used by JournalDateScroll)
  time: string         // 'HH:MM' (for display in list row)
  title: string        // formatted from slug suffix
  content: string      // raw markdown
}
```

`parseFeedFiles()` lives in a new utility `playground/src/lib/feedFiles.ts`. It is a pure function with no side effects — easy to unit test.

### 8. `JournalDateScroll` Adaptation

`JournalDateScroll` currently receives `JournalEntrySummary` objects keyed by date. Feed entries need to map onto this same shape. `FeedsListPage` transforms `FeedItem[]` into a `Map<string, JournalEntrySummary>` before passing to the scroll component. No changes to `JournalDateScroll` are required.

---

## Alternatives Considered

### A. Reuse the Collections list view instead of Journal scroll

Collections renders a flat folder list (`CollectionsPage`). It has no date grouping, no chronological scroll, and no calendar strip. Rejected — the date-oriented UX is the defining feature of FeedNote.

### B. Add date-parsing to the existing workout category system

The `workoutFiles` glob already loads `markdown/**/*.md`. We could detect `feeds/` entries there and add them to the existing item stream. Rejected — it would contaminate the workout search index and make the category routing logic harder to reason about. FeedNote is a distinct concept; it deserves its own data path.

### C. Extend JournalWeeklyPage to also show feed entries

Would couple journal-specific IndexedDB logic with static file logic. Rejected — separation of concerns. The Journal is about user activity; the Feed is about curated content.

### D. Store feed entries in IndexedDB on first load

Would enable full-text search and offline mutation. Out of scope for MVP — the read-only, bundled-file model is explicitly simpler and avoids sync complexity.

---

## Consequences

**Positive:**
- Zero new UI components introduced.
- `JournalDateScroll`, `MarkdownCanvasPage`, `CanvasPage`, `JournalPageShell` are reused as-is.
- Feature is additive — no existing routes, components, or data flows are modified.
- `parseFeedFiles()` is a pure function — trivially testable.

**Negative / Watch-outs:**
- The `feeds/` folder must be maintained manually (no in-app creation UI).
- If `JournalDateScroll`'s `JournalEntrySummary` type evolves, the mapping adapter in `FeedsListPage` may need updating.
- Large numbers of feed files will increase bundle size (they are eagerly bundled). This is acceptable for typical curated content volumes; if feeds grow large, lazy loading can be added later.

---

## Implementation Checklist

- [ ] `markdown/feeds/` folder created with at least one sample file
- [ ] `playground/src/lib/feedFiles.ts` — `parseFeedFiles()` + `FeedItem` type
- [ ] Unit tests for `parseFeedFiles()` (valid patterns, invalid patterns, edge cases)
- [ ] `playground/src/views/FeedsListPage.tsx` — wraps `JournalDateScroll`
- [ ] `playground/src/pages/FeedNotePage.tsx` — wraps `MarkdownCanvasPage` + `CanvasPage`
- [ ] Routes `/feeds` and `/feeds/:slug` added to `App.tsx`
- [ ] `appNavTree.ts` — Feeds L1 nav item added after Collections
- [ ] `currentWorkout` / `isActive` detection in `AppContent` updated for `/feeds` paths
- [ ] Storybook story for `FeedsListPage`
- [ ] Storybook story for `FeedNotePage`
