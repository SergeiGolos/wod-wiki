# Content Types Architecture

*Design document — covers the three content sources, their page modes, action rules, and the three template shells that display them. Intended as the single source of truth for the content-type system going forward.*

---

## 1. The Three Content Sources

| Source | Origin | Persistence | Mutability |
|--------|--------|-------------|------------|
| **Journal** | User-authored, date-keyed | `playgroundDB` (IndexedDB) under `journal/YYYY-MM-DD` | Mutable (today); read-only (history/future) |
| **Collection** | Bundled at build time from `markdown/collections/{slug}/{file}.md` | None — memory only | Immutable; user can "adopt" content into Journal |
| **Feed** | Bundled at build time from `markdown/feeds/{slug}/{YYYY-MM-DD}/{file}.md` | None — memory only | Immutable; user can "adopt" content into Journal |

### 1.1 Journal

A Journal entry is a user-authored markdown document tied to a **calendar date**. It is stored in `playgroundDB` with the key `journal/YYYY-MM-DD`. Workout execution results are stored separately in `indexedDBService` under the same full note ID.

**Directory structure (storage model):**
```
playgroundDB
  journal/2025-01-15   ← content: "# 2025-01-15\n## Fran\n```wod…"
  journal/2025-01-16
  …
```

**Date semantics:**
- `targetDate < today` → **History** mode (read-only)
- `targetDate === today` → **Active** mode (full edit + run)
- `targetDate > today` → **Plan** mode (editable, cannot run)

### 1.2 Collection

A Collection is a named library of workouts bundled at build time from the `markdown/collections/` directory. Each subdirectory becomes a Collection. `README.md` supplies header metadata; every other `.md` file is a workout item.

**Directory structure (source model):**
```
markdown/
  collections/
    strongfirst/
      README.md          ← collection header + front matter (categories, description)
      simple-sinister.md
      the-eagle.md
    crossfit-girls/
      README.md
      fran.md
      …
```

The `README.md` front matter defines `template: canvas` and `category: []`. Collections are read via `getWodCollections()` / `getWodCollection()` from `src/repositories/wod-collections.ts`.

### 1.3 Feed

> **Status: Implemented.** The feed repository, list/detail/item pages, nav panel, and routes are live.

A Feed is similar to a Collection but uses **date sub-directories** as its primary structure. This allows a feed to have a natural temporal organisation — e.g. a programming feed that publishes dated workouts.

**Directory structure (source model):**
```
markdown/
  feeds/
    compbell-powerlifting/
      README.md          ← feed header (name, description, categories)
      2025-01-06/
        squat-day.md
        press-day.md
      2025-01-13/
        deadlift-day.md
    crossfit-open-2025/
      README.md
      2025-02-27/
        25.1.md
```

**Key differences from Collection:**
- Items are scoped to a date (the parent directory name is `YYYY-MM-DD`)
- The Feed list view groups items by date (same `CalendarListTemplate` used by the journal)
- An item can be "scheduled" to a specific journal date (default: the feed item's date) or run today

---

## 2. Page Modes

Every page in the app is in exactly one **PageMode**. Mode determines which actions are available and whether the editor is read-only.

```
type PageMode =
  | 'collection-readonly'   // Collection or Feed item — static content
  | 'journal-history'       // Journal, targetDate < today
  | 'journal-active'        // Journal, targetDate === today
  | 'journal-plan'          // Journal, targetDate > today
```

### 2.1 Mode derivation rules

```
ContentSource == Collection | Feed
  → mode = 'collection-readonly'

ContentSource == Journal
  targetDate < today  → mode = 'journal-history'
  targetDate === today → mode = 'journal-active'
  targetDate > today  → mode = 'journal-plan'
```

*Currently this logic is scattered across `INLINE_RUNTIME_CATEGORIES`, `NON_COLLECTION_CATEGORIES`, route checks in `App.tsx`, and ad-hoc conditionals in `WorkoutEditorPage`. It should be centralised into a single `derivePageMode(source, targetDate)` function.*

---

## 3. Action Capabilities by Mode

Each mode grants a specific set of actions. The action bar and editor behaviour flow from mode — not from the route or category string.

| Action | `collection-readonly` | `journal-history` | `journal-active` | `journal-plan` |
|--------|-----------------------|-------------------|------------------|----------------|
| **Edit content** | ✗ | ✗ | ✓ | ✓ |
| **Run workout** | ✗ | ✗ | ✓ | ✗ |
| **Run Now** (adopt to today) | ✓ | ✓ | — | — |
| **Add to Today** (adopt to today's journal) | ✓ | ✗ | — | — |
| **Plan for date** (adopt with calendar picker) | ✓ | ✓ | ✓ | ✓ |
| **Clone to date** | ✗ | ✓ | ✓ | ✓ |
| **Share / export** | ✓ | ✓ | ✓ | ✓ |
| **Link to Playground** | ✓ | ✓ | ✓ | ✓ |

### 3.1 Action definitions

- **Run Now** — Start execution immediately. Only available when `mode === 'journal-active'`. For collection/feed items, "Run Now" means: adopt to today's journal → then run.
- **Add to Today** — Append this workout block to today's journal entry (creates entry if absent). Available on `collection-readonly` and `journal-history`.
- **Plan for date** — Adopt to a user-selected date via calendar picker. Creates a journal entry for that date.
- **Clone to date** — Duplicate the entire journal entry to another date. Available on all journal modes.
- **Link to Playground** — Open content in the Playground editor for ad-hoc editing without affecting the source.

---

## 4. The Three Template Shells

Three layout templates already exist and map cleanly to content scenarios.

### 4.1 `CalendarListTemplate` → Journal & Feed list views

**Location:** `playground/src/templates/CalendarListTemplate.tsx`

Used for any date-grouped list view. Wraps `JournalDateScroll`. Accepts:
- `loadResults(query)` — async data fetch
- `loadJournalEntries(query)` — async journal note fetch
- `mapResultsToItems(results, query)` — result→list item transform

**Current uses:**
- Journal list (`/journal`) — `JournalWeeklyPage` (currently bypasses this template and directly composes `JournalFeed`; should be migrated to use `CalendarListTemplate`)

**Planned uses:**
- Feed list (`/feeds/{slug}`) — same template, different loaders

### 4.2 `CollectionListTemplate` → Collections & Feed parent list

**Location:** `playground/src/templates/CollectionListTemplate.tsx`

Used for any flat/grouped searchable list. Accepts:
- `loadRecords(query)` — sync or async data fetch
- `mapRecordToItem(record, query)` — record→display item transform
- `renderPrimaryContent(item, context)` — row renderer

**Current uses:**
- Collections browser (`/collections`) — `CollectionsPage`

**Planned uses:**
- Feeds browser (`/feeds`) — same template, list of feed slugs
- Feed item list within a feed — if non-date-grouped

### 4.3 `JournalPageShell` → All note/entry pages

**Location:** `src/panels/page-shells/JournalPageShell.tsx`

Used for any page with an editor, sticky header, and optional index sidebar. The shell itself is layout-only; it does not know about content type or mode.

**Current uses:**
- `JournalPage` — journal entry (read or edit)
- `PlaygroundNotePage` — playground personal note
- `WorkoutEditorPage` — collection workout viewer

The shell should remain generic. The **mode-driven action bar** and **editor read-only state** are passed in as props from the page component above.

---

## 5. Proposed Module Structure

### 5.1 `ContentType` discriminant

Add a shared type that all content sources and pages share:

```typescript
// src/types/content-type.ts

export type ContentSource = 'journal' | 'collection' | 'feed';

export type PageMode =
  | 'collection-readonly'
  | 'journal-history'
  | 'journal-active'
  | 'journal-plan';

/**
 * Derive the page mode from the content source and target date.
 * Centralises the logic currently scattered across route checks
 * and NON_COLLECTION_CATEGORIES / INLINE_RUNTIME_CATEGORIES sets.
 */
export function derivePageMode(source: ContentSource, targetDate?: Date): PageMode {
  if (source === 'collection' || source === 'feed') {
    return 'collection-readonly';
  }
  if (!targetDate) return 'journal-active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);
  if (t < today) return 'journal-history';
  if (t > today) return 'journal-plan';
  return 'journal-active';
}
```

### 5.2 `PageActions` component

Replace the four separate action bars (`NotePageActions`, `PlaygroundNoteActions`, and the inline actions in `WorkoutEditorPage`) with a single mode-driven component:

```typescript
// playground/src/components/PageActions.tsx

interface PageActionsProps {
  mode: PageMode;
  content: string;
  title: string;
  index: PageNavLink[];
  onRunNow?: () => void;
  onAddToToday?: () => void;
  onPlanForDate?: (date: Date) => void;
  onCloneToDate?: (date: Date) => void;
}
```

The component renders only the buttons permitted by the `mode`. This eliminates the current pattern of each page assembling its own toolbar from parts.

### 5.3 Feed repository

Mirror `wod-collections.ts` with a feed-aware loader:

```typescript
// src/repositories/wod-feeds.ts

export interface WodFeedItem {
  id: string;           // filename without extension
  name: string;         // display name
  content: string;      // raw markdown
  feedDate: string;     // YYYY-MM-DD (parent directory)
  path: string;
}

export interface WodFeed {
  id: string;           // directory name
  name: string;
  readme?: string;
  categories: string[];
  items: WodFeedItem[]; // sorted by feedDate desc
}

// Glob: markdown/feeds/**/*.md
export function getWodFeeds(): WodFeed[] { … }
export function getWodFeed(id: string): WodFeed | undefined { … }
```

### 5.4 Feed pages

Two new route/page components:

| Route | Component | Template |
|-------|-----------|----------|
| `/feeds` | `FeedsPage` | `CollectionListTemplate` |
| `/feeds/:slug` | `FeedPage` | `CalendarListTemplate` |
| `/feeds/:slug/:date/:name` | `WorkoutEditorPage` (reused, mode=`collection-readonly`) | `JournalPageShell` |

`FeedPage` uses `CalendarListTemplate` with:
- `loadResults = () => feed.items` (synchronous — build-time data)
- `loadJournalEntries = () => journalEntries for dates in feed` (async — from playgroundDB)

This gives the feed view the same date-header grouping and journal-note display as the journal list.

---

## 6. Migration Plan

The changes below move incrementally toward the clean architecture. Each step is independently shippable.

### Step 1: Centralise `derivePageMode`

- Create `src/types/content-type.ts` with `ContentSource`, `PageMode`, and `derivePageMode()`.
- Replace `NON_COLLECTION_CATEGORIES` and `INLINE_RUNTIME_CATEGORIES` sets in `pageUtils.ts` with calls to `derivePageMode`.
- Replace the route-based type-switch in `App.tsx` with `derivePageMode`.
- **Test surface**: unit-test `derivePageMode` directly with boundary dates (yesterday, today, tomorrow).

### Step 2: Single `PageActions` component

- Create `playground/src/components/PageActions.tsx` using `mode` to control button visibility.
- Replace `NotePageActions`, `PlaygroundNoteActions`, and the inline action bar in `WorkoutEditorPage`.
- **Test surface**: render `PageActions` with each `PageMode` and assert correct button presence.

### Step 3: Migrate `JournalWeeklyPage` to `CalendarListTemplate`

- `JournalWeeklyPage` currently manages its own data loading, date-key computation, and multi-select state inline. Move data loading into `CalendarListTemplate` loaders.
- Keep `JournalFeed` as the rendering layer (`renderNoteCard`, `renderResultRow`, `renderEmptyDate` slots).
- **Test surface**: tests now cover the loaders in isolation; `JournalFeed` tests cover rendering only.

### Step 4: Feed repository + `/feeds` routes ✅ DONE

- Created `markdown/feeds/` directory with two example feeds (`crossfit-programming`, `dan-john-40-day`).
- Created `src/repositories/wod-feeds.ts` with `getWodFeeds()`, `getWodFeed()`, `getWodFeedItem()`, `getFeedDateKeys()`.
- Added `/feeds`, `/feeds/:feedSlug`, and `/feeds/:feedSlug/:feedDate/:feedItem` routes.
- `FeedsPage` — uses `CollectionListTemplate` to list all feeds.
- `FeedDetailPage` — uses `CalendarListTemplate` with feed items grouped by date.
- `FeedItemPage` — renders individual feed workout in `JournalPageShell` with Add to Today / Run Now actions.
- `FeedsNavPanel` — L2 nav panel (feed list → date groups → sibling items).
- Feeds L1 nav item added to `appNavTree.ts` below Collections.

### Step 5: Feed sub-strategy in `journalNoteStrategy` ✅ DONE

- Implemented `createFeedPickStrategy` (choose a feed) and `createFeedItemPickStrategy` (choose an item).
- Feed items are searchable by name or date key.
- Selected item is cloned into the journal entry with a source back-link.

---

## 7. Current Friction Points (Deletion Test)

The following modules would **reduce complexity if replaced** by the above:

| Current code | Problem | Replaced by |
|---|---|---|
| `NON_COLLECTION_CATEGORIES` set in `pageUtils.ts` | Shallow: set membership is as complex as the check it avoids | `derivePageMode(source)` |
| `INLINE_RUNTIME_CATEGORIES` set in `pageUtils.ts` | Encodes one platform quirk (syntax popup), not a real content mode distinction | `derivePageMode` + `mode === 'collection-readonly'` |
| Route-based type switch in `App.tsx` (~50 lines) | Depth-zero: maps routes to component names with no shared behaviour extraction | Per-route page components each calling `derivePageMode` |
| `NotePageActions`, `PlaygroundNoteActions` (two near-identical files) | Shallow: both render the same four icons; the difference is one extra button | `PageActions` with mode guard |
| Feed stub in `journalNoteStrategy.tsx` | Placeholder that silently falls back to collections — invisible behaviour gap | Real `createFeedPickStrategy` backed by `getWodFeeds()` |

---

## 8. Open Questions

1. **Feed vs Collection for the "Add to Today" flow** — currently a collection item is appended to the journal with a source back-link. Should a feed item append the same way? (Most likely yes, with feed name + feed date in the back-link.)

2. **Future plan dates for feed items** — when "Plan for date" is used on a feed item, the default date should pre-fill to the feed item's own `feedDate`. Is that the right UX?

3. **History journal read-only** — today the journal is always editable regardless of date. Should history entries actually lock the editor, or just hide the "Run" button? (The document above proposes full read-only for history, matching the stated requirement.)

4. **Feed content at runtime** — should a feed item's wod block be runnable from the feed page itself (i.e. does "Run Now" on a feed item adopt-then-run)? The table above says yes — but the UX flow (navigate away to journal) may feel jarring.
