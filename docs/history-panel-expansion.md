# History Panel & Analyze View Expansion

> **Companion to:** [`responsive-panel-system.md`](./responsive-panel-system.md)
> **Scope:** Expand the view strip from **3 views** (`Plan | Track | Review`) to a **dynamic 5-view** system: `History | Plan | Track | Review | Analyze` — where `Analyze` conditionally replaces `Plan | Track | Review` based on selection mode. The workbench supports two **content provider modes** — one powered by history browsing, the other by a static workout injection.

---

## Overview

The History panel is the new entry point of the workbench. It presents a browsable archive of stored workout posts, combining a **calendar** for date navigation and a **list** of saved entries. Users select one or more entries via checkmarks, and the selection count determines which downstream views are available:

| Selection State | Available Views | Strip Layout |
|----------------|----------------|--------------|
| **Nothing selected** | `History` only | Single view, no sliding |
| **Single entry selected** | `History → Plan → Track → Review` | 4-view strip (current behavior + History prepended) |
| **Multiple entries selected** | `History → Analyze` | 2-view strip (comparative analysis) |

This creates a **context-sensitive sliding strip** — the number and identity of views changes based on the user's intent.

---

## Content Provider Modes

The workbench must support two fundamentally different ways of loading workout content. This distinction is the **highest-level branching point** in the system — it determines which views exist, whether selection is possible, and what the landing view is.

### Why Two Modes?

The current `UnifiedWorkbench` accepts `initialContent?: string` and wraps everything in a `WorkbenchProvider`. Storybook stories use this to inject a static workout (e.g., `franMarkdown`) that can't be swapped at runtime. In production, the workbench should browse and select from stored history. These are two distinct content delivery strategies that must coexist.

### Mode: `HistoryContentProvider`

**When:** Production app, any context where the user has access to stored workout history.

| Aspect | Behavior |
|--------|----------|
| **Landing view** | `History` |
| **Available views** | `History`, `Plan`, `Track`, `Review`, `Analyze` |
| **Content source** | Selected from browsable history (persistence layer) |
| **Selection** | Single or multi-select via checkboxes |
| **Multi-select** | Enables `Analyze` view, hides `Plan \| Track \| Review` |
| **Strip modes** | `history-only`, `single-select`, `multi-select` |
| **New workout** | User creates via Plan editor, saved to history on completion |

```tsx
// Production usage
<WorkbenchProvider mode="history" historyStore={indexedDBStore}>
  <UnifiedWorkbenchContent />
</WorkbenchProvider>
```

### Mode: `StaticContentProvider`

**When:** Storybook stories, embedded demos, documentation examples, any context where a specific workout is pre-loaded and cannot be changed.

| Aspect | Behavior |
|--------|----------|
| **Landing view** | `Plan` (same as current behavior) |
| **Available views** | `Plan`, `Track`, `Review` only |
| **Content source** | Injected `initialContent` string — a single workout |
| **Selection** | Not applicable — only one workout exists |
| **Multi-select** | Impossible — `Analyze` is never available |
| **Strip modes** | `static` only (fixed 3-view strip) |
| **History tab** | Not shown |
| **Reload** | Not possible — content is immutable |

```tsx
// Storybook / demo usage
<WorkbenchProvider mode="static" initialContent={franMarkdown}>
  <UnifiedWorkbenchContent />
</WorkbenchProvider>
```

### Provider Interface

```ts
// The content provider abstraction
type ContentProviderMode = 'history' | 'static';

interface ContentProviderConfig {
  mode: ContentProviderMode;

  // History mode props
  historyStore?: IHistoryStore;    // required when mode='history'

  // Static mode props
  initialContent?: string;         // required when mode='static'
}

// Discriminated union for type safety
type ContentProvider =
  | { mode: 'history'; historyStore: IHistoryStore }
  | { mode: 'static'; initialContent: string };
```

### Impact on Strip Behavior

| Content Provider | Available StripModes | History Tab | Analyze Tab | Landing View |
|-----------------|---------------------|-------------|-------------|-------------|
| `HistoryContentProvider` | `history-only`, `single-select`, `multi-select` | ✓ Shown | ✓ (on multi-select) | `history` |
| `StaticContentProvider` | `static` | ✗ Hidden | ✗ Never | `plan` |

### How It Flows Through the System

```
┌─────────────────────────────────────────────────────────┐
│                  WorkbenchProvider                       │
│         mode: 'history' | 'static'                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  if mode === 'history':                                 │
│    → contentProvider = HistoryContentProvider            │
│    → useHistorySelection() active                       │
│    → Landing view: 'history'                            │
│    → Strip reacts to selection state                    │
│    → Nav tabs: dynamic based on selectionMode           │
│                                                         │
│  if mode === 'static':                                  │
│    → contentProvider = StaticContentProvider             │
│    → useHistorySelection() NOT mounted                  │
│    → Landing view: 'plan'                               │
│    → Strip: fixed 3-view (Plan | Track | Review)        │
│    → Nav tabs: static [Plan, Track, Review]             │
│    → Content: initialContent loaded into editor         │
│    → ViewMode type constrained to 'plan'|'track'|'rev'  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Existing Storybook Compatibility

Today's stories pass `initialContent` and get the full `UnifiedWorkbench`. The migration path:

1. `UnifiedWorkbench` gains a `mode` prop (defaults to `'static'` for backward compatibility)
2. Existing stories continue to work unchanged — they get `mode='static'` implicitly
3. The production app wrapper sets `mode='history'` and provides a `historyStore`
4. No Storybook story changes are needed

```ts
// Current (continues to work):
<UnifiedWorkbench initialContent={franMarkdown} />
// ↑ Internally: mode='static', History tab hidden, Analyze unavailable

// Future production:
<UnifiedWorkbench mode="history" historyStore={store} />
// ↑ History tab shown, full selection model active
```

---

## History Panel — `HistoryPanel`

**Component:** `HistoryPanel.tsx` (new)
**Intent:** Browse, search, and select stored workout entries. Combines a calendar widget, filter controls, and a selectable list of posts. Checkmarks enable single or multi-select behavior.

### Internal Elements

| Element | Description |
|---------|-------------|
| **Calendar** | Month-view calendar highlighting dates with stored workouts. Tapping a date filters the list. |
| **Filter controls** | Dropdown/chips for filtering by workout type, tags, duration range, etc. |
| **Post list** | Scrollable list of stored workout entries with metadata (name, date, duration, tags). Each row has a **checkbox** for selection. |
| **Selection indicator** | Badge/counter showing how many entries are currently selected. |

### Responsive Layouts by Span

The History panel follows the same sliding + expand model as existing panels and supports `1/3 | 2/3 | full` spans on desktop.

---

#### 1/3 Span — Compact Sidebar (`flex: 1`)

The narrowest view. Calendar sits on top, list below, and the **entire panel scrolls vertically** as one unit.

```
┌──────────────────┐
│   « Calendar »   │  ← Compact month-view (grid, no day names)
│   Mo Tu We Th Fr │
│   ·  ·  3  ·  5  │  ← Dots = no entries, numbers = has entries
│   ·  ·  ·  9  ·  │
├──────────────────┤
│ ☐ AMRAP 20min    │  ← Post list begins (scrolls with calendar)
│   Jan 3 · 20:00  │
│ ☐ EMOM 10min     │
│   Jan 5 · 10:00  │
│ ☑ Fran           │  ← Selected entry (checkmark filled)
│   Jan 9 · 8:42   │
│        ...       │
└──────────────────┘
  ↕ entire panel scrolls
```

**Layout rules:**
- `flex-direction: column`, no internal splits
- Calendar: compact grid, ~120px tall, no filter controls visible
- Post list: fills remaining height, `overflow-y` on the **panel container** (not the list)
- The whole panel is a single scroll context — calendar scrolls out of view when the list is long
- Checkboxes are always visible on each row

---

#### 2/3 Span — Split View (`flex: 2`)

Side-by-side layout. Left half has the calendar + filter controls. Right half has the post list.

```
┌─────────────────────────┬─────────────────────────┐
│      « Calendar »       │ ☐ AMRAP 20min           │
│  Mo Tu We Th Fr Sa Su   │   Jan 3 · 20:00         │
│  ·  ·  3  ·  5  ·  ·   │ ☐ EMOM 10min            │
│  ·  ·  ·  9  ·  ·  ·   │   Jan 5 · 10:00         │
│  · 12  ·  ·  ·  ·  ·   │ ☑ Fran                  │
│                         │   Jan 9 · 8:42           │
│ ┌─────────────────────┐ │ ☐ Murph                 │
│ │ Type: [All      ▾]  │ │   Jan 12 · 45:30        │
│ │ Tags: [strength ✕]  │ │         ...             │
│ └─────────────────────┘ │                         │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
  ← 50% calendar+filters →  ← 50% post list ──────→
```

**Layout rules:**
- `display: flex; flex-direction: row`
- Left half (50%): Calendar (full month view with day names) + filter controls below calendar
- Right half (50%): Post list, independently scrollable (`overflow-y: auto`)
- Calendar is larger, shows full day names, highlights dates with entries
- Filter controls: dropdowns or chip selectors for type, tags, duration
- Each half scrolls independently

---

#### Full Screen — Expanded View (`flex: 3`)

The widest view. Calendar and filters occupy the left third, post list takes the right two-thirds. More room for richer list items.

```
┌───────────────────┬─────────────────────────────────────────────┐
│    « Calendar »   │ ☐ AMRAP 20min                              │
│  Mo Tu We ...  Su │   Jan 3, 2025 · 20:00 · #conditioning     │
│  ·  ·  3  ·  5   │   3 rounds completed · Avg HR: 165         │
│  ·  ·  ·  9  ·   │                                            │
│  · 12  ·  ·  ·   │ ☐ EMOM 10min                               │
│                   │   Jan 5, 2025 · 10:00 · #skills            │
│ ──── Filters ──── │                                            │
│ Type: [All    ▾]  │ ☑ Fran                                     │
│ Tags: [str    ✕]  │   Jan 9, 2025 · 8:42 · #benchmark         │
│ Duration: 0-60m   │   21-15-9 Thrusters & Pull-ups             │
│ ── Select All ─── │                                            │
│ [✓ Select All]    │ ☐ Murph                                    │
│ [Clear Selection] │   Jan 12, 2025 · 45:30 · #hero             │
│                   │   1mi Run, 100 Pull-ups, 200 Push-ups...   │
│ Selected: 1       │                                            │
└───────────────────┴─────────────────────────────────────────────┘
  ← 1/3 calendar ──→  ← 2/3 post list ──────────────────────────→
```

**Layout rules:**
- `display: flex; flex-direction: row`
- Left column (1/3, `flex: 1`): Calendar + filters + selection controls (Select All, Clear, count)
- Right column (2/3, `flex: 2`): Enriched post list with expanded metadata per row (tags, summary, stats)
- Each column scrolls independently
- Post list rows show more detail: full date, tags, short summary, key stats
- "Select All" and "Clear Selection" bulk actions visible in the left column

---

### History Panel — Screen Mode Adaptations

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 1/3 | `flex: 1` | Compact calendar + vertically scrolling list. No filter controls. |
| Desktop 2/3 | `flex: 2` | 50/50 split: calendar+filters | post list. Independent scroll. |
| Desktop full | `flex: 3` (expanded) | 1/3+2/3 split: calendar+filters+bulk actions | enriched list. |
| Tablet 50% | `flex: 1` | Same as Desktop 1/3 — compact single-column. Filters hidden. |
| Mobile stack | Full width, scrollable | Calendar on top (collapsible), list below. Touch-friendly rows. |

**Resize strategy:**
- Calendar size scales: compact grid (1/3) → full month (2/3) → full month + stats (full)
- Filter controls: hidden (1/3) → visible (2/3) → visible + bulk actions (full)
- Post list density: minimal (1/3) → standard (2/3) → enriched with metadata (full)

---

## Selection Model

The selection model is the core behavioral difference that drives the dynamic view strip.

### Types

```ts
interface HistoryEntry {
  id: string;
  name: string;
  date: Date;
  duration: number;       // seconds
  tags: string[];
  workoutType: string;
  results?: WorkoutResults;
  rawContent: string;     // original markdown
}

interface HistorySelectionState {
  entries: HistoryEntry[];           // all loaded entries
  selectedIds: Set<string>;          // currently checked entry IDs
  selectionMode: 'none' | 'single' | 'multi';  // derived
  activeEntryId: string | null;      // the entry loaded into Plan/Track/Review
  calendarDate: Date;                // currently viewed month
  filters: HistoryFilters;
}

interface HistoryFilters {
  workoutType: string | null;
  tags: string[];
  durationRange: [number, number] | null;  // [min, max] in seconds
  dateRange: [Date, Date] | null;
}
```

### Selection Rules

```
┌─────────────────────────────────────────────────────────┐
│                   SELECTION LOGIC                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  selectedIds.size === 0                                 │
│    → selectionMode = 'none'                             │
│    → Strip: [ History ]                                 │
│    → Plan/Track/Review hidden, Analyze hidden           │
│                                                         │
│  selectedIds.size === 1                                 │
│    → selectionMode = 'single'                           │
│    → Strip: [ History | Plan | Track | Review ]         │
│    → Load selected entry into Plan editor               │
│    → Track/Review operate on that entry                 │
│    → Analyze hidden                                     │
│                                                         │
│  selectedIds.size >= 2                                  │
│    → selectionMode = 'multi'                            │
│    → Strip: [ History | Analyze ]                       │
│    → Plan/Track/Review hidden                           │
│    → Analyze receives all selected entries              │
│    → Auto-slide to Analyze view                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Selection UX Transitions

| Action | From State | To State | Effect |
|--------|-----------|----------|--------|
| Check 1st entry | `none` | `single` | Strip expands to 4 views. Entry loaded into Plan. |
| Uncheck only entry | `single` | `none` | Strip collapses to History only. Plan/Track/Review cleared. |
| Check 2nd entry | `single` | `multi` | Strip morphs to 2-view. Plan/Track/Review slide out, Analyze slides in. |
| Uncheck to 1 remaining | `multi` | `single` | Strip morphs back to 4-view. Remaining entry loaded into Plan. |
| Check via "Select All" | `any` | `multi` | All visible (filtered) entries selected. Strip → 2-view. |
| Click "Clear Selection" | `any` | `none` | All unchecked. Strip → 1-view. |

---

## Analyze View — `AnalyzePanel` (Placeholder)

**Component:** `AnalyzePanel.tsx` (new — placeholder)
**Default span:** `3` (full-screen)
**Intent:** Comparative analysis of multiple selected workout entries. Receives `HistoryEntry[]` from selection state and renders comparative visualizations.

### Placeholder Content

For the initial implementation, the Analyze panel displays:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         📊  Analyze  (Comparative View)                 │
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │  Selected Entries: 3                          │     │
│   │                                               │     │
│   │  • AMRAP 20min — Jan 3, 2025                  │     │
│   │  • Fran — Jan 9, 2025                         │     │
│   │  • Murph — Jan 12, 2025                       │     │
│   │                                               │     │
│   │  ── Comparative analysis coming soon ──       │     │
│   │                                               │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Future scope:** Side-by-side timelines, aggregate stats, trend charts across selected workouts.

---

## Dynamic Strip Architecture

The current `SlidingViewport` (and its planned replacement `ResponsiveViewport`) uses a fixed strip width of `300%` (3 views). The expansion requires the strip to be **dynamic**, adjusting its width and contents based on selection mode.

### Strip Configurations

```ts
type StripMode = 'history-only' | 'single-select' | 'multi-select' | 'static';

interface StripConfiguration {
  mode: StripMode;
  views: ViewDescriptor[];
  stripWidth: string;          // CSS calc
  offsets: Record<string, string>;  // viewId → translateX
}

const stripConfigs: Record<StripMode, StripConfiguration> = {
  'history-only': {
    mode: 'history-only',
    views: [historyView],
    stripWidth: '100%',
    offsets: { history: '0%' },
  },
  'single-select': {
    mode: 'single-select',
    views: [historyView, planView, trackView, reviewView],
    stripWidth: '400%',
    offsets: {
      history: '0%',
      plan: '-25%',
      track: '-50%',
      review: '-75%',
    },
  },
  'multi-select': {
    mode: 'multi-select',
    views: [historyView, analyzeView],
    stripWidth: '200%',
    offsets: {
      history: '0%',
      analyze: '-50%',
    },
  },
  'static': {
    mode: 'static',
    views: [planView, trackView, reviewView],
    stripWidth: '300%',
    offsets: {
      plan: '0%',
      track: '-33.333%',
      review: '-66.666%',
    },
  },
};
```

> **Note:** The `static` strip mode is identical to the current `SlidingViewport` behavior — 3 views, fixed 300% width, same offsets. This ensures backward compatibility for Storybook and demo contexts.

### Strip Transitions

When the selection mode changes, the strip must smoothly transition:

```
Single → Multi:
  1. Current view slides back to History (if not already there)
  2. Strip morphs: Plan/Track/Review fade out, Analyze fades in
  3. Strip width transitions from 400% → 200%
  4. Auto-slide to Analyze view

Multi → Single:
  1. Strip morphs: Analyze fades out, Plan/Track/Review fade in
  2. Strip width transitions from 200% → 400%
  3. Load remaining selected entry into Plan
  4. Stay on History view (user navigates manually)

Any → None:
  1. Slide back to History
  2. Strip width transitions to 100%
  3. Downstream views unmount (cleanup runtime, etc.)
```

**CSS approach:** Use `transition: width 400ms ease, transform 400ms ease` on the strip container. Views entering/leaving use `opacity` transitions.

---

## Updated ViewMode Type

The existing `ViewMode` type must expand to include the new views:

```ts
// Before:
type ViewMode = 'plan' | 'track' | 'review';

// After (full set):
type ViewMode = 'history' | 'plan' | 'track' | 'review' | 'analyze';

// Constrained by provider mode:
type StaticViewMode = 'plan' | 'track' | 'review';           // static mode only
type HistoryViewMode = ViewMode;                              // all views available
```

> **Runtime constraint:** In `static` mode, `setViewMode()` should reject `'history'` and `'analyze'`. The nav bar never renders tabs for these views, so this is a safety guard, not a UX-facing concern.

### Impact on WorkbenchContext

```ts
interface WorkbenchContextState {
  // ... existing fields ...

  // New: Content provider mode
  contentMode: ContentProviderMode;  // 'history' | 'static'

  // New: History selection state (null when contentMode='static')
  historySelection: HistorySelectionState | null;

  // Derived: Current strip mode
  stripMode: StripMode;

  // Updated: viewMode now includes 'history' and 'analyze'
  viewMode: ViewMode;

  // New actions (no-op when contentMode='static')
  selectHistoryEntry: (id: string) => void;
  deselectHistoryEntry: (id: string) => void;
  toggleHistoryEntry: (id: string) => void;
  selectAllHistoryEntries: () => void;
  clearHistorySelection: () => void;
  setCalendarDate: (date: Date) => void;
  setHistoryFilters: (filters: Partial<HistoryFilters>) => void;
}
```

---

## Updated ViewDescriptors

```ts
// viewDescriptors.ts — expanded

const historyView: ViewDescriptor = {
  id: 'history',
  label: 'History',
  icon: <Calendar />,
  panels: [
    { id: 'history-browser', title: 'History', defaultSpan: 3, content: <HistoryPanel /> },
  ],
};

// Plan, Track, Review — unchanged from responsive-panel-system.md

const analyzeView: ViewDescriptor = {
  id: 'analyze',
  label: 'Analyze',
  icon: <BarChart3 />,
  panels: [
    { id: 'analyze-main', title: 'Analyze', defaultSpan: 3, content: <AnalyzePanel /> },
  ],
};
```

> The History panel starts as a full-screen single panel. When selected as an individual view within the 4-view strip (`single-select` mode), it shows at `1/3` as the first panel — the user can expand it to `2/3` or full.

### History Panel Default Span by Strip Mode

| Strip Mode | History Default Span | Rationale |
|-----------|---------------------|-----------|
| `history-only` | `3` (full) | Only view — takes all space |
| `single-select` | `1` (1/3) | Sidebar role, entry already loaded into Plan |
| `multi-select` | `1` (1/3) | Sidebar role, Analyze is the primary view |

This means the History panel's `defaultSpan` is **dynamic** — set by the strip configuration, not hardcoded in the `ViewDescriptor`. The `ViewDescriptor` for History should accept a span override:

```ts
function getHistoryView(stripMode: StripMode): ViewDescriptor {
  const span: PanelSpan = stripMode === 'history-only' ? 3 : 1;
  return {
    id: 'history',
    label: 'History',
    icon: <Calendar />,
    panels: [
      { id: 'history-browser', title: 'History', defaultSpan: span, content: <HistoryPanel /> },
    ],
  };
}
```

---

## Navigation Bar Updates

The navigation bar (view tabs) must adapt to the current strip mode:

| Strip Mode | Visible Tabs | Behavior |
|-----------|-------------|----------|
| `history-only` | `[ History ]` | Single tab, no navigation arrows |
| `single-select` | `[ History · Plan · Track · Review ]` | 4 tabs, keyboard navigation active |
| `multi-select` | `[ History · Analyze ]` | 2 tabs, keyboard navigation active |

Tab transitions should animate smoothly — tabs sliding in/out rather than popping.

---

## Hook: `useHistorySelection`

This hook is **only mounted** when `contentMode='history'`. In static mode, the workbench skips this hook entirely — no selection state, no strip mode derivation.

```ts
function useHistorySelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [filters, setFilters] = useState<HistoryFilters>({ ... });

  const selectionMode = useMemo<SelectionMode>(() => {
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === 1) return 'single';
    return 'multi';
  }, [selectedIds.size]);

  const stripMode = useMemo<StripMode>(() => {
    switch (selectionMode) {
      case 'none': return 'history-only';
      case 'single': return 'single-select';
      case 'multi': return 'multi-select';
    }
  }, [selectionMode]);

  const toggleEntry = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(new Set(visibleIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectionMode,
    stripMode,
    calendarDate,
    filters,
    toggleEntry,
    selectAll,
    clearSelection,
    setCalendarDate,
    setFilters: (partial: Partial<HistoryFilters>) =>
      setFilters(prev => ({ ...prev, ...partial })),
  };
}
```

### Hook: `useStripMode`

A top-level hook that returns the active `StripMode` based on the content provider mode:

```ts
function useStripMode(contentMode: ContentProviderMode): StripMode {
  const historySelection = useHistorySelection(); // only called in history mode

  if (contentMode === 'static') {
    return 'static';  // always fixed 3-view strip
  }

  return historySelection.stripMode;
}
```

> In practice, the conditional hook call is handled via the provider pattern — `HistoryContentProvider` renders `useHistorySelection` internally, while `StaticContentProvider` hardcodes `stripMode='static'`.

---

## Tasks

### Phase 0: Content Provider Infrastructure

- [ ] **Task H0a: Define `ContentProviderMode` and `ContentProvider` types**
  File: `src/types/content-provider.ts`
  Define: `ContentProviderMode`, `ContentProvider` (discriminated union), `IHistoryStore` interface
  These types gate every downstream decision (strip mode, available views, landing view).
  → Verify: Types compile, importable from other modules

- [ ] **Task H0b: Define `HistoryEntry` and history types**
  File: `src/types/history.ts`
  Define: `HistoryEntry`, `HistoryFilters`, `HistorySelectionState`, `SelectionMode`, `StripMode` (now includes `'static'`)
  Storage interface: `IHistoryStore` with `getEntries(filters)`, `getEntry(id)`, `saveEntry(entry)`, `deleteEntry(id)`
  → Verify: Types compile, importable from other modules

- [ ] **Task H0c: Add `mode` prop to `WorkbenchProvider`**
  File: `src/components/layout/WorkbenchContext.tsx`
  Add: `mode: ContentProviderMode` prop (default: `'static'` for backward compatibility)
  Add: `contentMode` to context state, `stripMode` derived field
  When `mode='static'`: `historySelection = null`, `stripMode = 'static'`, `viewMode` defaults to `'plan'`
  When `mode='history'`: `historySelection` initialized, `stripMode` derived from selection, `viewMode` defaults to `'history'`
  → Verify: Existing Storybook stories render unchanged (they don't pass `mode`, so default `'static'` kicks in)

- [ ] **Task H1: Implement `useHistorySelection` hook**
  File: `src/hooks/useHistorySelection.ts`
  Manages: `selectedIds`, `selectionMode`, `stripMode`, `calendarDate`, `filters`
  Actions: `toggleEntry`, `selectAll`, `clearSelection`, `setCalendarDate`, `setFilters`
  Only mounted when `contentMode='history'`
  → Verify: Unit test — toggle adds/removes, mode transitions correctly, strip mode derives from selection count

### Phase 1: History Panel Components

- [ ] **Task H2: Create `HistoryPanel` component**
  File: `src/components/workbench/HistoryPanel.tsx`
  Implements the responsive layout from the span specifications above:
  - Accepts `span: PanelSpan` and `screenMode: ScreenMode` props
  - Renders calendar, filters, and post list according to the active span
  - Checkboxes on each row, wired to `useHistorySelection`
  - Selection count badge
  → Verify: Renders at 1/3, 2/3, and full spans with correct layouts

- [ ] **Task H3: Create `CalendarWidget` component**
  File: `src/components/history/CalendarWidget.tsx`
  A month-view calendar that:
  - Highlights dates with stored entries
  - Accepts `compact` prop for 1/3 span (no day names, smaller cells)
  - Emits `onDateSelect(date)` for filtering
  - Shows month/year navigation
  → Verify: Renders compact and full modes, highlights correct dates

- [ ] **Task H4: Create `HistoryPostList` component**
  File: `src/components/history/HistoryPostList.tsx`
  A selectable list of workout entries:
  - Each row: checkbox + name + date + duration + tags (when space allows)
  - Accepts `enriched` prop for full-span mode (show summary, stats)
  - Emits `onToggle(id)` for selection
  - Supports virtual scrolling for large lists (future)
  → Verify: Rows render with checkboxes, selection state reflects correctly

### Phase 2: Analyze Panel (Placeholder)

- [ ] **Task H5: Create `AnalyzePanel` placeholder**
  File: `src/components/workbench/AnalyzePanel.tsx`
  Displays:
  - Title "Analyze (Comparative View)"
  - List of selected entries (names + dates)
  - "Comparative analysis coming soon" message
  - Receives selected entries from context
  → Verify: Shows correct selected entries when in multi-select mode

### Phase 3: Dynamic Strip Integration

- [ ] **Task H6: Expand `ViewMode` type + add `StripMode` routing**
  File: `src/components/layout/SlidingViewport.tsx` (and future `ResponsiveViewport.tsx`)
  Update: `ViewMode = 'history' | 'plan' | 'track' | 'review' | 'analyze'`
  Add: `StaticViewMode` subset type for static mode constraint
  Update: `viewOffsets` to be dynamic based on `StripMode` (including `'static'` which maps to current 3-view behavior)
  → Verify: Type compiles, existing 3-view usage still works in `static` mode, new modes work in `history` mode

- [ ] **Task H7: Implement `StripMode`-aware viewport**
  File: `src/components/layout/panel-system/DynamicViewport.tsx` (or update `ResponsiveViewport.tsx`)
  Accepts: `stripMode: StripMode` + corresponding `ViewDescriptor[]`
  Calculates: strip width as `N * 100%` dynamically
  Handles: smooth transitions when strip mode changes (width + opacity animations)
  → Verify: Strip correctly shows 1, 2, or 4 views based on mode. Transitions are smooth.

- [ ] **Task H8: Wire History selection into `WorkbenchContext`**
  File: `src/components/layout/WorkbenchContext.tsx`
  Add: `historySelection: HistorySelectionState | null` to context (null when static)
  Add: History-related actions to context value (no-op stubs in static mode)
  Connect: `selectionMode` changes trigger `viewMode` and strip reconfiguration
  Guard: In static mode, `historySelection` stays null, selection actions are no-ops
  → Verify: Selecting 1 entry loads content into Plan. Selecting 2+ switches to multi-select strip. Static mode ignores selection.

- [ ] **Task H9: Update navigation bar for mode-aware dynamic tabs**
  File: `src/components/layout/UnifiedWorkbench.tsx` (nav section)
  Update: Tab bar reads from current `StripConfiguration.views` instead of hardcoded tabs
  In static mode: Render exactly `[Plan, Track, Review]` tabs — no History, no Analyze
  In history mode: Tabs change dynamically based on `selectionMode`
  Animate: Tabs entering/leaving with CSS transitions (history mode only)
  Update: Keyboard nav (Ctrl+Arrow) respects the current strip's view order
  → Verify: Static mode shows 3 tabs always. History mode tabs change on selection.

### Phase 4: Integration

- [ ] **Task H10: Wire `HistoryPanel` into `UnifiedWorkbench` (history mode only)**
  Connect `HistoryPanel` as the first view in the strip — only mounted when `contentMode='history'`
  In history mode: History is the **default view** on app launch (replaces Plan as landing)
  In static mode: History panel is not rendered; Plan remains the landing view
  Load selected entry's `rawContent` into the Plan editor when in single-select mode
  Dispose runtime when switching away from Track (existing behavior, extended to new flow)
  → Verify:
    - History mode: launch → History → select 1 → Plan visible → Track → Review → back to History
    - Static mode: launch → Plan → Track → Review (unchanged behavior, no History tab)

- [ ] **Task H11: Test multi-select → Analyze flow (history mode only)**
  Select 2+ entries → verify Plan/Track/Review hidden
  Verify Analyze panel shows correct selected entries
  Deselect to 1 → verify Plan/Track/Review reappear
  Deselect all → verify only History visible
  → Verify: All transitions smooth, no stale state, runtime cleaned up properly
  → Verify: This entire flow is unreachable in static mode (Analyze never available)

- [ ] **Task H11b: Verify static mode backward compatibility**
  Run all existing Storybook stories — they must render unchanged
  Verify: No History tab visible in any story
  Verify: No Analyze tab visible in any story
  Verify: Plan is the landing view, 3-view strip works as before
  Verify: `initialContent` flows into editor correctly
  → Verify: Zero regressions in static mode

### Phase 5: Polish

- [ ] **Task H12: Animate strip transitions**
  Ensure view enter/exit is smooth when strip mode changes
  Handle edge case: user is on Track view, then selects a 2nd entry → must slide back to History before morphing to multi-select strip
  Add `will-change: transform, width` for GPU acceleration during transitions
  → Verify: No layout jumps, smooth 400ms transitions

- [ ] **Task H13: Persist selection across navigation**
  History selection persists when navigating to Plan/Track/Review and back
  Checkmarks remain checked when returning to History view
  Calendar date and filters persist within session
  → Verify: Navigate History → Plan → History: checkmarks and filters intact

---

## File Map (New & Modified)

| File | Action | Purpose |
|------|--------|---------|
| `src/types/content-provider.ts` | **NEW** | Content provider mode types, `IHistoryStore` interface |
| `src/types/history.ts` | **NEW** | History entry types, filter types, selection types |
| `src/hooks/useHistorySelection.ts` | **NEW** | Selection state management hook (history mode only) |
| `src/components/workbench/HistoryPanel.tsx` | **NEW** | History panel — responsive calendar + list |
| `src/components/history/CalendarWidget.tsx` | **NEW** | Month-view calendar component |
| `src/components/history/HistoryPostList.tsx` | **NEW** | Selectable post list component |
| `src/components/workbench/AnalyzePanel.tsx` | **NEW** | Placeholder comparative analysis panel |
| `src/components/layout/SlidingViewport.tsx` | **MODIFY** | Expand `ViewMode`, `StripMode`, dynamic strip width |
| `src/components/layout/WorkbenchContext.tsx` | **MODIFY** | Add `contentMode`, history selection state, mode-aware defaults |
| `src/components/layout/UnifiedWorkbench.tsx` | **MODIFY** | Add `mode` prop, wire History/Analyze conditionally, mode-aware nav |
| `src/components/layout/panel-system/viewDescriptors.ts` | **MODIFY** | Add History + Analyze view descriptors |
| `src/components/layout/panel-system/types.ts` | **MODIFY** | Add `StripMode`, `StripConfiguration` types |

---

## Relationship to `responsive-panel-system.md`

This document **extends** the responsive panel system, not replaces it. Here's how they relate:

| Concern | `responsive-panel-system.md` | This document |
|---------|------------------------------|---------------|
| Panel abstractions | `PanelShell`, `PanelGrid`, `PanelSpan` | Reuses all — History panel is a `PanelDescriptor` |
| Screen modes | Desktop, Tablet, Mobile | Same modes apply to History panel |
| View descriptors | Plan, Track, Review | Adds History + Analyze descriptors |
| Strip architecture | Fixed `N * 100%` | Dynamic strip that changes based on selection |
| Expand/collapse | Panel-level expand | Same — History supports expand at 1/3 → 2/3 → full |
| Context | `WorkbenchContext` + panel layouts | Adds `HistorySelectionState` to context |
| Navigation | Keyboard nav, view tabs | Extends with dynamic tab visibility |

> **Implementation order:** The responsive panel system (Phase 1-3 from the companion doc) should be built first. This expansion builds on top of `PanelShell`, `PanelGrid`, `ViewDescriptor`, and `ResponsiveViewport` from that foundation.

---

## Summary: Panel Resize Contracts (Additions)

| Panel | `mobile` prop | `compact` prop | Needs resize work | Critical adaptations |
|-------|--------------|----------------|-------------------|---------------------|
| `HistoryPanel` | TBD | TBD | **Yes** | Calendar size, filter visibility, list density |
| `AnalyzePanel` | ✗ | ✗ | No (placeholder) | Full-screen only for now |

---

## Notes

- The History panel is the **default landing view in history mode** — the app opens to History, not Plan
- In **static mode**, Plan remains the landing view — History and Analyze do not exist
- **Backward compatibility is paramount** — existing Storybook stories must work without any changes. The `mode` prop defaults to `'static'`, preserving the current 3-view behavior.
- Stored posts need a persistence layer (localStorage, IndexedDB, or API) — out of scope for this doc but required before `H0`
- The `HistoryEntry.rawContent` is the markdown that gets loaded into the Plan editor on single-select
- The calendar widget should be lightweight — no heavy date-picker library; a simple grid is sufficient
- Multi-select → Analyze transition should feel like a "mode switch," not a jarring layout change
- The Analyze panel is intentionally minimal (placeholder) — detailed analytics design is a separate effort
- The content provider mode is a **compile-time decision per mount point**, not a runtime toggle — you don't switch from static to history while the app is running
- `UnifiedWorkbench` continues to accept `initialContent` for both modes. In history mode, `initialContent` could seed an empty editor for new workout creation. In static mode, it's the sole content source.
