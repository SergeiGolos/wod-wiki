# Feature: Page-Level View / Panel → Runtime Coupling

**Brainstorm Date:** March 19, 2026
**Updated:** March 21, 2026 — Added formal term definitions, supported configuration scenarios, scroll-driven state changes, and high-level goals.
**Status:** Draft
**Issue:** Decoupled panels / views / pages with multiple running engines

---

## Terms & Definitions

The following terms define the architectural layers from outermost container down to the execution engine. These terms are used consistently throughout this document and in the codebase.

### Workbench

The **Workbench** is the top-level page container loaded in the browser. A single workbench instance manages the full surface area of a loaded page.

- Contains one or more **notes** (loaded documents).
- Contains zero or more **runtimes** running simultaneously.
- Hosts one or more **views**, each of which subscribes to the state of any note or runtime available on the workbench.
- Manages cross-cutting concerns: theme, audio, command palette, navigation, and persistence.

> **Existing code:** `src/components/layout/Workbench.tsx` + `workbenchSyncStore.ts` (Zustand store for cross-panel state).

### Runtime

A **Runtime** is a stateful execution engine unique to a single WOD block.

- Created when the user clicks "Run" on a note's editor toolbar.
- Manages its own `RuntimeStack`, `RuntimeClock`, `RuntimeMemory`, and `SubscriptionManager`.
- One workbench can have zero or more active runtimes (one per running WOD block).
- Emits events (stack snapshots, output statements, tracker updates) to its `SubscriptionManager`, which fans them out to subscribers.

> **Existing code:** `src/runtime/ScriptRuntime.ts`, `src/components/layout/RuntimeLifecycleProvider.tsx`, `src/runtime/subscriptions/SubscriptionManager.ts`.

### Note

A **Note** is a document containing WOD blocks and prose. Notes can be:

- **In-memory** — created on page load, not persisted. Used for documentation/tutorial pages where the content is ephemeral. A page reload resets to the default content.
- **Stored** — persisted to IndexedDB (and eventually a server). Used for journal entries, workout collections, and user-created content. All data (content, run history, analytics) is preserved.

### Views

A **View** is a container that displays one or more **panels**. Views are responsible for:

- **Layout management** — sizing panels within their container (responsive grid, split panes, full-screen).
- **Responsive adaptation** — adjusting panel arrangement across breakpoints (desktop, tablet, mobile).
- **Panel binding** — connecting a panel to a specific runtime or note on the workbench. A view can rebind its panels to a different runtime or note without rebuilding the panel components.

Views do *not* own runtime lifecycle — they subscribe to runtimes managed by the workbench.

> **Existing code:** `src/panels/panel-system/types.ts` (`ViewDescriptor`), `src/panels/panel-system/ResponsiveViewport.tsx`, `src/panels/panel-system/PanelGrid.tsx`.

### Panels

**Panels** are the concrete UI components that display information from a subscribed runtime or note. Each panel type has a single responsibility:

- **Editor Panel** — Displays the CodeMirror editor wired to a note on the workbench. Provides editing, syntax highlighting, inline run controls, and the overlay companion.
- **Timer Panel** — Subscribes to events on a live runtime and displays the countdown/count-up timers, the runtime stack, and execution controls (start/pause/stop/next).
- **Review Panel** — Displays the output statements from a completed (or running) runtime as grid views with analytics, segments, and metric breakdowns.

> **Note:** The panels themselves are well-defined in the current codebase. The changes proposed here primarily affect the *view layer* that manages panel sizing, layout, and runtime binding — not the panels' internal implementations.

> **Existing code:** `src/panels/plan-panel.tsx`, `src/panels/timer-panel.tsx`, `src/panels/track-panel.tsx`, `src/panels/analyze-panel.tsx`.

---

## 1. Requirement Analysis

- **Core Problem**: The application needs a unified page/view architecture that decouples UI panels from runtime engines, enabling multiple independent runtimes across different view contexts (Docs, Journal, Calendar) while supporting mobile, Chromecast, and web targets. The workbench must support multiple notes and runtimes simultaneously, with views that can subscribe to any combination of notes and runtimes available on the page.
- **Success Criteria**: Each page type (Docs, Journal, Calendar) renders correctly across breakpoints, can optionally bind to zero or more runtime engines, and views compose from reusable panel primitives without hard coupling. The three supported configurations (see below) all work correctly with consistent panel components.
- **Scope**: Architecture — new view types, panel composition patterns, and runtime binding strategy. Touches playground pages, panel system, and runtime lifecycle.
- **User Impact**: End users get a cohesive multi-page experience where documentation pages, workout journals, and calendar views all share consistent navigation, responsive behavior, and optional workout execution.

### Summary

The current system tightly couples the Workbench component to a single runtime instance. This brainstorm proposes an architecture where pages are built from composable view primitives (parallax sections, sticky navs, hero banners, scrollable lists), each optionally bound to independent runtime engines. Three page archetypes emerge — Docs, Journal, and Calendar — each with distinct layout needs but shared panel infrastructure.

### Supported Configurations

The architecture must support three distinct workbench configurations, each combining notes, views, and runtimes differently.

#### Configuration 1: In-Memory Note — Single View Transition

A single view bound to an in-memory note. The view transitions between panels as the workflow progresses:

```
[Editor Panel] ──(run)──→ [Timer Panel] ──(complete)──→ [Review Panel]
```

- **Note type:** In-memory (not persisted). Page reload returns to a fresh state.
- **Views:** One view that transitions between panels sequentially.
- **Runtime:** Created when "Run" is clicked; disposed when the user resets or navigates away.
- **Use case:** Tutorial steps, interactive documentation, getting-started pages — where the user is guided through a Plan → Track → Review flow in a focused, single-panel experience.

#### Configuration 2: In-Memory Note — Multi-View Simultaneous

Multiple views subscribed to the same in-memory note, showing the Editor, Timer, and Review panels simultaneously:

```
┌─────────────────────────────────────────────────────┐
│ View A: Editor Panel │ View B: Timer Panel          │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│ View C: Review Panel                                │
└─────────────────────────────────────────────────────┘
```

- **Note type:** In-memory.
- **Views:** Multiple independent views, each showing a different panel, all subscribed to the same note and runtime.
- **Runtime:** Shared across views via workbench-level subscription.
- **Use case:** Long-scrolling parallax documentation pages where the user can see the editor, live timer, and review output at different scroll positions. Also useful for side-by-side tutorial layouts.

#### Configuration 3: Stored Note — Dialog-Based Timer

An editor view bound to a stored (persisted) note. Running a workout launches the timer in a separate fullscreen dialog view. Completion shows a fullscreen review:

```
[Editor Panel]
      │
      ├──(run)──→ [Fullscreen Timer Dialog]
      │                    │
      │           (complete)
      │                    │
      └──(return)←─ [Fullscreen Review Dialog]
```

- **Note type:** Stored (IndexedDB now, server-side later). All content and run data is preserved.
- **Views:** The editor lives in the base page view. The timer and review each open as fullscreen dialog views overlaid on the editor.
- **Runtime:** Created in the dialog scope; analytics persisted back to the stored note on completion.
- **Use case:** Collection pages, journal notes — where the user has an editor as their primary workspace and the timer/review are immersive overlays. This is the behavior that exists today but needs to be abstracted for consistency with the other configurations.

### High-Level Goals

#### Documentation Pages (Home, Getting Started, Syntax)

- Use **in-memory notes** with **Configuration 1** (single view transition) for focused step-through experiences.
- Use **Configuration 2** (multi-view) for long-scrolling parallax pages where views are visible at different scroll positions.
- Scroll events on parallax pages drive runtime state changes (see [Section 9: Scroll-Driven Runtime State Changes](#9-feature-deep-dive-scroll-driven-runtime-state-changes)).

#### Collection & Journal Pages

- Use **stored notes** with **Configuration 3** (dialog-based timer/review).
- The editor is always visible as the primary workspace.
- The timer launches as a fullscreen dialog (existing behavior today).
- On completion, the fullscreen review dialog renders with analytics.
- All data is persisted — content, run history, and analytics survive page reloads.

#### Parallax Scroll Integration

On scrolling parallax documentation pages, scroll events need to:
- Support state changes in the runtime (e.g., scrolling to a new section activates a different demo runtime).
- Progress through the parallax story based on timer events (timer start → auto-scroll to next step, timer complete → auto-scroll to next step).
- Respond to user scroll actions (scrolling to a step ensures the views/panels and note/runtime state are correctly set or updated).

---

## 2. Code Exploration

### Relevant Files

| File | Purpose |
|------|---------|
| `src/panels/panel-system/types.ts` | Core panel types: `PanelSpan`, `ScreenMode`, `ViewDescriptor`, `PanelDescriptor` |
| `src/panels/panel-system/viewDescriptors.ts` | Factory functions for Plan/Track/Review/History/Analyze views |
| `src/panels/panel-system/PanelGrid.tsx` | Responsive flex container (desktop/tablet/mobile breakpoints) |
| `src/panels/panel-system/PanelShell.tsx` | Individual panel wrapper with expand/collapse |
| `src/panels/panel-system/ResponsiveViewport.tsx` | Stacked view container with keyboard navigation |
| `src/panels/panel-system/useScreenMode.ts` | Responsive breakpoint detection |
| `src/panels/panel-system/PanelSizeContext.tsx` | Container-aware sizing context |
| `src/runtime/context/RuntimeContext.tsx` | React context for `IScriptRuntime` injection |
| `src/runtime/context/RuntimeLifecycleProvider.tsx` | Creates/disposes runtimes, manages `SubscriptionManager` |
| `src/runtime/subscriptions/SubscriptionManager.ts` | Fan-out hub distributing runtime events to subscribers |
| `src/runtime/subscriptions/LocalRuntimeSubscription.ts` | Browser-local event receiver |
| `src/runtime/contracts/IRuntimeSubscription.ts` | Subscription interface contract |
| `src/runtime/contracts/IRuntimeEventProvider.ts` | Event dispatch interface contract |
| `src/runtime/hooks/useStackSnapshot.ts` | Hook to subscribe to runtime stack changes |
| `src/runtime/hooks/useOutputStatements.ts` | Hook to subscribe to output statements |
| `src/components/layout/workbenchSyncStore.ts` | Zustand store for cross-panel state |
| `src/components/layout/DisplaySyncBridge.tsx` | Serializes UI state for Chromecast |
| `src/components/workbench/useWorkbenchRuntime.ts` | Workout lifecycle + analytics |
| `playground/src/HomePage.tsx` | Current parallax landing page |
| `playground/src/GettingStartedPage.tsx` | Current tutorial page |
| `playground/src/SyntaxPage.tsx` | Current syntax reference page |
| `playground/src/App.tsx` | Playground router and top-level providers |

### Similar Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| **Workbench multi-view system** | `src/panels/panel-system/` | The existing `ViewDescriptor` / `PanelDescriptor` pattern is the foundation for composable views |
| **Chromecast receiver panels** | `src/panels/*-chromecast.tsx` | Demonstrates decoupled runtime-to-display: the receiver renders from serialized state, not direct runtime access |
| **DisplaySyncBridge** | `src/components/layout/DisplaySyncBridge.tsx` | Serializes runtime state for remote display — proves the pattern of runtime → serialized state → independent renderer |
| **Parallax sections on HomePage** | `playground/src/HomePage.tsx` | Uses `IntersectionObserver` with rootMargin `-20% 0px -50% 0px` for step detection — a working parallax panel primitive |
| **SubscriptionManager fan-out** | `src/runtime/subscriptions/SubscriptionManager.ts` | Already supports multiple subscriptions per runtime — extensible to multiple runtimes |

### Key Patterns

| Pattern                            | How It Applies                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fan-out Subscriptions**          | `SubscriptionManager` already distributes one runtime's events to N subscribers. Extending to N runtimes means N managers, each with their own subscriber set. |
| **ViewDescriptor composition**     | Views are defined as `{ id, label, icon, panels[] }`. New page types (Docs, Journal, Calendar) can each define their own `ViewDescriptor` sets.                |
| **PanelSpan responsive layout**    | The `PanelSpan` (1/3, 2/3, 3/3) system handles desktop/tablet/mobile. New panels (calendar widget, scrollable list, parallax section) plug into this.          |
| **Zustand selector subscriptions** | `workbenchSyncStore` uses Zustand for efficient cross-panel state. Multiple runtimes could each have their own store slice or separate stores.                 |
| **Strategy pattern**               | Runtime block compilation uses strategies. Page-level view composition can use a similar pattern — page type → view strategy → panel set.                      |

### Mapping: New Terms → Existing Code

| Term                       | Existing Code                                       | Gap                                                                                                                |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Workbench**              | `Workbench.tsx` + `workbenchSyncStore.ts`           | Currently hardcoded to one runtime. Needs to support 0..N runtimes and multiple notes.                             |
| **Runtime**                | `ScriptRuntime.ts` + `RuntimeLifecycleProvider.tsx` | Per-block runtime already works. Lifecycle provider needs scoping for multiple simultaneous runtimes.              |
| **Note (in-memory)**       | `HomePage.tsx` inline `useState` for editor content | No formal "note" abstraction. Content is ad-hoc per page.                                                          |
| **Note (stored)**          | `NotebookProvider` + IndexedDB                      | Exists for playground/journal notes. Needs clean API for views to bind to.                                         |
| **View**                   | `ViewDescriptor` + `ResponsiveViewport`             | Existing views (Plan/Track/Review) transition sequentially. Multi-view simultaneous display is not supported.      |
| **Panel**                  | `PanelDescriptor` + `PanelShell` + concrete panels  | Well-defined. No changes needed to panel internals.                                                                |
| **View ↔ Runtime binding** | `RuntimeContext` + `SubscriptionManagerContext`     | Currently 1:1 (one runtime per provider tree). Needs to support views subscribing to any runtime on the workbench. |
| **Configuration 3 dialog** | `TrackerPage` / `ReviewPage` as routes              | Today these are full routes (`/tracker/:id`, `/review/:id`). Need abstraction as dialog views for consistency.     |

---

## 3. Proposed Solutions

### Solution A: Multi-Runtime Provider with Page-Level View Registry

**How It Works:** Introduce a `RuntimeRegistry` that manages multiple named runtime instances (e.g., `"hero-demo"`, `"syntax-example-3"`, `"journal-editor"`). Each panel declares which runtime it binds to via a `runtimeId` prop. A `PageViewRegistry` maps page archetypes (Docs/Journal/Calendar) to their `ViewDescriptor` sets. Panels that don't need a runtime simply omit the binding.

**Affected Components:**
- New: `src/runtime/context/RuntimeRegistry.tsx`, `src/panels/page-views/` directory
- Modified: `RuntimeLifecycleProvider.tsx` (support multiple instances), panel-system `types.ts` (add `runtimeId` to `PanelDescriptor`)
- New panels: `DocsPageView`, `JournalPageView`, `CalendarPageView`

**Implementation Complexity:** High
**Alignment with Existing Patterns:** Good — extends the existing `ViewDescriptor` pattern and `SubscriptionManager` fan-out. The `runtimeId` binding is a natural extension of the current context-based injection.

**Testing Strategy:**
- Unit: `RuntimeRegistry` creation/disposal/lookup
- Integration: Multiple panels binding to different runtimes in one page
- Visual: Storybook stories for each page archetype

**Risks or Tradeoffs:**
- Complexity of managing multiple runtime lifecycles simultaneously
- Memory pressure from multiple active runtimes
- Need to carefully handle disposal order when navigating between pages

---

### Solution B: Page Shell Pattern with Scoped Runtime Contexts

**How It Works:** Instead of a global registry, each page type gets a `PageShell` component that defines its layout structure and optionally wraps sections in scoped `RuntimeLifecycleProvider` instances. A Docs page shell provides parallax sections, hero banners, and sticky navigation as layout primitives. A Journal page shell wraps the existing Workbench. A Calendar page shell provides date selection and tabbed content areas. Each shell composes panels from the existing `PanelGrid`/`PanelShell` infrastructure.

**Affected Components:**
- New: `src/panels/page-shells/DocsPageShell.tsx`, `JournalPageShell.tsx`, `CalendarPageShell.tsx`
- New primitives: `ParallaxPanel.tsx`, `StickyNavPanel.tsx`, `HeroBanner.tsx`, `CalendarWidget.tsx`, `TabbedContentPanel.tsx`
- Modified: Minimal changes to existing panel system — new shells compose existing primitives

**Implementation Complexity:** Medium
**Alignment with Existing Patterns:** Excellent — follows the existing pattern where `Workbench` is effectively a "page shell" already. Each new shell wraps `RuntimeLifecycleProvider` only where runtime binding is needed.

**Testing Strategy:**
- Unit: Each shell renders correct panel structure
- Integration: Runtime scoping within shell sections
- Visual: Storybook stories per shell + individual primitives

**Risks or Tradeoffs:**
- Less flexible than a full registry for arbitrary runtime compositions
- Parallax/scroll behavior needs careful mobile handling
- Each page shell is somewhat bespoke — may lead to code duplication without good primitives

---

### Solution C: Unified Page Composition Framework

**How It Works:** Define a declarative page DSL where each page is a JSON/TypeScript configuration of sections, each section declares its layout mode (parallax, sticky, scroll, tabbed), panel content, and optional runtime binding. A `PageRenderer` interprets this configuration and assembles the component tree. This maximizes reuse and makes page creation data-driven.

**Affected Components:**
- New: `src/panels/page-framework/PageRenderer.tsx`, `SectionRenderer.tsx`, `pageConfigs/` directory
- New: Section type components (parallax, sticky, hero, calendar, tabbed)
- Modified: Router to use `PageRenderer` instead of direct page components

**Implementation Complexity:** High
**Alignment with Existing Patterns:** Fair — introduces a new abstraction layer. While powerful, it diverges from the current direct-component approach.

**Testing Strategy:**
- Unit: PageRenderer with mock configs
- Integration: Full page rendering with runtime bindings
- Snapshot: Page configs produce expected component trees

**Risks or Tradeoffs:**
- Over-engineering risk — may not need the full DSL for three page types
- Debugging becomes harder when layout is config-driven
- Configuration schema maintenance overhead

---

## 4. Recommendation

**Recommended: Solution B — Page Shell Pattern with Scoped Runtime Contexts**

This approach provides the best balance of flexibility and pragmatism. It extends the existing pattern (Workbench as a page shell) rather than replacing it, keeps runtime scoping simple through nested `RuntimeLifecycleProvider` instances, and delivers the three page types with composable primitives.

The key insight is that the current `Workbench` component already _is_ a page shell — it defines a layout (Plan/Track/Review views), manages a runtime lifecycle, and composes panels. The proposal formalizes this into an explicit pattern and adds new shells for Docs, Journal, and Calendar pages.

### Why Not Solution A?

A global `RuntimeRegistry` is more powerful but adds complexity for scenarios we don't need yet. Most pages will have 0–1 active runtimes. The registry pattern can be adopted later if multi-runtime pages become common.

### Why Not Solution C?

A declarative page DSL is premature. With only three page types, direct component composition is simpler to build, debug, and modify. The DSL can be extracted later if a pattern emerges.

---

### Implementation Steps

#### Phase 1: Layout Primitives

1. **Create `src/panels/page-shells/` directory** with shared types
2. **Create `ParallaxSection.tsx`** — Scroll-driven section with `IntersectionObserver` step detection
   - Port parallax logic from `playground/src/HomePage.tsx` into a reusable component
   - Props: `steps[]`, `stickyContent`, `onStepChange`, `rootMargin`
   - Mobile: Reduced height (50vh, 320px min), compact padding
3. **Create `StickyNavPanel.tsx`** — Sticky navigation that follows scroll position
   - Props: `sections[]`, `activeSection`, `variant: 'hero-follow' | 'top-fixed'`
   - Desktop: Side-sticky or top-sticky
   - Mobile: Collapsible top nav
4. **Create `HeroBanner.tsx`** — Full-width hero/banner section
   - Props: `title`, `subtitle`, `cta`, `backgroundVariant`
5. **Create `ScrollSection.tsx`** — Simple scrollable content area
   - Props: `children`, `maxHeight?`, `padding?`

#### Phase 2: Page Shells

6. **Create `DocsPageShell.tsx`** — Docs page layout
   ```
   ┌─────────────────────────────────┐
   │         HeroBanner              │
   ├─────────────────────────────────┤
   │ StickyNav │ ParallaxSection(s)  │
   │           │ ScrollSection(s)    │
   │           │ [RuntimeScope?]     │
   └───────────┴─────────────────────┘
   ```
   - Composes: HeroBanner + StickyNavPanel + content sections
   - Runtime: Optional scoped `RuntimeLifecycleProvider` per section (for live demos)

7. **Create `JournalPageShell.tsx`** — Journal/Playground page layout
   ```
   ┌─────────────────────────────────┐
   │     Workbench (existing)        │
   │  Plan │ Track │ Review views    │
   └─────────────────────────────────┘
   ```
   - Wraps existing `Workbench` with journal-specific state (notebook context, save/load)
   - Runtime: Single scoped runtime via existing `RuntimeLifecycleProvider`

8. **Create `CalendarPageShell.tsx`** — Calendar page layout
   ```
   Desktop:
   ┌──────────────────┬──────────────┐
   │   CalendarWidget  │  SummaryPanel│
   ├──────────────────┴──────────────┤
   │  TabbedContent (List|Detail|    │
   │                    Results)     │
   └─────────────────────────────────┘

   Mobile:
   ┌─────────────────────────────────┐
   │        CalendarWidget           │
   ├─────────────────────────────────┤
   │ [List] [Detail] [Results] tabs  │
   ├─────────────────────────────────┤
   │     Scrollable content          │
   └─────────────────────────────────┘
   ```
   - New: `CalendarWidget.tsx` — Month view with selectable date range
   - New: `TabbedContentPanel.tsx` — Tab switcher between List/Detail/Results
   - Runtime: None in calendar shell itself (runtime lives inside Detail tab's embedded Workbench)

#### Phase 3: Runtime Scoping

9. **Create `ScopedRuntimeProvider.tsx`** — Lightweight wrapper
   - Wraps `RuntimeLifecycleProvider` with a panel-local scope
   - Handles automatic disposal when the section unmounts
   - Allows Docs pages to embed live demos without affecting the global runtime

10. **Update `RuntimeLifecycleProvider.tsx`** — Support nesting
    - Ensure nested providers don't conflict with parent providers
    - Each provider maintains its own `SubscriptionManager` instance (already true)

#### Phase 4: Integration

11. **Update `playground/src/App.tsx`** — Route new page shells
    - `/` → `DocsPageShell` (replaces current `HomePage`)
    - `/journal` or `/playground` → `JournalPageShell`
    - `/calendar` → `CalendarPageShell`
    - `/getting-started` → `DocsPageShell` with tutorial content
    - `/syntax` → `DocsPageShell` with syntax reference content

12. **Migrate `HomePage.tsx` content** into `DocsPageShell` sections
    - Extract parallax steps into data configuration
    - Replace inline `IntersectionObserver` with `ParallaxSection` component

### Testing Strategy

| Category | Test Cases |
|----------|-----------|
| **Unit — Primitives** | `ParallaxSection` renders steps, fires `onStepChange`; `StickyNavPanel` tracks active section; `CalendarWidget` selects dates |
| **Unit — Shells** | `DocsPageShell` renders hero + nav + sections; `CalendarPageShell` renders calendar + tabs; `JournalPageShell` wraps Workbench |
| **Integration — Runtime** | `ScopedRuntimeProvider` creates/disposes independently; nested runtimes don't conflict; disposal on unmount |
| **Visual — Storybook** | Stories for each primitive, each shell, and responsive breakpoints |
| **Responsive** | Desktop/tablet/mobile layouts for all three shells |

---

## 5. Validation & Next Steps

- [ ] Review existing `HomePage.tsx` parallax implementation for extraction
- [ ] Prototype `ParallaxSection` component with existing step data
- [ ] Validate `RuntimeLifecycleProvider` nesting behavior
- [ ] Design `CalendarWidget` API (date range selection, event markers)
- [ ] Define `TabbedContentPanel` tab configuration interface
- [ ] Create Storybook stories for each new primitive
- [ ] Migrate playground routes to use page shells
- [ ] Test mobile layouts on viewport < 768px
- [ ] Test Chromecast integration with new page shells
- [ ] Validate Configuration 1: Single view transitions (Editor → Timer → Review) with in-memory note
- [ ] Validate Configuration 2: Multi-view simultaneous display with shared runtime subscription
- [ ] Validate Configuration 3: Dialog-based timer/review overlay on stored notes
- [ ] Prototype `ScrollRuntimeBridge` for bidirectional scroll ↔ runtime sync on parallax pages
- [ ] Formalize `INote` interface (`type: 'memory' | 'stored'`) for uniform note access
- [ ] Abstract `TrackerPage`/`ReviewPage` into `DialogView` component for Config 3 consistency

---

## 6. Edge Cases & Considerations

### Performance

- **Multiple active runtimes:** Docs pages with live demos may have 2–3 scoped runtimes. Each runtime creates a `SubscriptionManager` and `EventBus`. Profile memory and CPU impact.
- **Parallax scroll performance:** `IntersectionObserver` is efficient, but many observed elements on Docs pages could degrade scroll performance. Consider lazy-loading sections.
- **Calendar date queries:** Loading notes for date ranges hits IndexedDB. Consider pagination and virtual scrolling for large result sets.

### Mobile Considerations

- **CalendarWidget on mobile:** Full month calendar occupies significant vertical space. Consider a compact week-strip view on mobile with swipe navigation.
- **Sticky navigation on mobile:** Must not conflict with browser chrome (address bar, bottom nav). Use `position: sticky` with appropriate `top` values.
- **Parallax on mobile:** Reduce motion for `prefers-reduced-motion` users. Fall back to simple scroll.

### Chromecast Integration

- **Which pages cast?** Only Journal/Track pages should enable casting. Docs and Calendar pages disable the cast button.
- **Runtime disposal on page navigation:** If user navigates away from Journal page while cast session is active, the runtime and cast subscription must be cleanly disposed.

### Cross-Page State

- **Analytics persistence:** Workout analytics should persist across page navigation (already handled by `workbenchSyncStore` with analytics slices).
- **Calendar ↔ Journal navigation:** Selecting a date in Calendar view and opening a journal entry should pre-populate the Journal page shell with that entry's content.

### Accessibility

- **Parallax sections:** Ensure all content is accessible without scroll-based animations. Provide skip links.
- **Calendar keyboard navigation:** Arrow keys for date navigation, Enter for selection, Escape to close popups.
- **Tab panels:** ARIA roles for `tablist`, `tab`, `tabpanel` on the Calendar's List/Detail/Results switcher.

### Scroll-Runtime Sync

- **Infinite loop risk:** Bidirectional scroll ↔ runtime sync must guard against loops where a runtime event triggers a scroll, which triggers a state change, which triggers another scroll. The `ScrollSource` anti-loop mechanism (see [Section 9](#9-feature-deep-dive-scroll-driven-runtime-state-changes)) addresses this.
- **Scroll jank:** Programmatic `scrollTo` during active user scrolling can cause visual jitter. Use `requestAnimationFrame` batching and debounce runtime-driven scrolls.
- **Reduced motion:** Users with `prefers-reduced-motion` should get instant position changes (no smooth scroll, no parallax transforms). All `scroll-behavior: smooth` must be conditional.
- **Multiple runtimes on one page:** Parallax pages with multiple live demos need clear rules for which runtime "owns" the scroll. Only the most recently interacted-with demo should drive auto-scroll behavior.

---

## 7. Feature Deep-Dive: Consistent Parallax Framework

### Problem

The current parallax implementation in `HomePage.tsx` is inline and page-specific. Each parallax section duplicates `IntersectionObserver` setup, sticky panel management, and step-transition logic. There is no abstract framework for scripting parallax-driven pages, and no mechanism to link different views within a parallax flow to independent runtime engines.

### Goals

- **Abstract parallax page primitive** — A single, configurable `ParallaxPage` component that accepts a section manifest and renders the full parallax experience.
- **Section composition** — Each section declares its content type (parallax steps, scroll content, hero banner), sticky panel binding, and optional runtime engine.
- **Multi-engine support** — Different sections on the same page can bind to different runtime engines (e.g., an editor demo in section 2, a timer demo in section 4).
- **Transition points** — Defined, observable points between sections where transition actions fire (e.g., change sticky panel content, swap runtime, trigger animation).
- **Easy to script** — Page authors define sections as data; the framework handles observers, sticky behavior, and transitions.

### Proposed Architecture

#### Section Manifest

```typescript
interface ParallaxPageManifest {
  sections: ParallaxSectionConfig[];
  stickyNavVariant: 'hero-follow' | 'top-fixed';
}

interface ParallaxSectionConfig {
  id: string;
  type: 'parallax' | 'scroll' | 'hero' | 'sticky-content';
  /** Steps within a parallax section */
  steps?: ParallaxStepConfig[];
  /** Content for scroll/hero/sticky sections */
  content?: React.ReactNode;
  /** Optional runtime binding for live demos in this section */
  runtimeId?: string;
  /** Sticky panel content that appears alongside this section */
  stickyPanel?: {
    position: 'left' | 'right';
    content: React.ReactNode | ((activeStep: number) => React.ReactNode);
  };
  /** Transition actions fired when entering/leaving this section */
  onEnter?: () => void;
  onLeave?: () => void;
}

interface ParallaxStepConfig {
  id: string;
  content: React.ReactNode;
  /** Tab examples within this step (e.g., code variants, visual demos the user can switch between) */
  examples?: { label: string; content: React.ReactNode }[];
}
```

#### Core Component: `ParallaxPage`

```
┌─────────────────────────────────────────────┐
│ ParallaxPage                                │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Section[0]: hero                        ││
│  │  → HeroBanner                           ││
│  └─────────────────────────────────────────┘│
│  ┌──────────┬──────────────────────────────┐│
│  │ Sticky   │ Section[1]: parallax         ││
│  │ Panel    │  → Step 0 (IntersectionObs)  ││
│  │ (bound   │  → Step 1                    ││
│  │  to      │  → Step 2                    ││
│  │  active  │  → [ScopedRuntime: engine-1] ││
│  │  step)   │                              ││
│  ├──────────┼──────────────────────────────┤│
│  │ Sticky   │ Section[2]: parallax         ││
│  │ Panel    │  → Step 0                    ││
│  │ (new     │  → Step 1                    ││
│  │  content)│  → [ScopedRuntime: engine-2] ││
│  ├──────────┴──────────────────────────────┤│
│  │ Section[3]: scroll                      ││
│  │  → Plain content, natural scroll        ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

#### Multi-Engine Binding

Each section with a `runtimeId` gets a `ScopedRuntimeProvider`. The sticky panel receives the active step index and can render content driven by the section's runtime:

```
Section[1] ──→ ScopedRuntimeProvider("editor-demo")
  └─ stickyPanel receives: useScriptRuntime() from "editor-demo" scope

Section[2] ──→ ScopedRuntimeProvider("timer-demo")
  └─ stickyPanel receives: useScriptRuntime() from "timer-demo" scope
```

Runtimes are lazily created when the section enters the viewport and disposed when scrolled far out of view (using `IntersectionObserver` with generous `rootMargin`).

#### Transition Points

Between sections, the framework fires `onLeave` / `onEnter` callbacks. These allow:
- Swapping sticky panel content with a cross-fade animation
- Preloading the next section's runtime engine
- Triggering scroll-snap behavior at section boundaries
- Analytics events (section viewed, time spent)

#### IntersectionObserver Configuration

Extracted from `HomePage.tsx` and made configurable:

| Parameter | Desktop | Mobile | Purpose |
|-----------|---------|--------|---------|
| `rootMargin` | `-30% 0px -30% 0px` | `-${headerHeight}px 0px -20% 0px` | Detection zone |
| `threshold` | `[0, 0.1, 0.25, 0.5, 0.75]` | Same | Granularity |
| Sticky height | `calc(100vh - headerHeight)` | `40vh` (320px min) | Panel sizing |
| Sticky position | Side (left/right, 60% width) | Top (full width) | Layout |

#### Responsive Behavior

- **Desktop (≥1024px):** Side-by-side sticky panel + scrolling steps. Section transitions fire at defined scroll points.
- **Tablet (768–1023px):** Sticky panel stacks above content at reduced height. Transition points same as desktop.
- **Mobile (<768px):** Sticky panel at top (40vh). Steps scroll beneath. `prefers-reduced-motion` disables parallax transitions and uses simple opacity fades.

### Implementation Steps

1. Extract `ParallaxSection` from `HomePage.tsx` into `src/panels/page-shells/ParallaxSection.tsx`
2. Create `ParallaxPage` component that reads a `ParallaxPageManifest` and renders sections
3. Add `ScopedRuntimeProvider` integration per section with lazy init/dispose
4. Add transition point callbacks with `onEnter`/`onLeave` per section
5. Create `StickyPanel` component that swaps content based on active section
6. Migrate `HomePage.tsx` to use `ParallaxPage` with manifest-driven configuration
7. Create Storybook stories demonstrating multi-section, multi-engine parallax pages

---

## 8. Feature Deep-Dive: Journal View

### Problem

The current journal/playground experience is inconsistent across viewport sizes. The editor shows line numbers by default (inappropriate for journal/note-taking context), and there is no structured page index for navigating within a journal document. The page index needs three responsive variants depending on available screen width.

### Goals

- **Consistent journal view** across all viewport sizes — the editor and surrounding chrome adapt fluidly without layout jumps.
- **Remove line numbers** — Journal mode uses `showLineNumbers={false}` on the `UnifiedEditor`. Line numbers create visual clutter in writing-focused contexts and confuse non-technical users who expect a notebook, not a code editor.
- **Journal page index** — A navigation sidebar showing the document's structure (headings + WOD blocks) with three responsive layout variants.

### Journal Page Index — Responsive Variants

The page index shows the same data at all sizes (headings, WOD block titles, active/complete badges) but renders differently:

#### Variant 1: Hamburger Submenu (Mobile, <768px)

```
┌──────────────────────────────┐
│ ☰  Journal Title        [▶]  │ ← Hamburger menu in header
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ▸ Warm Up               │ │ ← Submenu under parent section
│ │ ▸ Main Work             │ │
│ │   ├ 5x5 Back Squat      │ │ ← Child entries
│ │   └ AMRAP 10:00         │ │
│ │ ▸ Cool Down             │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ Full-width Editor        │ │
│ │ (no line numbers)        │ │
│ │                          │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Index appears as a collapsible submenu under the hamburger navigation.
- Grouped under correct parent sections (h1 → h2 → WOD blocks).
- Tapping an item scrolls the editor to that section and closes the menu.
- Uses existing `WodIndexPanel` data but rendered as a `DropdownMenu` variant.

#### Variant 2: Navigation Select (Tablet, 768–1023px)

```
┌──────────────────────────────────┐
│  [▾ Warm Up ∕ Main Work ∕ ...]   │ ← Compact select/dropdown in nav bar
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Full-width Editor            │ │
│ │ (no line numbers)            │ │
│ │                              │ │
│ │                              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- Index appears as a dropdown select in the navigation panel area.
- Shows the currently active section name; opens a list on click.
- Editor occupies full content width below the select.
- The select tracks scroll position — as the user scrolls, the active item updates.

#### Variant 3: Sticky Side Panel (Desktop, ≥1024px with xl-4 max-width)

```
┌──────────────────────────────────────────────────────────┐
│  Header / Navigation Bar                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────┐  ┌─────────────────────────┐│
│  │ Editor (max-w-4xl)     │  │ Sticky Index Panel      ││
│  │ (no line numbers)      │  │                         ││
│  │                        │  │ ▸ Warm Up               ││
│  │                        │  │ ▸ Main Work             ││
│  │                        │  │   ├ 5x5 Back Squat  ●   ││
│  │                        │  │   └ AMRAP 10:00     ◷   ││
│  │                        │  │ ▸ Cool Down             ││
│  │                        │  │                         ││
│  │                        │  │ (right-aligned, sticky) ││
│  └────────────────────────┘  └─────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Editor constrained to `max-w-4xl` (56rem / 896px) for comfortable reading width.
- Index panel floats to the right of the editor, `position: sticky` with `top: headerHeight`.
- Panel tracks scroll position — the active section highlights as the user scrolls.
- Clicking an index item scrolls the editor/page to that section.
- Mirrors the `WodIndexPanel` component but with sticky behavior and right-alignment.
- The sticky panel itself controls page scroll (clicking an item scrolls the page, not just the editor).

### Editor Configuration for Journal Mode

```typescript
// Journal mode editor props
<UnifiedEditor
  showLineNumbers={false}    // ← No line numbers in journal
  lineWrapping={true}        // Wrap long lines for readability
  enablePreview={true}       // Show markdown preview for non-active sections
  enableLinting={true}       // Keep syntax checking
  enableOverlay={true}       // Keep interactive overlay
  enableInlineRuntime={true} // Keep inline run controls
  mode="edit"                // Default edit mode
/>
```

### WodIndexPanel Integration

The existing `WodIndexPanel` (`src/components/layout/WodIndexPanel.tsx`) already:
- Extracts document structure (headers h1/h2 + WOD blocks)
- Supports click-to-jump navigation
- Shows hover highlighting and preview text
- Has compact mode for smaller containers

New work needed:
- **DropdownIndex variant** — Renders the same data as a collapsible dropdown menu (for hamburger)
- **SelectIndex variant** — Renders as a select/dropdown in the nav bar (for tablet)
- **StickyIndex variant** — Renders as a right-aligned sticky panel (for desktop)
- **Scroll tracking** — `IntersectionObserver` on section headings to update the active item as the user scrolls

### Data Flow

```
UnifiedEditor
  │
  ├─→ Document structure (headings, blocks)
  │     │
  │     ▼
  │   JournalIndex (shared data model)
  │     │
  │     ├─→ DropdownIndex (mobile hamburger)
  │     ├─→ SelectIndex (tablet nav bar)
  │     └─→ StickyIndex (desktop side panel)
  │
  └─→ IntersectionObserver on section headings
        │
        ▼
      Active section tracking → drives all three index variants
```

### Responsive Transitions

| Breakpoint | Index Variant | Editor Width | Line Numbers |
|------------|---------------|-------------|-------------|
| <768px (mobile) | Hamburger submenu | 100% | Hidden |
| 768–1023px (tablet) | Navigation select | 100% | Hidden |
| ≥1024px (desktop) | Sticky side panel | `max-w-4xl` | Hidden |

All three variants use the same underlying data model (`JournalIndex`) and scroll-tracking logic. The `useScreenMode()` hook (from `src/panels/panel-system/useScreenMode.ts`) selects which variant to render. Transitions between breakpoints are seamless — the index data persists; only the rendering container changes.

### Implementation Steps

1. Create `JournalIndex` data model — extract structure from `WodIndexPanel` into a shared hook (`useJournalIndex`)
2. Add scroll tracking via `IntersectionObserver` on section headings
3. Create `DropdownIndex` component for mobile hamburger submenu
4. Create `SelectIndex` component for tablet navigation bar
5. Create `StickyIndex` component for desktop right-aligned panel
6. Update `JournalPageShell` to compose the correct index variant based on `useScreenMode()`
7. Set `showLineNumbers={false}` on the journal editor
8. Set editor `max-w-4xl` on desktop when sticky index is active
9. Create Storybook stories for each index variant at each breakpoint

---

## 9. Feature Deep-Dive: Scroll-Driven Runtime State Changes

### Problem

On parallax documentation pages, the scrolling experience and the runtime state are currently independent systems. Scroll position determines which parallax step is visually active (via `IntersectionObserver`), and the runtime operates independently when a user clicks "Run." There is no bidirectional link: timer events don't drive scroll position, and scroll actions don't affect runtime state.

The issue requires a tighter coupling where:
1. **Timer events drive scroll** — When a timer starts, the page auto-scrolls to the next step. When the timer completes, the page scrolls to the review step.
2. **Scroll drives runtime state** — When a user manually scrolls to a new step, the workbench ensures the correct views/panels and note/runtime states are set (e.g., scrolling to the timer section activates the timer view if a runtime is running).
3. **Bidirectional sync** — The scroll position and the runtime lifecycle form a synchronized state machine.

### Goals

- **Scroll → Runtime:** When the user scrolls to a parallax section bound to a runtime, that runtime's view should activate (lazy-start if needed, show the correct panel).
- **Runtime → Scroll:** When a runtime event fires (start, complete, transition), the page should auto-scroll to the corresponding parallax section.
- **No loops:** Bidirectional sync must not create infinite scroll ↔ runtime update loops. Use a "source of truth" flag or debounce to determine whether scroll was user-initiated or runtime-initiated.
- **Graceful degradation:** If `prefers-reduced-motion` is set, replace smooth scroll transitions with immediate jumps or opacity fades.

### Proposed Architecture

#### State Machine

The scroll-runtime binding follows a state machine per parallax page:

```
┌──────────────┐       scroll to editor section        ┌───────────────┐
│   Idle       │ ────────────────────────────────────→ │  Editor Active │
│ (no runtime) │ ←──────────────────────────────────── │  (editing)     │
└──────────────┘       scroll away / reset              └───────┬───────┘
                                                                │
                                                          user clicks Run
                                                                │
                                                                ▼
┌──────────────────┐    timer complete           ┌──────────────────────┐
│  Review Active   │ ←────────────────────────── │    Timer Active      │
│  (auto-scrolled) │                             │  (auto-scrolled to   │
│                  │                             │   timer section)     │
└──────────────────┘                             └──────────────────────┘
```

#### Event Bridge: `ScrollRuntimeBridge`

A new component or hook that connects `IntersectionObserver` scroll tracking with runtime lifecycle events:

```typescript
interface ScrollRuntimeBridgeProps {
  /** Map of section IDs to their scroll targets */
  sections: Map<string, HTMLElement>;
  /** Active runtime (if any) */
  runtime: IScriptRuntime | null;
  /** Callback when scroll should be driven by runtime events */
  onRuntimeDrivenScroll: (sectionId: string) => void;
  /** Callback when runtime state should be driven by scroll */
  onScrollDrivenStateChange: (sectionId: string) => void;
}
```

**Runtime → Scroll events:**
- `runtime.start` → scroll to timer section
- `runtime.complete` → scroll to review section
- `runtime.block.transition` → scroll within timer section (step change)

**Scroll → Runtime effects:**
- Scroll to editor section → ensure editor panel is active, show note content
- Scroll to timer section → if runtime exists and is paused, show timer panel (don't auto-start)
- Scroll to review section → if runtime has output, show review panel
- Scroll away from all sections → no runtime action (keep current state)

#### Anti-Loop Mechanism

```typescript
type ScrollSource = 'user' | 'runtime';

// Track who initiated the last scroll
let lastScrollSource: ScrollSource = 'user';

function onRuntimeEvent(event: RuntimeEvent) {
  lastScrollSource = 'runtime';
  scrollToSection(event.targetSection);
  // Reset after scroll completes
  setTimeout(() => { lastScrollSource = 'user'; }, 500);
}

function onIntersectionChange(sectionId: string) {
  if (lastScrollSource === 'runtime') return; // Ignore runtime-initiated scrolls
  applyScrollDrivenStateChange(sectionId);
}
```

### Integration with Parallax Framework

The `ParallaxPage` component (from [Section 7](#7-feature-deep-dive-consistent-parallax-framework)) gains a new optional `runtimeBridge` prop:

```typescript
interface ParallaxPageManifest {
  sections: ParallaxSectionConfig[];
  stickyNavVariant: 'hero-follow' | 'top-fixed';
  /** Optional: Enable scroll ↔ runtime bidirectional sync */
  runtimeBridge?: {
    /** Section ID that should activate when runtime starts */
    timerSection: string;
    /** Section ID that should activate when runtime completes */
    reviewSection: string;
    /** Whether to auto-scroll on runtime events (default: true) */
    autoScroll?: boolean;
  };
}
```

### Configuration Support

| Configuration | Scroll → Runtime | Runtime → Scroll |
|---------------|-----------------|-----------------|
| **Config 1** (single view transition) | Scroll to step → activate corresponding panel | Timer start → scroll to timer step; complete → scroll to review step |
| **Config 2** (multi-view simultaneous) | Scroll to section → highlight corresponding view | Timer events update the visible timer view in place (no scroll needed) |
| **Config 3** (dialog-based) | N/A — dialog overlays the page | N/A — dialog is fullscreen, no scroll interaction |

### Implementation Steps

1. Create `useScrollRuntimeBridge` hook — coordinates `IntersectionObserver` + runtime event listeners
2. Add anti-loop mechanism with `ScrollSource` tracking and debounce
3. Extend `ParallaxSectionConfig` with `runtimeBridge` options
4. Wire `ParallaxPage` to use the bridge when `runtimeBridge` is configured
5. Add `scrollToSection` utility that respects `prefers-reduced-motion`
6. Test bidirectional sync: runtime events → scroll, scroll → state changes, no infinite loops
7. Create Storybook story demonstrating scroll-driven runtime state changes

---

## 10. Reconciliation with Existing Code

### What Changes

The new Workbench → View → Panel hierarchy refines but does *not* replace the existing code. The changes required are:

| Layer | Current State | Target State |
|-------|---------------|--------------|
| **Workbench** | `Workbench.tsx` manages one runtime via `RuntimeLifecycleProvider` | Workbench manages 0..N runtimes via scoped providers, exposes runtime registry to child views |
| **View** | `ViewDescriptor` defines Plan/Track/Review as sequential tabs | Views can be tabs (Config 3), sequential transitions (Config 1), or simultaneous panels (Config 2) |
| **View binding** | Views implicitly use the single runtime from context | Views explicitly declare which runtime they subscribe to via `runtimeId` or nearest scoped provider |
| **Panel** | Panels render content from hooks that read the single runtime context | No change — panels continue to use `useScriptRuntime()` and `useWorkbenchSyncStore()` |
| **Note** | In-memory content is ad-hoc `useState`; stored content goes through `NotebookProvider` | Formalize `INote` interface with `type: 'memory' | 'stored'` and uniform access API |
| **Dialog views** | `TrackerPage` and `ReviewPage` are full routes | Abstract into `DialogView` component that wraps Timer/Review panels in a fullscreen overlay |

### What Stays the Same

- `PanelGrid`, `PanelShell`, `PanelSizeContext` — no changes
- `SubscriptionManager` fan-out pattern — already supports N subscribers
- `workbenchSyncStore` — Zustand selector pattern works for multi-runtime (one store per workbench)
- All concrete panel implementations (Editor, Timer, Review) — internals unchanged
- `RuntimeLifecycleProvider` — used as-is within scoped providers

---

## Appendix: Architecture Diagram

See companion canvas file: [`view-panel-architecture.canvas`](web/view-panel-architecture.canvas)

### Workbench → View → Panel Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WORKBENCH                                    │
│  Manages: Notes (in-memory + stored), Runtimes (0..N), Theme, Nav   │
│                                                                     │
│  ┌──────────── Note ─────────────┐  ┌──── Runtime (per WOD) ─────┐ │
│  │ Content (CodeMirror doc)      │  │ ScriptRuntime              │ │
│  │ Type: memory | stored         │  │ SubscriptionManager        │ │
│  │ Persistence: none | IndexedDB │  │ RuntimeStack + Clock       │ │
│  └───────────────────────────────┘  └────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────── Views ──────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ View A ────────────┐  ┌─ View B ─────────────────────┐ │   │
│  │  │ Subscribes to:      │  │ Subscribes to:                │ │   │
│  │  │   Note #1            │  │   Note #1 + Runtime #1       │ │   │
│  │  │                      │  │                               │ │   │
│  │  │ ┌──────────────────┐│  │ ┌───────────────────────────┐ │ │   │
│  │  │ │  Editor Panel    ││  │ │     Timer Panel            │ │ │   │
│  │  │ │  (bound to note) ││  │ │     (bound to runtime)     │ │ │   │
│  │  │ └──────────────────┘│  │ └───────────────────────────┘ │ │   │
│  │  └──────────────────────┘  └───────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌─ View C (Dialog) ──────────────────────────────────────┐ │   │
│  │  │ Subscribes to: Runtime #1                               │ │   │
│  │  │ ┌────────────────────────────────────────────────────┐  │ │   │
│  │  │ │              Review Panel (fullscreen)              │  │ │   │
│  │  │ └────────────────────────────────────────────────────┘  │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Supported Configuration Layouts

```
Config 1 — Single View Transition (In-Memory Note):
┌─────────────────────────────────────┐
│  Workbench (1 in-memory note)       │
│  ┌─ Single View ──────────────────┐ │
│  │  [Editor] ──→ [Timer] ──→ [Review] │
│  │  (transitions between panels)  │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘

Config 2 — Multi-View Simultaneous (In-Memory Note):
┌─────────────────────────────────────┐
│  Workbench (1 in-memory note)       │
│  ┌─ View A ──────┐ ┌─ View B ────┐ │
│  │ Editor Panel  │ │ Timer Panel  │ │
│  ├───────────────┘ └──────────────┤ │
│  │  ┌─ View C ──────────────────┐ │ │
│  │  │ Review Panel              │ │ │
│  │  └───────────────────────────┘ │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘

Config 3 — Dialog-Based (Stored Note):
┌─────────────────────────────────────┐
│  Workbench (1 stored note)          │
│  ┌─ Base View ────────────────────┐ │
│  │ Editor Panel                   │ │
│  │  ┌─ Dialog View ────────────┐  │ │
│  │  │ Timer Panel (fullscreen) │  │ │
│  │  │  or                      │  │ │
│  │  │ Review Panel (fullscreen)│  │ │
│  │  └──────────────────────────┘  │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### View Type Summary

```
┌────────────────────────────────────────────────────────────────┐
│                     Page Shell Layer                            │
├────────────────┬─────────────────┬─────────────────────────────┤
│  DocsPageShell │ JournalPageShell│     CalendarPageShell        │
│                │                 │                              │
│  ┌───────────┐ │  ┌───────────┐  │  ┌────────────┬───────────┐ │
│  │HeroBanner │ │  │ Workbench │  │  │CalendarWdgt│SummaryPane│ │
│  ├───────────┤ │  │           │  │  ├────────────┴───────────┤ │
│  │StickyNav  │ │  │Plan│Track │  │  │  TabbedContentPanel    │ │
│  │           │ │  │    │Review│  │  │  [List|Detail|Results] │ │
│  │Parallax(s)│ │  └───────────┘  │  └────────────────────────┘ │
│  │Scroll(s)  │ │                 │                              │
│  └───────────┘ │                 │                              │
├────────────────┴─────────────────┴─────────────────────────────┤
│                   Runtime Binding Layer                         │
│                                                                │
│  DocsPageShell:     0..N scoped runtimes (per live demo)       │
│  JournalPageShell:  1 runtime (via RuntimeLifecycleProvider)   │
│  CalendarPageShell: 0..1 runtime (in Detail tab only)          │
├────────────────────────────────────────────────────────────────┤
│                   Panel Infrastructure                         │
│  PanelGrid → PanelShell → PanelSizeContext                     │
│  ResponsiveViewport → useScreenMode → breakpoints              │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow Per Page Type

```
Docs Page:
  ParallaxSection ──→ IntersectionObserver ──→ onStepChange
  StickyNav ──→ scroll position ──→ active section
  LiveDemo section ──→ ScopedRuntimeProvider ──→ local IScriptRuntime
                                               └→ SubscriptionManager
                                               └→ LocalRuntimeSubscription
  ScrollRuntimeBridge ──→ bidirectional sync:
    runtime events ──→ auto-scroll to section
    scroll position ──→ runtime state changes

Journal Page:
  Workbench ──→ RuntimeLifecycleProvider ──→ IScriptRuntime
                                           └→ SubscriptionManager
                                                ├→ LocalRuntimeSubscription
                                                └→ ChromecastSubscription (if casting)
  Dialog views ──→ fullscreen Timer/Review overlaid on editor

Calendar Page:
  CalendarWidget ──→ date selection ──→ IndexedDB query
  TabbedContentPanel:
    [List] ──→ note list from query
    [Detail] ──→ JournalPageShell (embedded, with scoped runtime)
    [Results] ──→ analytics from store
```
