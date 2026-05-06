# WOD Wiki — Storybook × Playground Coverage Assessment

**Date:** 2026-04-21  
**Commit:** `20ce3a50` (main)  
**Scope:** Storybook stories vs. playground SPA components, with atomic design classification validation

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total story files (catalog/) | 56 |
| Total story variants | ~280 |
| Components in `src/components/` | ~110 |
| Direct story coverage | 42 components (38%) |
| Indirect coverage (composed in parent) | ~15 components (14%) |
| No coverage | ~50 components (48%) |
| Story quality: ✅ Complete | 38 (67%) |
| Story quality: ⚠️ Partial | 14 (25%) |
| Story quality: ❌ Minimal | 1 (2%) |
| Orphan stories (broken imports) | 0 |
| Atomic design misclassifications | 2 |

**Bottom line:** Storybook quality is high (67% complete), but nearly half the components have no dedicated story. The bigger finding is that **25 of 56 stories cover components not used in the playground SPA** — they serve the Workbench/Editor/Chromecast subsystems.

---

## 1. Playground Route Coverage

Each route traced to its component tree. Coverage % = components with stories ÷ total components rendered.

| Route | Top Components | Key Missing Stories | Coverage |
|-------|---------------|--------------------| ---------|
| `/` (Home) | SidebarLayout, CanvasPage, HomeView, HomeHero, MarkdownCanvasPage, NoteEditor, MacOSChrome | `CanvasPage`, `HomeView`, `FullscreenTimer`, `ReviewGrid` | **76%** |
| `/getting-started` | SidebarLayout, CanvasPage, MarkdownCanvasPage, NoteEditor | `CanvasPage`, `FullscreenTimer`, `ReviewGrid` | **75%** |
| `/syntax` | SidebarLayout, CanvasPage, MarkdownCanvasPage | `CanvasPage`, `FullscreenTimer`, `ReviewGrid` | **75%** |
| `/journal` | SidebarLayout, CanvasPage, JournalWeeklyPage, JournalDateScroll, ResultListItem | `CanvasPage`, `JournalWeeklyPage` | **73%** |
| `/collections` | SidebarLayout, CanvasPage, CollectionsPage, TextFilterStrip | `CanvasPage` | **74%** |
| `/collections/:slug` | SidebarLayout, CanvasPage, MarkdownCanvasPage | `CanvasPage` | **75%** |
| `/playground/:id` | SidebarLayout, PlaygroundNotePage, JournalPageShell, NoteEditor | `PlaygroundNotePage` | **73%** |
| `/journal/:id` | SidebarLayout, JournalPage, JournalPageShell, FullscreenTimer, FullscreenReview | `JournalPage`, `FullscreenTimer`, `FullscreenReview` | **68%** |
| `/tracker/:runtimeId` | TrackerPage, FullscreenTimer, RuntimeTimerPanel, ReviewGrid | `TrackerPage`, `FullscreenTimer`, `ReviewGrid` | **43%** |
| `/review/:runtimeId` | ReviewPage, FullscreenReview, ReviewGrid | `ReviewPage`, `FullscreenReview`, `ReviewGrid` | **50%** |
| `/load` | LoadZipPage | N/A (trivial redirect) | **0%** |

### Critical Missing Stories (playground-used, no story)

| Component | Used On | Priority |
|-----------|---------|----------|
| `CanvasPage` | Every content route | 🔴 High — most-used page shell |
| `FullscreenTimer` | Tracker, Journal, Editor | 🔴 High — core workout overlay |
| `FullscreenReview` | Review, Journal | 🔴 High — post-workout review |
| `ReviewGrid` | Tracker, Review, Home | 🔴 High — results display |
| `HomeView` | `/` | 🟡 Medium — page-level view |
| `JournalWeeklyPage` | `/journal` | 🟡 Medium — page-level view |
| `TrackerPage` | `/tracker/:runtimeId` | 🟡 Medium — route page |
| `ReviewPage` | `/review/:runtimeId` | 🟡 Medium — route page |
| `CommandPalette` (playground variant) | Global | 🟡 Medium — different from storybook-covered variant |

---

## 2. Storybook-Only Stories (Not Used in Playground SPA)

These 25 stories cover components used by the **Workbench/Editor/Chromecast** subsystems — not the playground SPA. They're valid stories but represent a different surface area.

| Story | Component | Used By |
|-------|-----------|---------|
| `atoms/MetricPill` | MetricPill | Chromecast receiver |
| `atoms/Progress` | Progress | Chromecast receiver |
| `atoms/VisibilityBadge` | VisibilityBadge | Chromecast receiver |
| `molecules/ButtonGroupDropdown` | ButtonGroupDropdown | Workbench |
| `molecules/CalendarButton` | CalendarButton | Workbench (CalendarPageShell) |
| `molecules/CommitGraph` | CommitGraph | Not used anywhere |
| `molecules/CommandInput` | CommandInput (surrogate) | Workbench CommandPalette |
| `molecules/CommandItem` | CommandItem | Workbench CommandPalette |
| `molecules/CommandPill` | CommandPill (surrogate) | Workbench |
| `molecules/MetricSourceRow` | MetricSourceRow | Chromecast receiver |
| `molecules/MetricTrackerCard` | MetricTrackerCard | Chromecast receiver |
| `molecules/MetricVisualizer` | MetricVisualizer | Chromecast receiver |
| `molecules/ShortcutBadge` | ShortcutBadge | Not used anywhere |
| `molecules/StatementDisplay` | StatementDisplay | Workbench/Editor |
| `organisms/CommandPalette` | CommandPalette (command-palette/) | Workbench (different from playground variant) |
| `organisms/ListView` | ListView/CommandListView | Workbench (different from JournalDateScroll) |
| `organisms/ParallaxSection` | ParallaxSection | Replaced by CanvasPage |
| `organisms/Syntax` | StorybookWorkbench | Storybook-only utility |
| `organisms/TimerStackView` | TimerStackView | Chromecast receiver |
| `organisms/WorkoutActionButton` | WorkoutActionButton | Not used in playground |
| `pages/Planner` | PlanPanel | Workbench/Editor |
| `pages/Calendar` | CalendarPageShell | Not used in playground |
| `templates/Review/Chromecast` | Receiver panels | Chromecast receiver |
| `templates/Tracker/Chromecast` | Receiver panels | Chromecast receiver |
| `Primitives.stories.tsx` | 23 UI primitives | Design system reference |

**Assessment:** These are not wasted stories — they document the broader component library. But they should be clearly categorized. Consider adding a `workbench/` or `chromecast/` story subfolder to distinguish from playground stories.

---

## 3. Story Quality Assessment

### ✅ Complete (38 stories — 67%)
Show form (all variants) + function (interactivity) + meaningful data + edge cases.

Standouts:
- **CommandPalette** — keyboard nav, empty state, filtered
- **NoteEditor/Web+Mobile** — 14 stories covering empty, WOD, multi-WOD, syntax highlight, long content, toolbar
- **Tracker/Review stories** — real ScriptRuntime execution with actual workout data
- **RuntimeTimerPanel** — all states (idle, running, paused, complete, error)
- **CalendarCard** — 7 stories including min-date, compact, range
- **Primitives** — 23 design system primitives, all interactive

### ⚠️ Partial (14 stories — 25%)
Good form coverage but missing edge cases or interactivity.

| Story | What's Missing |
|-------|---------------|
| AudioToggle | No edge cases (muted state, error) |
| CommandInput | Surrogate, no real component |
| CommandPill | Surrogate, no edge cases |
| GridHeaderCell | No edge cases (all metrics, error) |
| MetricTrackerCard | Single story only, minimal |
| ResultListItem | No edge cases (error, loading) |
| StickyNavPanel | No edge cases (overflow, mobile) |
| MarkdownCanvasPage | Only 2 stories, no edge cases |
| ParallaxSection | Limited interactivity |
| HomeHero | No edge cases, limited responsive |
| Calendar (page) | Only 2 stories |
| Collections (page) | Only 2 stories |
| VisibilityBadge | No edge cases |
| Syntax (organism) | No edge cases |

### ❌ Minimal (1 story — 2%)
- **MetricTrackerCard** — single default story, no variants

---

## 4. Atomic Design Classification Validation

### Misclassifications

| Story | Current | Should Be | Reason |
|-------|---------|-----------|--------|
| `organisms/Syntax.stories.tsx` | `organisms/` | `pages/` | Renders full documentation pages with real content at specific URLs. Not a composable UI section. |
| `organisms/WorkoutActionButton.stories.tsx` | `organisms/` | `molecules/` | Single button with loading/disabled states. Atom + state logic, not composed of multiple molecules. |

### Borderline (Acceptable)

| Story | Current | Alternative | Notes |
|-------|---------|-------------|-------|
| `organisms/RuntimeTimerPanel.stories.tsx` | `organisms/` | `molecules/` | Single panel but integrates with runtime system. Organisms is defensible. |
| `molecules/StatementDisplay.stories.tsx` | `molecules/` | `organisms/` | Composes MetricVisualizer + pills + actions, but single responsibility. Molecules is defensible. |

### Classification Distribution

| Level | Stories | Misclassified |
|-------|---------|---------------|
| atoms | 5 | 0 |
| molecules | 24 | 0 |
| organisms | 10 | 2 |
| templates | 12 | 0 |
| pages | 4 | 0 |
| catalog root (Primitives) | 1 | N/A |

---

## 5. Component Coverage Gaps (Full List)

### 🔴 High Priority — Playground-used, no story

| Component | File | Used By |
|-----------|------|---------|
| CanvasPage | panels/page-shells/CanvasPage.tsx | Every content route |
| FullscreenTimer | Editor/overlays/FullscreenTimer.tsx | Tracker, Journal, Editor |
| FullscreenReview | Editor/overlays/FullscreenReview.tsx | Review, Journal |
| ReviewGrid | review-grid/ReviewGrid.tsx | Tracker, Review, Home |

### 🟡 Medium Priority — Playground-used, no story

| Component | File | Used By |
|-----------|------|---------|
| HomeView | (inline in App.tsx or view) | `/` |
| JournalWeeklyPage | (inline or view) | `/journal` |
| CollectionsPage | playground/CollectionsPage.tsx | `/collections` |
| TrackerPage | (inline in App.tsx) | `/tracker/:runtimeId` |
| ReviewPage | (inline in App.tsx) | `/review/:runtimeId` |
| CommandPalette (playground/) | playground/CommandPalette.tsx | Global |
| WorkoutEditorPage | (inline in App.tsx) | `/workout/:cat/:name` |
| PlaygroundNotePage | (inline in App.tsx) | `/playground/:id` |
| JournalPage | (inline in App.tsx) | `/journal/:id` |

### ⚪ Low Priority — Providers, bridges, integration components

These don't need isolated stories but should be covered through integration/page stories:

AudioContext, CastButton, CastCallout, ProjectionSyncContext, WorkbenchCastBridge, CommandContext, EditorCastBridge, FrontmatterCompanion, InlineCommandBar, MetricInlinePanel, OverlayTrack, RuntimePanel, RuntimePortalManager, WidgetCompanion, WodCompanion, HeroCarousel, CalendarWidget, CollectionsFilter, HistoryLayout, HistoryPostList, ImportMarkdownDialog, NewPostButton, RuntimeHistoryLog, CollapsibleSection, DebugModeContext, DisplaySyncBridge, RuntimeLifecycleProvider, TimerIndexPanel, WodIndexPanel, WorkbenchContext, WorkbenchSyncBridge, Workbench, MetricSourceList, AddToNotebookButton, CreateNotebookDialog, NoteActions, NotebookContext, NotebookMenu, AddWodToNoteDropdown, CloneDateDropdown, CollectionItemList, CollectionPreview, HistoryDetailsPanel, ListFilter, ListOfNotes, NoteDetailsPanel, NotePreview, WorkoutPreviewPanel, RuntimeDebugPanel, StatementList, WorkoutContextPanel, ParsedView, WhiteboardScriptVisualizer

---

## 6. Surrogate Stories (Mock Components)

4 stories use inline mock/surrogate components instead of importing the real thing:

| Story | Real Component | Surrogate | Risk |
|-------|---------------|-----------|------|
| CastButtonRpc | CastButtonRpc | CastButtonMock | Medium — visual-only, no runtime validation |
| CommandInput | cmdk Command.Input | CommandInputRow | Low — documents pattern only |
| CommandPill | CommandPill | Inline wrapper | Low — documents pattern only |
| Review/Chromecast | ReceiverReviewPanel | Inline replication | Medium — documented as "should be extracted" |

---

## 7. Recommendations

### Immediate (Phase 1 — Highest Impact)

1. **Add `CanvasPage` story** — this is the most-used component with zero coverage. A story with variants for each view (Home, Journal, Collections, Syntax) would catch layout regressions.
2. **Add `FullscreenTimer` story** — core workout overlay, used on 3+ routes.
3. **Add `ReviewGrid` story** — results display used on tracker/review/home.
4. **Move `Syntax.stories.tsx` from `organisms/` to `pages/`** — it renders full pages, not composable sections.
5. **Move `WorkoutActionButton.stories.tsx` from `organisms/` to `molecules/`** — it's a single button.

### Short-term (Phase 2)

6. **Add `FullscreenReview` story** — post-workout review overlay.
7. **Upgrade MetricTrackerCard from ❌ to ✅** — currently minimal with 1 story.
8. **Upgrade 14 ⚠️ Partial stories** — add missing edge cases (empty states, error states, loading states).
9. **Organize storybook with subsystem folders** — add `workbench/` or `chromecast/` tags to distinguish playground vs. non-playground stories.

### Medium-term (Phase 3)

10. **Extract inline page components** from App.tsx (TrackerPage, ReviewPage, JournalPage, WorkoutEditorPage, PlaygroundNotePage) into proper files, then add stories.
11. **Replace surrogate stories** with real component imports where possible (especially CastButtonRpc).
12. **Add integration stories** that compose the full page stack (SidebarLayout + CanvasPage + View) to catch cross-level issues.

---

## 8. Comparison to Previous Audit

Since the last audit (commit `67e9193b`), significant progress was made:

| Change | Before | After |
|--------|--------|-------|
| Story files | ~46 | 56 (+10) |
| Primitives index | Missing | ✅ `Primitives.stories.tsx` (23 primitives) |
| Navbar story | Missing | ✅ `atoms/Navbar.stories.tsx` |
| AudioToggle story | Missing | ✅ `molecules/AudioToggle.stories.tsx` |
| CastButtonRpc story | Missing | ✅ `molecules/CastButtonRpc.stories.tsx` |
| PageNavDropdown story | Missing | ✅ `molecules/PageNavDropdown.stories.tsx` |
| SidebarAccordion story | Missing | ✅ `molecules/SidebarAccordion.stories.tsx` |
| TextFilterStrip story | Missing | ✅ `molecules/TextFilterStrip.stories.tsx` |
| MacOSChrome story | Missing | ✅ `molecules/chrome/MacOSChrome.stories.tsx` |
| CanvasProse story | Missing | ✅ `molecules/content/CanvasProse.stories.tsx` |
| FocusedDialog story | Missing | ✅ `molecules/overlays/FocusedDialog.stories.tsx` |
| MarkdownCanvasPage story | Missing | ✅ `organisms/MarkdownCanvasPage.stories.tsx` |
| NavSidebar story | Missing | ✅ `organisms/NavSidebar.stories.tsx` |
| RuntimeTimerPanel story | Missing | ✅ `organisms/RuntimeTimerPanel.stories.tsx` |
| SidebarLayout story | Missing | ✅ `organisms/SidebarLayout.stories.tsx` |
| HomeHero template story | Missing | ✅ `templates/HomeHero.stories.tsx` |
| JournalDateScroll template story | Missing | ✅ `templates/JournalDateScroll.stories.tsx` |
| CollectionWorkoutsList template story | Missing | ✅ `templates/CollectionWorkoutsList.stories.tsx` |
| Planner page story | Missing | ✅ `pages/Planner.stories.tsx` |
| ShortcutBadge component | Missing | ✅ Created |
| VisibilityBadge component | Missing | ✅ Created |
| AGENTS.md guidelines | Missing | ✅ Created |

**18 new stories added** since the last audit. The biggest remaining gap is that many new stories cover non-playground components while the core playground page components (CanvasPage, FullscreenTimer, FullscreenReview, ReviewGrid) still have zero coverage.
