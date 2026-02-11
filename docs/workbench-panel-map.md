# Workbench Panel & State Map

This document tracks the relationship between workbench panels, views, and the state they consume or modify.

## Workbench Variants

The workbench is designed to support multiple configurations, allowing components to be composed differently based on the target environment.

1.  **`DesktopWorkbench`** (Primary Focus): Fully featured, multi-panel sliding strip.
2.  **`MobileWorkbench`** (Placeholder): Stacked/Sheet-based navigation for touch.
3.  **`StoryWorkbench`** (Placeholder): All panels rendered simultaneously for documentation/testing.

---

## Panel Inventory

| Panel | Description | Key Responsibilities |
| :--- | :--- | :--- |
| **ListFilter** | Filter & Calendar Sidebar | Manages date ranges, tags, and search criteria. Notifies workbench of filter changes. |
| **ListOfNotes** | Workout List | Lists workouts matching filters. Supports pagination/lazy load. |
| **NotePreview** | Workout Details & Actions | Read-only view of a selected workout. Supports inline "Start" to jump to Track. Scroll-locks to editor. |
| **AnalyticsPreview** | Aggregate Stats | Placeholder. Summarizes total time/work for selected multiple items. |
| **EditorPanel** | Markdown Editor | Full text editing. |
| **TimerScreen** | Active Workout | The main timer interface (formerly TrackPanelPrimary). |
| **SessionHistory** | Live Log | Review of current session activities (replacing TrackPanelIndex). |
| **RuntimeDebugPanel** | Debug Tools | Deep inspection of runtime memory. Replaces SessionHistory in Debug Mode. |
| **ReviewPanel** | Post-Workout Analysis | Timeline and detailed analytics. |

---

## Desktop Layout Configuration

The `DesktopWorkbench` uses a responsive 3-column grid system (1/3 fractions) or split (1/2 fractions).

### 1. History View
*Navigating the database of WODs.*

| State | Col 1 (1/3) | Col 2 (1/3) | Col 3 (1/3) | Interactions |
| :--- | :--- | :--- | :--- | :--- |
| **Nothing Selected** | `ListFilter` | `ListOfNotes` | *(Empty / Extension of List)* | Default landing state. |
| **Single Item** | `ListFilter` | `ListOfNotes` | `NotePreview` | Clicking a note opens Preview in Col 3. |
| **Multi Selection** | `ListFilter` | `ListOfNotes` | `AnalyticsPreview` | Select checkboxes to trigger Aggregate view. |

### 2. Plan View
*Editing and crafting workouts.*

| Layout | Left (1/2) | Right (1/2) | Interactions |
| :--- | :--- | :--- | :--- |
| **Standard** | `EditorPanel` | `NotePreview` | Cursor in editor updates Preview scroll position. |

### 3. Track View
*Executing the workout.*

| Mode | Main (2/3) | Sidebar (1/3) | Interactions |
| :--- | :--- | :--- | :--- |
| **Normal** | `TimerScreen` | `SessionHistory` | Standard execution flow. |
| **Debug** | `TimerScreen` | `RuntimeDebugPanel` | Debug toggle swaps Sidebar. |

### 4. Review View
*Analyzing performance.*

| Layout | Sidebar (1/3) | Main (2/3) | Interactions |
| :--- | :--- | :--- | :--- |
| **Standard** | `SessionHistory` | `ReviewPanel` | Selecting log items highlights timeline. |

---

## State Architecture

### Unified State Containers
1.  **`WorkbenchContext`**: Manages document content, view metadata (mode, strip, layout), and content providers.
2.  **`WorkbenchSyncBridge` (Zustand)**: Manages the active runtime, execution status, and synchronized UI state (hovers, selections, analytics).

### New Interactions
- **Editor <-> NotePreview Sync:**
    - `NotePreview` listens to `activeBlockId` from `WorkbenchContext`.
    - When Editor cursor moves, `activeBlockId` updates, scrolling `NotePreview` to match.
    - When `NotePreview` row is clicked, it sends `revealLine` command to Editor.
- **Preview -> Track Transition:**
    - `NotePreview` contains a "Start" button for valid WOD blocks.
    - Click -> Sets `activeBlockId` -> Switches View to `Track` -> Initializes Runtime.

---

## Implementation Plan Checklist

- [ ] **Phase 1: Component Decomposition**
    - [ ] Split `HistoryPanel` into `ListFilter` and `ListOfNotes`.
    - [ ] Refactor `WodIndexPanel` into `NotePreview` (add Start button & scroll sync).
    - [ ] Rename `TrackPanelPrimary` to `TimerScreen`.
    - [ ] Rename `TrackPanelIndex` to `SessionHistory`.

- [ ] **Phase 2: Configuration Logic**
    - [ ] Define `IWorkbenchLayout` interface.
    - [ ] Implement `DesktopLayout` configuration object.

- [ ] **Phase 3: View Assembly**
    - [ ] Rebuild `HistoryView` to support 3-column dynamic layout.
    - [ ] Rebuild `PlanView` to support 50/50 split.
    - [ ] Rebuild `TrackView` to support generic sidebar swapping (Session/Debug).



----
_Decision_: How should 
    
    ```
    ListFilter
    ```
    
     notify the parent?
    - **A) Callback Props**: 
        
        ```
        onFilterChange={(f) => setFilter(f)}
        ```
        
         (Simple, pure).
    - **B) Context Slice**: 
        
        ```
        useHistoryContext()
        ```
        
         (Avoids prop drilling if intermediate containers exist).
    - _Recommendation: A) Callback Props for atomic reusability._
choice: A

---

1. **Multiple Choice: Navigation Strategy**
    
    - **Option A (State-Based)**: 
        
        ```
        activeView
        ```
        
         string in Redux/Zustand. Fast, simple, but no deep linking.
    - **Option B (Route-Based)**: 
        
        ```
        /workbench/track
        ```
        
        , 
        
        ```
        /workbench/history
        ```
        
        . Good for deep linking, harder to animate transitions.
    - **Option C (Hybrid)**: "Modes" (Plan/Track) are state, "Route" (Project ID) is URL.

This depends on he workbench it is running in.. the desktop mode should keep following the format that it has today with useing hashroutes 
      
---  
    1. **Multiple Choice: Editor <-> Preview Sync**
    - **Option A (Event Bus)**: 
        
        ```
        EventEmitter
        ```
        
         emits 
        
        ```
        scroll-to-line
        ```
        
        . Decoupled but harder to debug.
    - **Option B (Shared Store)**: 
        
        ```
        useWorkbenchStore(s => s.highlightedLine)
        ```
        
        . Both components subscribe.
    - **Option C (Ref Handler)**: Parent holds refs to both, calls methods directly. Tightly coupled.
    - _Recommendation: B) Shared Store (already using Zustand)._
      
Event bus that is managed by the workbench panels subscribed when loaded, and unsubcribed when unlaode dto keep memorey clean.