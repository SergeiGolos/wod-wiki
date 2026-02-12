# Workbench Architecture Refactor Plan

This document outlines the step-by-step plan to refactor the WOD Workbench into a **configurable, multi-panel system** with URL-driven navigation and atomic components.

## 🎯 Objectives
- **Atomicity**: Decompose monolithic panels (`HistoryPanel`, `TrackPanel`) into reusable sub-components.
- **Configurability**: Support multiple layouts (Desktop vs. Mobile vs. Storybook).
- **Navigation**: Replace internal state switching with URL-driven routing (`/history`, `/plan`, `/track`).
- **Synchronization**: Decouple component communication using an event bus.

---

## 🏗️ Architecture Decisions

### 1. Panel Communication
- **Strategy**: **Callback Props** (for purely presentational components like `ListFilter`).
- **Justification**: Keeps components pure and testable; avoids tight coupling to specific Context providers.

### 2. Navigation Strategy
- **Strategy**: **Hash-Based Routing** (e.g., `/#/note/123/plan`).
- **Justification**: 
  - Consistent with current Desktop/Electron architecture.
  - Enables deep linking to specific views.
  - Leverages existing `React Router` setup.

### 3. Editor <-> Preview Synchronization
- **Strategy**: **Event Bus** (Pub/Sub).
- **Justification**: 
  - Decouples the Editor from the `NotePreview` panel.
  - Panels subscribe on mount and unsubscribe on unmount to prevent memory leaks.
  - Events: `active-block-change`, `scroll-to-line`, `reveal-line`.

---

## 📅 Implementation Phases

### Phase 1: Component Decomposition
_Goal: Create atomic panels that manage their own internal state but use props for data flow._

- [x] **1.1. Split `HistoryPanel`**
    - [x] Create `ListFilter` component (Calendar + Search Inputs).
        - Props: `filter`, `onFilterChange`.
    - [x] Create `ListOfNotes` component (Virtual list).
        - Props: `notes`, `onSelect`.
    - [x] Refactor `HistoryPanel` to compose these two.

- [x] **1.2. Enhance `NotePreview`**
    - [x] Refactor `WodIndexPanel` into `NotePreview`.
    - [x] Add `onStartWorkout` prop (navigates to Track view).
    - [x] Add `scrollToBlock(id)` method/imperative handle.

- [x] **1.3. Standardize Track Panels**
    - [x] Rename `TrackPanelPrimary` -> `TimerScreen`.
    - [x] Rename `TrackPanelIndex` -> `SessionHistory`.
    - [x] Ensure they accept `runtime` as a prop or context slice.

### Phase 2: Configuration & Routing
_Goal: Define layouts and wire them to URLs._

- [x] **2.1. Define Layout Configuration**
    - [x] Create `IWorkbenchLayout` interface.
    - [x] Implement `DesktopLayout` config (specifying grid areas/columns).

- [x] **2.2. Implement View Components**
    - [x] `DesktopHistoryView`: 3-column grid (Filter | List | Preview).
    - [x] `DesktopPlanView`: 2-column split (Editor | Preview).
    - [x] `DesktopTrackView`: Main + Sidebar (Timer | History/Debug).

- [x] **2.3. Update Routing (`App.tsx`)**
    - [x] Ensure routes map clearly to these Views.
    - [x] Verify `useParams` usage for `noteId` and `viewMode`.

### Phase 3: Event Bus & Synchronization
_Goal: Connect independent panels without prop drilling._

- [x] **3.1. Create Workbench Event Bus**
    - [x] Implement a lightweight event emitter service/class.
    - [x] Define events: `SCROLL_TO_BLOCK`, `HIGHLIGHT_BLOCK`, `START_WORKOUT`.

- [x] **3.2. Wire `NotePreview` Sync**
    - [x] Editor emits `HIGHLIGHT_BLOCK` on cursor move.
    - [x] `NotePreview` subscribes and scrolls to matching block.
    - [x] `NotePreview` click emits `SCROLL_TO_BLOCK` -> Editor scrolls.

### Phase 4: Integration & Cleanup
_Goal: Assemble the full Desktop Workbench and remove legacy code._

- [x] **4.1. Assemble `DesktopWorkbench`**
    - [x] Compose the views based on the current Route.
    - [x] Ensure transitions (if any) are smooth.

- [x] **4.2. Legacy Cleanup**
    - [x] Remove old monolithic `Workbench.tsx` logic.
    - [x] verify all tests pass.

---

## 🚀 Execution Strategy
We will start with **Phase 1 (Component Decomposition)** as it provides immediate architectural benefits without breaking the existing app flow until Phase 2 integration.
