# Responsive Panel System

## Goal
Replace the hardcoded `SlidingViewport` layout with a composable panel system where every panel supports `1/3 | 2/3 | full` spans, panels communicate through a shared workbench context, and the system scales to N views (not just 3). The panel system adapts its layout across three distinct **screen modes** — Desktop, Tablet, and Mobile — each with its own rendering rules.

---

## Screen Modes

The panel system operates in three distinct screen modes. Each mode defines how panels are sized and arranged within a view. The `PanelGrid` component is responsible for detecting the current mode and applying the correct layout strategy.

### Desktop (`≥ 1024px`)

| Layout | When | Behavior |
|--------|------|----------|
| **Full-screen** | View has a single panel (e.g. Plan → Editor) | Panel occupies 100% width |
| **2/3 \| 1/3 split** | View has multiple panels (e.g. Track → Timer + History) | Panels render at their `defaultSpan` ratios (2/3 and 1/3) |
| **Expanded** | User clicks expand on any panel | That panel goes full-screen, siblings are hidden with transition. A close button returns to the previous split. |

> The default split configuration comes from each view's `ViewDescriptor.panels[].defaultSpan` — the system respects whatever ratios are defined there today.

### Tablet (`768px – 1023px`)

| Layout | When | Behavior |
|--------|------|----------|
| **Half-screen split** | View has multiple panels | All panels render at **equal width** (`50% \| 50%`), regardless of their `defaultSpan`. A 1/3 panel and a 2/3 panel both become 1/2. |
| **Full-screen** | View has a single panel OR user expands | Same as Desktop full-screen behavior |

> Rationale: On tablet, a 1/3-width panel is too narrow to be usable. Equalizing to 50/50 gives both panels enough room.

### Mobile (`< 768px`)

| Layout | When | Behavior |
|--------|------|----------|
| **Vertical stack** | Always | Panels stack vertically in source order. Each panel gets `min-height: 50vh` and the container scrolls vertically (`overflow-y: auto`). |
| **Expanded** | User expands a panel | Panel takes `100vh`, siblings hidden. Close button returns to stacked view. |

> On mobile, the 1/3 concept doesn't apply — every panel is full-width and the user scrolls between them.

### Mode Detection

```ts
type ScreenMode = 'desktop' | 'tablet' | 'mobile';

function useScreenMode(): ScreenMode {
  // Uses window.matchMedia or ResizeObserver
  // Returns the current mode based on viewport width
}
```

The `PanelGrid` component consumes `useScreenMode()` and switches its flex strategy accordingly:

| Mode | Flex Direction | Panel Sizing | Overflow |
|------|---------------|--------------|----------|
| Desktop | `row` | `flex: {defaultSpan}` (1, 2, or 3) | hidden |
| Tablet | `row` | `flex: 1` (equal) | hidden |
| Mobile | `column` | `min-height: 50vh`, full-width | `overflow-y: auto` |

---

## Panel Inventory

Each view is composed of one or more panels. This section documents what each panel renders, its intent, and how it should adapt its internal layout when the available span changes across screen modes.

> **Key concept:** The panel system controls *how much space* a panel gets (`1/3`, `2/3`, `full`, or `50%` on tablet). Individual panels are responsible for *how they render* within that space. Some panels already accept `mobile` or `compact` props — the new system formalizes when those activate.

### Plan View — `PlanPanel`

**Component:** `PlanPanel.tsx` → wraps `MarkdownEditorBase` (Monaco Editor)
**Default span:** `3` (full-screen)
**Intent:** The authoring surface. Users write and edit WOD workout definitions here. Monaco's inline view zones render WOD block previews directly in the editor.

| Screen Mode | Layout | Adaptations |
|-------------|--------|-------------|
| Desktop (full) | Full viewport width | Standard Monaco editor, all features visible |
| Tablet (full) | Full viewport width | Same as desktop — Monaco handles its own responsive sizing |
| Mobile (full) | Full viewport width, stacked | Monaco minimap hidden (already configured via editor options), smaller font feasible |

**Resize strategy:** None required — Monaco auto-fills its container. The editor already has `height="100%"` and uses a container ref for sizing.

---

### Track View — `TrackPanelPrimary`

**Component:** `TrackPanelPrimary` → wraps `TimerDisplay` → wraps `RefinedTimerDisplay`
**Default span:** `2` (2/3 width)
**Intent:** The active workout display. Shows the main timer ring, execution stack cards, transport controls (play/pause/stop/next), and action buttons from the runtime.

**Internal layout (RefinedTimerDisplay):**
- **Left column:** Stack cards (`UnifiedItemRow` list with timer pills) — the live execution stack
- **Right column:** Large circular timer ring with progress arc + transport controls below
- Grid: `grid-cols-1 lg:grid-cols-[minmax(280px,35%)_1fr]` — already switches to single-column on narrow widths

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 2/3 | `flex: 2` | Full two-column layout: stack cards on left, timer ring on right. Timer ring at `lg:w-96 lg:h-96`. |
| Desktop full | `flex: 3` (expanded) | Same two-column layout but with more horizontal room. Timer ring stays centered. |
| Tablet 50% | `flex: 1` | **Trigger `compact` mode.** At 50% tablet width (~384-512px), the `lg:` breakpoint won't fire. Falls back to single-column: stack cards stacked above timer. Timer ring at `sm:w-48 sm:h-48`. |
| Mobile stack | Full width | **Already handled.** `compact=true` passed via `isMobile`. On mobile, `TrackPanelPrimary` embeds a `TimerIndexPanel` *inside* itself (the history log scrolls on top, timer docks at bottom). The separate `TrackPanelIndex` panel is hidden on mobile. |

**Resize strategy:**
- The `compact` prop on `TimerDisplay` controls small vs. large timer ring and single-column layout
- The `lg:` CSS breakpoint inside `RefinedTimerDisplay` naturally handles the column flip
- **What to hide at narrow spans:** Nothing — the grid gracefully degrades to single-column
- **What changes:** Timer ring size scales down, button sizes use `sm:` variants, padding tightens

**Existing responsive props:** `compact` (boolean), `isMobile` (boolean)

---

### Track View — `TrackPanelIndex`

**Component:** `TrackPanelIndex` → wraps `TimerIndexPanel` → wraps `RuntimeHistoryLog`
**Default span:** `1` (1/3 width)
**Intent:** Live execution history — a chronological, indented log of completed workout operations. Scrolls with auto-follow during active execution. This panel is the *sidebar context* during a workout.

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 1/3 | `flex: 1` | Full history log, auto-scroll enabled, desktop styling. |
| Desktop full | `flex: 3` (expanded) | History log fills viewport — useful for reviewing long workout history. |
| Tablet 50% | `flex: 1` | Same as desktop 1/3 behavior — `RuntimeHistoryLog` is a single-column list, it adapts naturally. Passes `mobile=false` (tablet is wide enough). |
| Mobile stack | **Hidden as standalone panel** | On mobile, `TrackPanelPrimary` embeds a copy of `TimerIndexPanel` inside itself (scrollable area above the timer). The standalone `TrackPanelIndex` is not rendered as a separate stacked panel. |

**Resize strategy:**
- The list is inherently single-column and flexible — no special resize needed
- **Mobile exception:** This panel is *not shown separately* on mobile. Instead, `TrackPanelPrimary` includes an inline copy. The `ViewDescriptor` for Track on mobile should only emit the primary panel.
- **Debug mode swap:** On desktop, when debug mode is active, this panel is swapped for `RuntimeDebugPanel` in the same 1/3 slot.

**Existing responsive props:** `mobile` (boolean), `autoScroll` (boolean)

---

### Track View — `RuntimeDebugPanel`

**Component:** `RuntimeDebugPanel.tsx`
**Default span:** `1` (1/3 width, replaces `TrackPanelIndex` when debug mode active)
**Intent:** Developer inspection tool — shows the runtime stack with inline memory inspection, parser output, and block metadata. Only visible when `isDebugMode=true`.

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 1/3 | `flex: 1` | Embedded mode (`embedded=true`). Two tabs: Parser, Stack. Memory values shown inline with dialog on click. |
| Desktop full | `flex: 3` (expanded) | Full-width debug view — stack and parser side-by-side feasible. |
| Tablet 50% | `flex: 1` | Same as desktop 1/3. The panel is a scrollable list — adapts naturally. |
| Mobile | **Not shown** | Debug panel is hidden on mobile (`!isMobile && <DebugButton>` in header). If supported in future, would need significant redesign. |

**Resize strategy:** Minimal — the panel is a scrollable list with collapsible sections. Content adapts naturally to available width.

**Existing responsive props:** `embedded` (boolean), `className` (string)

---

### Review View — `ReviewPanelPrimary`

**Component:** `ReviewPanelPrimary` → wraps `TimelineView`
**Default span:** `2` (2/3 width)
**Intent:** Post-workout analytics visualization. Renders a timeline chart showing workout segments over time with interactive selection and filtering.

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 2/3 | `flex: 2` | Full timeline chart with interactive hover, segment selection. Adequate width for multi-bar charts. |
| Desktop full | `flex: 3` (expanded) | Timeline stretches to fill — more data resolution visible. |
| Tablet 50% | `flex: 1` | Timeline at ~50% viewport width. Chart should still render but with **reduced tick density** on the x-axis. Consider hiding legend if it overlaps. |
| Mobile stack | Full width, scrollable | Full-width chart within the stacked panel. Adequate room since it's 100% width. Touch-friendly selection targets. |

**Resize strategy:**
- The `TimelineView` component should use container-aware sizing (e.g., `ResizeObserver` or `responsiveContainer` from a charting library) to adapt chart density to available width
- **What to hide at narrow spans:** Dense axis labels, secondary legends
- **What to resize:** Bar widths, tick intervals, tooltip positioning

**Existing responsive props:** None currently — relies on parent container width

---

### Review View — `ReviewPanelIndex`

**Component:** `ReviewPanelIndex` → wraps `AnalyticsIndexPanel`
**Default span:** `1` (1/3 width)
**Intent:** Segment selection sidebar for the analytics view. Shows a chronological list of workout segments (efforts, rests, groups) with toggleable selection that syncs with the timeline chart. Uses the `UnifiedItemList` visualization system.

| Screen Mode | Span | Adaptations |
|-------------|------|-------------|
| Desktop 1/3 | `flex: 1` | Full segment list with group headers, elapsed times, and fragment visualization. |
| Desktop full | `flex: 3` (expanded) | Segment list fills viewport — useful for very long segment lists. |
| Tablet 50% | `flex: 1` | Same as desktop — the list is single-column and width-flexible. |
| Mobile stack | Full width, scrollable | List renders at full viewport width within the stacked panel. Passes `mobile=true` for larger touch targets and simplified row layout. |

**Resize strategy:**
- The list is inherently single-column — no special resize needed
- **Mobile:** Passes `mobile=true` which increases padding, font sizes, and touch target areas in `AnalyticsIndexPanel`
- **What to hide at narrow spans:** Nothing — the list is already compact

**Existing responsive props:** `mobile` (boolean)

---

### Summary: Panel Resize Contracts

| Panel | Existing `mobile` prop | Existing `compact` prop | Needs new resize work | Critical adaptations |
|-------|----------------------|------------------------|----------------------|---------------------|
| `PlanPanel` | ✗ | ✗ | No | Monaco auto-fills |
| `TrackPanelPrimary` | ✓ (`isMobile`) | ✓ (`compact`) | Trigger compact on tablet 50% | Timer ring size, column→single-column |
| `TrackPanelIndex` | ✓ (`mobile`) | ✗ | No (skip on mobile) | Embedded inside primary on mobile |
| `RuntimeDebugPanel` | ✗ | ✗ | No (hidden on mobile) | N/A |
| `ReviewPanelPrimary` | ✗ | ✗ | **Yes — chart density** | Axis labels, bar widths at narrow spans |
| `ReviewPanelIndex` | ✓ (`mobile`) | ✗ | No | Touch targets on mobile |

> **Migration note:** Today, the `isMobile` boolean is a single flag. The new `useScreenMode()` hook should replace it with the three-way `ScreenMode` type. Components should adapt their internal layout based on *both* the screen mode AND their current span (since a 1/3 panel on desktop is similar in width to a 50% panel on tablet).

---

## Architecture Overview

### Current Pain Points
- `SlidingViewport` hardcodes 3 views at `w-1/3` each with fixed inner layouts (`w-2/3 + w-1/3`)
- No panel-level abstraction — inner panel sizes are CSS classes baked into the viewport
- `WorkbenchContext` manages doc state but doesn't own panel layout state or content lifecycle
- Runtime cleanup on view change is handled ad-hoc in `UnifiedWorkbench` with manual `useEffect` chains
- Mobile layout is a completely separate code path with duplicated logic

### Target Architecture

```
┌─────────────────────────────────────────────────────┐
│  WorkbenchContext (enhanced)                        │
│  ┌───────────────┬─────────────┬──────────────────┐ │
│  │ Document State│ Panel State │ Runtime Lifecycle │ │
│  │ - content     │ - layouts[] │ - auto-dispose   │ │
│  │ - blocks      │ - spans     │ - on view change │ │
│  │ - selectedId  │ - expanded  │                  │ │
│  └───────────────┴─────────────┴──────────────────┘ │
│                         │                           │
│           ┌─────────────┼──────────────┐            │
│           ▼             ▼              ▼            │
│     ┌──────────┐  ┌──────────┐   ┌──────────┐      │
│     │PanelShell│  │PanelShell│   │PanelShell│      │
│     │ span:1/3 │  │ span:2/3 │   │ span:full│      │
│     │ [expand] │  │ [expand] │   │ [close]  │      │
│     │ ┌──────┐ │  │ ┌──────┐ │   │ ┌──────┐ │      │
│     │ │Child │ │  │ │Child │ │   │ │Child │ │      │
│     │ └──────┘ │  │ └──────┘ │   │ └──────┘ │      │
│     └──────────┘  └──────────┘   └──────────┘      │
│           PanelGrid (flex row / column)             │
└─────────────────────────────────────────────────────┘
```

### Key Types

```ts
// Panel span values (fraction of the view)
type PanelSpan = 1 | 2 | 3; // 1=1/3, 2=2/3, 3=full

// Individual panel descriptor
interface PanelDescriptor {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultSpan: PanelSpan;
  content: React.ReactNode;
}

// A view is a named collection of panels
interface ViewDescriptor {
  id: string;           // 'plan' | 'track' | 'review' | future views
  label: string;
  icon: React.ReactNode;
  panels: PanelDescriptor[];
}

// Panel layout state (managed in context)
interface PanelLayoutState {
  viewId: string;
  panelSpans: Record<string, PanelSpan>; // panelId → current span
  expandedPanelId: string | null;        // which panel is full-screen
}
```

---

## Tasks

### Phase 1: Core Abstractions (Foundation)

- [ ] **Task 1: Create `PanelSpan` types and `PanelDescriptor` interface**
  File: `src/components/layout/panel-system/types.ts`
  Define: `PanelSpan`, `PanelDescriptor`, `ViewDescriptor`, `PanelLayoutState`
  → Verify: Types compile, no runtime code yet

- [ ] **Task 2: Create `PanelShell` component**
  File: `src/components/layout/panel-system/PanelShell.tsx`
  Renders a panel wrapper with:
  - Header bar (title, icon, expand button)
  - Close button when `span === 3` (full)
  - Smooth CSS transition on width/height changes (`transition: flex 300ms ease`)
  - Passes `className` and `children` through
  → Verify: Renders in Storybook or dev with placeholder children

- [ ] **Task 3: Create `PanelGrid` component**
  File: `src/components/layout/panel-system/PanelGrid.tsx`
  A flex container that adapts to the current **screen mode** (see [Screen Modes](#screen-modes)):
  - **Desktop**: `flex-row`, each child gets `flex: {defaultSpan}` (1, 2, or 3)
  - **Tablet**: `flex-row`, each child gets `flex: 1` (equal width, 50/50 split)
  - **Mobile**: `flex-col`, each child gets `min-height: 50vh`, container has `overflow-y: auto`
  - When one panel is expanded (`span=3`): siblings get `display: none` with CSS transition
  - Accepts `panels: PanelDescriptor[]` and `layoutState: PanelLayoutState`
  - Uses `useScreenMode()` hook to detect the active mode
  → Verify: Renders panels correctly at each breakpoint — 2/3+1/3 on desktop, 50/50 on tablet, stacked on mobile

- [ ] **Task 4: Create `usePanelLayout` hook**
  File: `src/components/layout/panel-system/usePanelLayout.ts`
  Manages span state for a single view:
  - `expandPanel(panelId)` → sets that panel to `span=3`, stores previous spans
  - `collapsePanel()` → restores previous spans
  - `setSpan(panelId, span)` → manual span override
  - Returns `{ panelSpans, expandedPanelId, expandPanel, collapsePanel, setSpan }`
  → Verify: Unit test — expand sets span=3, collapse restores defaults

### Phase 2: Workbench Context Enhancement

- [ ] **Task 5: Add panel layout state to `WorkbenchContext`**
  File: `src/components/layout/WorkbenchContext.tsx`
  Add:
  - `panelLayouts: Record<string, PanelLayoutState>` (per-view layout state)
  - `expandPanel(viewId, panelId)` / `collapsePanel(viewId)` actions
  - `content` is already state ✓ — ensure `setContent` properly resets view when new workout loads
  - Auto-dispose runtime when `viewMode` changes away from `'track'` (move the current `useEffect` from `UnifiedWorkbench` into context or a dedicated hook)
  → Verify: Context provides layout state, no regressions in existing view switching

- [ ] **Task 6: Define `ViewDescriptor` configurations**
  File: `src/components/layout/panel-system/viewDescriptors.ts`
  Define the 3 default views as `ViewDescriptor[]`:
  ```
  Plan:   [{ id: 'editor', defaultSpan: 3 }]           // full-width editor
  Track:  [{ id: 'timer', defaultSpan: 2 },             // 2/3 timer
           { id: 'history', defaultSpan: 1 }]            // 1/3 history
  Review: [{ id: 'analytics-index', defaultSpan: 1 },   // 1/3 index
           { id: 'timeline', defaultSpan: 2 }]           // 2/3 timeline
  ```
  → Verify: Descriptors are importable and type-safe

### Phase 3: Integration — Replace SlidingViewport

- [ ] **Task 7: Build `ResponsiveViewport` (replacement for `SlidingViewport`)**
  File: `src/components/layout/panel-system/ResponsiveViewport.tsx`
  This is the new top-level layout component that:
  - Accepts `views: ViewDescriptor[]` and `currentViewId: string`
  - Uses the same horizontal sliding model (translateX) for view-to-view transitions
  - Inside each view, renders a `PanelGrid` with `PanelShell`-wrapped panels
  - Calculates strip width as `N * 100%` (not hardcoded 300%)
  - Mobile: Keeps sliding for view-to-view, but within each view panels stack vertically
  - Keyboard navigation (Ctrl+Arrow) still works
  → Verify: 3 views slide correctly, inner panels show with correct proportions

- [ ] **Task 8: Wire panels into `UnifiedWorkbench`**
  File: `src/components/layout/UnifiedWorkbench.tsx`
  Replace `<SlidingViewport>` with `<ResponsiveViewport>`:
  - Build `ViewDescriptor[]` from existing panel JSX (`planPanel`, `trackPrimaryPanel`, etc.)
  - Pass panel content as `PanelDescriptor.content`
  - Connect `expandPanel` / `collapsePanel` from context to `PanelShell` buttons
  - Remove the manual mobile/tablet `useEffect` and breakpoint detection (now in `PanelGrid`)
  → Verify: All 3 views render identically to before with default spans

- [ ] **Task 9: Add expand/collapse to panel headers**
  Update `PanelShell.tsx`:
  - Expand button (maximize icon) → calls `expandPanel(viewId, panelId)`
  - Close button (X icon, only shown when `span === 3`) → calls `collapsePanel(viewId)`
  - Animate siblings: CSS `transition: flex 300ms ease, opacity 200ms ease`
  - When expanded, siblings: `flex: 0; opacity: 0; overflow: hidden`
  → Verify: Click expand on Timer panel → it goes full width, sibling hides. Click X → restores.

### Phase 4: Tablet & Mobile Responsiveness

- [ ] **Task 10: Implement screen-mode-aware `PanelGrid` layout**
  Update `PanelGrid.tsx` to handle all three screen modes:
  - **Tablet** (`768px – 1023px`): `flex-direction: row`, all panels get `flex: 1` (equal 50/50 split)
  - **Mobile** (`< 768px`): `flex-direction: column`, panels get `min-height: 50vh`, container has `overflow-y: auto`
  - Expand to full-screen on any mode = panel takes full viewport, siblings hidden
  - Create `useScreenMode()` hook that returns `'desktop' | 'tablet' | 'mobile'`
  → Verify: Tablet shows 50/50 split, mobile stacks vertically and scrolls

### Phase 5: Runtime Lifecycle Cleanup

- [ ] **Task 11: Centralize runtime cleanup on view transitions**
  Move the runtime init/dispose logic from `UnifiedWorkbench`'s manual `useEffect` into a hook or the context:
  - When `viewMode` changes FROM `'track'` → auto-call `disposeRuntime()`
  - When `viewMode` changes TO `'track'` AND `selectedBlockId` exists → auto-call `initializeRuntime()`
  - When new content is loaded (external tooling) → reset `viewMode` to `'plan'`, dispose runtime
  → Verify: Navigate Plan → Track → Plan → Track: runtime initializes and disposes cleanly each time, no stale refs

### Phase 6: Verification

- [ ] **Task 12: Smoke-test all views across screen modes**
  - **Desktop (≥ 1024px)**:
    - Plan view: Editor renders full width
    - Track view: Timer 2/3 + History 1/3, expand Timer → full screen, close → restores 2/3|1/3
    - Review view: Index 1/3 + Timeline 2/3, expand Timeline → full, close → restores
  - **Tablet (768px – 1023px)**:
    - Track view: Timer 50% + History 50% (equal split)
    - Review view: Index 50% + Timeline 50% (equal split)
    - Expand any panel → full screen, close → restores 50/50
  - **Mobile (< 768px)**:
    - All multi-panel views: panels stacked vertically, scrollable
    - Each panel min-height 50vh
    - Expand any panel → full viewport, close → restores stack
  - **All modes**: Keyboard nav (Ctrl+Left/Right) switches views
  - **All modes**: Debug mode still toggles history ↔ debug panel in Track view
  → Verify: Manual browser testing at each screen mode breakpoint

---

## File Map

| File                                                        | Action        | Purpose                                                        |
| ----------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| `src/components/layout/panel-system/types.ts`               | **NEW**       | Core type definitions                                          |
| `src/components/layout/panel-system/PanelShell.tsx`         | **NEW**       | Panel wrapper with expand/collapse                             |
| `src/components/layout/panel-system/PanelGrid.tsx`          | **NEW**       | Flex layout engine                                             |
| `src/components/layout/panel-system/usePanelLayout.ts`      | **NEW**       | Panel span state hook                                          |
| `src/components/layout/panel-system/viewDescriptors.ts`     | **NEW**       | Default view configurations                                    |
| `src/components/layout/panel-system/ResponsiveViewport.tsx` | **NEW**       | New sliding viewport                                           |
| `src/components/layout/panel-system/index.ts`               | **NEW**       | Barrel export                                                  |
| `src/components/layout/WorkbenchContext.tsx`                | **MODIFY**    | Add panel layout state                                         |
| `src/components/layout/UnifiedWorkbench.tsx`                | **MODIFY**    | Use new panel system                                           |
| `src/components/layout/SlidingViewport.tsx`                 | **DEPRECATE** | ==Keep for reference, unused==^[Do not keep, remove this com]  |

## Future Extensibility

The `ViewDescriptor[]` pattern makes adding new views trivial:
```ts
// Adding a 4th "Settings" view:
const settingsView: ViewDescriptor = {
  id: 'settings',
  label: 'Settings',
  icon: <Settings />,
  panels: [
    { id: 'profile', title: 'Profile', defaultSpan: 1, content: <ProfilePanel /> },
    { id: 'preferences', title: 'Preferences', defaultSpan: 2, content: <PrefsPanel /> },
  ]
};
// Just add to the views array — strip width auto-calculates to N*100%
```

## Notes
- The `PanelShell` header should be minimal (thin bar, ~28px) to not eat content space
- Expand button uses `Maximize2` icon from lucide; close uses `X`
- CSS transitions on `flex` property are well-supported (all modern browsers)
- The panel system is **agnostic** to what content is rendered inside — it only manages layout
- `WorkbenchContext` becomes the single source of truth for: document state, view mode, panel layouts, and content lifecycle
