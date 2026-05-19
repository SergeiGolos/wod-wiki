# Architecture Deepening Opportunities — wod-wiki Page Types

## Context

This document catalogs architectural friction points surfaced by the page-type inventory (see `page-type-inventory.md`). The live site (`https://wod.wiki`) exposes 7+ page types, but the codebase reveals a deeper structural story: **three competing list templates**, **two different canvas systems**, and **page shells that are not actually shells**.

The goal is to identify modules that are shallow (interface nearly as complex as implementation) and propose consolidations that increase depth, locality, and testability.

---

## Candidate 1: Merge the Three List Templates into One Deep Module

**Files involved:**
- `playground/src/templates/CalendarListTemplate.tsx` (164 lines)
- `playground/src/templates/CollectionListTemplate.tsx` (344 lines)
- `playground/src/views/JournalFeed.tsx` (282 lines) — not a template, but does the same job imperatively

**Problem:**
Three separate components all render a scrollable list of items with:
- Loading / error / empty states
- Date-grouped headers
- Keyboard navigation (arrow keys + Enter)
- Action buttons per row
- Optional prepended canvas / filter / search slots

The interfaces are nearly identical but the implementations diverged:
- `CalendarListTemplate` uses generic `<TQuery, TResult, TEntrySummary>` with slot-based customization
- `CollectionListTemplate` uses generic `<TQuery, TRecord, TItem>` with action-per-row customization
- `JournalFeed` is hardcoded for journal dates, no generics, no slots

**Deletion test:** Delete `CalendarListTemplate` — its complexity reappears in `JournalWeeklyPage` and `PlanPage`. Delete `CollectionListTemplate` — complexity reappears in `CollectionsPage`. These are earning their keep individually, but together they represent the same concept implemented three times.

**Solution:**
Create a single `ListTemplate<TQuery, TItem>` deep module with:
- Uniform loading/error/empty/reload surface
- Slot system for `prependedCanvas`, `filterSlot`, `searchSlot` (already proven in both templates)
- Optional `groupBy` function for date-grouped vs flat lists
- Optional `getItemActions` for per-row action buttons
- Optional keyboard navigation (enabled via `navigationScope` prop)
- `renderItem: (item, context) => ReactNode` for row content

Migrate `JournalFeed` → `ListTemplate`, `FeedFeed` → `ListTemplate`, `CollectionsPage` → `ListTemplate`, `JournalWeeklyPage` → `ListTemplate`, `PlanPage` → `ListTemplate`.

**Benefits:**
- **Locality:** List behavior (keyboard nav, loading states, empty states) lives in one place. Bug in keyboard nav? One fix, not three.
- **Leverage:** New list pages (e.g., Search results, History) require only a `renderItem` function and a `loadItems` callback.
- **Testability:** Test the template once with mock items; page components become thin adapters.

---

## Candidate 2: Unify the Two Canvas Systems

**Files involved:**
- `playground/src/canvas/MarkdownCanvasPage.tsx` (1040 lines — the big one)
- `playground/src/canvas/CanvasProse.tsx`
- `playground/src/templates/ListPreludeCanvas.tsx`
- `playground/src/panels/page-shells/CanvasPage.tsx` (or `CalendarPageShell.tsx`)
- `playground/src/pages/PlaygroundLandingPage.tsx`

**Problem:**
There are two "canvas" concepts that do overlapping work:

1. **MarkdownCanvasPage** — renders `ParsedCanvasPage` with a sticky two-column layout (scrolling prose + sticky editor). Handles runtime state, workout execution, review overlays, section visibility tracking. Used by: Home (`/`), Getting Started (`/getting-started`), Syntax (`/syntax`), Collection detail (`/collections/:slug`).

2. **ListPreludeCanvas** — renders `ParsedCanvasPage` as a static header above a list. No sticky editor, no runtime. Used by: Collections list (`/collections`).

3. **PlaygroundLandingPage** — completely separate landing page with hardcoded widget configs (`AttentionWidget`, `CodeExampleWidget`, `SyntaxGroupWidget`). Does NOT use the canvas system at all.

The `MarkdownCanvasPage` interface is enormous (1040 lines). It handles:
- Canvas prose rendering
- Source resolution (DSL paths → markdown files)
- Pipeline action execution (navigate, set-source, set-state)
- Runtime timer panels (inline + fullscreen)
- Workout result persistence
- Section visibility tracking
- Collection workout list injection (`{{workouts}}` tag)

**Deletion test:** Delete `MarkdownCanvasPage` — complexity explodes across every docs page, home page, and collection detail page. It IS earning its keep, but its interface is nearly as large as its implementation. The `{{workouts}}` injection logic (lines 258-292 in App.tsx's `currentNavLinks`) leaks collection-specific knowledge into App.tsx.

**Solution:**
Split `MarkdownCanvasPage` into deep modules at clear seams:

1. **CanvasRenderer** — pure prose + section rendering from `ParsedCanvasPage`. No state.
2. **CanvasRuntimeShell** — wraps CanvasRenderer, adds sticky editor + runtime panels. Used by Home, Getting Started, Syntax.
3. **CanvasCollectionShell** — wraps CanvasRenderer, injects `CollectionWorkoutsList` when `{{workouts}}` tag present. Used by collection detail pages.
4. **CanvasPrelude** — static header renderer (already exists as `ListPreludeCanvas`, just rename and generalize).

Move the `{{workouts}}` injection logic OUT of App.tsx's `currentNavLinks` and INTO `CanvasCollectionShell` where it belongs.

**Benefits:**
- **Locality:** Collection-specific logic lives with collections, not in App.tsx.
- **Leverage:** New canvas pages choose their shell (runtime, collection, or prelude) instead of forking MarkdownCanvasPage.
- **Testability:** `CanvasRenderer` is pure — test with static `ParsedCanvasPage` data. Runtime shell tested with mock runtime store.

---

## Candidate 3: Extract a Real PageShell from JournalPageShell

**Files involved:**
- `src/panels/page-shells/JournalPageShell.tsx` (256 lines)
- `src/panels/page-shells/CalendarPageShell.tsx`
- `playground/src/pages/JournalPage.tsx`
- `playground/src/pages/FeedItemPage.tsx`
- `playground/src/pages/WorkoutEditorPage.tsx`
- `playground/src/pages/PlaygroundNotePage.tsx`

**Problem:**
`JournalPageShell` is used by Journal, FeedItem, WorkoutEditor, and PlaygroundNote pages. But it is NOT a generic shell — it hardcodes:
- Sticky header with title + actions
- Note column with max-width constraints
- Index sidebar (L3 nav) on the right
- Timer dialog overlay
- Review dialog overlay

The `CanvasPage` shell (used by Journal list, Plan, Collections list) has a DIFFERENT layout:
- Title + actions in a header
- Subheader slot
- Full-width content area
- No index sidebar

These two "shells" share NO code. Adding a new page type requires choosing one or the other, then copy-pasting props.

**Solution:**
Create a unified `PageShell` with variants:

```
PageShell
├── variant="note"     → JournalPageShell behavior (constrained width, index sidebar, timer/review overlays)
├── variant="canvas"   → CanvasPage behavior (full width, subheader slot, no index sidebar)
└── variant="feed"     → Feed behavior (full width, date headers, no overlays)
```

Shared surface:
- `title`, `actions` (right side)
- `subheader` (optional, below title)
- `children` (main content)
- `overlay` (optional modal/overlay slot)
- `index` (optional right sidebar, only rendered on `variant="note"` or when screen is wide enough)

**Benefits:**
- **Locality:** Layout behavior (responsive breakpoints, sticky headers, scroll margins) lives in one module.
- **Leverage:** New page types get consistent layout without choosing between two divergent shells.
- **Testability:** Test layout responsiveness once; page components only test their content.

---

## Candidate 4: Consolidate Page Action Bars

**Files involved:**
- `playground/src/pages/shared/PageActions.tsx`
- `playground/src/pages/shared/PlaygroundNoteActions.tsx` (comment says "replaced by PageActions" but file still exists)
- `playground/src/pages/shared/NotePageActions.tsx` (comment says "replaced by PageActions" but file still exists)
- `playground/src/pages/shared/PageToolbar.tsx` (ActionsMenu, NewEntryButton)

**Problem:**
`PageActions` is a mode-driven component (`mode: PageMode`) that conditionally renders:
- Playground: New | Reset button group
- All pages: Search input, Cast button, ActionsMenu

But the `ActionsMenu` (in `PageToolbar.tsx`) ALSO renders:
- "On this page" section (L3 nav items)
- Theme toggle
- Audio toggle
- Download markdown
- Buy Me a Coffee
- Debug mode
- Reset & Clear Cache

This menu is duplicated between `PageActions` (used in page shells) and the Navbar in `App.tsx` (which renders its own `ActionsMenu`).

**Solution:**
1. Delete `PlaygroundNoteActions.tsx` and `NotePageActions.tsx` (they are already deprecated per comments).
2. Make `ActionsMenu` a standalone module that reads `currentWorkout` and `l3Items` from context, not props.
3. `PageActions` becomes: `<NavSearchInput /> <CastButtonRpc /> <ActionsMenu />` — no conditional logic.
4. The "New | Reset" button group moves to `PlaygroundNotePage` directly (it's playground-specific).

**Benefits:**
- **Locality:** One ActionsMenu, not two slightly different versions.
- **Deletion test:** Delete `PageActions` — its 101 lines vanish and are replaced by 3 component calls in each page. It was a shallow wrapper.

---

## Candidate 5: Unify Keyboard Navigation Across Lists

**Files involved:**
- `playground/src/templates/CollectionListTemplate.tsx` (lines 180-227)
- `playground/src/views/queriable-list/CollectionWorkoutsList.tsx` (lines 116-165)
- `playground/src/views/queriable-list/TextFilterStrip.tsx`

**Problem:**
Keyboard navigation (ArrowUp/Down/Left/Right + Enter) is implemented identically in:
- `CollectionListTemplate`
- `CollectionWorkoutsList`
- `JournalFeed` (does NOT have it — accessibility gap)
- `FeedFeed` (does NOT have it — accessibility gap)

The implementation uses a custom event (`TEXT_FILTER_NAVIGATION_EVENT`) dispatched from `TextFilterStrip` and listened to by list components. This is clever but means every list must implement its own listener, state management (`selectedRowIndex`, `selectedActionIndex`), and ref tracking.

**Solution:**
Extract a `useListKeyboardNav(flatItems, itemActions, navigationScope)` hook that returns:
- `selectedRowIndex`, `selectedActionIndex`
- `actionRefs` setter
- `handleMouseEnter` helper

Used by all list components. The hook encapsulates the event listener, clamping logic, and scroll-into-view behavior.

**Benefits:**
- **Locality:** Keyboard nav behavior lives in one hook.
- **Leverage:** `JournalFeed` and `FeedFeed` gain keyboard nav for free.
- **Testability:** Test the hook with mock events; list components only test rendering.

---

## Candidate 6: Merge JournalWeeklyPage and PlanPage Data Loading

**Files involved:**
- `playground/src/views/ListViews.tsx` (JournalWeeklyPage, 240 lines)
- `playground/src/views/PlanPage.tsx` (198 lines)
- `playground/src/views/JournalFeed.tsx` (shared renderer)

**Problem:**
`JournalWeeklyPage` and `PlanPage` both:
1. Load journal entries from `playgroundDB.getPagesByCategory('journal')`
2. Extract date keys and headings
3. Compute `createNoteDates`
4. Handle date header clicks (focus vs multi-select)
5. Render via `JournalFeed`

The differences are minor:
- JournalWeeklyPage: loads results from `indexedDBService`, shows past dates, no empty dates
- PlanPage: no results, shows future dates, all dates in window shown

But the data loading logic is ~80 lines of duplicated boilerplate in each file.

**Solution:**
Create `useJournalData(options)` hook:
```ts
useJournalData({
  includeResults?: boolean,
  dateRange: 'past' | 'future' | 'all',
  focusedDate?: string | null,
})
```
Returns `{ journalEntries, results, dateKeys, createNoteDates, isLoading, error }`.

Both pages become thin wrappers:
```tsx
// JournalWeeklyPage
const data = useJournalData({ includeResults: true, dateRange: 'past' });
return <JournalFeed {...data} ... />;

// PlanPage
const data = useJournalData({ dateRange: 'future' });
return <JournalFeed {...data} ... />;
```

**Benefits:**
- **Locality:** Journal data loading lives in one hook.
- **Deletion test:** Delete `useJournalData` — complexity reappears in both pages. It earns its keep.

---

## Summary Table

| # | Candidate | Files | Severity | Effort | Test Impact |
|---|-----------|-------|----------|--------|-------------|
| 1 | Merge 3 list templates | 5+ files | High | Medium | High — test once, not thrice |
| 2 | Unify canvas systems | 4 files | High | High | High — pure renderer testable |
| 3 | Extract real PageShell | 6+ files | Medium | Medium | Medium — layout tested once |
| 4 | Consolidate action bars | 4 files | Low | Low | Low — mostly deletion |
| 5 | Unify keyboard nav | 4 files | Medium | Low | Medium — hook testable |
| 6 | Merge journal data loading | 2 files | Low | Low | Low — hook extraction |

---

## Notes on Canvas Pages

The dogfood inventory identified canvas pages as a distinct page type (Getting Started, Syntax docs). The codebase reveals these are rendered by `MarkdownCanvasPage`, which is ALSO used for:
- Home page (`/`)
- Collection detail pages (`/collections/:slug`)

This means "canvas" is not a page type — it's a **rendering engine** used by multiple page types. The `canvasRoutes.ts` file maps markdown files to routes at build time. This is a key architectural seam: adding new docs or collection READMEs requires ONLY a markdown file, no code.

However, the `{{workouts}}` DSL tag (injected in collection READMEs) breaks this seam by requiring App.tsx to know about collection-specific workout lookup. This should move into `MarkdownCanvasPage` or a collection-specific canvas shell.

---

*Generated from dogfood inventory + codebase exploration.*
