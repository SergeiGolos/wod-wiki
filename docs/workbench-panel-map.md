# Workbench Panel & State Map

This document tracks the relationship between workbench panels, views, and the state they consume or modify.

## Unified State Containers

The workbench relies on two primary state containers:
1.  **`WorkbenchContext`**: Manages document content, view metadata (mode, strip, layout), and content providers.
2.  **`WorkbenchSyncBridge` (Zustand)**: Manages the active runtime, execution status, and synchronized UI state (hovers, selections, analytics).

---

## Panel Matrix

| Panel                  | Views     | Subscribes To                                                          | Notifies / Updates                                                               |
| :--------------------- | :-------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **PlanPanel**          | `plan`    | `content`, `monacoTheme`, `highlightedLine`                            | `setContent`, `setBlocks`, `setActiveBlockId`, `setCursorLine`, `onStartWorkout` |
| **TrackPanelIndex**    | `track`   | `runtime`, `activeSegmentIds`, `activeStatementIds`, `hoveredBlockKey` | (None directly)                                                                  |
| **TrackPanelPrimary**  | `track`   | `runtime`, `execution`, `selectedBlock`, `documentItems`               | `onStart`, `onPause`, `onStop`, `onNext`, `onBlockHover`, `onBlockClick`         |
| **ReviewPanelIndex**   | `review`  | `analyticsSegments`, `analyticsGroups`, `selectedAnalyticsIds`         | `toggleAnalyticsSegment`                                                         |
| **ReviewPanelPrimary** | `review`  | `analyticsData`, `analyticsSegments`, `selectedAnalyticsIds`           | `toggleAnalyticsSegment`                                                         |
| **HistoryPanel**       | `history` | `historyEntries`, `historySelection`, `stripMode`                      | `onToggleEntry`, `onOpenEntry`, `onCalendarDateChange`, `onCreateNewEntry`       |
| **AnalyzePanel**       | `analyze` | `selectedEntries`                                                      | (None directly)                                                                  |
| **RuntimeDebugPanel**  | `track`\* | `runtime`, `selectedBlock`, `activeStatementIds`                       | (Internal debug interactions)                                                    |

*\* Conditional based on `isDebugMode` toggled via the header.*

---

## Panel Details & Planning

### Plan Panel
*The primary markdown/WOD editor.*
- **Current State:** Wraps `MarkdownEditorBase`. Uses Monaco for high-fidelity editing. Subscribes to document content and line highlights for cross-panel navigation (e.g., clicking a block in Track slides to the editor and highlights the line).
- **Notes & Updates:**
    - [ ] Add support for "Ghost Text" or inline suggestions from the runtime.
    - [ ] Improve block-start interaction (play button in gutter).

### Track Panel (Primary & Index)
*Real-time workout execution and timer display.*
- **Current State:** Split into an Index (sidebar list of blocks) and Primary (active timer). It adapts to screen size via `usePanelSize`, merging index and primary into a scrolling list on mobile/compact spans.
- **Notes & Updates:**
    - [ ] Implement "Pip" (Picture-in-Picture) mode for the timer when switching to Plan view.
    - [ ] Add per-block progress bars in the Index panel.

### Review Panel (Primary & Index)
*Post-workout analytics and timeline view.*
- **Current State:** Displays a multi-track timeline of segments and groups. Subscribes to a set of selected IDs to filter the visualization.
- **Notes & Updates:**
    - [ ] Implement "Compare" mode where two history entries can be overlaid.
    - [ ] Add summary stats (Total Work, Consistency) to the Index panel.

### History Panel
*The database browser for workout entries.*
- **Current State:** Three-column responsive layout (Calendar, List, Details). Controls the `stripMode` of the workbench (single-select vs multi-select).
- **Notes & Updates:**
    - [ ] Add full-text search across entry contents.
    - [ ] Implement "Tags" filter in the sidebar.

### Analyze Panel
*Comparative analysis for multiple selected workouts.*
- **Current State:** Early implementation. Currently takes a list of `selectedEntries`.
- **Notes & Updates:**
    - [ ] Create specialized "Comparison Aggregators" for recurring WOD blocks.
    - [ ] Add export functionality for analyzed data.

### Runtime Debug Panel
*Deep-dive into block memory and state.*
- **Current State:** Embedded panel appearing inside the Track view when debug mode is enabled.
- **Notes & Updates:**
    - [ ] Add "Time-Travel" slider to scrub through past blocks in the current session.
    - [ ] Improve visualization of `ICodeFragment` memory hierarchy.
