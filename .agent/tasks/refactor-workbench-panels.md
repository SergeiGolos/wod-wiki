# Refactor Workbench Panels & Architecture

This plan outlines the steps to refactor the Workbench into a configurable, multi-variant system (Desktop, Mobile, Story) with atomic panels and a dedicated event bus for UI synchronization.

## Context & Architecture Decisions
- **Goal**: Move from a monolithic responsive workbench to a composed "DesktopWorkbench" with distinct, reusable panels.
- **Architecture**:
    - **Panels**: `ListFilter`, `ListOfNotes`, `NotePreview`, `TimerScreen`, `SessionHistory`, `RuntimeDebugPanel`.
    - **Communication**: Callback props for data (Parent -> Child); `WorkbenchEventBus` for cross-panel UI sync (scroll/focus).
    - **Navigation**: Hash-based routing for Desktop (`#/plan`, `#/history`, `#/track`, `#/review`).

### Decision Log
The following architectural choices have been locked in:
1.  **Filter Communication**: **Callback Props** (Option A).
    - `ListFilter` accepts `onFilterChange`. Parent manages state.
2.  **Navigation Strategy**: **Hybrid Hash Routes** (Option C/Traditional).
    - URL drives the main view mode (Plan/Track).
    - Internal state drives selection/layout nuances.
3.  **UI Synchronization**: **Event Bus** (Option A).
    - `WorkbenchEventBus` singleton for `scroll-to-line`, `reveal-line`, etc.
    - Decoupled from React render cycles for performance.

---

## Phase 1: Foundation & Event Bus
*Goal: Establish the communication layer for cross-panel sync.*

1.  **Create `WorkbenchEventBus`**
    - [ ] Create `src/services/WorkbenchEventBus.ts`.
    - [ ] Define Event Types:
        - `scroll-to-line`: `{ line: number, source: string }`
        - `highlight-block`: `{ blockId: string, source: string }`
        - `reveal-line`: `{ line: number, source: string }`
        - `analytics-select`: `{ ids: string[], source: string }`
    - [ ] Implement Singleton class (matching `WorkoutEventBus` pattern).
    - [ ] Add `subscribe(event, callback)` and `emit(event)` methods.

2.  **Verify & Test**
    - [ ] Create a simple test harness to verify pub/sub behavior works outside React.

## Phase 2: Component Decomposition
*Goal: Break down monolithic panels into atomic, reusable units.*

### Part A: History Panel Decomposition
3.  **Extract `ListFilter`**
    - [ ] Create `src/components/history/ListFilter.tsx`.
    - [ ] Props: `filters: HistoryFilters`, `onFilterChange`, `calendarDate`, `onDateChange`.
    - [ ] Move CalendarWidget and Filter inputs here.

4.  **Extract `ListOfNotes`**
    - [ ] Create `src/components/history/ListOfNotes.tsx`.
    - [ ] Props: `entries: HistoryEntry[]`, `selectedIds`, `onToggle`, `onSelect`.
    - [ ] Move `HistoryPostList` logic here (ensure virtualization/pagination support).

5.  **Refactor `HistoryPanel` Wrapper**
    - [ ] Update `HistoryPanel.tsx` to compose `ListFilter` and `ListOfNotes`.
    - [ ] Maintain backward compatibility for existing `Workbench.tsx` until Desktop switch.

### Part B: Preview & Track Components
6.  **Create `NotePreview`**
    - [ ] Create `src/components/workbench/NotePreview.tsx`.
    - [ ] Logic: Based on `WodIndexPanel` but for a *single* selected entry (read-only).
    - [ ] Props: `content: string`, `onStartWorkout: () => void`.
    - [ ] **Interaction**: Subscribe to `WorkbenchEventBus` (`scroll-to-line`) to auto-scroll.

7.  **Rename Track Components**
    - [ ] Rename `TrackPanelPrimary` -> `TimerScreen`.
    - [ ] Rename `TrackPanelIndex` -> `SessionHistory`.
    - [ ] Update imports in `Workbench.tsx`.

8.  **Create `AnalyticsPreview` Stub**
    - [ ] Create `src/components/workbench/AnalyticsPreview.tsx`.
    - [ ] Implement basic "Aggregate Summary" (Total Time, Total Reps) for `selectedEntries`.

## Phase 3: Desktop Workbench Implementation
*Goal: Assemble the new Desktop-specific layout engine.*

9.  **Create `DesktopWorkbench` Layout**
    - [ ] Create `src/components/layout/DesktopWorkbench.tsx`.
    - [ ] Define helper `useDesktopNavigation` for Hash Route management.

10. **Implement History View (3-Column)**
    - [ ] logic:
      ```tsx
      <div className="grid grid-cols-3 h-full">
        <div className="col-span-1 border-r"><ListFilter ... /><ListOfNotes ... /></div>
        <div className="col-span-1 border-r"><ListOfNotes ... /> (Wait, need to check column split)</div>
        {/* Correction:
            Col 1: ListFilter
            Col 2: ListOfNotes
            Col 3: Preview/Analytics
        */}
      </div>
      ```
    - [ ] **State Logic**:
        - Nothing Selected: `ListFilter` (1/3) | `ListOfNotes` (1/3) | Empty (1/3)
        - Single Selected: `ListFilter` (1/3) | `ListOfNotes` (1/3) | `NotePreview` (1/3)
        - Multi Selected: `ListFilter` (1/3) | `ListOfNotes` (1/3) | `AnalyticsPreview` (1/3)

11. **Implement Plan View (Split)**
    - [ ] Layout: `EditorPanel` (1/2) | `NotePreview` (1/2).
    - [ ] **Sync**: Ensure `EditorPanel` emits cursor events to `WorkbenchEventBus`.

12. **Implement Track View (Sidebar)**
    - [ ] Layout: `TimerScreen` (2/3) | Sidebar (1/3).
    - [ ] **Sidebar Logic**:
        - Normal: `<SessionHistory />`
        - Debug: `<RuntimeDebugPanel />`

## Phase 4: Wiring & Live Interactions
*Goal: Connect the Event Bus and verify flow.*

13. **Editor Integration**
    - [ ] Update `PlanPanel` (or `EditorPanel`) to publish `scroll-to-line`.
    - [ ] Update `PlanPanel` to subscribe to `reveal-line` (from NotePreview click).

14. **NotePreview Integration**
    - [ ] Subscribe to `scroll-to-line`.
    - [ ] Implement "Scroll Lock": When scrolling Preview manually, disable auto-scroll temporarily.

15. **Transition Logic**
    - [ ] Clicking "Start" in `NotePreview` ->
        - Sets Active Block ID.
        - Navigates URL to `#/track`.
        - Initializes Runtime.

## Phase 5: Mobile & Story Stubs (Future)
*Goal: Prepare the ground for other variants.*

16. **Create Mobile/Story Placeholders**
    - [ ] Create `MobileWorkbench.tsx` (Stacked layout).
    - [ ] Create `StoryWorkbench.tsx` (All-visible layout).

## Verification Checklist
- [ ] **History**: 3-column layout works. Selecting a note shows Preview. Selecting multiple shows Analytics.
- [ ] **Plan**: Editor and Preview side-by-side. Cursor moves sync scroll.
- [ ] **Track**: Timer works. Debug toggle swaps sidebar.
- [ ] **Router**: Reloading page on `#/history` loads correctly.
