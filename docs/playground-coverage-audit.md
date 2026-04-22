# Playground Coverage Audit — wod-wiki Storybook

> **Analyzed:** 2026-04-21
> **Scope:** All playground pages/routes vs. Storybook catalog — component consumption mapping and coverage gaps
> **Method:** Traced route definitions → page components → import trees → cross-referenced with `stories/catalog/`

---

## Playground Pages

| # | Page | Route | Source |
|---|------|-------|--------|
| 1 | **Home** | `/` | `playground/src/views/HomeView.tsx` |
| 2 | **Journal List** | `/journal` | `playground/src/views/ListViews.tsx` |
| 3 | **Collections** | `/collections` | `playground/src/views/CollectionsPage.tsx` |
| 4 | **Collection Detail** | `/collections/:slug` | `playground/src/canvas/MarkdownCanvasPage.tsx` |
| 5 | **Syntax / Getting Started** | `/getting-started`, `/syntax`, `/workout/:category/:name` | `playground/src/App.tsx` (WorkoutEditorPage) |
| 6 | **Playground Note** | `/playground/:id` | `playground/src/App.tsx` (PlaygroundNotePage) |
| 7 | **Journal Entry** | `/journal/:id` | `playground/src/App.tsx` (JournalPage) |
| 8 | **Tracker** | `/tracker/:runtimeId` | `playground/src/App.tsx` (TrackerPage) |
| 9 | **Review** | `/review/:runtimeId` | `playground/src/App.tsx` (ReviewPage) |

---

## Component Consumption by Page

### Home (`/`)
```
HomeView
├── HomeHero
├── MarkdownCanvasPage
│   ├── MacOSChrome
│   ├── CanvasProse
│   ├── NoteEditor
│   ├── FullscreenTimer → RuntimeTimerPanel, FocusedDialog, ReviewGrid
│   ├── ButtonGroup
│   └── CollectionWorkoutsList → QueriableListView → FilteredList, FuzzySearchQuery
├── CanvasPage → PageNavDropdown, StickyNavPanel
├── SidebarLayout → Navbar, Sidebar, SidebarAccordion
├── NavSidebar
├── CommandPalette (playground) → CommandListView
├── CastButtonRpc, AudioToggle
└── CalendarSplitButton → CalendarCard, DropdownMenu
```

### Journal List (`/journal`)
```
JournalWeeklyPage
├── JournalDateScroll → ResultListItem
└── CanvasPage → PageNavDropdown, StickyNavPanel
```

### Collections (`/collections`)
```
CollectionsPage
├── TextFilterStrip
└── CanvasPage → PageNavDropdown, StickyNavPanel
```

### Syntax / Getting Started / Workout Editor
```
WorkoutEditorPage
├── JournalPageShell → PageNavDropdown
├── NoteEditor
├── FullscreenTimer → RuntimeTimerPanel, FocusedDialog, ReviewGrid, CastButtonRpc, AudioToggle
├── FullscreenReview → ReviewGrid, FocusedDialog, CastButtonRpc, AudioToggle
└── CalendarSplitButton → CalendarCard, DropdownMenu
```

### Tracker (`/tracker/:runtimeId`)
```
FullscreenTimer → RuntimeTimerPanel, FocusedDialog, ReviewGrid, CastButtonRpc, AudioToggle
```

### Review (`/review/:runtimeId`)
```
FullscreenReview → ReviewGrid, FocusedDialog, CastButtonRpc, AudioToggle
```

---

## Storybook Coverage Matrix

### ✅ Covered (18 components)

| Component | Used In | Story | Quality |
|-----------|---------|-------|---------|
| Button | Navbar, AudioToggle, CastButtonRpc | `atoms/Button` | Full |
| Badge | (not used in playground) | `atoms/Badge` | Full |
| Card | (not used in playground) | `atoms/Card` | Full |
| Progress | (not used in playground) | `atoms/Progress` | Full |
| Dialog | (not used — playground uses Headless) | `atoms/Dialog` | Full |
| Label | (not used in playground) | `atoms/Label` | Full |
| DropdownMenu | CalendarSplitButton, CalendarCard | `atoms/DropdownMenu` | Full |
| ButtonGroup | MarkdownCanvasPage | `molecules/ButtonGroup` | Full |
| ButtonGroupDropdown | (editor overlays) | `molecules/ButtonGroupDropdown` | Full |
| CalendarCard | NewEntryButton, schedule modal | `molecules/CalendarCard` | Full |
| CalendarSplitButton | NewEntryButton | `molecules/CalendarSplitButton` | Full |
| StickyNavPanel | CanvasPage | `molecules/StickyNavPanel` | Full |
| ResultListItem | JournalDateScroll | `molecules/ResultListItem` | Full |
| CommandListView | CommandPalette | `organisms/ListView` | Full |
| CommandPalette (command-palette/) | Playground CommandPalette | `organisms/CommandPalette` | Partial — see notes |
| NoteEditor | All editor pages | `templates/NoteEditor/*` | Full |
| FullscreenTimer | Tracker, Journal Entry | `templates/Tracker/*` | Full |
| FullscreenReview | Review, Journal Entry | `templates/Review/*` | Full |

### ❌ Missing Stories — 17 components used in playground with NO Storybook

#### Organisms (4)

| Component | File | Used In | Priority |
|-----------|------|---------|----------|
| **SidebarLayout** | `src/components/playground/sidebar-layout.tsx` | ALL pages | 🔴 Critical — entire app shell |
| **NavSidebar** | `playground/src/nav/NavSidebar.tsx` | ALL pages | 🔴 Critical — primary navigation |
| **CommandPalette** (playground) | `src/components/playground/CommandPalette.tsx` | ALL pages | 🔴 Critical — wraps in Dialog, different from catalog story |
| **MarkdownCanvasPage** | `playground/src/canvas/MarkdownCanvasPage.tsx` | Home, all canvas pages | 🔴 Critical — core content renderer |

#### Molecules (7)

| Component | File | Used In | Priority |
|-----------|------|---------|----------|
| **PageNavDropdown** | `src/components/playground/PageNavDropdown.tsx` | CanvasPage, JournalPageShell | 🟡 High |
| **SidebarAccordion** | `src/components/playground/SidebarAccordion.tsx` | ALL pages (nav L2) | 🟡 High |
| **MacOSChrome** | `playground/src/components/MacOSChrome.tsx` | MarkdownCanvasPage | 🟡 High |
| **CanvasProse** | `playground/src/canvas/CanvasProse.tsx` | MarkdownCanvasPage | 🟡 High |
| **AudioToggle** | `src/components/audio/AudioToggle.tsx` | ALL pages (navbar) | 🟡 High |
| **CastButtonRpc** | `src/components/cast/CastButtonRpc.tsx` | ALL pages (navbar) | 🟡 High |
| **FocusedDialog** | `src/components/Editor/overlays/FocusedDialog.tsx` | FullscreenTimer, FullscreenReview | 🟡 High |

#### Atoms (2)

| Component | File | Used In | Priority |
|-----------|------|---------|----------|
| **Navbar** (+ Item/Section/Spacer/Divider) | `src/components/playground/navbar.tsx` | ALL pages | 🟡 High |
| **Sidebar** (+ Body/Header/Item/Section/Label) | `src/components/playground/sidebar.tsx` | ALL pages | 🟡 High |

#### Templates / Views (4)

| Component | File | Used In | Priority |
|-----------|------|---------|----------|
| **HomeHero** | `playground/src/components/HomeHero.tsx` | Home | 🟡 High |
| **JournalDateScroll** | `playground/src/views/queriable-list/JournalDateScroll.tsx` | Journal List | 🟡 High |
| **TextFilterStrip** | `playground/src/views/queriable-list/TextFilterStrip.tsx` | Collections | 🟢 Medium |
| **CollectionWorkoutsList** | `playground/src/views/queriable-list/CollectionWorkoutsList.tsx` | Collection Detail | 🟢 Medium |

---

## Inadequate Stories (5)

| Component | Issue |
|-----------|-------|
| **CommandPalette** (catalog story) | Story documents `@/components/command-palette/CommandPalette`, **not** the playground's `@/components/playground/CommandPalette.tsx` which wraps it in a Headless Dialog. Dialog behavior, keyboard shortcut integration, and strategy switching are untested. |
| **RuntimeTimerPanel** | Only visible inside FullscreenTimer parent. Never shown standalone. No stories demonstrating different workout types (AMRAP, EMOM, Tabata). |
| **Collections Page** (catalog story) | Uses `CollectionBrowsePanel` (workbench component), not the playground's `CollectionsPage.tsx`. The actual playground page with `TextFilterStrip` and grouped category layout is not represented. |
| **Planner Page** (catalog story) | Uses legacy `PlanPanel`. Playground now uses `NoteEditor` inside `JournalPageShell` — this pattern is covered by JournalPageShell stories but not under the "Planner" name. |
| **StickyNavPanel** | Good standalone coverage but doesn't demonstrate it inside the `CanvasPage` shell with scroll observation and section highlighting — how it's actually used. |

---

## Orphan Components — In Storybook but NOT in Playground (30+)

### Design System Primitives (no story, not consumed)
alert, auth-layout, avatar, checkbox, combobox, description-list, divider, fieldset, heading, input, link, listbox, pagination, radio, select, stacked-layout, switch, table, textarea, text

### Storybook-Only Catalog Entries
| Component | Story | Notes |
|-----------|-------|-------|
| ShortcutBadge | `atoms/ShortcutBadge` | Not used in playground |
| VisibilityBadge | `atoms/VisibilityBadge` | Not used in playground |
| Label | `atoms/Label` | UI primitive, not directly used |
| Card | `atoms/Card` | UI primitive, not directly used |
| Progress | `atoms/Progress` | UI primitive, not directly used |
| CalendarButton | `molecules/CalendarButton` | Not used in playground |
| CommandInput | `molecules/CommandInput` | Not used in playground |
| CommandItem | `molecules/CommandItem` | Not used in playground |
| CommandPill | `molecules/CommandPill` | Not used in playground |
| CommitGraph | `molecules/CommitGraph` | Not used in playground |
| GridHeaderCell | `molecules/GridHeaderCell` | Not used in playground |
| MetricSourceRow | `molecules/MetricSourceRow` | Not used in playground |
| MetricTrackerCard | `molecules/MetricTrackerCard` | Not used in playground |
| MetricVisualizer | `molecules/MetricVisualizer` | Not used in playground |
| StatementDisplay | `molecules/StatementDisplay` | Not used in playground |
| TimerStackView | `organisms/TimerStackView` | Not used in playground |
| WorkoutActionButton | `organisms/WorkoutActionButton` | Not used in playground |
| ParallaxSection | `organisms/ParallaxSection` | Not used in playground |
| Syntax | `organisms/Syntax` | Standalone story, not playground's syntax page |
| CalendarPageShell | `pages/Calendar` | Not used in playground |
| CollectionBrowsePanel | (Collections story) | Not used in playground |
| PlanPanel | (Planner story) | Legacy — not used in playground |

> **Note:** Many orphans are workbench/internal components used in Storybook for documentation or testing purposes but not directly consumed by the playground app. This is expected for a component library — they document the API surface even if not all primitives are used in the playground today.

---

## Summary

```
Playground components:     ~35 actively consumed
Components with stories:   18 (51%)
Components missing stories: 17 (49%)
Inadequate stories:        5
Orphan catalog entries:    30+
```

### Priority Queue — Stories to Create

**🔴 Critical (app shell — zero coverage):**
1. SidebarLayout
2. NavSidebar
3. CommandPalette (playground variant)
4. MarkdownCanvasPage

**🟡 High (repeated across pages, zero coverage):**
5. Navbar + Sidebar (atoms)
6. SidebarAccordion
7. PageNavDropdown
8. MacOSChrome + CanvasProse
9. AudioToggle + CastButtonRpc
10. FocusedDialog
11. HomeHero
12. JournalDateScroll

**🟢 Medium:**
13. TextFilterStrip
14. CollectionWorkoutsList

**📋 Existing stories to update:**
15. CommandPalette — add playground variant story
16. RuntimeTimerPanel — add standalone stories
17. Collections — use actual playground CollectionsPage
18. Planner — rename or redirect to NoteEditor pattern
